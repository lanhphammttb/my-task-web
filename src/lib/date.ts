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

/*
 * `dateKey` và `parseKey` viết tay thay vì đi qua `format`/`parseISO` của
 * date-fns: hai hàm ấy dựng bộ phân tích chuỗi định dạng và chạy regex mỗi lần
 * gọi, mà nhật khoá, chuỗi ngày, thống kê gọi chúng hàng trăm nghìn lần trên
 * một hồ sơ vài nghìn việc - đủ làm điện thoại khựng nhiều giây khi mở Bế Quan.
 * Kết quả giữ y hệt: cùng chuỗi `yyyy-MM-dd` theo giờ máy, ngày hỏng vẫn ném
 * `RangeError` như `format`, chuỗi lạ vẫn lùi về `parseISO`.
 */
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const dateKey = (d: Date) => {
  if (Number.isNaN(d.getTime())) throw new RangeError('Invalid time value');
  return `${String(d.getFullYear()).padStart(4, '0')}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
export const todayKey = () => dateKey(new Date());
/** Calendar day in the user's timezone, not the UTC prefix of an ISO timestamp. */
export const completedDay = (task: { completedAt?: string; completedOn?: string; date: string }) =>
  task.completedOn ?? (task.completedAt ? dateKey(new Date(task.completedAt)) : task.date);

/**
 * Việc có xong trước hạn không - so hai THỜI ĐIỂM, không so hai chuỗi.
 *
 * Hạn chót mới lưu dạng ISO UTC có `Z`, hạn cũ thì là chuỗi `datetime-local`
 * không múi giờ (`2026-09-20T17:00`). So chuỗi `completedAt <= deadline` giữa
 * hai dạng ấy là so từng ký tự: `...T10:00:00.000Z` với `...T17:00` ra kết quả
 * theo bảng chữ chứ không theo đồng hồ, lệch tới cả ngày ở múi giờ xa UTC.
 * Đổi cả hai ra mốc thời gian rồi mới so; chuỗi hỏng thì coi như không kịp.
 */
export const xongTruocHan = (task: { completedAt?: string; deadline?: string }): boolean => {
  if (!task.deadline || !task.completedAt) return false;
  const xong = Date.parse(task.completedAt);
  const han = Date.parse(task.deadline);
  return !Number.isNaN(xong) && !Number.isNaN(han) && xong <= han;
};

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseKey = (key: string) => {
  const m = KEY.exec(key);
  if (!m) return parseISO(`${key}T00:00:00`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const out = new Date(y, mo - 1, d);
  if (y < 100) out.setFullYear(y);
  // `new Date` tự tràn 2026-02-30 thành 02/03; `parseISO` thì trả ngày hỏng.
  return out.getMonth() === mo - 1 && out.getDate() === d ? out : new Date(NaN);
};

/** Số ngày của tháng `month` (0..11). */
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Ngày neo của việc lặp hằng tháng: trường `recurDay` nếu có, không thì ngày của `date`. */
export function monthlyAnchor(task: { date: string; recurDay?: number }): number {
  const d = task.recurDay;
  if (typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 31) return d;
  return parseKey(task.date).getDate();
}

/**
 * Ngày của lần lặp kế tiếp: lần đầu tiên theo luật lặp mà nằm SAU CẢ `date`
 * lẫn `today`.
 *
 * Trước đây tính từ `date` của lần vừa xong. Một việc hằng ngày đặt từ hai
 * tháng trước thì tick xong sinh ra việc của hôm sau ngày ấy - vẫn là quá khứ,
 * tick tiếp được - nên ngồi một chỗ tick liền 61 lần: 61 lần tu vi, 61 "ngày
 * viên mãn" cho một thói quen. Lần kế phải là lần CHƯA tới.
 *
 * Hằng tháng thì neo theo `anchorDay` và kẹp vào ngày cuối tháng: 31/01 →
 * 28/02 → 31/03. `setMonth(+1)` trần trụi từng đẩy 31/01 thành 03/03, bỏ luôn
 * tháng hai.
 */
export function nextOccurrence(
  date: string,
  recurrence: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly',
  today: string = date,
  anchorDay?: number,
): string | null {
  const base = parseKey(date);
  if (Number.isNaN(base.getTime())) return null;
  // Mốc "đã qua": lần kế phải nằm sau mốc này.
  const floorKey = today > date ? today : date;
  const floor = parseKey(floorKey);
  if (Number.isNaN(floor.getTime())) return null;
  switch (recurrence) {
    case 'daily':
      return dateKey(addDays(floor, 1));
    case 'weekdays': {
      let d = addDays(floor, 1);
      while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
      return dateKey(d);
    }
    case 'weekly': {
      // Giữ đúng thứ trong tuần của lần đầu: nhảy từng tuần một từ `date`.
      const gap = differenceInCalendarDays(floor, base);
      return dateKey(addDays(base, (Math.floor(gap / 7) + 1) * 7));
    }
    case 'monthly': {
      const anchor = anchorDay ?? base.getDate();
      let y = base.getFullYear();
      let m = base.getMonth();
      // Tối đa vài trăm vòng dù việc đặt từ chục năm trước - rẻ, và khỏi phải
      // tự tính phép chia tháng dễ sai.
      for (let i = 0; i < 12 * 200; i++) {
        m += 1;
        if (m > 11) { m = 0; y += 1; }
        const key = dateKey(new Date(y, m, Math.min(anchor, daysInMonth(y, m))));
        if (key > floorKey) return key;
      }
      return null;
    }
    default:
      return null;
  }
}

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
