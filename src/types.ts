/** Kiểu dữ liệu dùng chung cho toàn bộ ứng dụng. */

import type { OwnedBeast } from './lib/beasts';
import type { Expedition } from './lib/expedition';
import type { FieldPlot, HerbId } from './lib/field';
import type { LedgerEntry } from './lib/integrity';
import type { PillGrade } from './lib/pills';
import type { ActiveMission } from './lib/sect';
import type { SpiritRoot } from './lib/spirit';
import type { TechniqueId } from './lib/techniques';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'todo' | 'doing' | 'done';
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type ViewKey = 'today' | 'week' | 'month' | 'goals' | 'focus' | 'cave' | 'awards' | 'stats';

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
  /** Đạo hiệu người tu - hiển thị trên thẻ cảnh giới */
  daoName: string;
  /** Bật tiếng phản hồi khi hoàn thành nhiệm vụ, lên cấp, mở huy hiệu */
  soundEnabled: boolean;
  /** Bật nhạc nền và video khi đang bế quan */
  ambientEnabled: boolean;
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
  /** Linh căn - khai quang một lần khi nhập môn */
  root?: SpiritRoot;
  /** Linh thú đã thu phục */
  beasts: OwnedBeast[];
  /** Linh thú đang mang theo, thiên phú của nó mới có tác dụng */
  activeBeastId?: string;
  /** Công pháp đang tu - đổi tỷ giá giữa công sức và tu vi, chưa chọn thì để trống */
  technique?: TechniqueId;
  /** Số lần đã đổi công pháp. Lần chọn đầu miễn phí, mỗi lần đổi sau một đắt hơn */
  techniqueSwaps: number;
  /** Bậc động phủ - quyết định số ô linh điền và tay nghề luyện đan */
  caveLevel: number;
  /** Linh điền: các ô đang có cây. Ô trống thì không nằm trong mảng này */
  field: FieldPlot[];
  /** Linh thảo đã hái, đếm theo loại */
  herbs: Record<HerbId, number>;
  /** Chuyến thám hiểm đang đi. Mỗi lúc chỉ đi được một nơi */
  expedition?: Expedition;
  /** Cống hiến tích luỹ cho tông môn - quyết định bậc đệ tử */
  contribution: number;
  /** Sứ mệnh đang nhận. Mỗi lúc chỉ gánh được một cái */
  mission?: ActiveMission;
  /**
   * Hòm kỳ ngộ đã mở, ghi theo khoá `ngày:mốc`.
   *
   * Chỉ lưu danh sách đã mở, còn hòm nào đang có thì suy ra từ số liệu công
   * việc trong ngày - nhờ vậy không có bộ đếm nào để chỉnh.
   */
  chestsOpened: string[];
  /** Linh thạch đã tiêu (số dư = kiếm được - đã tiêu) */
  stonesSpent: number;
  /** Đan dược đang có, theo phẩm cấp */
  pills: Record<PillGrade, number>;
  /**
   * Tu vi bị tổn thất do độ kiếp thất bại. Tách riêng khỏi tu vi gốc để hồ sơ
   * công việc thật không bao giờ bị sửa - chỉ có phần "hao tổn" cộng dồn ở đây.
   */
  tuViPenalty: number;
  /** Cảnh giới cao nhất đã được phép bước vào; muốn lên nữa phải độ kiếp */
  gateRealm: number;
  /** Số lần độ kiếp thất bại liên tiếp - mỗi lần cộng thêm cơ hội cho lần sau */
  failStreak: number;
  /** Tu vi có được (hoặc mất) từ kỳ ngộ - tách khỏi tu vi do công việc */
  encounterXp: number;
  /** Linh thạch thưởng từ kỳ ngộ */
  stonesBonus: number;
  /** Sổ ghi chuỗi băm cho mọi nguồn tu vi - dùng để phát hiện sửa dữ liệu */
  ledger: LedgerEntry[];
  /** Lần cuối mở app, để phát hiện đồng hồ bị đẩy lùi */
  lastSeenAt: string;
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; weight: number }> = {
  urgent: { label: 'Khẩn cấp', color: '#cf3f2f', weight: 4 },
  high: { label: 'Cao', color: '#e0a83c', weight: 3 },
  medium: { label: 'Trung bình', color: '#5aa9c9', weight: 2 },
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

/**
 * Bảng màu lấy từ màu truyền thống Á Đông: thanh ngọc, kim, chu sa, tùng lục,
 * đại lam, tử đàn, giả thạch, thiên thanh. Hợp tông với giao diện thuỷ mặc.
 */
export const GOAL_COLORS = [
  '#3fa796', // thanh ngọc
  '#d4a24c', // kim
  '#c9482f', // chu sa
  '#4f7a52', // tùng lục
  '#4a6b8a', // đại lam
  '#8a6aa3', // tử đàn
  '#a3603a', // giả thạch
  '#5aa9c9', // thiên thanh
];
