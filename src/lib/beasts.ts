import type { Element } from './spirit';

/**
 * Linh thú: thu phục bằng linh thạch, nuôi lớn để tăng thiên phú. Mỗi con chỉ
 * có đúng một thiên phú dạng phần trăm nên người dùng luôn kiểm chứng được
 * con số, không có hiệu ứng mơ hồ.
 */
export type BeastRarity = 'pham' | 'linh' | 'bao' | 'thanh' | 'thoai';

export interface RarityMeta {
  label: string;
  color: string;
  chance: number;
  /** Số vòng viền quanh huy hiệu - nhìn là biết bậc */
  rings: number;
}

export const RARITIES: Record<BeastRarity, RarityMeta> = {
  pham: { label: 'Phàm phẩm', color: '#9aa3ad', chance: 0.48, rings: 1 },
  linh: { label: 'Linh phẩm', color: '#5aa9c9', chance: 0.3, rings: 1 },
  bao: { label: 'Bảo phẩm', color: '#9b7fd4', chance: 0.15, rings: 2 },
  thanh: { label: 'Thánh phẩm', color: '#f4d03f', chance: 0.06, rings: 2 },
  thoai: { label: 'Thần thoại', color: '#f97362', chance: 0.01, rings: 3 },
};

export const RARITY_ORDER: BeastRarity[] = ['pham', 'linh', 'bao', 'thanh', 'thoai'];

/** Hình con vật khắc trên huy hiệu linh thú. */
export type BeastGlyph =
  | 'dragon'
  | 'crane'
  | 'phoenix'
  | 'tiger'
  | 'turtle'
  | 'firerat'
  | 'deer'
  | 'fox';

export type PerkKind = 'xpPct' | 'focusPct' | 'urgentPct' | 'deadlinePct' | 'stonePct';

export const PERK_LABEL: Record<PerkKind, string> = {
  xpPct: 'tu vi',
  focusPct: 'tu vi từ bế quan',
  urgentPct: 'tu vi từ việc Khẩn cấp',
  deadlinePct: 'tu vi từ việc xong trước hạn',
  stonePct: 'linh thạch nhận được',
};

export interface Beast {
  id: string;
  name: string;
  rarity: BeastRarity;
  element: Element;
  /** Ảnh chân dung trong public/art/beast */
  image: string;
  perk: PerkKind;
  /** Phần trăm cộng thêm cho mỗi cấp linh thú */
  perkPerLevel: number;
  lore: string;
}

export const BEASTS: Beast[] = [
  // ----------------------------------------------------------- phàm phẩm
  { id: 'hoa-thu', name: 'Hoả Thử', rarity: 'pham', element: 'hoa', image: '/art/beast/hoa-thu.png', perk: 'urgentPct', perkPerLevel: 3, lore: 'Chuột lửa nhỏ mà nhanh, chuyên rúc vào chỗ gấp nhất.' },
  { id: 'linh-mieu', name: 'Linh Miêu', rarity: 'pham', element: 'kim', image: '/art/beast/linh-mieu.png', perk: 'stonePct', perkPerLevel: 3, lore: 'Mèo linh ngủ cả ngày, nhưng chưa bao giờ để sót một viên linh thạch.' },
  { id: 'thiet-quy', name: 'Thiết Giáp Quy', rarity: 'pham', element: 'tho', image: '/art/beast/thiet-quy.png', perk: 'stonePct', perkPerLevel: 4, lore: 'Mai dày, đi chậm, nhưng chưa từng bỏ dở đường nào.' },
  { id: 'thanh-xa', name: 'Thanh Xà', rarity: 'pham', element: 'moc', image: '/art/beast/thanh-xa.png', perk: 'xpPct', perkPerLevel: 2, lore: 'Rắn xanh lặng lẽ, mỗi ngày dài thêm một tấc.' },

  // ----------------------------------------------------------- linh phẩm
  { id: 'hac-bao', name: 'Hắc Báo', rarity: 'linh', element: 'kim', image: '/art/beast/hac-bao.png', perk: 'urgentPct', perkPerLevel: 4, lore: 'Rình cả đêm chỉ để chồm một nhát. Việc gấp không thoát được nó.' },
  { id: 'bach-lang', name: 'Bạch Lang', rarity: 'linh', element: 'thuy', image: '/art/beast/bach-lang.png', perk: 'focusPct', perkPerLevel: 4, lore: 'Sói trắng chạy đường dài trong tuyết, không cần ai cổ vũ.' },
  { id: 'linh-hau', name: 'Linh Hầu', rarity: 'linh', element: 'moc', image: '/art/beast/linh-hau.png', perk: 'xpPct', perkPerLevel: 3, lore: 'Khỉ linh cầm thiết bổng, nghịch mà tinh, học gì cũng nhanh.' },
  { id: 'hoa-ho', name: 'Hoả Hồ', rarity: 'linh', element: 'hoa', image: '/art/beast/hoa-ho.png', perk: 'deadlinePct', perkPerLevel: 4, lore: 'Cáo lửa băng qua khe hẹp, tới trước khi chuông điểm.' },

  // ------------------------------------------------- bảo phẩm - u minh giới
  { id: 'cu-mang', name: 'Cự Mãng', rarity: 'bao', element: 'moc', image: '/art/beast/cu-mang.jpg', perk: 'xpPct', perkPerLevel: 5, lore: 'Trăn khổng lồ trong U Minh, siết một vòng là việc lớn cũng phải vỡ.' },
  { id: 'huyet-lang', name: 'Huyết Lang', rarity: 'bao', element: 'hoa', image: '/art/beast/huyet-lang.jpg', perk: 'urgentPct', perkPerLevel: 5, lore: 'Sói máu săn theo mùi khẩn cấp, không bao giờ bỏ dấu.' },
  { id: 'song-dau-khuyen', name: 'Song Đầu Khuyển', rarity: 'bao', element: 'tho', image: '/art/beast/song-dau-khuyen.jpg', perk: 'stonePct', perkPerLevel: 6, lore: 'Hai đầu canh hai hướng, của cải không lọt kẽ tay.' },
  { id: 'u-minh-hac-bao', name: 'U Minh Hắc Báo', rarity: 'bao', element: 'kim', image: '/art/beast/u-minh-hac-bao.jpg', perk: 'deadlinePct', perkPerLevel: 5, lore: 'Bóng đen trong rừng lạnh, tới trước hạn kỳ mà không ai thấy.' },

  // ---------------------------------------------------------- thánh phẩm
  { id: 'bach-ho', name: 'Bạch Hổ', rarity: 'thanh', element: 'kim', image: '/art/beast/bach-ho.png', perk: 'urgentPct', perkPerLevel: 6, lore: 'Tứ Tượng phương Tây. Một vuốt trảm đứt việc khó nhất.' },
  { id: 'thanh-long', name: 'Thanh Long', rarity: 'thanh', element: 'moc', image: '/art/beast/thanh-long.png', perk: 'xpPct', perkPerLevel: 6, lore: 'Tứ Tượng phương Đông. Rồng xanh cuộn mây, khí vận sinh sôi.' },
  { id: 'ky-lan', name: 'Kỳ Lân', rarity: 'thanh', element: 'tho', image: '/art/beast/ky-lan.png', perk: 'xpPct', perkPerLevel: 6, lore: 'Đi qua chỗ nào, chỗ ấy điềm lành. Cổ thư chép: chỉ hiện với người có đạo tâm.' },
  { id: 'bao-long', name: 'Bạo Long', rarity: 'thanh', element: 'hoa', image: '/art/beast/bao-long.jpg', perk: 'urgentPct', perkPerLevel: 7, lore: 'Rồng bạo trong U Minh, gầm một tiếng là tâm ma tan.' },

  // -------------------------------------------------------- thần thoại
  { id: 'phuong-hoang', name: 'Phượng Hoàng', rarity: 'thoai', element: 'hoa', image: '/art/beast/phuong-hoang.png', perk: 'xpPct', perkPerLevel: 10, lore: 'Cháy rụi rồi sinh lại. Mỗi lần vấp là một lần lửa mới.' },
  { id: 'huyen-vu', name: 'Huyền Vũ', rarity: 'thoai', element: 'thuy', image: '/art/beast/huyen-vu.png', perk: 'focusPct', perkPerLevel: 10, lore: 'Tứ Tượng phương Bắc. Rùa rắn hợp thể, tĩnh tới mức thời gian ngừng.' },
];

