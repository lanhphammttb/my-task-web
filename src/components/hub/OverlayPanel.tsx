import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import ArtImage from "../ArtImage";
import { requestOpenSection } from "../../lib/section";
import { hasKeyboardLayer } from "../../lib/keyboard";

interface Props {
  title: string;
  subtitle?: string;
  /** Ảnh nền riêng của bảng, hiện mờ ở dải đầu. */
  banner?: string;
  /** Ảnh lùi khi file riêng của bảng chưa có. */
  bannerFallback?: string;
  onClose: () => void;
  /** Neo cuộn tới khi bảng vừa mở, ví dụ "cave-beast". */
  anchor?: string;
  children: ReactNode;
}

/**
 * Bảng phủ toàn màn hình - cách Tiên Ma Giới mở mọi chức năng: trượt lên từ
 * đáy, che hub bằng kính mờ, có nút đóng để quay lại hub. Đây cũng là vùng
 * cuộn duy nhất của bảng nên nội dung dài vẫn cuộn mượt.
 */
export default function OverlayPanel({
  title,
  subtitle,
  banner,
  bannerFallback,
  onClose,
  anchor,
  children,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !hasKeyboardLayer()) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cuộn tới đúng mục khi mở bảng từ một icon cụ thể (ví dụ Linh Thú).
  useEffect(() => {
    if (!anchor) return;
    // Lazy-loaded views may arrive after the panel: wait for the actual target.
    let frame = 0;
    const reveal = () => {
      const target = document.getElementById(anchor);
      if (!target) return false;
      requestOpenSection(anchor);
      frame = requestAnimationFrame(() => target.scrollIntoView({
        block: "start", behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      }));
      return true;
    };
    if (reveal()) return () => cancelAnimationFrame(frame);
    const observer = new MutationObserver(() => { if (reveal()) observer.disconnect(); });
    if (scroller.current) observer.observe(scroller.current, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [anchor]);

  return (
    <motion.section
      role="dialog"
      aria-modal="false"
      aria-label={title}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 22 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      // Chừa chỗ theo chiều cao ĐO ĐƯỢC của HUD và thanh tab, không đóng cứng:
      // thanh tab trên điện thoại cao 129px chứ không phải 86px.
      style={{
        top: "calc(var(--hud-h, 92px) + 6px)",
        bottom: "calc(var(--footer-h, 86px) + 6px)",
      }}
      className="panel-shell absolute inset-x-0 z-20 mx-auto flex min-h-0 w-full max-w-5xl flex-col px-2 sm:px-4"
    >
      <div className="glass-panel panel-solid flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        {/* ------------------------------------------------------------ đầu bảng */}
        <div className="relative shrink-0 overflow-hidden">
          {banner && (
            <>
              <ArtImage
                src={banner}
                fallback={bannerFallback}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, var(--glass-bg))",
                }}
              />
            </>
          )}
          <div className="relative flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-title glow-text truncate text-[15px] font-black tracking-[0.14em] uppercase">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground truncate text-[11px]">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng"
              className="glass-panel text-gold hover:text-gold-bright grid size-8 shrink-0 place-items-center rounded-full transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="rule-gold" />
        </div>

        {/* Vùng cuộn duy nhất của bảng */}
        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        >
          {children}
        </div>
      </div>
    </motion.section>
  );
}
