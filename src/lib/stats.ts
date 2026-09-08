import type { FocusSession, Task } from '../types';
import { PRIORITY_META } from '../types';
import { addDays, dateKey, parseKey, todayKey } from './date';

export interface DayStats {
  key: string;
  total: number;
  done: number;
  focusMin: number;
  overdue: number;
  rate: number;
}

export const tasksOn = (tasks: Task[], key: string) => tasks.filter((t) => t.date === key);

export const isOverdue = (t: Task) =>
  t.status !== 'done' && (t.deadline ? new Date(t.deadline).getTime() < Date.now() : t.date < todayKey());

export function dayStats(tasks: Task[], sessions: FocusSession[], key: string): DayStats {
  const list = tasksOn(tasks, key);
  const done = list.filter((t) => t.status === 'done').length;
  const focusMin = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.minutes, 0);
  return {
    key,
    total: list.length,
    done,
    focusMin,
    overdue: list.filter(isOverdue).length,
    rate: list.length ? done / list.length : 0,
  };
}

/** Chuỗi ngày liên tiếp gần nhất có ít nhất 1 nhiệm vụ hoàn thành. */
export function currentStreak(tasks: Task[]): number {
  const doneDays = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.completedAt?.slice(0, 10) ?? t.date));
  let streak = 0;
  let cursor = new Date();
  // Hôm nay chưa xong việc thì vẫn tính chuỗi từ hôm qua (chưa hết ngày).
  if (!doneDays.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  while (doneDays.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(tasks: Task[]): number {
  const days = [...new Set(tasks.filter((t) => t.status === 'done').map((t) => t.completedAt?.slice(0, 10) ?? t.date))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && dateKey(addDays(parseKey(prev), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Tu vi tích luỹ: ưu tiên càng cao thưởng càng nhiều, cộng thêm thời gian nhập định. */
export function totalXp(tasks: Task[], sessions: FocusSession[]) {
  const fromTasks = tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + 10 * PRIORITY_META[t.priority].weight, 0);
  const fromFocus = Math.floor(sessions.reduce((s, x) => s + x.minutes, 0) / 5);
  return fromTasks + fromFocus;
}

export function statsRange(tasks: Task[], sessions: FocusSession[], from: Date, days: number): DayStats[] {
  return Array.from({ length: days }, (_, i) => dayStats(tasks, sessions, dateKey(addDays(from, i))));
}

export function groupByGoal(tasks: Task[]) {
  const map = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const k = t.goalId ?? '__none__';
    const cur = map.get(k) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (t.status === 'done') cur.done += 1;
    map.set(k, cur);
  }
  return map;
}

export function allTags(tasks: Task[]) {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b, 'vi'));
}

/** Sắp xếp: đang làm > chưa làm > xong; trong cùng nhóm thì ưu tiên & giờ bắt đầu. */
export function sortTasks(list: Task[]) {
  const statusRank = { doing: 0, todo: 1, done: 2 } as const;
  return [...list].sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status];
    const pa = PRIORITY_META[a.priority].weight;
    const pb = PRIORITY_META[b.priority].weight;
    if (pa !== pb) return pb - pa;
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