export const beastById = (id: string) => BEASTS.find((b) => b.id === id);

/** Linh thú đã thu phục, kèm điểm nuôi dưỡng. */
export interface OwnedBeast {
  id: string;
  /** Điểm nuôi dưỡng tích luỹ */
  fed: number;
  obtainedAt: string;
}

export const MAX_BEAST_LEVEL = 10;

/** Cấp linh thú suy ra từ điểm nuôi dưỡng: cấp n cần tổng 3·n(n-1)/2 điểm. */
export function beastLevel(fed: number): number {
  let level = 1;
  let need = 3;
  let acc = 0;
  while (level < MAX_BEAST_LEVEL && fed >= acc + need) {
    acc += need;
    level += 1;
    need += 3;
  }
  return level;
}

/** Còn thiếu bao nhiêu điểm nuôi để lên cấp; 0 nghĩa là đã tối đa. */
export function feedToNext(fed: number): number {
  const level = beastLevel(fed);
  if (level >= MAX_BEAST_LEVEL) return 0;
  let need = 3;
  let acc = 0;
  for (let i = 1; i < level; i++) {
    acc += need;
    need += 3;
  }
  return acc + need - fed;
}

/** Tổng phần trăm thiên phú của linh thú ở cấp hiện tại. */
export function beastPerkValue(owned: OwnedBeast): { kind: PerkKind; percent: number } | null {
  const beast = beastById(owned.id);
  if (!beast) return null;
  return { kind: beast.perk, percent: beast.perkPerLevel * beastLevel(owned.fed) };
}

/** Chi phí chiêu thú và cho ăn, tính bằng linh thạch. */
export const SUMMON_COST = 20;
export const FEED_COST = 6;
/** Mỗi lần cho ăn cộng bao nhiêu điểm nuôi dưỡng */
export const FEED_GAIN = 1;
/** Bắt trùng linh thú thì hồn thú nhập vào con cũ, cộng thẳng điểm nuôi */
export const DUPLICATE_FEED = 5;

/** Chiêu thú: bốc bậc theo xác suất rồi bốc một con trong bậc đó. */
export function summonBeast(rand: () => number = Math.random): Beast {
  let roll = rand();
  let rarity: BeastRarity = 'pham';
  for (const r of RARITY_ORDER) {
    if (roll < RARITIES[r].chance) {
      rarity = r;
      break;
    }
    roll -= RARITIES[r].chance;
  }
  const pool = BEASTS.filter((b) => b.rarity === rarity);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
