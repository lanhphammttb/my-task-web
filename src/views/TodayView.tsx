import { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  AlertTriangle, CalendarCheck2, CalendarPlus, ChevronLeft, ChevronRight, Crosshair,
  Flag, Hourglass, Lightbulb, ListChecks, PartyPopper, Play, Quote, Target, Trophy,
} from 'lucide-react';
import type { Task } from '../types';
import {
  addDays, countdown, dateKey, formatDuration, longDate, parseKey, relativeDay, todayKey,
} from '../lib/date';
import { dayStats, sortTasks, tasksOn } from '../lib/stats';
import { nudge, quoteOfDay } from '../lib/motivation';
import { useApp } from '../store/AppStore';
import ProgressRing from '../components/ProgressRing';
import QuickAdd from '../components/QuickAdd';
import TaskCard from '../components/TaskCard';
import { EmptyState, Meter, Section } from '../components/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  date: string;
  onDateChange: (d: string) => void;
  onEdit: (t: Task) => void;
  onFocus: (t: Task) => void;
}

export default function TodayView({ date, onDateChange, onEdit, onFocus }: Props) {
  const { data, pushOverdueToToday } = useApp();
  const isToday = date === todayKey();

  const list = useMemo(() => sortTasks(tasksOn(data.tasks, date)), [data.tasks, date]);
  const stats = useMemo(() => dayStats(data.tasks, data.sessions, date), [data.tasks, data.sessions, date]);
  const overdue = useMemo(
    () => sortTasks(data.tasks.filter((t) => t.status !== 'done' && t.date < todayKey())),
    [data.tasks],
  );

  const doing = list.filter((t) => t.status === 'doing');
  const todo = list.filter((t) => t.status === 'todo');
  const done = list.filter((t) => t.status === 'done');
  const pending = [...doing, ...todo];
  const remainMin = pending.reduce((s, t) => s + t.estimateMin, 0);
  const top3 = pending.slice(0, 3);
  const quote = quoteOfDay();
  const { dailyTarget, dailyFocusTarget } = data.settings;
  const perfect = stats.total > 0 && stats.done === stats.total;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* ------------------------------------------------ điều hướng ngày */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Ngày trước"
          onClick={() => onDateChange(dateKey(addDays(parseKey(date), -1)))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold tracking-tight">
            {isToday ? 'Hôm nay' : relativeDay(date)}
          </h2>
          <p className="text-muted-foreground text-xs">{longDate(parseKey(date))}</p>
        </div>
        {!isToday && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDateChange(todayKey())}>
            <CalendarCheck2 className="size-3.5" /> Về hôm nay
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Ngày sau"
          onClick={() => onDateChange(dateKey(addDays(parseKey(date), 1)))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* ------------------------------------------------------- tổng quan */}
      <section
        className={cn(
          'rounded-2xl border p-5',
          perfect
            ? 'border-success/40 bg-gradient-to-br from-success/12 to-card'
            : 'border-primary/25 bg-gradient-to-br from-primary/12 to-card',
        )}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProgressRing
            value={stats.total ? stats.done / stats.total : 0}
            size={126}
            label={`${stats.done}/${stats.total}`}
            caption="nhiệm vụ xong"
            color={perfect ? 'var(--success)' : undefined}
          />
          <div className="min-w-0 flex-1 space-y-4">
            {perfect ? (
              <p className="text-success flex items-start gap-2 text-sm font-semibold">
                <PartyPopper className="mt-0.5 size-4 shrink-0" />
                Ngày trọn vẹn! Bạn đã dọn sạch danh sách. Nghỉ ngơi là phần thưởng xứng đáng.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-sm font-semibold">
                <Lightbulb className="text-warning mt-0.5 size-4 shrink-0" />
                {nudge(stats.done, stats.total, stats.overdue)}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Target className="size-3" /> Mục tiêu ngày
                </div>
                <div className="tabular mt-0.5 mb-1.5 text-sm font-semibold">
                  {stats.done}/{dailyTarget}
                </div>
                <Meter value={dailyTarget ? stats.done / dailyTarget : 0} />
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Crosshair className="size-3" /> Giờ tập trung
                </div>
                <div className="tabular mt-0.5 mb-1.5 text-sm font-semibold">
                  {formatDuration(stats.focusMin)} / {formatDuration(dailyFocusTarget)}
                </div>
                <Meter
                  value={dailyFocusTarget ? stats.focusMin / dailyFocusTarget : 0}
                  barClassName="bg-success"
                />
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Hourglass className="size-3" /> Còn phải làm
                </div>
                <div className="tabular mt-0.5 mb-1.5 text-sm font-semibold">{formatDuration(remainMin)}</div>
                <Meter value={remainMin / 480} barClassName="bg-warning" />
              </div>
            </div>

            <blockquote className="border-primary bg-card/70 text-muted-foreground rounded-r-lg border-l-2 px-3 py-2 text-xs">
              <Quote className="mr-1 mb-0.5 inline size-3" />
              <span className="italic">{quote.text}</span>
              <cite className="mt-0.5 block text-[11px] not-italic opacity-75">— {quote.author}</cite>
            </blockquote>
          </div>
        </div>
      </section>

      <QuickAdd date={date} />

      {/* --------------------------------------------------------- quá hạn */}
      {isToday && overdue.length > 0 && (
        <Section
          tone="danger"
          icon={AlertTriangle}
          title={`Quá hạn (${overdue.length})`}
          subtitle="Xử lý dứt điểm trước khi nhận việc mới"
          action={
            <Button variant="outline" size="sm" onClick={pushOverdueToToday}>
              Dời tất cả sang hôm nay
            </Button>
          }
        >
          <AnimatePresence initial={false}>
            <div className="space-y-2">
              {overdue.slice(0, 5).map((t) => (
                <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} showDate />
              ))}
            </div>
          </AnimatePresence>
        </Section>
      )}

      {/* --------------------------------------------------- 3 việc lớn */}
      {top3.length > 0 && (
        <Section
          tone="accent"
          icon={Trophy}
          title="3 việc quan trọng nhất"
          subtitle="Xong 3 việc này là ngày hôm nay đã thắng"
        >
          <ol className="space-y-2">
            {top3.map((t, i) => {
              const cd = countdown(t.deadline);
              return (
                <li
                  key={t.id}
                  className="border-border bg-card flex items-center gap-3 rounded-xl border p-3"
                >
                  <span className="bg-brand-gradient grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold">{t.title}</strong>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[11px]">
                      <span>{formatDuration(t.estimateMin)}</span>
                      {t.startTime && <span>· bắt đầu {t.startTime}</span>}
                      {cd.label && (
                        <span className={cn('inline-flex items-center gap-1', cd.level === 'late' && 'text-destructive')}>
                          · <Flag className="size-2.5" /> {cd.label}
                        </span>
                      )}
                    </span>
                  </div>
                  <Button size="sm" className="shrink-0 gap-1.5" onClick={() => onFocus(t)}>
                    <Play className="size-3.5" /> Làm ngay
                  </Button>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      {/* ------------------------------------------------- danh sách việc */}
      <Section
        icon={ListChecks}
        title="Danh sách nhiệm vụ"
        subtitle={`${stats.total} việc · ${stats.done} đã xong`}
      >
        {list.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Chưa có nhiệm vụ nào cho ngày này"
            hint="Dùng ô thêm nhanh phía trên để lên kế hoạch ngay. Ba việc là đủ cho một ngày tốt."
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {doing.length > 0 && (
                <div key="doing">
                  <GroupLabel>Đang làm</GroupLabel>
                  <div className="space-y-2">
                    {doing.map((t) => (
                      <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} />
                    ))}
                  </div>
                </div>
              )}
              {todo.length > 0 && (
                <div key="todo">
                  <GroupLabel>Cần làm</GroupLabel>
                  <div className="space-y-2">
                    {todo.map((t) => (
                      <TaskCard key={t.id} task={t} onEdit={onEdit} onFocus={onFocus} />
                    ))}
                  </div>
                </div>
              )}
              {done.length > 0 && (
                <div key="done">
                  <GroupLabel>Đã hoàn thành ({done.length})</GroupLabel>
                  <div className="space-y-2">
                    {done.map((t) => (
                      <TaskCard key={t.id} task={t} onEdit={onEdit} />
                    ))}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Section>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-muted-foreground mb-2 text-[11px] font-bold tracking-wider uppercase">{children}</h4>
  );
}
