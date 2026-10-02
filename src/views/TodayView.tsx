import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Check, CircleDashed, Crosshair, Gem, ListChecks, Quote, ScrollText, Sparkles } from 'lucide-react';
import type { Task } from '../types';
import { addDays, dateKey, formatDuration, longDate, parseKey, relativeDay, todayKey } from '../lib/date';
import { dayStats, sortTasks, tasksOn } from '../lib/stats';
import { questStates } from '../lib/quests';
import { aphorismOfDay, elderPortrait } from '../lib/elders';
import { NHAN, THUAT_NGU } from '../lib/thuatNgu';
import { useApp } from '../store/AppStore';
import QuickAdd from '../components/QuickAdd';
import ChestRow from '../components/ChestRow';
import ReturnDigest from '../components/ReturnDigest';
import TaskCard from '../components/TaskCard';
import { Meter, Section } from '../components/primitives';
import { Button } from '@/components/ui/button';

interface Props { date: string; onDateChange: (d: string) => void; onEdit: (t: Task) => void; onFocus: (t: Task) => void; }

/** Cùng mốc với `.journal-today` hai cột trong ui-polish.css. */
const HAI_COT = '(min-width: 1280px)';

/*
 * Bố cục: hai khối `.journal-cot-chinh` (việc) và `.journal-cot-phu` (tiến độ,
 * hòm, thử thách, gợi ý tập trung).
 *
 * Màn ≥1280px: hai cột thật, cột phụ đứng yên (sticky) khi cuộn danh sách việc.
 * Còn lại (điện thoại, màn vừa): hai khối là `display: contents`, các mục xếp
 * lại đúng thứ tự cũ bằng `order` - giao diện điện thoại không đổi một chỗ nào.
 */
