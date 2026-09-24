import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OPEN_SECTION } from "../lib/section";
import { cn } from "@/lib/utils";

/** Nhãn metadata nhỏ, thay cho việc nhồi emoji vào chuỗi văn bản. */
export function MetaChip({
  icon: Icon,
  children,
  className,
  style,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap",
        "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2.25} />}
      {children}
    </span>
  );
}

/** Khối nội dung có tiêu đề - khung chuẩn cho mọi mục trong app. */
export function Section({
  id,
  title,
  subtitle,
  subtitleClassName,
  icon: Icon,
  action,
  children,
  className,
  tone = "default",
  collapsible = false,
  defaultOpen = true,
}: {
  /** Neo để hub cuộn thẳng tới mục này khi mở từ icon bên rìa. */
  id?: string;
  title?: string;
  subtitle?: string;
  /**
   * Lớp thêm cho dòng phụ đề. Dùng `chi-man-rong` cho những câu chỉ giải thích
   * cách dùng - trên điện thoại chúng chắn mất nội dung mà không nói thêm gì.
   */
  subtitleClassName?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "danger";
  /**
   * Cho gập lại. Dùng cho những bảng dài mà phần lớn thời gian người dùng chỉ
   * ghé một hai mục - Động Phủ có tám mục, để mở hết thì cuộn mãi không tới
   * nơi, nhất là trên điện thoại.
   */
  collapsible?: boolean;
  /** Gập hay mở khi vừa vào. Chỉ có tác dụng khi `collapsible`. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible || defaultOpen);

  // Mở từ icon bên rìa thì phải bung ra, nếu không người dùng nhảy tới đúng
  // mục mình cần mà chỉ thấy một cái tiêu đề đang gập. Bảng phủ không dùng
  // `location.hash` mà cuộn bằng `getElementById`, nên phải nghe sự kiện riêng.
  useEffect(() => {
    if (!collapsible || !id) return;
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) setOpen(true);
    };
    window.addEventListener(OPEN_SECTION, onOpen);
    return () => window.removeEventListener(OPEN_SECTION, onOpen);
  }, [collapsible, id]);

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-4 rounded-xl border p-4 sm:p-5",
        tone === "default" && "border-border bg-card/80 backdrop-blur-[2px]",
        tone === "accent" &&
          "border-primary/35 bg-primary/[0.07] backdrop-blur-[2px]",
        tone === "danger" &&
          "border-destructive/40 bg-destructive/[0.07] backdrop-blur-[2px]",
        className,
      )}
    >
      {(title || action) && (
        <header
          className={cn(
            "flex flex-wrap items-start justify-between gap-3",
            open ? "mb-4" : "mb-0",
          )}
        >
          <div className="flex min-w-0 items-start gap-2">
            {collapsible && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={id ? `${id}-body` : undefined}
                className="text-muted-foreground hover:text-gold mt-0.5 shrink-0 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    !open && "-rotate-90",
                  )}
                />
                <span className="sr-only">
                  {open ? "Thu gọn" : "Mở rộng"} {title}
                </span>
              </button>
            )}
            <div className="min-w-0">
            {title && (
              <h3 className="font-heading flex items-center gap-2 text-[15px] font-bold tracking-wide">
                {Icon && (
                  <Icon
                    className={cn(
                      "size-4",
                      tone === "danger"
                        ? "text-destructive"
                        : tone === "accent"
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                  />
                )}
                {title}
              </h3>
            )}
              {subtitle && (
                <p className={cn("text-muted-foreground mt-0.5 text-xs", subtitleClassName)}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action}
        </header>
      )}
      {/* Gập bằng `hidden` chứ không tháo khỏi cây: giữ nguyên trạng thái bên
          trong (ô đang gõ, hộp thoại đang mở) và không dựng lại từ đầu mỗi lần
          bung ra. */}
      <div id={id ? `${id}-body` : undefined} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

/** Trạng thái rỗng có gợi ý hành động tiếp theo, không để màn hình trắng trơ. */
export function EmptyState({
  icon: Icon,
  art,
  title,
  hint,
  className,
}: {
  icon: LucideIcon;
  /**
   * Tên minh hoạ trong `public/art/empty/`. Có file thì hiện tranh 72 px thay
   * cho icon nét 28 px; chưa có thì lùi về icon, layout không đổi.
   */
  art?: string;
  title: string;
  hint?: string;
  className?: string;
}) {
  const [artOk, setArtOk] = useState(true);
  const showArt = !!art && artOk;

  return (
    <div
      className={cn(
        "border-border/70 rounded-xl border border-dashed px-4 py-8 text-center",
        className,
      )}
    >
      {showArt ? (
        <img
        loading="lazy"
        decoding="async"
          src={`/art/empty/${art}.png`}
          alt=""
          onError={() => setArtOk(false)}
          className="mx-auto mb-3 size-[72px] object-contain opacity-90"
        />
      ) : (
        <Icon
          className="text-muted-foreground/70 mx-auto mb-3 size-7"
          strokeWidth={1.75}
        />
      )}
      <p className="text-sm font-semibold">{title}</p>
      {hint && (
        <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Thanh tiến độ mảnh, tự chạy hoạt ảnh khi giá trị đổi. */
export function Meter({
  value,
  className,
  barClassName,
  height = 6,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  height?: number;
}) {
  const pct =
    Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div
      className={cn("bg-muted w-full overflow-hidden rounded-full", className)}
      style={{ height }}
    >
      <div
        className={cn(
          "bg-primary h-full rounded-full transition-[width] duration-700 ease-out",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Ô chỉ số lớn dùng ở trang thống kê. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card/80 rounded-lg border p-4",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className="tabular mt-1.5 text-2xl font-bold tracking-tight">
        {value}
      </div>
      {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
    </div>
  );
}
