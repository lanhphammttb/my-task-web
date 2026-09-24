import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Check, Gem, ListChecks, Quote, ScrollText } from 'lucide-react';
import type { Task } from '../types';
import { addDays, dateKey, formatDuration, longDate, parseKey, relativeDay, todayKey } from '../lib/date';
import { dayStats, sortTasks, tasksOn } from '../lib/stats';
import { questStates } from '../lib/quests';
import { aphorismOfDay, elderPortrait } from '../lib/elders';
import { useApp } from '../store/AppStore';
import QuickAdd from '../components/QuickAdd';
import ChestRow from '../components/ChestRow';
import ReturnDigest from '../components/ReturnDigest';
import TaskCard from '../components/TaskCard';
import { Meter, Section } from '../components/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props { date: string; onDateChange: (d: string) => void; onEdit: (t: Task) => void; onFocus: (t: Task) => void; }

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

  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Ngày trước" onClick={() => onDateChange(dateKey(addDays(parseKey(date), -1)))}><ChevronLeft className="size-4" /></Button>
      <div className="min-w-0 flex-1"><h2 className="font-title text-lg font-bold">{isToday ? 'Sổ hành sự hôm nay' : relativeDay(date)}</h2><p className="text-muted-foreground text-xs">{longDate(parseKey(date))}</p></div>
      {!isToday && <Button variant="outline" size="sm" onClick={() => onDateChange(todayKey())}><CalendarCheck2 className="size-3.5" /> Về hôm nay</Button>}
      <Button variant="outline" size="icon" aria-label="Ngày sau" onClick={() => onDateChange(dateKey(addDays(parseKey(date), 1)))}><ChevronRight className="size-4" /></Button>
    </div>
    <div className="journal-day-summary">
      <span><strong>{stats.done}/{stats.total}</strong> việc đã hoàn thành</span>
      <span><strong>{formatDuration(stats.focusMin)}</strong> nhập định</span>
      <span>{pending.length ? `${formatDuration(remainMin)} dự kiến còn lại` : done.length ? 'Đã làm xong. Nghỉ ngơi cũng là tu luyện.' : 'Chọn một việc vừa sức để bắt đầu.'}</span>
    </div>
    {/* Lời tiền bối kèm chân dung.

        Bộ `art/elder/` có 13 tấm, nhưng sau một lần sắp xếp lại thì màn này -
        màn hay nhìn nhất - chỉ còn mỗi danh sách việc, còn chân dung thì lui
        hết về Sơn Môn. Đưa về lại đây. Thiếu file thì lùi về icon nháy kép. */}
    <blockquote className="border-gold/60 bg-card/70 text-muted-foreground flex items-start gap-3 rounded-r-lg border-l-2 px-3 py-2 text-xs">
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

    <div className="journal-write"><label className="mb-2 block text-xs font-medium">Ghi một việc đời thường vào sổ tu hành</label><QuickAdd date={date} /></div>
    <Section icon={ListChecks} title="Việc của bạn" subtitle="Chọn Bế Quan để tập trung. Chỉ đóng dấu hoàn thành khi đã làm xong ngoài đời.">
      {list.length === 0 ? <div className="journal-empty"><ScrollText className="size-7 text-gold" /><div><h3 className="font-title font-semibold">Trang sổ còn để ngỏ</h3><p>Đọc 10 trang sách, đi bộ 20 phút, hay hoàn thành một phần công việc. Viết điều bạn thực sự muốn làm vào ô phía trên.</p></div></div> : <div className="space-y-4">
        <AnimatePresence initial={false}>{pending.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} />)}</AnimatePresence>
        {done.length > 0 && <div className="space-y-2"><h3 className="journal-completed"><Check className="size-4" /> Đã hành công · {done.length} việc hoàn thành</h3><AnimatePresence initial={false}>{done.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} />)}</AnimatePresence></div>}
      </div>}
    </Section>
    {isToday && overdue.length > 0 && <Section icon={ScrollText} title={`Việc còn dang dở (${overdue.length})`} subtitle="Sắp xếp lại cho vừa sức, không cần làm tất cả cùng lúc." action={<Button variant="outline" size="sm" onClick={pushOverdueToToday}>Dời tất cả sang hôm nay</Button>}><div className="space-y-2">{overdue.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} showDate />)}</div></Section>}
    <div className="journal-rewards"><div className="mb-3"><p className="sanctuary-eyebrow"><Gem className="size-3" /> SAU MỖI BƯỚC TU HÀNH</p><h2 className="font-title mt-1 text-lg font-semibold">Công sức kết thành cơ duyên</h2><p className="text-muted-foreground mt-1 text-xs">Hòm và tông khoá ghi nhận việc đã làm. Bạn không cần nhận thêm thử thách để hoàn thành việc của mình.</p></div><ChestRow date={date} /></div>
    <Section id="quests" icon={ScrollText} title="Nhật khoá tông môn" subtitle="Thử thách thêm nếu phù hợp với ngày của bạn" action={<span className="text-muted-foreground text-xs">{quests.filter(q => q.done).length}/{quests.length} hoàn thành</span>}>
      <ul className="grid gap-2 sm:grid-cols-3">{quests.map(q => <li key={q.id} className={cn('rounded-lg border p-3', q.done ? 'border-success/40 bg-success/10' : 'border-border bg-surface/50')}><div className="flex items-start gap-2">{q.done && <Check className="size-4 shrink-0 text-success" />}<div><p className="text-xs font-medium">{q.label}</p><p className="text-muted-foreground text-[11px]">{q.current}/{q.target} · thưởng {q.reward} linh thạch</p></div></div>{!q.done && <Meter value={q.ratio} height={4} className="mt-2" />}</li>)}</ul>
    </Section>
    {isToday && <ReturnDigest />}
  </div>;
}
