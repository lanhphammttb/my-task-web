import {
  Award, BadgeCheck, Bomb, CalendarCheck, Crown, Flame, Gem, Hourglass, Medal, Rocket,
  ShieldCheck, Sparkles, Sunrise, Target, Timer, Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppData, FocusSession, Task } from '../types';
import { bestStreak } from './stats';
import { dateKey, parseKey } from './date';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  target: number;
  /** Màu huy hiệu, dùng token của theme để hợp cả sáng lẫn tối. */
  tone: 'brand' | 'success' | 'warning' | 'danger';
  measure: (data: Pick<AppData, 'tasks' | 'sessions' | 'goals'>) => number;
}

const doneTasks = (tasks: Task[]) => tasks.filter((t) => t.status === 'done');
const focusMinutes = (sessions: FocusSession[]) => sessions.reduce((sum, s) => sum + s.minutes, 0);

/** Số ngày mà mọi nhiệm vụ của ngày đó đều đã hoàn thành (và có ít nhất 1 việc). */
export function perfectDays(tasks: Task[]): string[] {
  const byDay = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const cur = byDay.get(t.date) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (t.status === 'done') cur.done += 1;
    byDay.set(t.date, cur);
  }
  return [...byDay.entries()].filter(([, v]) => v.total > 0 && v.total === v.done).map(([k]) => k);
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    title: 'Nhập Đạo',
    description: 'Hoàn thành nhiệm vụ đầu tiên',
    icon: Rocket,
    target: 1,
    tone: 'brand',
    measure: ({ tasks }) => doneTasks(tasks).length,
  },
  {
    id: 'ten-tasks',
    title: 'Sơ Khai Linh Trí',
    description: 'Hoàn thành 10 nhiệm vụ',
    icon: BadgeCheck,
    target: 10,
    tone: 'brand',
    measure: ({ tasks }) => doneTasks(tasks).length,
  },
  {
    id: 'fifty-tasks',
    title: 'Đạo Tâm Kiên Định',
    description: 'Hoàn thành 50 nhiệm vụ',
    icon: Medal,
    target: 50,
    tone: 'brand',
    measure: ({ tasks }) => doneTasks(tasks).length,
  },
  {
    id: 'hundred-tasks',
    title: 'Bách Chiến Bách Thắng',
    description: 'Hoàn thành 100 nhiệm vụ',
    icon: Trophy,
    target: 100,
    tone: 'warning',
    measure: ({ tasks }) => doneTasks(tasks).length,
  },
  {
    id: 'streak-3',
    title: 'Tam Nhật Bất Đoạn',
    description: 'Giữ chuỗi 3 ngày liên tiếp',
    icon: Flame,
    target: 3,
    tone: 'danger',
    measure: ({ tasks }) => bestStreak(tasks),
  },
  {
    id: 'streak-7',
    title: 'Thất Nhật Vô Gián',
    description: 'Giữ chuỗi 7 ngày liên tiếp',
    icon: CalendarCheck,
    target: 7,
    tone: 'danger',
    measure: ({ tasks }) => bestStreak(tasks),
  },
  {
    id: 'streak-30',
    title: 'Đạo Tâm Như Thép',
    description: 'Giữ chuỗi 30 ngày liên tiếp',
    icon: Crown,
    target: 30,
    tone: 'warning',
    measure: ({ tasks }) => bestStreak(tasks),
  },
  {
    id: 'focus-60',
    title: 'Nhất Khắc Nhập Định',
    description: 'Nhập định tổng 60 phút',
    icon: Timer,
    target: 60,
    tone: 'success',
    measure: ({ sessions }) => focusMinutes(sessions),
  },
  {
    id: 'focus-600',
    title: 'Thập Thời Bế Quan',
    description: 'Nhập định tổng 600 phút',
    icon: Hourglass,
    target: 600,
    tone: 'success',
    measure: ({ sessions }) => focusMinutes(sessions),
  },
  {
    id: 'focus-3000',
    title: 'Toạ Vong Chi Cảnh',
    description: 'Nhập định tổng 50 giờ',
    icon: Gem,
    target: 3000,
    tone: 'success',
    measure: ({ sessions }) => focusMinutes(sessions),
  },
  {
    id: 'deadline-hunter',
    title: 'Thần Tốc Trảm Kiếp',
    description: 'Xong 10 nhiệm vụ trước hạn chót',
    icon: ShieldCheck,
    target: 10,
    tone: 'brand',
    measure: ({ tasks }) =>
      doneTasks(tasks).filter((t) => t.deadline && t.completedAt && t.completedAt <= t.deadline).length,
  },
  {
    id: 'bomb-squad',
    title: 'Trảm Tâm Ma',
    description: 'Xong 10 nhiệm vụ mức Khẩn cấp',
    icon: Bomb,
    target: 10,
    tone: 'danger',
    measure: ({ tasks }) => doneTasks(tasks).filter((t) => t.priority === 'urgent').length,
  },
  {
    id: 'perfect-day',
    title: 'Nhật Khoá Viên Mãn',
    description: 'Dọn sạch danh sách trong một ngày',
    icon: Sparkles,
    target: 1,
    tone: 'brand',
    measure: ({ tasks }) => perfectDays(tasks).length,
  },
  {
    id: 'perfect-week',
    title: 'Thất Nhật Viên Mãn',
    description: 'Có 7 ngày dọn sạch danh sách',
    icon: Award,
    target: 7,
    tone: 'warning',
    measure: ({ tasks }) => perfectDays(tasks).length,
  },
  {
    id: 'goal-crusher',
    title: 'Đại Nguyện Thành',
    description: 'Hoàn thành 100% một mục tiêu',
    icon: Target,
    target: 1,
    tone: 'brand',
    measure: ({ tasks, goals }) =>
      goals.filter((g) => {
        const list = tasks.filter((t) => t.goalId === g.id);
        return list.length > 0 && list.every((t) => t.status === 'done');
      }).length,
  },
  {
    id: 'early-bird',
    title: 'Kê Minh Tức Khởi',
    description: 'Xong 5 nhiệm vụ trước 9 giờ sáng',
    icon: Sunrise,
    target: 5,
    tone: 'warning',
    measure: ({ tasks }) =>
      doneTasks(tasks).filter((t) => t.completedAt && new Date(t.completedAt).getHours() < 9).length,
  },
];

export interface AchievementState extends Achievement {
  current: number;
  unlocked: boolean;
  ratio: number;
}

export function achievementStates(data: Pick<AppData, 'tasks' | 'sessions' | 'goals'>): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const current = a.measure(data);
    return {
      ...a,
      current: Math.min(current, a.target),
      unlocked: current >= a.target,
      ratio: a.target === 0 ? 0 : Math.min(1, current / a.target),
    };
  });
}

export function unlockedIds(data: Pick<AppData, 'tasks' | 'sessions' | 'goals'>): Set<string> {
  return new Set(achievementStates(data).filter((a) => a.unlocked).map((a) => a.id));
}

/** Ngày hôm nay đã "trọn vẹn" chưa - dùng để bật hiệu ứng mưa confetti. */
export function isPerfectDay(tasks: Task[], key: string) {
  const list = tasks.filter((t) => t.date === key);
  return list.length > 0 && list.every((t) => t.status === 'done');
}

export { dateKey, parseKey };
