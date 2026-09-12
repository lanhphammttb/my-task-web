import type { HerbId } from './field';
import type { PillGrade } from './pills';

/**
 * Hòm kỳ ngộ - phần thưởng bất ngờ, nhưng phải làm việc mới có.
 *
 * Đây là chỗ dễ đi chệch nhất trong cả app. "Quà đăng nhập mỗi ngày" là thưởng
 * cho việc **mở app**, mà app này tồn tại để người ta **làm xong việc** - hai
 * thứ ấy kéo ngược nhau. Nên hòm không tự rơi xuống theo ngày: mỗi cái gắn với
 * một mốc công việc thật trong ngày, xong mốc mới có hòm.
 *
 * Phần ngẫu nhiên nằm ở chỗ **mở**, không nằm ở chỗ nhận. Nhờ vậy xong một việc
 * là có ngay một thứ đang chờ được mở - thứ mà app trước nay thiếu hẳn.
 *
 * Mọi điều kiện đều suy ra từ dữ liệu ngày hôm đó, nên vẫn thuần phái sinh:
 * chỉ lưu đúng danh sách hòm đã mở.
 */
export type ChestGrade = 'go' | 'ngoc' | 'kim';

export interface ChestGradeMeta {
  grade: ChestGrade;
  name: string;
  tone: string;
  /** Ảnh trong `public/art/chest/`. Thiếu file thì UI lùi về icon nét. */
  image: string;
  note: string;
}

export const CHEST_GRADES: Record<ChestGrade, ChestGradeMeta> = {
  go: {
    grade: 'go',
    name: 'Hòm Gỗ',
    tone: '#c79a5b',
    image: '/art/chest/go.png',
    note: 'Hòm gỗ tạp, khoá đồng đã xỉn. Không quý, nhưng mở ra vẫn vui.',
  },
  ngoc: {
    grade: 'ngoc',
    name: 'Hòm Ngọc',
    tone: '#5aa9c9',
    image: '/art/chest/ngoc.png',
    note: 'Hòm khảm ngọc, hơi lạnh toát ra từ khe nắp. Bên trong có thứ đáng giá.',
  },
  kim: {
    grade: 'kim',
    name: 'Hòm Kim',
    tone: '#e0a83c',
    image: '/art/chest/kim.png',
    note: 'Hòm bọc vàng, khắc phù văn cổ. Cả tháng chưa chắc mở được một cái.',
  },
};

/** Một thứ có thể moi ra từ hòm. */
export interface Loot {
  /** Trọng số bốc thăm, không cần cộng lại thành 100 */
  weight: number;
  label: string;
  text: string;
  stones?: number;
  xp?: number;
  herbs?: Partial<Record<HerbId, number>>;
  pill?: PillGrade;
}

/**
 * Bảng đồ trong hòm.
 *
 * Cố ý **không có kết cục tay trắng**: hòm phải làm việc mới có, mở ra mà trống
 * không thì lần sau chẳng ai buồn mở. Mức chênh lệch nằm ở chỗ được nhiều hay
 * ít, chứ không phải được hay không.
 */
export const LOOT: Record<ChestGrade, Loot[]> = {
  go: [
    {
      weight: 42,
      label: 'Túi đá vụn',
      text: 'Một túi vải cũ, bên trong là mấy mảnh linh thạch vỡ. Gom lại cũng thành món.',
      stones: 18,
    },
    {
      weight: 30,
      label: 'Nắm hạt giống',
      text: 'Hạt còn dính đất, gieo xuống là mọc. Ai đó cất đi rồi quên mất.',
      herbs: { thanh_diep: 2 },
    },
    {
      weight: 21,
      label: 'Mảnh ngọc bội',
      text: 'Nửa miếng ngọc bội sứt, đổi được ít tiền. Nửa còn lại không biết ở đâu.',
      stones: 32,
    },
    {
      weight: 7,
      label: 'Một tia linh khí',
      text: 'Nắp vừa hé thì một sợi khí trắng luồn thẳng vào đan điền. Ấm cả người.',
      xp: 40,
      stones: 10,
    },
  ],

  ngoc: [
    {
      weight: 34,
      label: 'Đãy linh thạch',
      text: 'Đãy nhỏ mà nặng tay, đá bên trong còn nguyên khối chưa cắt.',
      stones: 70,
    },
    {
      weight: 26,
      label: 'Bó dược liệu khô',
      text: 'Buộc bằng dây gai, mùi thuốc còn hăng. Người cất rất biết cách giữ.',
      herbs: { thanh_diep: 3, huyet_tinh: 2 },
    },
    {
      weight: 20,
      label: 'Ngọc giản dở dang',
      text: 'Trong ngọc giản là nửa bài khẩu quyết. Đọc xong vẫn thấy sáng ra ít nhiều.',
      xp: 130,
      stones: 30,
    },
    {
      weight: 14,
      label: 'Lọ đan cũ',
      text: 'Lọ sứ bịt sáp, bên trong còn đúng một viên chưa hỏng.',
      pill: 'ha',
      stones: 40,
    },
    {
      weight: 6,
      label: 'Hạt Kim Tuỷ',
      text: 'Một hạt giống ánh kim nằm trong lớp bông. Loại này ngoài chợ không ai bán.',
      herbs: { kim_tuy: 1, huyet_tinh: 2 },
      stones: 50,
    },
  ],

  kim: [
    {
      weight: 30,
      label: 'Rương linh thạch',
      text: 'Mở nắp ra là một lớp đá xếp đều tăm tắp, ánh sáng hắt lên tận mặt.',
      stones: 230,
    },
    {
      weight: 24,
      label: 'Hộp dược liệu quý',
      text: 'Hộp gỗ đàn chia ngăn, mỗi ngăn một loại. Người chuẩn bị rất kỹ lưỡng.',
      herbs: { kim_tuy: 2, huyet_tinh: 3 },
      stones: 80,
    },
    {
      weight: 20,
      label: 'Trung phẩm đan dược',
      text: 'Một viên đan tròn trịa, khí tức tinh thuần. Tự luyện thì mười mẻ chưa chắc ra.',
      pill: 'trung',
      stones: 120,
    },
    {
      weight: 16,
      label: 'Ngọc giản của tiền bối',
      text: 'Thần thức vừa chạm vào là cả bài công pháp tràn tới. Ngồi hồi lâu mới tiêu hoá hết.',
      xp: 380,
      stones: 100,
    },
    {
      weight: 10,
      label: 'Củ Tử Vân Sâm',
      text: 'Sâm tía nguyên rễ, hơi mây còn quấn quanh. Đây là thứ người ta tranh nhau đến chết.',
      herbs: { tu_van: 1, kim_tuy: 1 },
      stones: 160,
    },
  ],
};

