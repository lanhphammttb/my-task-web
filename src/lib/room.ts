import type { AppData } from '../types';
import { caveAt } from './cave';
import { unlockedIds } from './achievements';
import { currentStreak, dayStats } from './stats';
import { progressOf, verifiedFocusMinutes } from './economy';
import { cultivationOf } from './cultivation';
import { todayKey } from './date';

/**
 * Động phủ dựng bằng NHIỀU LỚP, không phải một tấm tranh.
 *
 * Trước đây nâng động phủ chỉ đổi một ảnh vuông 512px nằm trong ô nhỏ của bảng
 * nâng cấp. Tiêu 1400 linh thạch mà thứ nhìn thấy chỉ là một hình khác - không
 * có cảm giác căn nhà của mình lớn lên.
 *
 * Ở đây nền phòng và đồ đạc tách rời: nền lo chuyện phòng rộng bao nhiêu, còn
 * mỗi món đồ là một lớp riêng chỉ hiện khi người chơi thật sự sắm được nó. Nhờ
 * vậy mở khoá bất cứ thứ gì cũng THẤY NGAY trong phòng, chứ không phải đọc một
 * con số vừa tăng.
 *
 * Nhịp thay đổi được chia làm ba tầng, để ngày nào mở ra cũng có cái khác:
 *
 *  - mỗi NGÀY: đèn lồng thắp dần theo số việc làm xong;
 *  - mỗi TUẦN/THÁNG: sắm thêm được một món đồ;
 *  - vài THÁNG: cả căn phòng đổi sang bậc mới.
 *
 * Thiếu file ảnh thì món đó không hiện, phòng vẫn chạy - xem `public/art/prop/
 * README.md`. Nhờ vậy vẽ được tới đâu thả vào tới đó.
 */

export interface Prop {
  /** Tên file trong `public/art/prop/`, không gồm đuôi */
  file: string;
  ten: string;
  /** Tâm món đồ, tính theo % bề ngang phòng */
  x: number;
  /** Chân món đồ chạm sàn ở đây, tính theo % chiều cao phòng */
  day: number;
  /** Bề ngang món đồ, theo % bề ngang phòng */
  w: number;
  /** Bấm vào thì nhảy tới mục nào trong Động Phủ */
  anchor?: string;
  /** Có món này chưa */
  co: (d: AppData) => boolean;
  /** Câu hiện khi chưa có - nói thẳng phải làm gì để sắm được */
  dieuKien: string;
  /**
   * Thứ tự gợi ý "sắp có", nhỏ là gần tầm với. Bỏ trống thì không bao giờ gợi ý.
   *
   * Cần trường riêng chứ không xét theo thứ tự trong mảng, vì mảng xếp theo thứ
   * tự VẼ (xa trước, gần sau) - chẳng liên quan gì tới dễ hay khó. Và ba bậc lò
   * đan phải để trống: chúng là ba dáng của CÙNG một cái lò, không phải ba món
   * sắm thêm. Không loại ra thì đứng ở bậc 5 với ngọc lô trong phòng mà app vẫn
   * giục "sắp có: Đồng lô - nâng động phủ lên bậc 3", tức là chỉ ngược về sau
   * lưng người chơi.
   */
  goiY?: number;
}

/**
 * Thứ tự trong mảng là thứ tự VẼ: đứng trước thì nằm sau lưng. Món nào đặt sâu
 * trong phòng (`day` nhỏ) phải xếp lên đầu, nếu không nó sẽ đè lên món đứng gần.
 */
