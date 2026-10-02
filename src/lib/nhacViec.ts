import type { Task } from '../types';
import { addDays, dateKey, parseKey } from './date';

/**
 * Nhắc việc bằng thông báo của chính máy - không có máy chủ đẩy.
 *
 * Vì không có push, lời nhắc chỉ bắn được khi app còn sống (đang mở, hoặc vừa
 * chuyển sang nền mà hệ điều hành chưa đóng băng). Bù lại hai chỗ:
 *
 *  - mở app lại thì báo NGAY những lời nhắc vừa lỡ trong 10 phút gần nhất -
 *    lỡ lâu hơn thì thôi, nhắc "họp lúc 9 giờ" vào 3 giờ chiều chỉ gây nhiễu;
 *  - mỗi lời nhắc chỉ báo đúng một lần: đánh dấu vào localStorage, nên hẹn giờ
 *    và lượt quét lúc mở app không bao giờ báo trùng nhau.
 *
 * Cài đặt để ở khoá riêng `my-task/nhac-viec`, không nằm trong `settings` của
 * hồ sơ: đây là chuyện của từng máy (máy này cho phép thông báo, máy kia
 * không), không phải thứ cần đồng bộ lên máy chủ.
 */

export const KHOA_NHAC = 'my-task/nhac-viec';
export const KHOA_DA_BAO = 'my-task/nhac-viec/da-bao';
/** Sự kiện phát ra khi cài đặt nhắc việc đổi, để bộ hẹn giờ lên lịch lại. */
export const SU_KIEN_NHAC = 'my-task:nhac-viec';

export const MOC_TRUOC_HAN = [5, 15, 30, 60] as const;
export type MocTruocHan = (typeof MOC_TRUOC_HAN)[number];

export interface CaiDatNhac {
  bat: boolean;
  /** Nhắc trước hạn chót bao nhiêu phút. */
  truocHan: MocTruocHan;
}

export const MAC_DINH_NHAC: CaiDatNhac = { bat: false, truocHan: 15 };

/** Lời nhắc lỡ trong khoảng này thì mở app vẫn báo bù. */
export const BAO_BU_TOI_DA_MS = 10 * 60_000;

export type LoaiNhac = 'bat-dau' | 'han-chot';

export interface LoiNhac {
  /** Khoá chống trùng: đổi giờ của việc thì ra lời nhắc mới. */
  id: string;
  taskId: string;
  loai: LoaiNhac;
  /** Mốc báo, ms. */
  luc: number;
  tieuDe: string;
  noiDung: string;
}