/** Mốc công việc trong ngày, đạt là được một hòm. */
export interface ChestRule {
  id: string;
  grade: ChestGrade;
  label: string;
  /** Nói rõ phải làm gì, để người dùng biết đường mà nhắm */
  hint: string;
  /** Đã đạt mốc chưa - chỉ đọc từ số liệu trong ngày */
  reached: (done: number, focusMin: number, perfect: boolean) => boolean;
  /** Tiến độ 0..1 để vẽ thanh */
  ratio: (done: number, focusMin: number, perfect: boolean) => number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const CHEST_RULES: ChestRule[] = [
  {
    id: 'first',
    grade: 'go',
    label: 'Khai bút',
    hint: 'Xong việc đầu tiên trong ngày',
    reached: (done) => done >= 1,
    ratio: (done) => clamp01(done / 1),
  },
  {
    id: 'five',
    grade: 'ngoc',
    label: 'Cần mẫn',
    hint: 'Xong năm việc trong ngày',
    reached: (done) => done >= 5,
    ratio: (done) => clamp01(done / 5),
  },
  {
    id: 'focus60',
    grade: 'ngoc',
    label: 'Nhập định',
    hint: 'Bế quan đủ một giờ trong ngày',
    reached: (_d, focusMin) => focusMin >= 60,
    ratio: (_d, focusMin) => clamp01(focusMin / 60),
  },
  {
    id: 'perfect',
    grade: 'kim',
    label: 'Viên mãn',
    hint: 'Dọn sạch nhật khoá hôm nay',
    reached: (_d, _f, perfect) => perfect,
    ratio: (_d, _f, perfect) => (perfect ? 1 : 0),
  },
];

/** Khoá ghi vào danh sách đã mở: một hòm cho mỗi mốc, mỗi ngày. */
export const chestKey = (dateKey: string, ruleId: string) => `${dateKey}:${ruleId}`;

export interface ChestState {
  rule: ChestRule;
  meta: ChestGradeMeta;
  /** Đã đạt mốc, tức là đã có hòm */
  earned: boolean;
  /** Đã mở rồi thì thôi */
  opened: boolean;
  ratio: number;
}

export function chestsForDay(
  dateKey: string,
  done: number,
  focusMin: number,
  perfect: boolean,
  openedKeys: string[],
): ChestState[] {
  const opened = new Set(openedKeys);
  return CHEST_RULES.map((rule) => ({
    rule,
    meta: CHEST_GRADES[rule.grade],
    earned: rule.reached(done, focusMin, perfect),
    opened: opened.has(chestKey(dateKey, rule.id)),
    ratio: rule.ratio(done, focusMin, perfect),
  }));
}

/** Số hòm đang chờ mở - dùng cho chấm báo trên icon. */
export const pendingChests = (list: ChestState[]) =>
  list.filter((c) => c.earned && !c.opened).length;

/** Bốc đồ theo trọng số. `rand` tách ra để test cố định được kết quả. */
export function rollLoot(grade: ChestGrade, rand: () => number = Math.random): Loot {
  const table = LOOT[grade];
  const total = table.reduce((s, o) => s + o.weight, 0);
  let roll = rand() * total;
  for (const item of table) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return table[table.length - 1];
}
