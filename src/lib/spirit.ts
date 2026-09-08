/**
 * Linh căn ngũ hành. Khai quang một lần khi nhập môn, quyết định tốc độ hấp thu
 * linh khí và các thiên phú đi kèm.
 *
 * Cân bằng cố ý: càng ít hệ thì hệ số tu vi càng cao nhưng được ít thiên phú;
 * Ngũ Linh Căn hấp thu chậm nhất nhưng hưởng trọn cả năm thiên phú. Không có
 * kết quả nào là "hỏng" - chỉ là hai lối tu khác nhau.
 */
export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

export interface ElementMeta {
  label: string;
  color: string;
  /** Tên thiên phú */
  perk: string;
  /** Mô tả tác dụng thật, viết đúng con số để người dùng kiểm chứng được */
  perkNote: string;
}

export const ELEMENTS: Record<Element, ElementMeta> = {
  kim: {
    label: 'Kim',
    color: '#cbb994',
    perk: 'Kim Khí Sắc Bén',
    perkNote: 'Nhiệm vụ mức Khẩn cấp cho thêm 20% tu vi',
  },
  moc: {
    label: 'Mộc',
    color: '#6fbf73',
    perk: 'Mộc Trưởng Bất Tức',
    perkNote: 'Mỗi ngày trong chuỗi tu luyện cho thêm 3 tu vi',
  },
  thuy: {
    label: 'Thuỷ',
    color: '#5aa9c9',
    perk: 'Thuỷ Tĩnh Nhi Thâm',
    perkNote: 'Tu vi từ bế quan tăng 25%',
  },
  hoa: {
    label: 'Hoả',
    color: '#e0664a',
    perk: 'Hoả Tốc Vô Ảnh',
    perkNote: 'Việc xong trước hạn chót cho thêm 25% tu vi',
  },
  tho: {
    label: 'Thổ',
    color: '#c79a5b',
    perk: 'Thổ Hậu Tái Vật',
    perkNote: 'Mỗi ngày nhật khoá viên mãn cho thêm 30 tu vi',
  },
};

export const ELEMENT_ORDER: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

export interface RootGrade {
  /** Số hệ */
  count: number;
  name: string;
  /** Hệ số nhân tu vi */
  multiplier: number;
  /** Xác suất khai quang ra phẩm cấp này */
  chance: number;
  tone: string;
  note: string;
}

export const ROOT_GRADES: RootGrade[] = [
  {
    count: 1,
    name: 'Thiên Linh Căn',
    multiplier: 1.25,
    chance: 0.03,
    tone: '#fcd34d',
    note: 'Đơn hệ thuần khiết, vạn người khó gặp một. Hấp thu linh khí nhanh nhất.',
  },
  {
    count: 2,
    name: 'Song Linh Căn',
    multiplier: 1.15,
    chance: 0.12,
    tone: '#c084fc',
    note: 'Hai hệ tương hoà, đường tu rộng mà vẫn nhanh.',
  },
  {
    count: 3,
    name: 'Tam Linh Căn',
    multiplier: 1.08,
    chance: 0.25,
    tone: '#5aa9c9',
    note: 'Tư chất khá, đủ để đi xa nếu chịu khó.',
  },
  {
    count: 4,
    name: 'Tứ Linh Căn',
    multiplier: 1.03,
    chance: 0.35,
    tone: '#6fbf73',
    note: 'Tạp nhưng vững. Bốn thiên phú bù lại tốc độ.',
  },
  {
    count: 5,
    name: 'Ngũ Linh Căn',
    multiplier: 1.0,
    chance: 0.25,
    tone: '#cbb994',
    note: 'Ngũ hành đều hoà. Hấp thu chậm nhất nhưng hưởng trọn năm thiên phú.',
  },
];

export interface SpiritRoot {
  elements: Element[];
  rolledAt: string;
}

export function gradeOf(root: SpiritRoot): RootGrade {
  return ROOT_GRADES.find((g) => g.count === root.elements.length) ?? ROOT_GRADES[4];
}

export function rootName(root: SpiritRoot): string {
  return gradeOf(root).name;
}

/** "Hoả · Thuỷ" */
export function rootElementLabel(root: SpiritRoot): string {
  return root.elements.map((e) => ELEMENTS[e].label).join(' · ');
}

/**
 * Khai quang: bốc phẩm cấp theo xác suất rồi bốc đủ số hệ tương ứng.
 * `rand` tách ra để test cố định được kết quả.
 */
export function rollRoot(rand: () => number = Math.random, now = new Date()): SpiritRoot {
  let roll = rand();
  let grade = ROOT_GRADES[ROOT_GRADES.length - 1];
  for (const g of ROOT_GRADES) {
    if (roll < g.chance) {
      grade = g;
      break;
    }
    roll -= g.chance;
  }

  const pool = [...ELEMENT_ORDER];
  const picked: Element[] = [];
  for (let i = 0; i < grade.count; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
    picked.push(pool.splice(idx, 1)[0]);
  }

  // Giữ đúng thứ tự ngũ hành cho dễ đọc.
  picked.sort((a, b) => ELEMENT_ORDER.indexOf(a) - ELEMENT_ORDER.indexOf(b));
  return { elements: picked, rolledAt: now.toISOString() };
}

/** Chi phí Tẩy Tuỷ Đan để khai quang lại, tính bằng linh thạch. */
export const REROLL_COST = 40;