export default function TodayView({ date, onDateChange, onEdit, onFocus }: Props) {
  const { data, pushOverdueToToday } = useApp();
  const isToday = date === todayKey();
  const list = sortTasks(tasksOn(data.tasks, date));
  const stats = dayStats(data.tasks, data.sessions, date);
  const overdue = sortTasks(data.tasks.filter(t => t.status !== 'done' && t.date < todayKey()));
  const pending = list.filter(t => t.status !== 'done');
  const done = list.filter(t => t.status === 'done');
  const remainMin = pending.reduce((s, t) => s + t.estimateMin, 0);
  const quests = questStates(data, date);
  const aphorism = aphorismOfDay();
  const portrait = elderPortrait(aphorism.elder);
  // Chỉ xếp ngang khi ảnh tải được thật, nếu không chữ sẽ thụt vào mà bên cạnh
  // chẳng có mặt ai.
  const [portraitOk, setPortraitOk] = useState(true);
  const showPortrait = !!portrait && portraitOk;
  // Màn hai cột có chỗ: mở sẵn thử thách trong ngày ở cột phụ.
  const [haiCot] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(HAI_COT).matches);
  // Gợi ý tập trung: việc đầu tiên còn dở của ngày đang xem (đã xếp theo ưu tiên).
  const goiY = isToday ? pending[0] ?? overdue[0] : undefined;

  return <div className="journal-today mx-auto flex w-full max-w-5xl flex-col gap-4">
    <div className="journal-cot-chinh">
    <div className="journal-date-ribbon">
      <Button className="journal-date-seal" variant="outline" size="icon" aria-label="Ngày trước" title="Ngày trước" onClick={() => onDateChange(dateKey(addDays(parseKey(date), -1)))}><ChevronLeft className="size-4" /></Button>
      <div className="journal-date-copy"><h2 className="font-title chi-man-rong text-lg font-bold">{isToday ? 'Việc hôm nay' : relativeDay(date)}</h2><p className="text-muted-foreground text-xs">{longDate(parseKey(date))}</p></div>
      {!isToday && <Button className="journal-today-return" variant="outline" size="sm" onClick={() => onDateChange(todayKey())}><CalendarCheck2 className="size-3.5" /> Hôm nay</Button>}
      <Button className="journal-date-seal" variant="outline" size="icon" aria-label="Ngày sau" title="Ngày sau" onClick={() => onDateChange(dateKey(addDays(parseKey(date), 1)))}><ChevronRight className="size-4" /></Button>
    </div>

    <div className="journal-write"><label htmlFor="quick-add-task" className="chi-man-rong mb-2 block text-xs font-medium">Ghi một việc bạn muốn làm</label><QuickAdd date={date} /></div>
    <Section className="journal-viec" icon={ListChecks} title="Việc của bạn" subtitle="Bấm vào việc để sửa, biểu tượng tâm ngắm để tập trung. Chỉ đánh dấu xong khi đã làm xong ngoài đời." subtitleClassName="chi-man-rong">
      {list.length === 0 ? <div className="journal-empty"><ScrollText className="size-7 text-gold" /><div><h3 className="font-title font-semibold">Chưa có việc nào</h3><p className="chi-man-rong">Đọc 10 trang sách, đi bộ 20 phút, hay hoàn thành một phần công việc. Viết điều bạn thực sự muốn làm vào ô phía trên.</p></div></div> : <div className="space-y-2.5">
        <AnimatePresence initial={false}>{pending.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} />)}</AnimatePresence>
        {done.length > 0 && <div className="space-y-2"><h3 className="journal-completed"><Check className="size-4" /> Đã xong · {done.length} việc</h3><AnimatePresence initial={false}>{done.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} />)}</AnimatePresence></div>}
      </div>}
    </Section>
    {isToday && overdue.length > 0 && <Section className="journal-do-dang" icon={ScrollText} title={`Việc còn dang dở (${overdue.length})`} subtitle="Sắp xếp lại cho vừa sức, không cần làm tất cả cùng lúc." action={<Button variant="outline" size="sm" onClick={pushOverdueToToday}>Dời tất cả sang hôm nay</Button>}><div className="space-y-2">{overdue.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} showDate />)}</div></Section>}
    {isToday && <div className="journal-digest"><ReturnDigest /></div>}
    </div>

    <aside className="journal-cot-phu" aria-label="Tiến độ trong ngày">
    <div className="journal-day-summary">
      <span><strong>{stats.done}/{stats.total}</strong> việc đã xong</span>
      <span><strong>{formatDuration(stats.focusMin)}</strong> {THUAT_NGU.nhapDinh.ro}</span>
      <span className="chi-man-rong">{pending.length ? `${formatDuration(remainMin)} dự kiến còn lại` : done.length ? 'Đã làm xong. Nghỉ ngơi cũng là tu luyện.' : 'Chọn một việc vừa sức để bắt đầu.'}</span>
      <span className="journal-day-meter" aria-hidden="true"><Meter value={stats.total ? stats.done / stats.total : 0} height={5} /></span>
    </div>
    {goiY && <div className="journal-goi-y">
      <p className="sanctuary-eyebrow"><Crosshair className="size-3" /> GỢI Ý TẬP TRUNG</p>
      <p className="journal-goi-y-ten">{goiY.title}</p>
      <button type="button" className="btn-game journal-goi-y-nut" onClick={() => onFocus(goiY)}><Crosshair className="size-3.5" /> {NHAN.batDauTapTrung}</button>
    </div>}
    {/* Lời tiền bối kèm chân dung.

        Bộ `art/elder/` có 13 tấm, nhưng sau một lần sắp xếp lại thì màn này -
        màn hay nhìn nhất - chỉ còn mỗi danh sách việc, còn chân dung thì lui
        hết về Sơn Môn. Đưa về lại đây. Thiếu file thì lùi về icon nháy kép. */}
    <blockquote className="loi-tien-boi border-gold/60 bg-card/70 text-muted-foreground flex items-start gap-3 rounded-r-lg border-l-2 px-3 py-2 text-xs">
      {showPortrait ? (
        <img
          src={portrait}
          alt=""
          decoding="async"
          onError={() => setPortraitOk(false)}
          className="border-gold/45 size-11 shrink-0 rounded-full border object-cover shadow-[0_0_12px_var(--gold-glow)]"
        />
      ) : (
        <Quote className="text-gold mt-0.5 size-3 shrink-0" />
      )}
      <div className="min-w-0">
        <span className="italic">{aphorism.text}</span>
        <cite className="mt-1 block text-[11px] not-italic">
          <span className="text-gold/90 font-medium">— {aphorism.elder}</span>
          <span className="opacity-70"> · {aphorism.title}</span>
        </cite>
      </div>
    </blockquote>
    <div className="journal-rewards"><div className="mb-3"><p className="sanctuary-eyebrow"><Gem className="size-3" /> SAU MỖI VIỆC XONG</p><h2 className="font-title mt-1 text-lg font-semibold">Hòm thưởng trong ngày</h2><p className="text-muted-foreground chi-man-rong mt-1 text-xs">Hòm và thử thách ghi nhận việc đã làm. Bạn không cần nhận thêm thử thách để hoàn thành việc của mình.</p></div><ChestRow date={date} /></div>
    <Section id="quests" className="journal-thu-thach" icon={ScrollText} title={THUAT_NGU.nhatKhoaTongMon.ten} subtitle={`${THUAT_NGU.nhatKhoaTongMon.ro} - làm thêm nếu hợp với ngày của bạn`} action={<span className="text-muted-foreground text-xs">{quests.filter(q => q.done).length}/{quests.length} xong</span>} collapsible defaultOpen={haiCot}>
      <ul className="journal-quest-list grid gap-2 sm:grid-cols-3">{quests.map(q => {
        const state = q.done ? 'complete' : q.current > 0 ? 'advancing' : 'dormant';
        return <li key={q.id} data-quest-state={state} className="journal-quest-card">
          <div className="journal-quest-seal" aria-hidden="true">
            {q.done ? <Check className="size-4" /> : q.current > 0 ? <Sparkles className="size-4" /> : <CircleDashed className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="journal-quest-name">{q.label}</p>
            <p className="journal-quest-state">{q.done ? 'Ấn tông môn đã sáng' : q.current > 0 ? 'Đang tích lũy công đức' : 'Chưa khởi hành'}</p>
            <p className="journal-quest-reward">{q.current}/{q.target} · thưởng {q.reward} {THUAT_NGU.linhThach.ten}</p>
          </div>
          {q.done ? <span className="journal-quest-done">Hoàn thành</span> : <div className="journal-quest-progress" role="progressbar" aria-label={q.label} aria-valuemin={0} aria-valuemax={q.target} aria-valuenow={Math.min(q.current, q.target)}><Meter value={q.ratio} height={5} /></div>}
        </li>;
      })}</ul>
    </Section>
    </aside>
  </div>;
}
