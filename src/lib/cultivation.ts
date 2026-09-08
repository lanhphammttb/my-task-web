import { Cloudy, Combine, Crown, Eye, Feather, Mountain, Sparkle, Sun, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Hệ thống tu tiên: thay cho "cấp độ" khô khan, người dùng đi từ Luyện Khí lên
 * Phi Thăng. Mỗi cảnh giới có 9 tầng; đủ tu vi thì đột phá lên tầng kế, hết 9
 * tầng thì độ kiếp để sang cảnh giới mới. Đích cuối là Phi Thăng.
 */
export interface Realm {
  name: string;
  /** Số tầng trong cảnh giới. Phi Thăng là đích nên chỉ có 1. */
  tiers: number;
  /** Tu vi cần cho mỗi tầng. */
  perTier: number;
  color: string;
  icon: LucideIcon;
  note: string;
}

export const REALMS: Realm[] = [
  { name: 'Luyện Khí', tiers: 9, perTier: 50, color: '#22d3ee', icon: Wind, note: 'Dẫn khí nhập thể, đặt bước đầu lên đạo lộ.' },
  { name: 'Trúc Cơ', tiers: 9, perTier: 120, color: '#34d399', icon: Mountain, note: 'Xây nền móng vững, thói quen thành tự nhiên.' },
  { name: 'Kim Đan', tiers: 9, perTier: 260, color: '#fbbf24', icon: Sun, note: 'Ngưng khí thành đan, kỷ luật đã kết tinh.' },
  { name: 'Nguyên Anh', tiers: 9, perTier: 500, color: '#a78bfa', icon: Sparkle, note: 'Nguyên thần hiện hình, làm chủ được nhịp của mình.' },
  { name: 'Hóa Thần', tiers: 9, perTier: 900, color: '#e879f9', icon: Eye, note: 'Thần thức bao trùm, nhìn thấu việc lớn việc nhỏ.' },
  { name: 'Luyện Hư', tiers: 9, perTier: 1500, color: '#38bdf8', icon: Cloudy, note: 'Luyện hư hợp đạo, làm nhiều mà không thấy nặng.' },
  { name: 'Hợp Thể', tiers: 9, perTier: 2400, color: '#fb7185', icon: Combine, note: 'Thân đạo hợp nhất, việc và người là một.' },
  { name: 'Đại Thừa', tiers: 9, perTier: 3800, color: '#fb923c', icon: Crown, note: 'Đứng trên đỉnh nhân gian, chỉ còn một kiếp nạn.' },
  { name: 'Độ Kiếp', tiers: 9, perTier: 6000, color: '#f43f5e', icon: Zap, note: 'Thiên kiếp giáng lâm. Vượt qua là thành tiên.' },
  { name: 'Phi Thăng', tiers: 1, perTier: 0, color: '#fcd34d', icon: Feather, note: 'Phá vỡ hư không, đạp mây mà đi. Đạo lộ viên mãn.' },
];

/** Chỉ số cảnh giới cuối cùng - đích đến, không còn tu vi để tích. */
export const ASCENSION_INDEX = REALMS.length - 1;

/** Tu vi tích luỹ cần có để bước vào cảnh giới thứ `index`. */
export function realmStart(index: number): number {
  let total = 0;
  for (let i = 0; i < index && i < ASCENSION_INDEX; i++) {
    total += REALMS[i].tiers * REALMS[i].perTier;
  }
  return total;
}

export const TOTAL_TO_ASCEND = realmStart(ASCENSION_INDEX);

export interface Cultivation {
  realmIndex: number;
  realm: Realm;
  /** Tầng hiện tại trong cảnh giới, đếm từ 1. */
  tier: number;
  /** Tu vi đã tích trong tầng hiện tại. */
  into: number;
  /** Tu vi cần cho tầng hiện tại. */
  need: number;
  ratio: number;
  /** Còn thiếu bao nhiêu tu vi để đột phá. */
  toNext: number;
  /** Đang ở tầng 9 - lần đột phá tới là độ kiếp sang cảnh giới mới. */
  atPeak: boolean;
  /** Đã phi thăng, không còn gì để tích. */
  ascended: boolean;
  /** Nhãn của mốc kế tiếp, ví dụ "Trúc Cơ" hoặc "Luyện Khí tầng 4". */
  nextLabel: string;
  /** Tổng số tầng đã vượt qua tính từ lúc nhập môn. */
  totalTiers: number;
}

export function cultivationOf(xp: number): Cultivation {
  let remain = Math.max(0, Math.floor(xp));
  let passed = 0;

  for (let i = 0; i < ASCENSION_INDEX; i++) {
    const realm = REALMS[i];
    const realmTotal = realm.tiers * realm.perTier;

    if (remain < realmTotal) {
      const tier = Math.floor(remain / realm.perTier) + 1;
      const into = remain % realm.perTier;
      const atPeak = tier === realm.tiers;
      return {
        realmIndex: i,
        realm,
        tier,
        into,
        need: realm.perTier,
        ratio: into / realm.perTier,
        toNext: realm.perTier - into,
        atPeak,
        ascended: false,
        nextLabel: atPeak ? REALMS[i + 1].name : `${realm.name} tầng ${tier + 1}`,
        totalTiers: passed + tier,
      };
    }

    remain -= realmTotal;
    passed += realm.tiers;
  }

  const realm = REALMS[ASCENSION_INDEX];
  return {
    realmIndex: ASCENSION_INDEX,
    realm,
    tier: 1,
    into: 0,
    need: 0,
    ratio: 1,
    toNext: 0,
    atPeak: true,
    ascended: true,
    nextLabel: 'Đạo lộ viên mãn',
    totalTiers: passed + 1,
  };
}

/** "Kim Đan tầng 4" hoặc "Phi Thăng". */
export function realmLabel(c: Cultivation): string {
  return c.ascended ? c.realm.name : `${c.realm.name} tầng ${c.tier}`;
}

/** Nhãn ngắn cho chỗ chật, ví dụ "Kim Đan 4". */
export function realmShort(c: Cultivation): string {
  return c.ascended ? c.realm.name : `${c.realm.name} ${c.tier}`;
}

/** Tiến độ của toàn bộ đạo lộ, dùng cho thanh phi thăng. */
export function ascensionRatio(xp: number): number {
  return TOTAL_TO_ASCEND === 0 ? 1 : Math.min(1, Math.max(0, xp) / TOTAL_TO_ASCEND);
}

/** Trạng thái từng cảnh giới trên bậc thang, dùng cho trang Tiên Lộ. */
export interface RealmProgress {
  realm: Realm;
  index: number;
  status: 'done' | 'current' | 'locked';
  /** Tu vi cần để bước vào cảnh giới này. */
  startAt: number;
  tier: number;
  ratio: number;
}

export function realmLadder(xp: number): RealmProgress[] {
  const c = cultivationOf(xp);
  return REALMS.map((realm, index) => {
    const startAt = realmStart(index);
    if (index < c.realmIndex) {
      return { realm, index, status: 'done' as const, startAt, tier: realm.tiers, ratio: 1 };
    }
    if (index > c.realmIndex) {
      return { realm, index, status: 'locked' as const, startAt, tier: 0, ratio: 0 };
    }
    return {
      realm,
      index,
      status: 'current' as const,
      startAt,
      tier: c.tier,
      // Tiến độ trong cảnh giới: đã qua bao nhiêu phần của 9 tầng.
      ratio: c.ascended ? 1 : (c.tier - 1 + c.ratio) / realm.tiers,
    };
  });
}
