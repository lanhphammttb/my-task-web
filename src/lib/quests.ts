import type { AppData, Task } from '../types';
import { dateKey, parseKey, completedDay, xongTruocHan } from './date';

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

// So mốc thời gian chứ không so chuỗi - xem `xongTruocHan`.
const beatDeadline = (t: Task) => xongTruocHan(t);

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
    completed: data.tasks.filter((t) => t.status === 'done' && (completedDay(t)) === key),
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
  return statesOf(dayRecord(data, key));
}

function statesOf(record: DayRecord): QuestState[] {
  const key = record.key;
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

/**
 * Sổ ghi của MỌI ngày có hoạt động, dựng trong một lượt duyệt.
 *
 * Chỉ những ngày này mới xét nhật khoá. Gọi `dayRecord` cho từng ngày thì mỗi
 * ngày lại lọc cả danh sách việc: 120 ngày x vài nghìn việc là cả trăm nghìn
 * lượt `completedDay` - hàm này chạy mỗi lần tính linh thạch, tức mỗi lần vẽ.
 * Kết quả y hệt `dayRecord` (cùng thứ tự việc trong từng ngày).
 */
function activeRecords(data: AppData): DayRecord[] {
  const records = new Map<string, DayRecord>();
  const at = (key: string) => {
    let r = records.get(key);
    if (!r) records.set(key, (r = { key, completed: [], scheduled: [], focusMin: 0 }));
    return r;
  };
  const done: [string, Task][] = [];
  for (const t of data.tasks) {
    at(t.date).scheduled.push(t);
    const day = t.completedAt || t.status === 'done' ? completedDay(t) : undefined;
    // Mốc hoàn thành chỉ làm một ngày "có hoạt động" khi việc có `completedAt`,
    // đúng như cách đếm cũ.
    if (t.completedAt) at(day!);
    if (t.status === 'done') done.push([day!, t]);
  }
  for (const s of data.sessions) at(s.date).focusMin += s.minutes;
  // Việc xong chỉ được tính vào ngày đã có hoạt động - ngày khác không xét nhật khoá.
  for (const [day, t] of done) records.get(day)?.completed.push(t);
  return [...records.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** Tổng linh thạch kiếm được từ nhật khoá tông môn, tính lại từ lịch sử. */
export function questStones(data: AppData): number {
  let total = 0;
  for (const record of activeRecords(data)) {
    for (const q of statesOf(record)) {
      if (q.done) total += q.reward;
    }
  }
  return total;
}

export { dateKey, parseKey };
