/**
 * Đan dược độ kiếp. Muốn vượt từ cảnh giới này sang cảnh giới kế thì phải nuốt
 * một viên; phẩm càng cao thì cơ hội càng lớn. Đây là chỗ linh thạch có ý
 * nghĩa nhất, và cũng là chỗ tu tiên khác hẳn một thanh tiến độ tuyến tính:
 * có thể thất bại.
 */
export type PillGrade = 'ha' | 'trung' | 'thuong';

export interface Pill {
  grade: PillGrade;
  name: string;
  /** Tên ngắn để hiện trên thẻ, tránh lặp lại chữ "Độ Kiếp Đan". */
  short: string;
  /** Cơ hội độ kiếp thành công, 0..1 */
  chance: number;
  /** Giá bằng linh thạch */
  cost: number;
  image: string;
  note: string;
}

export const PILLS: Record<PillGrade, Pill> = {
  ha: {
    grade: 'ha',
    name: 'Độ Kiếp Đan (Hạ)',
    short: 'Hạ phẩm',
    chance: 0.1,
    cost: 40,
    image: '/art/pill/ha.png',
    note: 'Đan phẩm thấp, luyện vội. Mười lần thử được một lần thành.',
  },
  trung: {
    grade: 'trung',
    name: 'Độ Kiếp Đan (Trung)',
    short: 'Trung phẩm',
    chance: 0.25,
    cost: 120,
    image: '/art/pill/trung.png',
    note: 'Đan phẩm khá, dược lực ổn định. Bốn lần được một.',
  },
  thuong: {
    grade: 'thuong',
    name: 'Độ Kiếp Đan (Thượng)',
    short: 'Thượng phẩm',
    chance: 0.5,
    cost: 300,
    image: '/art/pill/thuong.png',
    note: 'Đan phẩm thượng hạng, khí tức tinh thuần. Một nửa cơ hội.',
  },
};

export const PILL_ORDER: PillGrade[] = ['ha', 'trung', 'thuong'];

/**
 * Mỗi lần thất bại cộng thêm 10% cơ hội cho lần sau (tối đa +40%). Người bền
 * chí không bị RNG chặn đường mãi - đúng tinh thần "thất bại là mẹ đột phá".
 */
export const FAIL_BONUS_PER_STREAK = 0.1;
export const MAX_FAIL_BONUS = 0.4;

export function tribulationChance(grade: PillGrade, failStreak: number): number {
  const bonus = Math.min(MAX_FAIL_BONUS, failStreak * FAIL_BONUS_PER_STREAK);
  return Math.min(0.95, PILLS[grade].chance + bonus);
}

/** Thất bại thì hao tổn một nửa tu vi đã tích trong cảnh giới hiện tại. */
export const FAIL_LOSS_RATIO = 0.5;
