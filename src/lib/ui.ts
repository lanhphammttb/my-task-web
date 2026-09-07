import {
  AlarmClockCheck, ArrowDown, ChevronsUp, Circle, Flame, Minus, Repeat, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Priority, Recurrence, Status } from '../types';

/** Gộp một chỗ mọi thứ liên quan tới hiển thị mức ưu tiên. */
export const PRIORITY_UI: Record<
  Priority,
  { label: string; icon: LucideIcon; text: string; dot: string; soft: string; cssVar: string }
> = {
  urgent: {
    label: 'Khẩn cấp',
    icon: Zap,
    text: 'text-p-urgent',
    dot: 'bg-p-urgent',
    soft: 'border-p-urgent/35 bg-p-urgent/12 text-p-urgent',
    cssVar: 'var(--p-urgent)',
  },
  high: {
    label: 'Cao',
    icon: ChevronsUp,
    text: 'text-p-high',
    dot: 'bg-p-high',
    soft: 'border-p-high/35 bg-p-high/12 text-p-high',
    cssVar: 'var(--p-high)',
  },
  medium: {
    label: 'Trung bình',
    icon: Minus,
    text: 'text-p-medium',
    dot: 'bg-p-medium',
    soft: 'border-p-medium/35 bg-p-medium/12 text-p-medium',
    cssVar: 'var(--p-medium)',
  },
  low: {
    label: 'Thấp',
    icon: ArrowDown,
    text: 'text-p-low',
    dot: 'bg-p-low',
    soft: 'border-p-low/35 bg-p-low/12 text-p-low',
    cssVar: 'var(--p-low)',
  },
};

export const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];

export const STATUS_UI: Record<Status, { label: string; icon: LucideIcon }> = {
  todo: { label: 'Chưa làm', icon: Circle },
  doing: { label: 'Đang làm', icon: Flame },
  done: { label: 'Hoàn thành', icon: AlarmClockCheck },
};

export const RECURRENCE_UI: Record<Recurrence, string> = {
  none: 'Không lặp',
  daily: 'Hằng ngày',
  weekdays: 'Thứ 2 - Thứ 6',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
};

export const RECURRENCE_ICON = Repeat;

/** Màu nhãn đếm ngược theo mức nguy cấp của hạn chót. */
export const DEADLINE_UI: Record<string, string> = {
  safe: 'border-border bg-muted/60 text-muted-foreground',
  soon: 'border-warning/40 bg-warning/12 text-warning',
  urgent: 'border-transparent bg-destructive text-white',
  late: 'border-transparent bg-destructive text-white',
};

export const TONE_UI: Record<'brand' | 'success' | 'warning' | 'danger', { ring: string; bg: string; text: string }> = {
  brand: { ring: 'ring-primary/40', bg: 'bg-primary/12', text: 'text-primary' },
  success: { ring: 'ring-success/40', bg: 'bg-success/12', text: 'text-success' },
  warning: { ring: 'ring-warning/40', bg: 'bg-warning/12', text: 'text-warning' },
  danger: { ring: 'ring-destructive/40', bg: 'bg-destructive/12', text: 'text-destructive' },
};
