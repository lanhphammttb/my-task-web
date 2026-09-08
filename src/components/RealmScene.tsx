import { REALMS } from '../lib/cultivation';
import { cn } from '@/lib/utils';

/**
 * Tranh cảnh giới. Dùng art thật trong public/art/scene, phủ thêm một lớp màu
 * của cảnh giới để cả mười bậc nhìn vào là thấy khác nhau ngay.
 */

/** Cảnh nào cho cảnh giới nào. Tám tấm dùng cho mười bậc nên có hai chỗ lặp. */
const REALM_SCENE = [
  'sect', // Luyện Khí - trong tông môn
  'beast', // Trúc Cơ - thung lũng thác nước
  'bicanh', // Kim Đan - rừng linh quang
  'uminh', // Nguyên Anh - u minh giới
  'bicanh', // Hoá Thần
  'main', // Luyện Hư - tiên cung trên mây
  'main', // Hợp Thể
  'bone', // Đại Thừa - khung thần lực
  'tower', // Độ Kiếp - tháp giữa thiên lôi
  'bone', // Phi Thăng
];

interface Props {
  realmIndex: number;
  variant?: 'hero' | 'thumb';
  className?: string;
  /** Độ mờ của lớp phủ màu cảnh giới */
  tint?: number;
}

export default function RealmScene({ realmIndex, variant = 'hero', className, tint = 0.28 }: Props) {
  const i = Math.max(0, Math.min(REALMS.length - 1, realmIndex));
  const realm = REALMS[i];

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)} aria-hidden>
      <img
        src={`/art/scene/${REALM_SCENE[i]}.jpg`}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {/* Nhuộm màu cảnh giới để phân biệt các bậc dùng chung một tấm nền */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ background: realm.color, opacity: tint }}
      />
      {variant === 'hero' && (
        <div className="from-card/85 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
      )}
    </div>
  );
}
