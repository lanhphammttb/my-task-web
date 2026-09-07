/** Kiểu dữ liệu dùng chung cho toàn bộ ứng dụng. */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'todo' | 'doing' | 'done';
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type ViewKey = 'today' | 'week' | 'month' | 'goals' | 'focus' | 'awards' | 'stats';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  note: string;
  /** Ngày thực hiện, dạng YYYY-MM-DD */
  date: string;
  /** Giờ bắt đầu dự kiến, dạng HH:mm */
  startTime?: string;
  /** Hạn chót (deadline) dạng ISO, dùng để đếm ngược và cảnh báo trễ */
  deadline?: string;
  priority: Priority;
  status: Status;
  tags: string[];
  goalId?: string;
  /** Thời lượng dự kiến (phút) */
  estimateMin: number;
  /** Tổng số phút đã tập trung làm việc này */
  focusMin: number;
  subtasks: Subtask[];
  recurrence: Recurrence;
  createdAt: string;
  completedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  color: string;
  /** Ngày muốn hoàn thành mục tiêu, dạng YYYY-MM-DD */
  targetDate?: string;
  archived: boolean;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  date: string;
  minutes: number;
  startedAt: string;
}

export interface Settings {
  theme: 'dark' | 'light';
  /** Bật tiếng phản hồi khi hoàn thành nhiệm vụ, lên cấp, mở huy hiệu */
  soundEnabled: boolean;
  /** Số nhiệm vụ mục tiêu mỗi ngày - dùng để tính vòng tiến độ */
  dailyTarget: number;
  /** Số phút tập trung mục tiêu mỗi ngày */
  dailyFocusTarget: number;
  focusLength: number;
  breakLength: number;
  /** 1 = Thứ Hai, 0 = Chủ Nhật */
  weekStartsOn: 0 | 1;
}

export interface AppData {
  version: number;
  tasks: Task[];
  goals: Goal[];
  sessions: FocusSession[];
  settings: Settings;
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; weight: number }> = {
  urgent: { label: 'Khẩn cấp', color: '#f43f5e', weight: 4 },
  high: { label: 'Cao', color: '#fb923c', weight: 3 },
  medium: { label: 'Trung bình', color: '#38bdf8', weight: 2 },
  low: { label: 'Thấp', color: '#94a3b8', weight: 1 },
};

export const STATUS_META: Record<Status, { label: string }> = {
  todo: { label: 'Chưa làm' },
  doing: { label: 'Đang làm' },
  done: { label: 'Hoàn thành' },
};

export const RECURRENCE_META: Record<Recurrence, { label: string }> = {
  none: { label: 'Không lặp' },
  daily: { label: 'Hằng ngày' },
  weekdays: { label: 'Thứ 2 - Thứ 6' },
  weekly: { label: 'Hằng tuần' },
  monthly: { label: 'Hằng tháng' },
};

export const GOAL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
