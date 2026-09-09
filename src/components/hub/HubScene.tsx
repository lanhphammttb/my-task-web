import { REALMS } from '../../lib/cultivation';
import ArtImage from '../ArtImage';
import { cn } from '@/lib/utils';

/**
 * Tên file nền riêng cho từng cảnh giới. Thả ảnh vào `public/art/realm/` theo
 * đúng tên này là web tự dùng; chưa có thì lùi về bộ art dùng chung bên dưới.
 */
export const REALM_SLUG = [
  '01-luyen-khi',
  '02-truc-co',
  '03-kim-dan',
  '04-nguyen-anh',
  '05-hoa-than',
  '06-luyen-hu',
  '07-hop-the',
  '08-dai-thua',
  '09-do-kiep',
  '10-phi-thang',
];

/**
 * Ảnh nền là ảnh vuông, còn khung hiển thị là 16:9 (máy tính) hoặc dọc (điện
 * thoại) — nên trình duyệt luôn phải cắt. Toạ độ dưới đây neo phần đáng giá
 * nhất của từng tranh vào vùng còn thấy được: trục X theo hướng lệch của chủ
 * thể (quan trọng khi màn hình dọc), trục Y theo chỗ đặt điểm nhìn.
 */
const REALM_FOCUS = [
  '62% 50%', // Luyện Khí - đệ tử ngồi thiền bên phải
  '62% 58%', // Trúc Cơ - đài bát quái nằm thấp
  '38% 50%', // Kim Đan - lò đan bên trái
  '62% 55%', // Nguyên Anh - nguyên anh và mặt nước
  '38% 50%', // Hoá Thần - cây tùng bên trái, biển mây
  '62% 50%', // Luyện Hư - cổng đá bên phải
  '38% 50%', // Hợp Thể - dãy điện bên trái
  '50% 50%', // Đại Thừa - đối xứng hai bên
  '58% 66%', // Độ Kiếp - đài đá hứng lôi nằm sát đáy
  '58% 45%', // Phi Thăng - cổng trời trên cao bên phải
];

/** Bộ nền dùng chung, đóng vai trò ảnh lùi khi chưa có ảnh riêng. */
const REALM_BG = [
  '/art/page/sect.jpg', // Luyện Khí
  '/art/page/bicanh.jpg', // Trúc Cơ
  '/art/page/bicanh.jpg', // Kim Đan
  '/art/page/uminh.jpg', // Nguyên Anh
  '/art/page/bicanh.jpg', // Hoá Thần
  '/art/page/hub.jpg', // Luyện Hư
  '/art/scene/main.jpg', // Hợp Thể
  '/art/page/bone.jpg', // Đại Thừa
  '/art/page/tower.jpg', // Độ Kiếp
  '/art/page/bone.jpg', // Phi Thăng
];

/** Toạ độ hạt linh khí - cố định để lần render nào cũng như nhau. */
const MOTES = [
  { x: 8, size: 3, delay: 0, dur: 11 },
  { x: 19, size: 2, delay: 3.5, dur: 14 },
  { x: 31, size: 4, delay: 1.4, dur: 9 },
  { x: 44, size: 2, delay: 6, dur: 13 },
  { x: 57, size: 3, delay: 2.2, dur: 10 },
  { x: 68, size: 2, delay: 4.8, dur: 15 },
  { x: 79, size: 4, delay: 0.7, dur: 12 },
  { x: 91, size: 3, delay: 5.4, dur: 10.5 },
];

interface Props {
  realmIndex: number;
  /** Ảnh đè lên cảnh giới, dùng khi mở một bảng có nền riêng. */
  override?: string;
  /** Ảnh lùi cho `override` khi file riêng chưa có. */
  overrideFallback?: string;
  className?: string;
}

/**
 * Nền cinematic toàn màn của hub: ảnh cảnh giới phóng rất chậm, phủ vignette,
 * bụi sao và một dải sương trôi ngang. Đây là thứ tạo cảm giác "đang ở trong
 * game" thay vì "đang xem một trang quản lý công việc".
 */
export default function HubScene({ realmIndex, override, overrideFallback, className }: Props) {
  const i = Math.max(0, Math.min(REALMS.length - 1, realmIndex));
  const realm = REALMS[i];
  const src = override ?? `/art/realm/${REALM_SLUG[i]}.jpg`;
  const fallback = override ? overrideFallback : REALM_BG[i];

  return (
    <div className={cn('pointer-events-none fixed inset-0 -z-20 overflow-hidden', className)} aria-hidden>
      <ArtImage
        src={src}
        fallback={fallback}
        alt=""
        className="animate-slow-zoom h-full w-full object-cover"
        style={{
          objectPosition: override ? '50% 50%' : REALM_FOCUS[i],
          opacity: 'calc(1 - var(--scene-dim))',
          // Ép tương phản theo từng chế độ: đêm thì hạ sáng, ngày thì giữ nguyên.
          filter: 'var(--scene-filter)',
        }}
      />

      {/* Màn tối phủ đều: giữ nền luôn chìm dưới HUD và các bảng */}
      <div
        className="absolute inset-0"
        style={{ background: 'color-mix(in oklab, var(--background) 22%, transparent)' }}
      />

      {/* Nhuộm sắc cảnh giới để mười bậc nhìn vào là thấy khác nhau ngay */}
      <div className="absolute inset-0 mix-blend-overlay" style={{ background: realm.color, opacity: 0.22 }} />

      {/* Vignette: tối bốn cạnh để HUD và bảng nổi lên trên */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(102% 80% at 50% 44%, transparent 0%, color-mix(in oklab, var(--background) 48%, transparent) 52%, var(--background) 98%)',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-48"
        style={{ background: 'linear-gradient(to bottom, var(--background), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-64"
        style={{ background: 'linear-gradient(to top, var(--background), transparent)' }}
      />

      {/* Bụi sao trôi rất chậm */}
      <div className="stardust animate-drift absolute inset-0 opacity-70" />

      {/* Dải sương ngang thân màn hình */}
      <div className="fog-band absolute inset-x-0 top-1/3 h-52 opacity-60 blur-2xl" />

      {/* Hạt linh khí bay lên từ đáy màn hình */}
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="absolute bottom-24 rounded-full"
          style={{
            left: `${m.x}%`,
            width: m.size,
            height: m.size,
            background: 'var(--gold-bright)',
            boxShadow: '0 0 6px var(--gold-glow)',
            animation: `mote ${m.dur}s linear ${m.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
