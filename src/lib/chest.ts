import type { AppData, Settings, Task } from '../types';
import type { HerbId } from './field';
import type { PillGrade } from './pills';
import { completedDay } from './date';
import { isPerfectDay } from './achievements';

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
    note: 'Hòm bọc vàng, khắc phù văn cổ. Chỉ mở được vào ngày dọn sạch nhật khoá và xong đủ chỉ tiêu ngày - ít nhất ba việc.',
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
 *
 * Kỳ vọng linh thạch mỗi hòm: Gỗ ~8, Ngọc ~20, Kim ~40 (trước đây ~15 / ~38 /
 * ~144). Mô phỏng một năm cho thấy riêng Hòm Kim đã là 73% số đá của người
 * dọn sạch danh sách mỗi ngày - gấp mấy lần chính công việc - nên ai lên lịch
 * ít việc cho chắc "viên mãn" lại giàu hơn người làm nhiều. Hòm giờ là phần
 * thưởng vui kèm theo, không phải nguồn thu chính. Tu vi trong hòm cũng giảm
 * theo cùng lý do.
 *
 * Hạ bảng này KHÔNG trừ ngược ai: đồ trong hòm cộng thẳng vào `stonesBonus` /
 * `encounterXp` ngay lúc mở, và hòm đã mở thì không bao giờ bốc lại.
 */