export const PROPS: Prop[] = [
  {
    file: 'tranh-treo',
    ten: 'Tranh sơn thuỷ',
    x: 50, day: 40, w: 16,
    co: (d) => d.caveLevel >= 4,
    dieuKien: 'Nâng động phủ lên bậc 4',
    goiY: 11,
  },
  {
    file: 'chuong-dong',
    ten: 'Chuông đồng',
    x: 84, day: 34, w: 9,
    co: (d) => currentStreak(d.tasks) >= 30,
    dieuKien: 'Giữ chuỗi 30 ngày liền',
    goiY: 9,
  },
  {
    file: 'binh-phong',
    ten: 'Bình phong',
    x: 16, day: 68, w: 20,
    co: (d) => d.caveLevel >= 5,
    dieuKien: 'Nâng động phủ lên bậc 5',
    goiY: 12,
  },
  {
    file: 'bia-thanh-tuu',
    ten: 'Bia thành tựu',
    x: 6, day: 70, w: 11,
    anchor: 'cave-home',
    co: (d) => unlockedIds(d).size >= 5,
    dieuKien: 'Đạt 5 thành tựu',
    goiY: 5,
  },
  {
    file: 'gia-sach',
    ten: 'Giá ngọc giản',
    x: 88, day: 72, w: 17,
    anchor: 'cave-technique',
    co: (d) => !!d.technique,
    dieuKien: 'Chọn một công pháp',
    goiY: 1,
  },
  {
    file: 'thu-an',
    ten: 'Án thư',
    x: 13, day: 74, w: 19,
    anchor: 'cave-home',
    co: (d) => d.goals.filter((g) => !g.archived).length >= 3,
    dieuKien: 'Lập 3 đại nguyện',
    goiY: 2,
  },
  {
    file: 'ngoc-sang',
    ten: 'Ngọc sàng',
    x: 31, day: 74, w: 23,
    anchor: 'cave-home',
    co: (d) => d.caveLevel >= 4,
    dieuKien: 'Nâng động phủ lên bậc 4',
    goiY: 10,
  },
  {
    file: 'gia-kiem',
    ten: 'Giá kiếm',
    x: 63, day: 72, w: 11,
    co: (d) => cultivationOf(progressOf(d).xp).realmIndex >= 2,
    dieuKien: 'Tu tới Kim Đan',
    goiY: 8,
  },
  {
    file: 'dinh-tram',
    ten: 'Đỉnh trầm',
    x: 44, day: 74, w: 9,
    anchor: 'cave-home',
    co: (d) => verifiedFocusMinutes(d) >= 600,
    dieuKien: 'Nhập định đủ 10 giờ',
    goiY: 6,
  },
  {
    file: 'lo-dan-3',
    ten: 'Ngọc lô',
    x: 75, day: 78, w: 22,
    anchor: 'cave-pill',
    co: (d) => d.caveLevel >= 5,
    dieuKien: 'Nâng động phủ lên bậc 5',
  },
  {
    file: 'lo-dan-2',
    ten: 'Đồng lô',
    x: 75, day: 78, w: 21,
    anchor: 'cave-pill',
    co: (d) => d.caveLevel >= 3 && d.caveLevel < 5,
    dieuKien: 'Nâng động phủ lên bậc 3',
  },
  {
    file: 'lo-dan-1',
    ten: 'Lò đất',
    x: 75, day: 78, w: 18,
    anchor: 'cave-pill',
    co: (d) => d.caveLevel < 3,
    dieuKien: '',
  },
  {
    file: 'bo-doan',
    ten: 'Bồ đoàn',
    x: 50, day: 80, w: 14,
    co: () => true,
    dieuKien: '',
  },
  {
    file: 'linh-tuyen',
    ten: 'Linh tuyền',
    x: 19, day: 84, w: 24,
    co: (d) => d.caveLevel >= 3,
    dieuKien: 'Nâng động phủ lên bậc 3',
    goiY: 7,
  },
  {
    file: 'chau-linh-thao',
    ten: 'Chậu linh thảo',
    x: 6, day: 86, w: 10,
    anchor: 'cave-field',
    co: (d) => Object.values(d.herbs).reduce((a, b) => a + b, 0) >= 10,
    dieuKien: 'Hái 10 linh thảo',
    goiY: 4,
  },
  {
    file: 'hom-chua',
    ten: 'Hòm chứa đồ',
    x: 93, day: 87, w: 13,
    co: (d) => d.chestsOpened.length >= 5,
    dieuKien: 'Mở 5 hòm kỳ ngộ',
    goiY: 3,
  },
];

/** Nhiều nhất ngần này đèn lồng treo trong phòng. */
export const SO_DEN = 5;

