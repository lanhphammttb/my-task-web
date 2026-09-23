import { ArrowRight, Check, Play, Plus, Timer } from 'lucide-react';
import { useApp } from '../../store/AppStore';
import { useFocusTimer } from '../../store/FocusTimer';
import { sortTasks } from '../../lib/stats';
import { clockLabel, formatDuration, todayKey, completedDay } from '../../lib/date';
import { taskValue } from '../../lib/integrity';
import type { Task } from '../../types';

export default function NextPractice({ onFocus, onResume, onNew, onReview }: {
  onFocus: (task: Task) => void; onResume: () => void; onNew: () => void; onReview: () => void;
}) {
  const { data, toggleDone } = useApp();
  const timer = useFocusTimer();
  const task = sortTasks(data.tasks.filter(t => t.status !== 'done' && t.date <= todayKey()))[0];
  const dayComplete = !task && data.tasks.some(t => t.status === "done" && completedDay(t) === todayKey());
  const inSession = timer.running || timer.seconds < timer.totalSeconds;
  const focused = data.tasks.find(t => t.id === timer.taskId);
  const goal = task && data.goals.find(g => g.id === task.goalId);
  return <section aria-label="Việc tu luyện tiếp theo" className="practice-card pointer-events-auto w-full max-w-3xl rounded-xl border border-gold/35 p-3 text-left sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 flex-1 basis-48">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-gold-bright uppercase"><Timer className="size-3" />{inSession ? (timer.running ? 'Đang bế quan' : 'Phiên đang tạm dừng') : 'Tu luyện từ việc thật'}</p>
        <h2 className="font-title text-sm font-semibold leading-snug sm:text-base">{inSession ? focused?.title ?? 'Một khoảng tập trung cho bản thân' : task?.title ?? (dayComplete ? 'Đã làm xong phần việc hôm nay' : 'Hôm nay, bạn muốn tiến bộ điều gì?')}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{inSession ? `${clockLabel(timer.seconds)} còn lại · ${timer.mode === 'work' ? 'Nhập định' : 'Điều tức'}` : task ? `${goal ? `${goal.title} · ` : ''}${formatDuration(task.estimateMin)} dự kiến · +${taskValue(task)} tu vi gốc khi hoàn thành` : dayComplete ? 'Thành quả đã được ghi nhận. Nghỉ ngơi cũng là một phần của tu luyện.' : 'Một việc nhỏ cho sức khoẻ, học tập hoặc công việc là đủ để bắt đầu.'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="btn-game px-3 py-2 text-[11px]" onClick={inSession ? onResume : task ? () => onFocus(task) : dayComplete ? onReview : onNew}>
          {inSession ? <ArrowRight className="size-3.5" /> : task ? <Play className="size-3.5" /> : <Plus className="size-3.5" />}
          {inSession ? 'Về phiên bế quan' : task ? 'Tập trung việc này' : dayComplete ? 'Xem thành quả' : 'Thêm việc của tôi'}
        </button>
        {!inSession && task && <button className="rounded-lg border border-gold/30 p-2 text-gold-bright hover:bg-gold/10" aria-label={`Hoàn thành ${task.title}`} title="Chỉ đánh dấu khi bạn đã làm xong" onClick={() => toggleDone(task.id)}><Check className="size-4" /></button>}
      </div>
    </div>
  </section>;
}
