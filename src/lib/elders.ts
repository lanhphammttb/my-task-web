/**
 * Châm ngôn tiền bối. Các vị này là nhân vật hư cấu - cố ý không gán lời cho
 * người thật. Nội dung vẫn là lời khuyên dùng được, chỉ khoác giọng tu chân.
 */
export interface Aphorism {
  text: string;
  elder: string;
  /** Chức danh ngắn, hiện dưới tên */
  title: string;
}

export const APHORISMS: Aphorism[] = [
  { text: 'Một ngày không tu, một ngày lùi. Đạo không đợi người.', elder: 'Huyền Thanh Chân Nhân', title: 'Chưởng môn Thái Hư Cốc' },
  { text: 'Đừng tham cảnh giới cao. Tầng nào vững tầng ấy — nền không nứt thì đỉnh không đổ.', elder: 'Trúc Cơ Lão Tổ', title: 'Người giữ Bi Đình' },
  { text: 'Tâm ma không sinh từ bên ngoài. Nó sinh từ việc hôm qua ngươi hứa mà không làm.', elder: 'Tĩnh Tâm Sư Thái', title: 'Ni sư Hàn Nguyệt Am' },
  { text: 'Kẻ đợi linh cảm mới động bút, cả đời chỉ mài mực.', elder: 'Mặc Vân Cư Sĩ', title: 'Ẩn sĩ Vân Lâm' },
  { text: 'Bế quan một canh giờ hơn tán tu ba ngày. Cái quý là không rời tâm.', elder: 'Bắc Minh Lão Tổ', title: 'Tổ sư Bắc Minh Đường' },
  { text: 'Việc nhỏ làm trước thì việc lớn tự nhỏ lại.', elder: 'Thanh Vân Tán Nhân', title: 'Du tăng bốn cõi' },
  { text: 'Ngươi không thiếu thời gian. Ngươi thiếu một thứ đáng để bỏ thời gian vào.', elder: 'Ly Hoả Đạo Quân', title: 'Chủ nhân Đan Lô Phong' },
  { text: 'Chuỗi ngày đứt không đáng sợ. Đáng sợ là ngày thứ hai không nối lại.', elder: 'Trường Sinh Chân Quân', title: 'Người canh Trường Sinh Điện' },
  { text: 'Tu vi là thứ dối trá được ít nhất trong thiên hạ. Làm bao nhiêu, có bấy nhiêu.', elder: 'Vô Danh Kiếm Tu', title: 'Không rõ tông môn' },
  { text: 'Linh căn định điểm khởi hành, không định nơi tới.', elder: 'Kim Đan Trưởng Lão', title: 'Trưởng lão Đan Đường' },
  { text: 'Đọc vạn quyển mà không luyện, chẳng bằng đứng tấn một canh giờ.', elder: 'Thạch Sơn Lão Nhân', title: 'Thủ toạ Luyện Thể Đường' },
  { text: 'Muốn nhanh thì đừng nhảy tầng. Đại đạo không có đường tắt, chỉ có đường vòng.', elder: 'Huyền Thanh Chân Nhân', title: 'Chưởng môn Thái Hư Cốc' },
  { text: 'Việc gấp mà tránh, ngày mai nó thành kiếp nạn.', elder: 'Lôi Kiếp Sứ', title: 'Chấp pháp Thiên Hình Đài' },
  { text: 'Hôm nay ngươi lười một khắc, ngày độ kiếp thiếu đúng một khắc công lực.', elder: 'Bắc Minh Lão Tổ', title: 'Tổ sư Bắc Minh Đường' },
  { text: 'Người bền chí đi chậm vẫn tới. Kẻ nóng vội chạy nhanh rồi ngồi thở.', elder: 'Tĩnh Tâm Sư Thái', title: 'Ni sư Hàn Nguyệt Am' },
  { text: 'Đừng so cảnh giới với người. Hãy so với chính ngươi hôm qua.', elder: 'Thanh Vân Tán Nhân', title: 'Du tăng bốn cõi' },
  { text: 'Bảng nhiệm vụ trống không phải là thanh nhàn — là chưa biết mình muốn gì.', elder: 'Mặc Vân Cư Sĩ', title: 'Ẩn sĩ Vân Lâm' },
  { text: 'Linh thú theo người có đạo tâm. Ngươi bỏ dở, nó cũng bỏ đi.', elder: 'Ngự Thú Trưởng Lão', title: 'Chủ nhân Vạn Thú Cốc' },
  { text: 'Ba việc quan trọng nhất làm xong, ngày đó coi như đắc đạo nhỏ.', elder: 'Kim Đan Trưởng Lão', title: 'Trưởng lão Đan Đường' },
  { text: 'Sợ khó thì mãi ở Luyện Khí. Cảnh giới nào cũng phải trả giá bằng mồ hôi.', elder: 'Ly Hoả Đạo Quân', title: 'Chủ nhân Đan Lô Phong' },
];

/** Châm ngôn theo ngày - mỗi sáng mở app là một lời khác. */
export function aphorismOfDay(seed = new Date()): Aphorism {
  const dayIndex = Math.floor(seed.getTime() / 86_400_000);
  return APHORISMS[dayIndex % APHORISMS.length];
}

/**
 * Tên file chân dung của từng tiền bối trong `public/art/elder/`.
 * Chưa có file thì khối châm ngôn vẫn hiện bình thường, chỉ không có mặt.
 */
const ELDER_SLUG: Record<string, string> = {
  'Bắc Minh Lão Tổ': 'bac-minh',
  'Huyền Thanh Chân Nhân': 'huyen-thanh',
  'Kim Đan Trưởng Lão': 'kim-dan',
  'Ly Hoả Đạo Quân': 'ly-hoa',
  'Lôi Kiếp Sứ': 'loi-kiep',
  'Mặc Vân Cư Sĩ': 'mac-van',
  'Ngự Thú Trưởng Lão': 'ngu-thu',
  'Thanh Vân Tán Nhân': 'thanh-van',
  'Thạch Sơn Lão Nhân': 'thach-son',
  'Trúc Cơ Lão Tổ': 'truc-co',
  'Trường Sinh Chân Quân': 'truong-sinh',
  'Tĩnh Tâm Sư Thái': 'tinh-tam',
  'Vô Danh Kiếm Tu': 'vo-danh',
};

export const elderPortrait = (elder: string) => {
  const slug = ELDER_SLUG[elder];
  return slug ? `/art/elder/${slug}.png` : undefined;
};

/** Lời tiền bối ngẫu nhiên, dùng cho khoảnh khắc đột phá. */
export function randomAphorism(rand: () => number = Math.random): Aphorism {
  return APHORISMS[Math.floor(rand() * APHORISMS.length) % APHORISMS.length];
}
