/**
 * Linh điền - vườn thuốc trong động phủ.
 *
 * Điểm mấu chốt: **linh thảo không lớn theo đồng hồ, nó lớn theo số phút bế
 * quan**. Nếu cây chín sau "8 tiếng thật" thì app đang thưởng cho việc mở app
 * chứ không thưởng cho việc làm - và nó sẽ cạnh tranh với chính mục đích của
 * ứng dụng. Đo bằng phút bế quan thì muốn thu hoạch chỉ có một đường: ngồi
 * xuống làm việc thật.
 *
 * Nhờ vậy trạng thái vẫn thuần phái sinh: mỗi ô chỉ lưu mốc phút lúc gieo, còn
 * cây lớn tới đâu thì trừ ra mà biết. Không có bộ đếm nào để chỉnh, và số phút
 * bế quan thì đã được sổ ghi xác thực sẵn.
 */
export type HerbId = 'thanh_diep' | 'huyet_tinh' | 'kim_tuy' | 'tu_van';

export interface Herb {
  id: HerbId;
  name: string;
  /** Tên ngắn cho chỗ chật */
  short: string;
  /** Số phút bế quan phải tích được kể từ lúc gieo thì cây mới chín */
  needFocus: number;
  /** Giá hạt giống, tính bằng linh thạch */
  seedCost: number;
  /** Thu được bao nhiêu nhánh mỗi lần hái */
  yield: number;
  tone: string;
  note: string;
}

export const HERBS: Record<HerbId, Herb> = {
  thanh_diep: {
    id: 'thanh_diep',
    name: 'Thanh Diệp Thảo',
    short: 'Thanh Diệp',
    needFocus: 60,
    seedCost: 12,
    yield: 3,
    tone: '#6fbf73',
    note: 'Cỏ dại của giới tu tiên. Rẻ, mau chín, nhà nào luyện đan cũng phải có.',
  },
  huyet_tinh: {
    id: 'huyet_tinh',
    name: 'Huyết Tinh Hoa',
    short: 'Huyết Tinh',
    needFocus: 180,
    seedCost: 30,
    yield: 2,
    tone: '#cf3f2f',
    note: 'Hoa đỏ như máu đọng, dược lực nóng. Xương sống của đan trung phẩm.',
  },
  kim_tuy: {
    id: 'kim_tuy',
    name: 'Kim Tuỷ Chi',
    short: 'Kim Tuỷ',
    needFocus: 420,
    seedCost: 70,
    yield: 2,
    tone: '#e0a83c',
    note: 'Nấm mọc trong khe đá có mạch kim. Bảy tiếng nhập định mới ra một lứa.',
  },
  tu_van: {
    id: 'tu_van',
    name: 'Tử Vân Sâm',
    short: 'Tử Vân',
    needFocus: 900,
    seedCost: 150,
    yield: 1,
    tone: '#9b7fd4',
    note: 'Sâm ngàn năm, hơi tía quấn quanh. Trồng một lứa tốn mười lăm tiếng bế quan.',
  },
};

export const HERB_ORDER: HerbId[] = ['thanh_diep', 'huyet_tinh', 'kim_tuy', 'tu_van'];

export interface FieldPlot {
  /** Ô đất thứ mấy, đếm từ 0 */
  slot: number;
  herb: HerbId;
  /**
   * Tổng số phút bế quan tại đúng lúc gieo. Đây là mốc để đo cây lớn tới đâu -
   * lấy tổng phút hiện tại trừ đi con số này.
   */
  plantedAtFocus: number;
  plantedAt: string;
}

export interface PlotState {
  plot: FieldPlot;
  herb: Herb;
  /** Số phút bế quan đã tích được kể từ lúc gieo */
  grown: number;
  need: number;
  /** 0..1 */
  ratio: number;
  ready: boolean;
  /** Còn thiếu bao nhiêu phút nữa thì hái được */
  remain: number;
}

/**
 * Trả `null` nếu ô đất mang loại linh thảo không còn tồn tại.
 *
 * Dữ liệu lưu có thể chứa id đã chết: app cho nhập file JSON mà gần như không
 * kiểm gì, và sau này đổi tên một loại thảo dược là mọi bản lưu cũ đều hỏng.
 * Hàm này chạy trong lúc dựng giao diện, nên tra hụt mà ném lỗi thì mất trắng
 * cả màn hình chứ không phải mỗi ô đất.
 */
export function plotState(plot: FieldPlot, totalFocus: number): PlotState | null {
  const herb = HERBS[plot.herb];
  if (!herb) return null;
  // Kẹp về 0: sổ ghi có thể hạ tổng phút xuống nếu phát hiện dữ liệu bị sửa,
  // lúc ấy cây coi như vừa gieo chứ không được âm.
  const grown = Math.max(0, totalFocus - plot.plantedAtFocus);
  const need = herb.needFocus;
  return {
    plot,
    herb,
    grown,
    need,
    ratio: need === 0 ? 1 : Math.min(1, grown / need),
    ready: grown >= need,
    remain: Math.max(0, need - grown),
  };
}

/** Đếm số nhánh linh thảo đang có, gộp mọi loại. */
export function herbTotal(herbs: Partial<Record<HerbId, number>>): number {
  return HERB_ORDER.reduce((sum, id) => sum + (herbs[id] ?? 0), 0);
}

/** Đủ nguyên liệu cho một đơn thuốc hay chưa. */
export function hasHerbs(
  have: Partial<Record<HerbId, number>>,
  need: Partial<Record<HerbId, number>>,
): boolean {
  return HERB_ORDER.every((id) => (have[id] ?? 0) >= (need[id] ?? 0));
}
