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

/*
 * Từ Nguyên Anh trở đi mỗi tầng chỉ còn 400 → 660 tu vi (trước đây 500 → 6000),
 * tổng đạo lộ 33 210 thay vì 139 770. Ba cảnh giới đầu giữ nguyên để nhập môn
 * vẫn nhanh như cũ.
 *
 * Vì sao: sau đợt cân bằng lại, phần "trời cho" (hòm, linh thú, kỳ ngộ) không
 * còn gánh tiến độ nữa - tu vi giờ chủ yếu là việc thật. Giữ ngưỡng cũ thì
 * người làm đều ba việc mỗi ngày phải sáu năm mới phi thăng. Ngưỡng mới cho
 * người ấy chừng hai năm chỉ bằng công việc; người làm nhiều hơn tới nhanh
 * hơn nhưng bị giữ bởi số ngày tu luyện (`REALM_MIN_DAYS`).
 *
 * Hồ sơ cũ không mất gì: cảnh giới đã độ kiếp giữ nguyên (`gateRealm`), tu vi
 * dư ra so với trần mới chỉ chuyển thành phần "bị giữ" chờ độ kiếp.
 */
export const REALMS: Realm[] = [
  { name: 'Luyện Khí', tiers: 9, perTier: 50, color: '#7fb7a8', icon: Wind, note: 'Dẫn khí nhập thể, đặt bước đầu lên đạo lộ.' },
  { name: 'Trúc Cơ', tiers: 9, perTier: 120, color: '#4f9d6b', icon: Mountain, note: 'Xây nền móng vững, thói quen thành tự nhiên.' },
  { name: 'Kim Đan', tiers: 9, perTier: 260, color: '#e0a83c', icon: Sun, note: 'Ngưng khí thành đan, kỷ luật đã kết tinh.' },
  { name: 'Nguyên Anh', tiers: 9, perTier: 400, color: '#9b7fd4', icon: Sparkle, note: 'Nguyên thần hiện hình, làm chủ được nhịp của mình.' },
  { name: 'Hóa Thần', tiers: 9, perTier: 460, color: '#c96fb0', icon: Eye, note: 'Thần thức bao trùm, nhìn thấu việc lớn việc nhỏ.' },
  { name: 'Luyện Hư', tiers: 9, perTier: 540, color: '#5aa9c9', icon: Cloudy, note: 'Luyện hư hợp đạo, làm nhiều mà không thấy nặng.' },
  { name: 'Hợp Thể', tiers: 9, perTier: 580, color: '#d4646f', icon: Combine, note: 'Thân đạo hợp nhất, việc và người là một.' },
  { name: 'Đại Thừa', tiers: 9, perTier: 620, color: '#e08a3c', icon: Crown, note: 'Đứng trên đỉnh nhân gian, chỉ còn một kiếp nạn.' },
  { name: 'Độ Kiếp', tiers: 9, perTier: 660, color: '#cf3f2f', icon: Zap, note: 'Thiên kiếp giáng lâm. Vượt qua là thành tiên.' },
  { name: 'Phi Thăng', tiers: 1, perTier: 0, color: '#f4d03f', icon: Feather, note: 'Phá vỡ hư không, đạp mây mà đi. Đạo lộ viên mãn.' },
];

/** Chỉ số cảnh giới cuối cùng - đích đến, không còn tu vi để tích. */
export const ASCENSION_INDEX = REALMS.length - 1;

/**
 * Căn cơ: số NGÀY tu luyện thật (ngày có việc xong hoặc phiên bế quan được
 * thưởng - xem `activeDays`) cần có, tính từ lúc nhập môn, để được độ kiếp
 * vào cảnh giới thứ i. Đủ tu vi mà thiếu ngày thì tu vi cứ tích (bị giữ lại
 * ngoài trần, không mất), chỉ là chưa được độ kiếp.
 *
 * Vì sao cần: tu vi tỷ lệ thẳng với công việc, mà người làm gấp sáu lần thì
 * cũng tới đích nhanh gấp sáu. Muốn người làm đều đặn vừa phải phi thăng trong
 * chừng hai năm thì người cày mười lăm việc mỗi ngày sẽ xong trong vài tháng -
 * và chẳng còn gì để đi. Tu tiên vốn cần thời gian để căn cơ vững; đếm NGÀY chứ
 * không đếm việc nên làm nhiều vẫn lên nhanh hơn, chỉ không thể dồn cả đạo lộ
 * vào một mùa. Người làm đều đặn vừa phải không bao giờ chạm mốc này.
 *
 * Bốn cảnh giới đầu không có mốc - nhập môn phải nhanh và vui. Mốc cuối (270
 * ngày, chừng chín tháng) là sớm nhất có thể phi thăng.
 */
export const REALM_MIN_DAYS: number[] = [0, 0, 0, 0, 45, 80, 120, 165, 215, 270];

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
