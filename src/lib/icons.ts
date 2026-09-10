/**
 * Icon ở hai cột hub và trên HUD, đặt ở `public/art/rail/`.
 *
 * Trước đây chỗ này mượn icon của Tiên Ma Giới, nhưng bộ đó có chữ nung sẵn
 * trong ảnh — mà app lại vẽ nhãn riêng ngay dưới icon, thành ra chữ hiện hai
 * lần, và năm cái còn ghi khác hẳn nhãn ("BXH" trong khi nhãn là "Thống Kê").
 * Bộ mượn đã bỏ hẳn.
 *
 * Không còn ảnh lùi: nhãn chữ dưới mỗi icon vẫn nói rõ nút đó là gì, nên thiếu
 * file thì chỉ mất phần hình chứ nút vẫn dùng được — không đáng đóng gói thêm
 * 3,4 MB icon dự phòng vào bản build.
 */
export const RAIL_ICONS = [
  'be-quan',
  'nhat-khoa',
  'tien-lo',
  'thong-ke',
  'linh-can',
  'linh-thu',
  'dan-duong',
  'dong-phu',
  'cai-dat',
  'linh-thach',
  'chieu-thu',
] as const;

export type RailIcon = (typeof RAIL_ICONS)[number];

export const railSrc = (name: RailIcon) => `/art/rail/${name}.png`;
