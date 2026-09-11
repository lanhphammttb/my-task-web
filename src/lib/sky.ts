/**
 * Panorama trời cho lớp 3D. Bốn tấm phủ đủ mười cảnh giới — đổi trời theo bậc
 * tu là cách rẻ nhất để cả thế giới đổi cảm giác khi đột phá.
 */
const SKY_BY_REALM = [
  "dawn", // Luyện Khí
  "dawn", // Trúc Cơ
  "gold", // Kim Đan
  "gold", // Nguyên Anh
  "gold", // Hoá Thần
  "void", // Luyện Hư
  "void", // Hợp Thể
  "storm", // Đại Thừa
  "storm", // Độ Kiếp
  "storm", // Phi Thăng
] as const;

export function skyForRealm(realmIndex: number) {
  const i = Math.max(0, Math.min(SKY_BY_REALM.length - 1, realmIndex));
  return `/art/sky/${SKY_BY_REALM[i]}.webp`;
}
