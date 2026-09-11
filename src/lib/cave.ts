/**
 * Động phủ - chỗ ở, và là chỗ tiêu linh thạch dài hạn duy nhất.
 *
 * Trước khi có bậc động phủ, linh thạch chỉ có đường ra là gacha: triệu hồi,
 * cho ăn, roll linh căn. Toàn thứ tiêu xong là hết, không đọng lại gì. Nâng
 * động phủ thì ngược lại - mỗi bậc mở thêm ô linh điền và tăng tay nghề luyện
 * đan, nghĩa là tiền tiêu hôm nay còn sinh lợi mãi về sau.
 */
export interface CaveLevel {
  level: number;
  name: string;
  /** Linh thạch phải trả để lên bậc này. Bậc đầu là nơi ai cũng bắt đầu. */
  cost: number;
  /** Số ô linh điền mở ra */
  plots: number;
  /** Cộng thẳng vào tỷ lệ luyện đan thành công, 0..1 */
  refineBonus: number;
  note: string;
}

export const CAVE_LEVELS: CaveLevel[] = [
  {
    level: 1,
    name: 'Hang Đá Thô',
    cost: 0,
    plots: 2,
    refineBonus: 0,
    note: 'Một hốc đá tránh mưa gió, kê được cái lò con và vỡ được hai vạt đất.',
  },
  {
    level: 2,
    name: 'Động Phủ Sơ Khai',
    cost: 120,
    plots: 3,
    refineBonus: 0.05,
    note: 'Đục rộng thêm, dựng cửa đá. Linh khí bắt đầu tụ lại chứ không tản hết.',
  },
  {
    level: 3,
    name: 'Linh Động',
    cost: 320,
    plots: 4,
    refineBonus: 0.1,
    note: 'Khoét trúng một mạch linh khí nhỏ. Lò đan cháy đều hơn hẳn.',
  },
  {
    level: 4,
    name: 'Động Thiên',
    cost: 700,
    plots: 5,
    refineBonus: 0.16,
    note: 'Trong động tự thành khí hậu riêng. Linh thảo trồng đâu cũng tốt.',
  },
  {
    level: 5,
    name: 'Phúc Địa',
    cost: 1400,
    plots: 6,
    refineBonus: 0.24,
    note: 'Đất phúc hiếm có, mây lành che đỉnh. Chỗ này đủ để dưỡng tới ngày phi thăng.',
  },
];

export const MAX_CAVE_LEVEL = CAVE_LEVELS.length;

export function caveAt(level: number): CaveLevel {
  const i = Math.max(1, Math.min(MAX_CAVE_LEVEL, Math.floor(level))) - 1;
  return CAVE_LEVELS[i];
}

/** Bậc kế tiếp, hoặc `null` nếu đã tới Phúc Địa. */
export function nextCave(level: number): CaveLevel | null {
  return level >= MAX_CAVE_LEVEL ? null : CAVE_LEVELS[Math.max(0, Math.floor(level))];
}

/** Số ô linh điền đang mở. */
export const fieldSlots = (level: number) => caveAt(level).plots;

/** Tay nghề luyện đan mà động phủ cộng thêm. */
export const caveRefineBonus = (level: number) => caveAt(level).refineBonus;
