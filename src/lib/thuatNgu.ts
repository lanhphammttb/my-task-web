import type { ViewKey } from '../types';

/**
 * Bảng thuật ngữ: mỗi tên tu tiên đi kèm một tên đời thường.
 *
 * Vỏ tu tiên là lớp sơn cho việc thật. Người mới mở app thấy "Hành Sự Đường",
 * "Bế Quan", "Tiên Lộ" thì đoán được là có chuyện gì đó, nhưng không đoán được
 * bấm vào sẽ ra cái gì. Giữ tên hay làm tiêu đề, còn tên đời thường đứng ngay
 * dưới - và là chữ trên các nút bấm, vì nút bấm phải nói thẳng nó làm gì.
 *
 * Một nguồn duy nhất: tiêu đề bảng, phụ đề trên điện thoại, nhãn nút đều lấy
 * từ đây, nên đổi một chữ là đổi khắp app chứ không sót chỗ nào.
 */
export const THUAT_NGU = {
  hanhSu: { ten: 'Hành Sự Đường', ro: 'Việc hằng ngày' },
  beQuan: { ten: 'Bế Quan', ro: 'Tập trung' },
  dongPhu: { ten: 'Động Phủ', ro: 'Nhà & vật phẩm' },
  tienLo: { ten: 'Tiên Lộ', ro: 'Thành tựu' },
  daiNguyen: { ten: 'Đại Nguyện', ro: 'Mục tiêu' },
  tuHanhLuc: { ten: 'Tu Hành Lục', ro: 'Thống kê' },
  sonMon: { ten: 'Sơn Môn', ro: 'Sảnh' },
  nhatKhoa: { ten: 'Nhật Khoá', ro: 'Hôm nay' },
  tuanKhoa: { ten: 'Tuần Khoá', ro: 'Tuần' },
  nguyetKhoa: { ten: 'Nguyệt Khoá', ro: 'Tháng' },
  tuVi: { ten: 'tu vi', ro: 'điểm kinh nghiệm' },
  linhThach: { ten: 'linh thạch', ro: 'tiền thưởng' },
  nhapDinh: { ten: 'nhập định', ro: 'phút tập trung' },
  canhGioi: { ten: 'cảnh giới', ro: 'cấp độ' },
  doKiep: { ten: 'độ kiếp', ro: 'lên cấp' },
  linhCan: { ten: 'linh căn', ro: 'thiên hướng' },
  nhatKhoaTongMon: { ten: 'Nhật khoá tông môn', ro: 'Thử thách trong ngày' },
} as const;

export type ThuatNgu = keyof typeof THUAT_NGU;

/** Tên đời thường của một thuật ngữ. */
export const ro = (k: ThuatNgu): string => THUAT_NGU[k].ro;

/** "Tên hay · tên rõ" - dùng cho chỗ chỉ có một dòng. */
export const kemNghia = (k: ThuatNgu): string => `${THUAT_NGU[k].ten} · ${THUAT_NGU[k].ro}`;

/** Thuật ngữ ứng với từng bảng (tuần/tháng vẫn là Hành Sự Đường). */
export const THUAT_NGU_BANG: Record<ViewKey, ThuatNgu> = {
  today: 'hanhSu',
  week: 'hanhSu',
  month: 'hanhSu',
  goals: 'daiNguyen',
  focus: 'beQuan',
  cave: 'dongPhu',
  awards: 'tienLo',
  stats: 'tuHanhLuc',
};

/**
 * Nhãn các thao tác chính. Nút bấm dùng chữ đời thường, nhất quán ở mọi nơi:
 * cùng một việc thì cùng một chữ, không chỗ "Ghi việc" chỗ "Nhiệm vụ mới".
 */
export const NHAN = {
  themViec: 'Thêm việc',
  themViecDau: 'Thêm việc đầu tiên',
  batDauTapTrung: 'Bắt đầu tập trung',
  tapTrungViecNay: 'Tập trung vào việc này',
  themMucTieu: 'Thêm mục tiêu',
  suaViec: 'Sửa việc',
  xoaViec: 'Xoá việc',
  timViec: 'Tìm việc',
} as const;

/** Tên đời thường của một bảng - dòng phụ dưới tiêu đề, cả điện thoại lẫn màn rộng. */
export function tenRoBang(view: ViewKey): string {
  if (view === 'week') return `${THUAT_NGU.hanhSu.ro} · ${THUAT_NGU.tuanKhoa.ro}`;
  if (view === 'month') return `${THUAT_NGU.hanhSu.ro} · ${THUAT_NGU.nguyetKhoa.ro}`;
  return THUAT_NGU[THUAT_NGU_BANG[view]].ro;
}
