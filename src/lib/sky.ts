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
  "ascension", // Phi Thăng: trời quang, không còn thiên lôi
] as const;

export function skyForRealm(realmIndex: number) {
  const i = Math.max(0, Math.min(SKY_BY_REALM.length - 1, realmIndex));
  if (SKY_BY_REALM[i] === "ascension") return "/art/world/ascension-sky-v1.webp";
  return `/art/sky/${SKY_BY_REALM[i]}.webp`;
}
