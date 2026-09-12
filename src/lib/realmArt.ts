/**
 * Hằng số ảnh nền cảnh giới.
 *
 * Tách khỏi `HubScene.tsx` vì bốn tệp khác cũng dùng, mà tệp component thì chỉ
 * nên xuất component - lẫn hằng số vào là Fast Refresh mất tác dụng cho cả tệp.
 * Cùng chỗ với `lib/icons.ts` và `lib/sky.ts` cho nhất quán.
 */

/**
 * Tên file nền riêng cho từng cảnh giới. Thả ảnh vào `public/art/realm/` theo
 * đúng tên này là web tự dùng; chưa có thì lùi về ảnh dùng chung bên dưới.
 */
export const REALM_SLUG = [
  "01-luyen-khi",
  "02-truc-co",
  "03-kim-dan",
  "04-nguyen-anh",
  "05-hoa-than",
  "06-luyen-hu",
  "07-hop-the",
  "08-dai-thua",
  "09-do-kiep",
  "10-phi-thang",
];

/**
 * Ảnh lùi dùng chung cho mọi chỗ cần nền cảnh. Bộ art đã đủ nên nó gần như
 * không bao giờ hiện; giữ lại một tấm để nếu thiếu file thì vẫn có gì đó thay
 * vì một mảng đen, mà không phải đóng gói cả bộ ảnh dự phòng vào bản build.
 */
export const SCENE_FALLBACK = "/art/scene/cave.jpg";
