import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cột icon nổi ở rìa màn hình. Máy rộng thì là cột dọc bám mép trái/phải,
 * máy hẹp thì rải thành hàng ngang ngay dưới HUD.
 */
export default function SideRail({
  side,
  label,
  /** Máy hẹp: bảng phủ che kín màn hình nên hai hàng icon phải nhường chỗ. */
  collapsed,
  children,
}: {
  side: "left" | "right";
  label: string;
  collapsed?: boolean;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      // Máy hẹp: hai hàng icon xếp dưới HUD. Bám theo chiều cao HUD đo được,
      // vì HUD cao 84-92px tuỳ máy nên top cứng sẽ đè lên nó. Hàng dưới lùi
      // thêm 92px để nhãn hai dòng của hàng trên không chạm tới.
      // Đặt qua biến CSS chứ không đặt thẳng `top`: style nội tuyến sẽ đè cả
      // `lg:top-1/2`, làm hai cột trên máy rộng bị ghim lên sát HUD.
      style={
        {
          "--rail-top": `calc(var(--hud-h, 92px) + ${side === "left" ? "4px" : "96px"})`,
        } as CSSProperties
      }
      className={cn(
        "absolute z-20 flex transition-opacity duration-200",
        collapsed
          ? "pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-100"
          : "pointer-events-auto",
        // Máy hẹp: hàng ngang, cuộn ngang nếu chật.
        "top-[var(--rail-top)] right-0 left-0 justify-center gap-1 overflow-x-auto px-2",

        // Máy rộng: cột dọc bám mép, canh giữa theo chiều cao.
        "lg:top-1/2 lg:w-20 lg:flex-col lg:justify-start lg:gap-3 lg:overflow-visible lg:px-0",
        "lg:-translate-y-1/2",
        side === "left" ? "lg:right-auto lg:left-3" : "lg:right-3 lg:left-auto",
      )}
    >
      {children}
    </nav>
  );
}
