import { REALMS } from "../lib/cultivation";
import ArtImage from "./ArtImage";
import { REALM_SLUG, SCENE_FALLBACK } from "../lib/realmArt";
import { cn } from "@/lib/utils";

/**
 * Tranh cảnh giới. Dùng art thật trong public/art/scene, phủ thêm một lớp màu
 * của cảnh giới để cả mười bậc nhìn vào là thấy khác nhau ngay.
 */

// Dùng chung bộ art cảnh giới với nền hub để thẻ và nền không lệch nhau.

interface Props {
  realmIndex: number;
  variant?: "hero" | "thumb";
  className?: string;
  /** Độ mờ của lớp phủ màu cảnh giới */
  tint?: number;
}

export default function RealmScene({
  realmIndex,
  variant = "hero",
  className,
  tint = 0.28,
}: Props) {
  const i = Math.max(0, Math.min(REALMS.length - 1, realmIndex));
  const realm = REALMS[i];

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      aria-hidden
    >
      <ArtImage
        src={`/art/realm/${REALM_SLUG[i]}.jpg`}
        fallback={SCENE_FALLBACK}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {/* Nhuộm màu cảnh giới để phân biệt các bậc dùng chung một tấm nền */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ background: realm.color, opacity: tint }}
      />
      {/* Hạ sáng nền tranh để chữ và vòng tiến độ đè lên vẫn đọc được */}
      <div className="bg-background/45 absolute inset-0" />
      {variant === "hero" && (
        <div className="from-card absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
      )}
    </div>
  );
}
