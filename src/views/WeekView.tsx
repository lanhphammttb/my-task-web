import { useMemo, useState } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Circle, CircleCheck, GripVertical, Plus } from 'lucide-react';
import type { Task } from '../types';
import {
  addDays, dateKey, formatDuration, monthLabel, parseKey, todayKey, weekDays, weekdayShort,
} from '../lib/date';
import { isOverdue, sortTasks } from '../lib/stats';
import { PRIORITY_UI } from '../lib/ui';
import { useApp } from '../store/AppStore';
import { Meter } from '../components/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  anchor: string;
  onAnchorChange: (d: string) => void;
  onEdit: (t: Task) => void;
  onOpenDay: (d: string) => void;
}

export default function WeekView({ anchor, onAnchorChange, onEdit, onOpenDay }: Props) {
  const { data, moveTask, toggleDone, addTask } = useApp();
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [composing, setComposing] = useState<string | null>(null);
  const [text, setText] = useState('');

  const days = useMemo(
    () => weekDays(parseKey(anchor), data.settings.weekStartsOn),
    [anchor, data.settings.weekStartsOn],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const d of days) map.set(dateKey(d), []);
    for (const t of data.tasks) map.get(t.date)?.push(t);
    for (const [k, v] of map) map.set(k, sortTasks(v));
    return map;
  }, [data.tasks, days]);

  const all = days.flatMap((d) => byDay.get(dateKey(d)) ?? []);
  const weekDone = all.filter((t) => t.status === 'done').length;

  const commit = (key: string) => {
    if (text.trim()) addTask({ title: text.trim(), date: key });
    setText('');
    setComposing(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Tuần trước"
          onClick={() => onAnchorChange(dateKey(addDays(parseKey(anchor), -7)))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight">
            {dateKey(days[0]).slice(8)}/{dateKey(days[0]).slice(5, 7)} – {dateKey(days[6]).slice(8)}/
            {dateKey(days[6]).slice(5, 7)}
          </h2>
          <p className="text-muted-foreground text-xs">
            {monthLabel(parseKey(anchor))} · hoàn thành {weekDone}/{all.length}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onAnchorChange(todayKey())}>
          <CalendarCheck2 className="size-3.5" /> Tuần này
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Tuần sau"
          onClick={() => onAnchorChange(dateKey(addDays(parseKey(anchor), 7)))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <p className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
        <GripVertical className="size-3.5" /> Kéo thả thẻ để dời nhiệm vụ sang ngày khác · nhấp đúp để sửa
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const key = dateKey(d);
          const list = byDay.get(key) ?? [];
          const done = list.filter((t) => t.status === 'done').length;
          const load = list.filter((t) => t.status !== 'done').reduce((s, t) => s + t.estimateMin, 0);
          const isTd = key === todayKey();

          return (
            <section
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverDay(key);
              }}
              onDragLeave={() => setHoverDay((h) => (h === key ? null : h))}
              onDrop={() => {
                if (dragId) moveTask(dragId, key);
                setDragId(null);
                setHoverDay(null);
              }}
              className={cn(
                'flex flex-col rounded-xl border p-2.5 transition-colors lg:min-h-[340px]',
                isTd ? 'border-primary bg-primary/[0.06]' : 'border-border bg-card',
                hoverDay === key && 'border-primary bg-primary/12 ring-primary/25 ring-2',
              )}
            >
              <button onClick={() => onOpenDay(key)} className="mb-2 flex w-full items-start justify-between text-left">
                <div>
                  <span className="text-muted-foreground block text-[10.5px] font-semibold tracking-wide uppercase">
                    {weekdayShort(d)}
                  </span>
                  <strong className={cn('tabular text-xl leading-none', isTd && 'text-primary')}>{d.getDate()}</strong>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground tabular block text-xs">
                    {done}/{list.length}
                  </span>
                  {load > 0 && (
                    <span className="text-muted-foreground/80 tabular block text-[10px]">{formatDuration(load)}</span>
                  )}
                </div>
              </button>

              <Meter value={list.length ? done / list.length : 0} height={3} barClassName="bg-success" className="mb-2.5" />

              <div className="flex flex-1 flex-col gap-1.5">
                {list.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onDoubleClick={() => onEdit(t)}
                    title={`${t.title} — nhấp đúp để sửa`}
                    className={cn(
                      'group flex cursor-grab items-start gap-1.5 rounded-lg border border-l-[3px] px-2 py-1.5 text-xs leading-snug transition-colors active:cursor-grabbing',
                      'border-border bg-surface/70 hover:bg-surface',
                      t.status === 'done' && 'text-muted-foreground line-through opacity-60',
                      isOverdue(t) && 'border-destructive/40 bg-destructive/[0.07]',
                    )}
                    style={{ borderLeftColor: PRIORITY_UI[t.priority].cssVar }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDone(t.id);
                      }}
                      aria-label="Đánh dấu hoàn thành"
                      className="hover:text-success mt-px shrink-0"
                    >
                      {t.status === 'done' ? (
                        <CircleCheck className="text-success size-3.5" />
                      ) : (
                        <Circle className="text-muted-foreground size-3.5" />
                      )}
                    </button>
                    <span className="min-w-0 break-words">
                      {t.startTime && <span className="text-muted-foreground tabular mr-1">{t.startTime}</span>}
                      {t.title}
                    </span>
                  </div>
                ))}

                {composing === key ? (
                  <Input
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => commit(key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit(key);
                      if (e.key === 'Escape') {
                        setText('');
                        setComposing(null);
                      }
                    }}
                    placeholder="Tên nhiệm vụ..."
                    className="h-8 text-xs"
                  />
                ) : (
                  <button
                    onClick={() => setComposing(key)}
                    className="text-muted-foreground border-border hover:border-primary hover:text-primary mt-0.5 flex items-center justify-center gap-1 rounded-lg border border-dashed py-1.5 text-[11px] transition-colors"
                  >
                    <Plus className="size-3" /> Thêm
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
