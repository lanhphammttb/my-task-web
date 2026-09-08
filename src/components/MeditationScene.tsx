import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Cảnh bế quan. Khi đồng hồ chạy thì phát video tu luyện và nhạc nền; lúc dừng
 * thì trở về ảnh tĩnh động phủ để không tốn pin và không gây ồn.
 */
interface Props {
  running: boolean;
  /** Đang điều tức thì đổi sang tông xanh dịu */
  resting?: boolean;
  /** Người dùng có bật video + nhạc nền không */
  ambient?: boolean;
  className?: string;
}

export default function MeditationScene({ running, resting = false, ambient = true, className }: Props) {
  const c = resting ? 'var(--success)' : 'var(--jade)';
  const audioRef = useRef<HTMLAudioElement>(null);
  const showVideo = running && ambient;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (showVideo) {
      el.volume = 0.35;
      // Bấm "Bắt đầu" là một cử chỉ người dùng nên trình duyệt cho phép phát.
      void el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [showVideo]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {showVideo ? (
        <video
          src="/art/media/tu.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src="/art/scene/cave.jpg"
          alt=""
          className="h-full w-full object-cover object-[center_60%]"
        />
      )}

      {/* Nhuộm tông theo trạng thái: nhập định xanh ngọc, điều tức xanh lá */}
      <div className="absolute inset-0 mix-blend-overlay" style={{ background: c, opacity: 0.16 }} />
      <div className="from-card/90 absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t to-transparent" />

      {/* Vòng linh khí và hạt sáng chỉ chạy khi đồng hồ đang đếm */}
      {running && (
        <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
          <g fill="none" stroke={c} strokeWidth="1.2" opacity="0.75">
            {[0, 1, 2].map((i) => (
              <ellipse
                key={i}
                cx="200"
                cy="196"
                rx="44"
                ry="13"
                style={{
                  transformOrigin: '200px 196px',
                  animation: `qi-wave 3.6s ease-out ${i * 1.2}s infinite`,
                }}
              />
            ))}
          </g>
          {Array.from({ length: 9 }, (_, i) => (
            <circle
              key={i}
              cx={120 + i * 21}
              cy={196}
              r={i % 2 ? 1.8 : 1.2}
              fill={c}
              opacity="0.7"
              style={{ animation: `mote ${4 + (i % 3)}s linear ${i * 0.45}s infinite` }}
            />
          ))}
        </svg>
      )}

      <audio ref={audioRef} src="/art/media/ambient.mp3" loop preload="none" />
    </div>
  );
}