function docJson<T>(khoa: string): T | undefined {
  try {
    const raw = localStorage.getItem(khoa);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function ghiJson(khoa: string, v: unknown) {
  try {
    localStorage.setItem(khoa, JSON.stringify(v));
  } catch {
    /* Hết chỗ hay bị chặn: nhắc việc là phần phụ, không làm hỏng app. */
  }
}

export function docCaiDatNhac(): CaiDatNhac {
  const v = docJson<Partial<CaiDatNhac>>(KHOA_NHAC);
  if (!v || typeof v !== 'object') return { ...MAC_DINH_NHAC };
  const truocHan = (MOC_TRUOC_HAN as readonly number[]).includes(v.truocHan as number)
    ? (v.truocHan as MocTruocHan)
    : MAC_DINH_NHAC.truocHan;
  return { bat: v.bat === true, truocHan };
}

export function ghiCaiDatNhac(c: CaiDatNhac) {
  ghiJson(KHOA_NHAC, c);
  try {
    window.dispatchEvent(new CustomEvent(SU_KIEN_NHAC));
  } catch {
    /* môi trường không có window */
  }
}

/** Giờ "HH:mm" của ngày `key` thành mốc ms theo giờ máy. */
function lucTrongNgay(key: string, hhmm: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return undefined;
  const d = parseKey(key);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.getTime();
}

function gioPhut(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Mọi lời nhắc của hôm nay và ngày mai, xếp theo giờ.
 *
 * Chỉ tính việc CHƯA XONG. Hai loại:
 *  - đúng giờ bắt đầu (`startTime`) của việc lên lịch hôm nay/mai;
 *  - trước hạn chót `truocHan` phút, nếu mốc ấy rơi vào hôm nay/mai (hạn chót
 *    không buộc cùng ngày với ngày làm việc).
 *
 * Hàm thuần, không đọc đồng hồ hay localStorage - để kiểm thử được.
 */
export function tinhLoiNhac(tasks: Task[], now: Date, truocHan: number): LoiNhac[] {
  const hom = dateKey(now);
  const mai = dateKey(addDays(now, 1));
  const dau = parseKey(hom).getTime();
  const cuoi = parseKey(dateKey(addDays(now, 2))).getTime();
  const ra: LoiNhac[] = [];

  for (const t of tasks) {
    if (t.status === 'done') continue;
    if (t.startTime && (t.date === hom || t.date === mai)) {
      const luc = lucTrongNgay(t.date, t.startTime);
      if (luc !== undefined) {
        ra.push({
          id: `${t.id}:bat-dau:${luc}`,
          taskId: t.id,
          loai: 'bat-dau',
          luc,
          tieuDe: `Tới giờ: ${t.title}`,
          noiDung: `Việc này hẹn bắt đầu lúc ${t.startTime}.`,
        });
      }
    }
    if (t.deadline) {
      const han = new Date(t.deadline).getTime();
      if (!Number.isFinite(han)) continue;
      const luc = han - truocHan * 60_000;
      if (luc >= dau && luc < cuoi) {
        ra.push({
          id: `${t.id}:han-chot:${luc}`,
          taskId: t.id,
          loai: 'han-chot',
          luc,
          tieuDe: `Sắp tới hạn: ${t.title}`,
          noiDung: `Còn ${truocHan} phút nữa là tới hạn chót (${gioPhut(han)}).`,
        });
      }
    }
  }
  return ra.sort((a, b) => a.luc - b.luc);
}

/** Lời nhắc còn ở phía trước - cần hẹn giờ. */
export const nhacSapToi = (ds: LoiNhac[], now: number) => ds.filter((n) => n.luc > now);

/** Lời nhắc vừa lỡ (trong 10 phút) mà chưa báo - báo bù một lần. */
export const nhacBiLo = (ds: LoiNhac[], now: number, daBao: Record<string, number>) =>
  ds.filter((n) => n.luc <= now && now - n.luc <= BAO_BU_TOI_DA_MS && !(n.id in daBao));

export function docDaBao(): Record<string, number> {
  const v = docJson<Record<string, number>>(KHOA_DA_BAO);
  return v && typeof v === 'object' ? v : {};
}

/** Đánh dấu đã báo, đồng thời bỏ dấu cũ hơn 3 ngày cho khoá không phình. */
export function danhDauDaBao(id: string, now: number) {
  const cu = docDaBao();
  const moi: Record<string, number> = {};
  for (const [k, v] of Object.entries(cu)) if (now - v < 3 * 86_400_000) moi[k] = v;
  moi[id] = now;
  ghiJson(KHOA_DA_BAO, moi);
}

export const hoTroThongBao = () => typeof window !== 'undefined' && 'Notification' in window;

/** Máy iPhone/iPad - để giải thích chuyện phải cài app lên màn hình chính. */
export function laIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Đường dẫn mở app ngay tại việc ấy (service worker dùng khi bấm thông báo). */
export const duongDanViec = (taskId: string) => `/?viec=${encodeURIComponent(taskId)}`;

/** Sự kiện trong trang: xin mở đúng việc vừa được nhắc. */
export const SU_KIEN_MO_VIEC = 'my-task:mo-viec';

/**
 * Hiện một thông báo.
 *
 * Ưu tiên qua service worker (`registration.showNotification`): trên Android
 * và iOS bản cài lên màn hình chính, `new Notification` hoặc không có hoặc ném
 * lỗi. `tag` theo từng việc: báo lần hai cho cùng một việc thì thay chỗ cái cũ
 * chứ không chất thêm một dòng.
 */
export async function hienThongBao(n: LoiNhac): Promise<boolean> {
  if (!hoTroThongBao() || Notification.permission !== 'granted') return false;
  const opts: NotificationOptions = {
    body: n.noiDung,
    tag: `viec-${n.taskId}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { taskId: n.taskId, url: duongDanViec(n.taskId) },
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg?.active) {
      await reg.showNotification(n.tieuDe, opts);
      return true;
    }
  } catch {
    /* rơi xuống cách dưới */
  }
  try {
    const tb = new Notification(n.tieuDe, opts);
    tb.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent(SU_KIEN_MO_VIEC, { detail: { taskId: n.taskId } }));
      tb.close();
    };
    return true;
  } catch {
    return false;
  }
}
