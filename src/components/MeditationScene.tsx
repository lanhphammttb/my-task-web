import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { startAmbient } from "../lib/celebrate";
import CultivationProp3D from "./CultivationProp3D";

/**
 * Cảnh bế quan. Khi đồng hồ chạy và người chơi bật âm nền, phát video cùng âm cảnh WebAudio;
 * lúc dừng trở về ảnh tĩnh và dừng âm để giữ pin, sự yên tĩnh.
 */
interface Props {
  running: boolean;
  /** Đang điều tức thì đổi sang tông xanh dịu */
  resting?: boolean;
  /** Người dùng có bật video + âm thanh nền không */
  ambient?: boolean;
  className?: string;
}

export default function MeditationScene({
  running,
  resting = false,
  ambient = true,
  className,
}: Props) {
  const c = resting ? "var(--success)" : "var(--jade)";
  // Máy bật "giảm chuyển động" thì giữ ảnh tĩnh, không chạy phim nền.
  const reduceMotion = useReducedMotion();
  const playAmbient = running && ambient;
  const showVideo = playAmbient && !reduceMotion;
  /** Video tải lỗi thì lùi về ảnh tĩnh động phủ, không lùi sang video khác. */
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    // Âm nền không phải chuyển động: vẫn phát dù video bị tắt.
    if (!playAmbient) return;
    return startAmbient("cave");
  }, [playAmbient]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {showVideo && videoOk ? (
        <video
          // Video chibi của app - cùng nhân vật với sprite đang hiện trên sảnh.
          src="/art/media/be-quan.mp4"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoOk(false)}
          className="h-full w-full object-cover object-[center_28%]"
        />
      ) : (
        <img
        loading="lazy"
        decoding="async"
          src="/art/scene/cave.jpg"
          alt=""
          className="h-full w-full object-cover object-[center_60%]"
        />
      )}

      {/* Nhuộm tông theo trạng thái: nhập định xanh ngọc, điều tức xanh lá */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ background: c, opacity: 0.16 }}
      />
      <div className="from-card/75 absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t to-transparent" />

      {!showVideo && (
        <img
          src="/art/chibi/ngoi-thien.png"
          alt=""
          loading="lazy"
          decoding="async"
          className="focus-disciple absolute bottom-0 right-[-4%] z-[1] w-[28%] object-contain object-bottom drop-shadow-[0_5px_16px_rgba(0,0,0,0.7)]"
        />
      )}

      <CultivationProp3D
        kind="jade-core"
        active={running}
        resting={resting}
        className="focus-core-3d absolute bottom-[7%] left-[4%] z-[1] size-[88px] sm:size-[96px]"
      />

      {/* Vòng linh khí và hạt sáng chỉ chạy khi đồng hồ đang đếm */}
      {running && (
        <svg
          viewBox="0 0 400 250"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g fill="none" stroke={c} strokeWidth="1.2" opacity="0.75">
            {[0, 1, 2].map((i) => (
              <ellipse
                key={i}
                cx="200"
                cy="196"
                rx="44"
                ry="13"
                style={{
                  transformOrigin: "200px 196px",
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
              style={{
                animation: `mote ${4 + (i % 3)}s linear ${i * 0.45}s infinite`,
              }}
            />
          ))}
        </svg>
      )}

    </div>
  );
}