/** Vị trí treo từng chiếc đèn, theo % bề ngang. */
export const CHO_TREO = [11, 30, 50, 70, 89];

/**
 * Bao nhiêu đèn đang sáng hôm nay.
 *
 * Đây là thứ DUY NHẤT trong phòng đổi hằng ngày, nên nó gánh việc làm cho căn
 * phòng sống: xong một việc là về nhà thấy thêm một ngọn đèn cháy. Làm hết việc
 * thì cả phòng sáng trưng.
 */
export function denSang(d: AppData): number {
  const s = dayStats(d.tasks, d.sessions, todayKey());
  if (s.total === 0) return 0;
  // Theo TỶ LỆ chứ không theo số việc: người ghi 3 việc và người ghi 20 việc
  // đều phải làm xong hết mới sáng đủ đèn.
  return Math.min(SO_DEN, Math.round((s.done / s.total) * SO_DEN));
}

/** Nền phòng của bậc đang ở. */
export function nenPhong(caveLevel: number): string {
  const slug = caveAt(caveLevel).art.replace('/art/cave/', '').replace('.png', '');
  return `/art/room/${slug}.webp`;
}

/** Ảnh lùi khi chưa có nền phòng riêng: dùng lại tranh vuông của bậc đó. */
export const nenPhongLui = (caveLevel: number) => caveAt(caveLevel).art;

/** Những món đã sắm được, theo đúng thứ tự vẽ. */
export const dungTrongPhong = (d: AppData) => PROPS.filter((p) => p.co(d));

/** Món sắp sắm được tiếp theo - dùng để nhắc người chơi có gì đáng cày. */
export function monTiepTheo(d: AppData): Prop | null {
  const chua = PROPS.filter((p) => p.goiY !== undefined && !p.co(d));
  return chua.sort((a, b) => a.goiY! - b.goiY!)[0] ?? null;
}

/**
 * Đạo nhân đứng đâu trong phòng và đang làm gì.
 *
 * Bảy tư thế mà chỉ dùng mỗi `idle` thì phí, mà quan trọng hơn: căn phòng có
 * người NGỒI THIỀN khác hẳn căn phòng có người đứng không. Tư thế chọn theo
 * việc đang làm thật, không phải đổi ngẫu nhiên cho vui mắt.
 *
 * Thứ tự xét là thứ tự ưu tiên: việc đang làm ngay > mục đang xem > trạng thái
 * trong ngày.
 */
export interface TheDaoNhan {
  file: string;
  mo: string;
  x: number;
  day: number;
  w: number;
}

export function theDaoNhan(d: AppData, tab?: string): TheDaoNhan {
  const s = dayStats(d.tasks, d.sessions, todayKey());
  const gio = new Date().getHours();
  const dem = gio >= 21 || gio < 5;
  const xongHet = s.total > 0 && s.done === s.total;

  // Ngồi ngay trên bồ đoàn, nên phải trùng chỗ với nó.
  if (tab === 'cave-refine') return { file: 'ngoi-thien', mo: 'Đang tẩy tuỷ', x: 50, day: 81, w: 13 };
  if (tab === 'cave-pill') return { file: 'luyen-dan', mo: 'Đang luyện đan', x: 63, day: 80, w: 13 };
  if (tab === 'cave-technique') return { file: 'doc-sach', mo: 'Đang đọc ngọc giản', x: 79, day: 76, w: 12 };

  // Đêm mà xong hết việc thì đi ngủ - nằm trên ngọc sàng nếu đã sắm được.
  if (dem && (xongHet || s.total === 0)) {
    const co = d.caveLevel >= 4;
    return co
      ? { file: 'ngu', mo: 'Đang ngủ trên ngọc sàng', x: 31, day: 71, w: 15 }
      : { file: 'ngu', mo: 'Đang ngủ', x: 38, day: 86, w: 14 };
  }
  if (xongHet) return { file: 'mung', mo: 'Xong hết việc hôm nay', x: 38, day: 86, w: 13 };

  return { file: 'idle', mo: 'Đạo nhân', x: 38, day: 86, w: 12 };
}
