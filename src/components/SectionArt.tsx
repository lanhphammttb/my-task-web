import type { ReactNode } from "react";
import ArtImage from "./ArtImage";
import { cn } from "@/lib/utils";

/**
 * Ô tranh vuông mở đầu một mục, kèm đoạn dẫn nằm bên cạnh.
 *
 * Các mục có từ đầu (đan dược, linh thú, linh căn) đều dẫn bằng một ô hình nhỏ
 * rồi chữ nằm cạnh, còn mấy mục thêm sau thì toàn chữ với chip - đặt cạnh nhau
 * là thấy ngay hai thứ không cùng một app.
 *
 * Cố ý là ô **vuông** chứ không phải dải ngang. Bộ tranh này đều đặt chủ thể
 * giữa khung, cắt thành dải mỏng thì chỉ được một lát nền trống, còn cắt vuông
 * từ giữa ra thì trúng ngay chủ thể.
 */
export default function SectionArt({
  src,
  fallback,
  caption,
  tone,
  focus,
  children,
  className,
}: {
  src: string;
  fallback?: string;
  /**
   * Toạ độ neo khi cắt, dạng `objectPosition`.
   *
   * Bộ tranh này là cảnh rộng chứ không phải ảnh chụp vật thể, và không phải
   * tấm nào cũng đặt chủ thể giữa khung - `linh-thao.jpg` chẳng hạn có cụm hoa
   * sáng nằm sát mép trái còn chính giữa là nền tối trống trơn. Cắt vuông từ
   * giữa ra là được đúng một ô đen. Neo lại thì trúng chủ thể.
   */
  focus?: string;
  /** Chữ nhỏ dưới ô tranh, thường là tên nơi chốn */
  caption?: string;
  /** Màu viền và màu chữ chú thích, thường lấy theo tông của mục */
  tone?: string;
  /** Đoạn dẫn của mục, nằm bên phải ô tranh */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-start gap-3", className)}>
      <div className="shrink-0">
        <div
          className="relative size-20 overflow-hidden rounded-xl border sm:size-24"
          style={{ borderColor: tone ? `${tone}59` : undefined }}
        >
          <ArtImage
            src={src}
            fallback={fallback}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: focus ?? "50% 50%" }}
          />
          {/* Phủ nhẹ cho ô tranh chìm về tông chung, khỏi chọi với chữ bên cạnh */}
          <div className="absolute inset-0 bg-(--background)/15" />
        </div>
        {caption && (
          <p
            className="font-title mt-1 max-w-20 text-[10px] leading-tight font-bold sm:max-w-24"
            style={{ color: tone }}
          >
            {caption}
          </p>
        )}
      </div>

      {children && (
        <p className="text-muted-foreground min-w-48 flex-1 text-xs leading-relaxed">
          {children}
        </p>
      )}
    </div>
  );
}
