import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export const ISO = 'yyyy-MM-dd';

export const todayKey = () => format(new Date(), ISO);
export const dateKey = (d: Date) => format(d, ISO);
export const parseKey = (key: string) => parseISO(`${key}T00:00:00`);

const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export const weekdayShort = (d: Date) => WEEKDAYS_SHORT[d.getDay()];
export const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** "Thứ Ba, 07/09/2026" */
export function longDate(d: Date) {
  const names = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${names[d.getDay()]}, ${format(d, 'dd/MM/yyyy')}`;
}

/** Nhãn tương đối: Hôm nay / Hôm qua / Mai / dd/MM */
export function relativeDay(key: string) {
  const diff = differenceInCalendarDays(parseKey(key), new Date());
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Ngày mai';
  if (diff === -1) return 'Hôm qua';
  if (diff > 1 && diff <= 6) return `${diff} ngày nữa`;
  if (diff < -1 && diff >= -6) return `${Math.abs(diff)} ngày trước`;
  return format(parseKey(key), 'dd/MM/yyyy');
}

/** Danh sách 7 ngày của tuần chứa `d`. */
export function weekDays(d: Date, weekStartsOn: 0 | 1) {
  const start = startOfWeek(d, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Lưới tháng: luôn trả về các tuần đầy đủ để vẽ calendar. */
export function monthGrid(d: Date, weekStartsOn: 0 | 1) {
  const start = startOfWeek(startOfMonth(d), { weekStartsOn });
  const end = endOfWeek(endOfMonth(d), { weekStartsOn });
  const days: Date[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) days.push(cur);
  return days;
}

/** Đếm ngược tới deadline, trả về nhãn + mức độ nguy cấp. */
export function countdown(deadline?: string): { label: string; level: 'none' | 'safe' | 'soon' | 'urgent' | 'late' } {
  if (!deadline) return { label: '', level: 'none' };
  const mins = differenceInMinutes(parseISO(deadline), new Date());
  if (mins < 0) {
    const late = Math.abs(mins);
    if (late < 60) return { label: `Trễ ${late} phút`, level: 'late' };
    if (late < 60 * 24) return { label: `Trễ ${Math.floor(late / 60)} giờ`, level: 'late' };
    return { label: `Trễ ${Math.floor(late / 1440)} ngày`, level: 'late' };
  }
  if (mins < 60) return { label: `Còn ${mins} phút`, level: 'urgent' };
  if (mins < 60 * 24) return { label: `Còn ${Math.floor(mins / 60)} giờ`, level: 'soon' };
  const days = Math.floor(mins / 1440);
  return { label: `Còn ${days} ngày`, level: days <= 3 ? 'soon' : 'safe' };
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return '0p';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function clockLabel(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export { addDays, isSameDay, differenceInCalendarDays, startOfMonth, endOfMonth, format };