export const LOOT: Record<ChestGrade, Loot[]> = {
  go: [
    {
      weight: 42,
      label: 'Túi đá vụn',
      text: 'Một túi vải cũ, bên trong là mấy mảnh linh thạch vỡ. Gom lại cũng thành món.',
      stones: 10,
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
      stones: 16,
    },
    {
      weight: 7,
      label: 'Một tia linh khí',
      text: 'Nắp vừa hé thì một sợi khí trắng luồn thẳng vào đan điền. Ấm cả người.',
      xp: 10,
      stones: 5,
    },
  ],

  ngoc: [
    {
      weight: 34,
      label: 'Đãy linh thạch',
      text: 'Đãy nhỏ mà nặng tay, đá bên trong còn nguyên khối chưa cắt.',
      stones: 40,
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
      xp: 25,
      stones: 15,
    },
    {
      weight: 14,
      label: 'Lọ đan cũ',
      text: 'Lọ sứ bịt sáp, bên trong còn đúng một viên chưa hỏng.',
      pill: 'ha',
      stones: 15,
    },
    {
      weight: 6,
      label: 'Hạt Kim Tuỷ',
      text: 'Một hạt giống ánh kim nằm trong lớp bông. Loại này ngoài chợ không ai bán.',
      herbs: { kim_tuy: 1, huyet_tinh: 2 },
      stones: 20,
    },
  ],

  kim: [
    {
      weight: 30,
      label: 'Rương linh thạch',
      text: 'Mở nắp ra là một lớp đá xếp đều tăm tắp, ánh sáng hắt lên tận mặt.',
      stones: 70,
    },
    {
      weight: 24,
      label: 'Hộp dược liệu quý',
      text: 'Hộp gỗ đàn chia ngăn, mỗi ngăn một loại. Người chuẩn bị rất kỹ lưỡng.',
      herbs: { kim_tuy: 2, huyet_tinh: 3 },
      stones: 20,
    },
    {
      weight: 20,
      label: 'Trung phẩm đan dược',
      text: 'Một viên đan tròn trịa, khí tức tinh thuần. Tự luyện thì mười mẻ chưa chắc ra.',
      pill: 'trung',
      stones: 30,
    },
    {
      weight: 16,
      label: 'Ngọc giản của tiền bối',
      text: 'Thần thức vừa chạm vào là cả bài công pháp tràn tới. Ngồi hồi lâu mới tiêu hoá hết.',
      xp: 30,
      stones: 25,
    },
    {
      weight: 10,
      label: 'Củ Tử Vân Sâm',
      text: 'Sâm tía nguyên rễ, hơi mây còn quấn quanh. Đây là thứ người ta tranh nhau đến chết.',
      herbs: { tu_van: 1, kim_tuy: 1 },
      stones: 40,
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
  /**
   * Đã đạt mốc chưa - chỉ đọc từ số liệu trong ngày. `need` là số việc Hòm
   * Kim đòi (xem `goldNeed`); các mốc khác bỏ qua nó.
   */
  reached: (done: number, focusMin: number, perfect: boolean, need: number) => boolean;
  /** Tiến độ 0..1 để vẽ thanh */
  ratio: (done: number, focusMin: number, perfect: boolean, need: number) => number;
}

/** Hòm Kim đòi ít nhất ngần này việc xong trong ngày, dù chỉ tiêu đặt thấp hơn. */
export const GOLD_MIN_DONE = 3;

/**
 * Số việc phải xong trong ngày (theo ngày XONG) để Hòm Kim mở: chỉ tiêu ngày
 * trong cài đặt, nhưng không dưới `GOLD_MIN_DONE`.
 *
 * Trước đây chỉ cần "dọn sạch nhật khoá" - mà danh sách một việc là dễ dọn
 * sạch nhất. Lên lịch đúng một việc vặt mỗi ngày là ngày nào cũng có Hòm Kim,
 * trong khi người lên tám việc thật mà sót một thì trắng tay. Giờ phải xong đủ
 * chỉ tiêu mình tự đặt, và hạ chỉ tiêu xuống 1 cũng không lọt dưới 3.
 */
export const goldNeed = (dailyTarget?: number): number =>
  Math.max(GOLD_MIN_DONE, typeof dailyTarget === 'number' && Number.isFinite(dailyTarget) ? Math.floor(dailyTarget) : 0);

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
    hint: 'Dọn sạch nhật khoá hôm nay và xong đủ chỉ tiêu ngày (ít nhất 3 việc)',
    reached: (done, _f, perfect, need) => perfect && done >= need,
    // Thanh chạy theo số việc đã xong; chưa dọn sạch thì dừng ở gần đầy.
    ratio: (done, _f, perfect, need) => (perfect && done >= need ? 1 : clamp01(done / need) * 0.95),
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
  /** Số việc Hòm Kim đòi - xem `goldNeed` */
  need: number = GOLD_MIN_DONE,
): ChestState[] {
  const opened = new Set(openedKeys);
  return CHEST_RULES.map((rule) => ({
    rule,
    meta: CHEST_GRADES[rule.grade],
    earned: rule.reached(done, focusMin, perfect, need),
    opened: opened.has(chestKey(dateKey, rule.id)),
    ratio: rule.ratio(done, focusMin, perfect, need),
  }));
}

/**
 * Số việc XONG trong ngày `key` - tính theo ngày hoàn thành (`completedDay`),
 * không theo ngày đã lên kế hoạch.
 *
 * Hòm thưởng công việc làm trong ngày. Đếm theo `task.date` thì dời năm việc
 * đã xong từ tuần trước sang hôm nay là "xong năm việc hôm nay" - lặp ba ngày
 * mở được chín hòm mà không làm thêm gì. Đếm theo ngày xong thì việc cũ dời
 * đi đâu cũng vẫn là việc của ngày nó được làm.
 */
export const doneOnDay = (tasks: readonly Task[], key: string) =>
  tasks.filter((t) => t.status === 'done' && completedDay(t) === key).length;

/**
 * Trạng thái mọi hòm của một ngày, dựng thẳng từ hồ sơ. Web và server gọi
 * cùng một hàm này để hai bên không bao giờ lệch nhau về "đã có hòm chưa".
 */
export function chestsOfDay(
  data: Pick<AppData, 'tasks' | 'sessions' | 'chestsOpened'> & { settings?: Pick<Settings, 'dailyTarget'> },
  key: string,
): ChestState[] {
  const focusMin = data.sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.minutes, 0);
  return chestsForDay(
    key,
    doneOnDay(data.tasks, key),
    focusMin,
    isPerfectDay(data.tasks, key),
    data.chestsOpened,
    // Chỗ chỉ vẽ hòm mà không truyền cài đặt thì lấy mức sàn. Lệnh mở hòm ở
    // server (và ở web) luôn truyền cả hồ sơ, nên luôn đúng chỉ tiêu thật.
    goldNeed(data.settings?.dailyTarget),
  );
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
