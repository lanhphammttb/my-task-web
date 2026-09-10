import { cn } from "@/lib/utils";

/**
 * Ấn triện chu sa khắc tên cảnh giới. Con dấu vuông kiểu Á Đông là chi tiết
 * nhận diện mạnh nhất của giao diện tu tiên, dùng ở thẻ cảnh giới và lúc đột phá.
 */
export default function RealmSeal({
  name,
  tier,
  size = "md",
  className,
}: {
  name: string;
  /** Tầng hiện tại; bỏ trống khi đã phi thăng. */
  tier?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  // Tên hai chữ (Kim Đan) xếp 2 dòng cho vuông vắn như con dấu thật.
  const words = name.split(" ");
  const dims = {
    sm: {
      box: "size-11 text-[11px] leading-[1.15]",
      tier: "text-[8.5px] -right-1 -bottom-1 size-4",
    },
    md: {
      box: "size-14 text-[13px] leading-[1.15]",
      tier: "text-[10px] -right-1.5 -bottom-1.5 size-5",
    },
    lg: {
      box: "size-20 text-[17px] leading-[1.15]",
      tier: "text-xs -right-2 -bottom-2 size-6",
    },
  }[size];

  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <span className={cn("seal flex-col p-1 text-center", dims.box)}>
        {words.map((w) => (
          <span key={w} className="block">
            {w}
          </span>
        ))}
      </span>
      {tier !== undefined && (
        <span
          className={cn(
            "bg-card text-gold border-gold/60 absolute grid place-items-center rounded-full border font-bold tabular",
            dims.tier,
          )}
        >
          {tier}
        </span>
      )}
    </span>
  );
}
