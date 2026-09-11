import type { HerbId } from './field';

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

// ---------------------------------------------------------------- luyện đan

/**
 * Đơn thuốc. Trước đây đan dược chỉ có mỗi nút Mua - "Đan Đường" mang tiếng là
 * đan đường nhưng thực chất là cái quầy hàng. Giờ muốn có đan phải tự trồng
 * linh thảo rồi tự nổi lửa, và **có thể hỏng** - đó mới là luyện đan.
 */
export interface Recipe {
  grade: PillGrade;
  herbs: Partial<Record<HerbId, number>>;
  /** Củi lửa và phụ liệu, tính bằng linh thạch */
  stones: number;
  /** Tỷ lệ thành công gốc, chưa cộng tay nghề */
  base: number;
}

export const RECIPES: Record<PillGrade, Recipe> = {
  ha: { grade: 'ha', herbs: { thanh_diep: 2 }, stones: 8, base: 0.85 },
  trung: { grade: 'trung', herbs: { thanh_diep: 3, huyet_tinh: 2 }, stones: 25, base: 0.62 },
  thuong: {
    grade: 'thuong',
    herbs: { huyet_tinh: 3, kim_tuy: 2, tu_van: 1 },
    stones: 70,
    base: 0.42,
  },
};

/**
 * Chợ chỉ còn bán hạ phẩm, và bán đắt. Giữ lại một đường mua để người mới hoặc
 * người vừa hết sạch linh thảo không bị chặn đứng trước cửa độ kiếp; còn trung
 * và thượng phẩm thì bắt buộc phải tự luyện.
 */
export const MARKET_GRADES: PillGrade[] = ['ha'];

/** Linh căn hệ Hoả giữ lửa giỏi hơn hẳn - cộng thẳng vào tay nghề. */
export const FIRE_ROOT_BONUS = 0.1;

export function refineChance(grade: PillGrade, caveBonus: number, fireRoot: boolean): number {
  const raw = RECIPES[grade].base + caveBonus + (fireRoot ? FIRE_ROOT_BONUS : 0);
  return Math.min(0.95, Math.max(0.05, raw));
}

/**
 * Hỏng lò vẫn còn vớt vát: một nửa số lần sẽ ra được đan phẩm thấp hơn một bậc.
 * Hạ phẩm hỏng thì mất trắng - đằng nào cũng đã là đáy.
 */
export function consolationGrade(grade: PillGrade): PillGrade | null {
  if (grade === 'thuong') return 'trung';
  if (grade === 'trung') return 'ha';
  return null;
}

export const CONSOLATION_CHANCE = 0.5;

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
