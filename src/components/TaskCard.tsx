import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Copy,
  CornerDownRight,
  Crosshair,
  Flag,
  ListChecks,
  Pause,
  Pencil,
  Play,
  Target,
  Timer,
  Trash2,
} from "lucide-react";
import type { Task } from "../types";
import {
  addDays,
  countdown,
  dateKey,
  formatDuration,
  parseKey,
  relativeDay,
} from "../lib/date";
import { isOverdue } from "../lib/stats";
import { PRIORITY_UI, RECURRENCE_ICON, RECURRENCE_UI } from "../lib/ui";
import { burstAt, soundComplete } from "../lib/celebrate";
import { useApp } from "../store/AppStore";
import { MetaChip } from "./primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onFocus?: (task: Task) => void;
  showDate?: boolean;
}

const DEADLINE_CLASS: Record<string, string> = {
  none: "",
  safe: "",
  soon: "border-warning/40 bg-warning/12 text-warning",
  urgent: "border-transparent bg-destructive text-white",
  late: "border-transparent bg-destructive text-white",
};

export default function TaskCard({ task, onEdit, onFocus, showDate }: Props) {
  const {
    toggleDone,
    setStatus,
    removeTask,
    duplicateTask,
    moveTask,
    toggleSubtask,
    data,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [xpBurst, setXpBurst] = useState(0);
  const checkRef = useRef<HTMLButtonElement>(null);

  const goal = data.goals.find((g) => g.id === task.goalId);
  const p = PRIORITY_UI[task.priority];
  const cd = countdown(task.deadline);
  const late = isOverdue(task);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const done = task.status === "done";

  /**
   * Tick xong: confetti tại đúng ô tick + chip "+XP" bay lên + tiếng ting.
   * Chỉ ăn mừng khi store thật sự chấp nhận - nếu bị chặn (ví dụ nhiệm vụ của
   * ngày mai) thì không hiệu ứng, không âm thanh.
   */
  const handleToggle = () => {
    const wasDone = done;
    const applied = toggleDone(task.id);
    if (!applied || wasDone) return;

    burstAt(checkRef.current);
    soundComplete();
    const gain = 10 * { urgent: 4, high: 3, medium: 2, low: 1 }[task.priority];
    setXpBurst(gain);
    window.setTimeout(() => setXpBurst(0), 1150);
  };

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex gap-3 overflow-hidden rounded-xl border pr-3 pl-0 transition-colors",
        "border-border bg-card/85 hover:border-gold/40 hover:bg-surface/70",
        done && "opacity-60",
        late && "border-destructive/35 bg-destructive/[0.05]",
      )}
    >
      {/* Vạch màu mức ưu tiên */}
      <span
        aria-hidden
        className={cn("w-[3px] shrink-0 self-stretch", p.dot)}
      />

      <div className="flex min-w-0 flex-1 gap-3 py-3">
        <div className="relative shrink-0">
          <button
            ref={checkRef}
            onClick={handleToggle}
            aria-label={done ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu hoàn thành"}
            className={cn(
              "o-tick mt-0.5 grid size-[22px] place-items-center rounded-full border-2 transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              done
                ? "border-success bg-success text-white animate-check-pop"
                : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10",
            )}
          >
            <Check
              className={cn(
                "size-3.5 transition-opacity",
                done ? "opacity-100" : "opacity-0",
              )}
              strokeWidth={3.5}
            />
          </button>

          {/* Chip điểm bay lên - phần thưởng tức thì cho hành động vừa rồi */}
          {xpBurst > 0 && (
            <span className="text-success animate-xp-float pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 text-xs font-bold whitespace-nowrap">
              +{xpBurst} tu vi
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "min-w-0 flex-1 text-left text-sm leading-snug font-semibold transition-colors",
                "hover:text-primary focus-visible:ring-ring rounded focus-visible:ring-2 focus-visible:outline-none",
                done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </button>
            {task.status === "doing" && (
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                Đang làm
              </span>
            )}
            <ChevronDown
              className={cn(
                "text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <MetaChip icon={p.icon} className={p.soft}>
              {p.label}
            </MetaChip>
            {showDate && (
              <MetaChip icon={CalendarDays}>{relativeDay(task.date)}</MetaChip>
            )}
            {task.startTime && (
              <MetaChip icon={Clock}>{task.startTime}</MetaChip>
            )}
            {task.estimateMin > 0 && (
              <MetaChip icon={Timer}>
                {formatDuration(task.estimateMin)}
              </MetaChip>
            )}
            {task.focusMin > 0 && (
              <MetaChip
                icon={Crosshair}
                className="border-success/35 bg-success/12 text-success"
              >
                {formatDuration(task.focusMin)}
              </MetaChip>
            )}
            {cd.label && (
              <MetaChip icon={Flag} className={DEADLINE_CLASS[cd.level]}>
                {cd.label}
              </MetaChip>
            )}
            {goal && (
              <MetaChip
                icon={Target}
                style={{
                  color: goal.color,
                  borderColor: `${goal.color}59`,
                  backgroundColor: `${goal.color}1f`,
                }}
              >
                {goal.title}
              </MetaChip>
            )}
            {task.subtasks.length > 0 && (
              <MetaChip
                icon={ListChecks}
                className={
                  subDone === task.subtasks.length ? "text-success" : undefined
                }
              >
                {subDone}/{task.subtasks.length}
              </MetaChip>
            )}
            {task.recurrence !== "none" && (
              <MetaChip icon={RECURRENCE_ICON}>
                {RECURRENCE_UI[task.recurrence]}
              </MetaChip>
            )}
            {task.tags.map((tag) => (
              <MetaChip
                key={tag}
                className="border-primary/30 bg-primary/12 text-primary"
              >
                #{tag}
              </MetaChip>
            ))}
          </div>

          {onFocus && !done && <button className="btn-game mt-3 px-3 py-1.5 text-[11px]" aria-label={`Bế quan: ${task.title}`} onClick={() => onFocus(task)}><Crosshair className="size-3.5" /> Bế quan làm việc này</button>}

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="border-border/70 mt-3 space-y-3 border-t border-dashed pt-3">
                  {task.note && (
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                      {task.note}
                    </p>
                  )}

                  {task.subtasks.length > 0 && (
                    <ul className="space-y-1">
                      {task.subtasks.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => toggleSubtask(task.id, s.id)}
                            className="hover:text-foreground flex w-full items-center gap-2 rounded text-left text-xs"
                          >
                            <span
                              className={cn(
                                "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                s.done
                                  ? "border-success bg-success text-white"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {s.done && (
                                <Check className="size-2.5" strokeWidth={4} />
                              )}
                            </span>
                            <span
                              className={cn(
                                s.done && "text-muted-foreground line-through",
                              )}
                            >
                              {s.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {!done && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 px-2.5 text-xs"
                        onClick={() =>
                          setStatus(
                            task.id,
                            task.status === "doing" ? "todo" : "doing",
                          )
                        }
                      >
                        {task.status === "doing" ? (
                          <Pause className="size-3.5" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        {task.status === "doing" ? "Tạm dừng" : "Bắt đầu"}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => onEdit(task)}
                    >
                      <Pencil className="size-3.5" /> Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() =>
                        moveTask(
                          task.id,
                          dateKey(addDays(parseKey(task.date), 1)),
                        )
                      }
                    >
                      <CornerDownRight className="size-3.5" /> Dời sang mai
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => duplicateTask(task.id)}
                    >
                      <Copy className="size-3.5" /> Nhân bản
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:border-destructive/50 h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => removeTask(task.id)}
                    >
                      <Trash2 className="size-3.5" /> Xoá
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
