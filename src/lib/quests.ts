import type { AppData, Task } from '../types';
import { dateKey, parseKey } from './date';

/**
 * Nhật khoá tông môn: mỗi ngày ba nhiệm vụ phụ, thưởng linh thạch.
 *
 * Bộ ba của một ngày suy ra từ chính ngày đó nên không cần lưu thêm gì; phần
 * thưởng cũng tính lại được từ lịch sử, không có nút "nhận thưởng" để bấm bừa.
 */
export type QuestId =
  | 'slay3'
  | 'slay5'
  | 'urgent1'
  | 'high2'
  | 'focus25'
  | 'focus50'
  | 'deadline2'
  | 'perfect';

export interface QuestDef {
  id: QuestId;
  label: string;
  target: number;
  reward: number;
  /** Số đã đạt trong ngày */
  measure: (day: DayRecord) => number;
}

export interface DayRecord {
  key: string;
  /** Nhiệm vụ được đánh dấu xong trong ngày này */
  completed: Task[];
  /** Nhiệm vụ thuộc về ngày này (dù xong hay chưa) */
  scheduled: Task[];
  focusMin: number;
}

const beatDeadline = (t: Task) => !!t.deadline && !!t.completedAt && t.completedAt <= t.deadline;

export const QUESTS: QuestDef[] = [
  { id: 'slay3', label: 'Trảm 3 nhiệm vụ', target: 3, reward: 6, measure: (d) => d.completed.length },
  { id: 'slay5', label: 'Trảm 5 nhiệm vụ', target: 5, reward: 9, measure: (d) => d.completed.length },
  {
    id: 'urgent1',
    label: 'Trảm 1 việc Khẩn cấp',
    target: 1,
    reward: 5,
    measure: (d) => d.completed.filter((t) => t.priority === 'urgent').length,
  },
  {
    id: 'high2',
    label: 'Trảm 2 việc từ mức Cao trở lên',
    target: 2,
    reward: 6,
    measure: (d) => d.completed.filter((t) => t.priority === 'high' || t.priority === 'urgent').length,
  },
  { id: 'focus25', label: 'Bế quan 25 phút', target: 25, reward: 5, measure: (d) => d.focusMin },
  { id: 'focus50', label: 'Bế quan 50 phút', target: 50, reward: 8, measure: (d) => d.focusMin },
  {
    id: 'deadline2',
    label: 'Xong 2 việc trước hạn chót',
    target: 2,
    reward: 7,
    measure: (d) => d.completed.filter(beatDeadline).length,
  },
  {
    id: 'perfect',
    label: 'Nhật khoá viên mãn',
    target: 1,
    reward: 10,
    measure: (d) =>
      d.scheduled.length > 0 && d.scheduled.every((t) => t.status === 'done') ? 1 : 0,
  },
];

/** Băm chuỗi ngày thành số để chọn bộ nhiệm vụ ổn định cho ngày đó. */
function hashDay(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Ba nhiệm vụ tông môn của một ngày. */
export function questsFor(key: string): QuestDef[] {
  const pool = [...QUESTS];
  const picked: QuestDef[] = [];
  let h = hashDay(key);
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = h % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
    h = Math.floor(h / 7) + 31;
  }
  return picked;
}

export function dayRecord(data: AppData, key: string): DayRecord {
  return {
    key,
    completed: data.tasks.filter((t) => t.status === 'done' && (t.completedAt?.slice(0, 10) ?? t.date) === key),
    scheduled: data.tasks.filter((t) => t.date === key),
    focusMin: data.sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.minutes, 0),
  };
}

export interface QuestState extends QuestDef {
  current: number;
  done: boolean;
  ratio: number;
}

export function questStates(data: AppData, key: string): QuestState[] {
  const record = dayRecord(data, key);
  return questsFor(key).map((q) => {
    const current = q.measure(record);
    return {
      ...q,
      current: Math.min(current, q.target),
      done: current >= q.target,
      ratio: q.target === 0 ? 0 : Math.min(1, current / q.target),
    };
  });
}

/** Những ngày có hoạt động - chỉ các ngày này mới xét nhật khoá. */
function activeDays(data: AppData): string[] {
  const set = new Set<string>();
  for (const t of data.tasks) {
    set.add(t.date);
    if (t.completedAt) set.add(t.completedAt.slice(0, 10));
  }
  for (const s of data.sessions) set.add(s.date);
  return [...set].sort();
}

/** Tổng linh thạch kiếm được từ nhật khoá tông môn, tính lại từ lịch sử. */
export function questStones(data: AppData): number {
  let total = 0;
  for (const key of activeDays(data)) {
    for (const q of questStates(data, key)) {
      if (q.done) total += q.reward;
    }
  }
  return total;
}

export { dateKey, parseKey };
