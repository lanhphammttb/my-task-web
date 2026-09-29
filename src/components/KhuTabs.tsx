import { useLayoutEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import ArtImage from "./ArtImage";
import { cn } from "@/lib/utils";

/**
 * Thanh tab dùng chung cho các khu nhiều mục (Động Phủ, Tiên Lộ).
 *
 * Thay cho dãy chip cũ: chip ấy bấm vào chỉ CUỘN tới một mục nằm đâu đó trong
 * một trang dài tám mục. Đó là lối của trang tài liệu, không phải của game -
 * bấm xong màn hình trôi đi, không biết mình đang ở đâu, và muốn sang mục khác
 * lại phải cuộn ngược lên tìm dãy chip.
 *
 * Tab thì đổi hẳn nội dung: mỗi lúc chỉ một mục, luôn bắt đầu từ đầu mục, và
 * thanh tab luôn nằm nguyên chỗ cũ. Trên màn 375x667 khác biệt này là lớn nhất,
 * vì trang cũ dài hơn màn tới bốn lần.
 *
 * Mỗi tab có ảnh riêng để nhận ra bằng mắt thay vì đọc chữ - cùng một lý do đã
 * dùng cho dãy nút tròn bên rìa.
 */

export interface KhuTab {
  id: string;
  label: string;
  /** Ảnh riêng; thiếu file thì tự lùi về icon nét */
  art?: string;
  Icon: LucideIcon;
  /** Chấm báo có việc đáng làm trong mục này */
  goi?: boolean;
}

export default function KhuTabs({
  tabs,
  dang,
  onChon,
  nhan,
}: {
  tabs: KhuTab[];
  dang: string;
  onChon: (id: string) => void;
  /** Nhãn trợ năng, ví dụ "Các mục trong Động Phủ" */
  nhan: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Tab được mở từ hotspot trong căn phòng cũng phải cuộn vào tầm mắt; nếu
  // không, trạng thái đổi nhưng mục đang chọn vẫn nằm ngoài màn hình ngang.
  useLayoutEffect(() => {
    const showSelected = () => {
      const selected = selectedRef.current;
      const list = listRef.current;
      if (!selected || !list) return;
      const viewport = list.getBoundingClientRect();
      const item = selected.getBoundingClientRect();
      const gutter = 8;
      let next = list.scrollLeft;
      if (item.left < viewport.left + gutter) next += item.left - viewport.left - gutter;
      else if (item.right > viewport.right - gutter) next += item.right - viewport.right + gutter;
      next = Math.max(0, Math.min(next, list.scrollWidth - list.clientWidth));
      if (Math.abs(next - list.scrollLeft) < 1) return;
      // Set scrollLeft directly: smooth scroll can be interrupted by touch
      // scroll-snap on mobile, leaving the selected tab clipped at the edge.
      list.scrollLeft = next;
    };

    showSelected();
    window.addEventListener("resize", showSelected, { passive: true });
    return () => window.removeEventListener("resize", showSelected);
  }, [dang, tabs.length]);

  return (
    <div
      role="tablist"
      aria-label={nhan}
      ref={listRef}
      className="khu-tabs"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          id={`${t.id}-tab`}
          role="tab"
          ref={t.id === dang ? selectedRef : undefined}
          aria-selected={t.id === dang}
          aria-controls={t.id}
          className={cn("khu-tab", t.id === dang && "khu-tab-dang")}
          onClick={() => onChon(t.id)}
        >
          <span className="khu-tab-vien">
            {t.art ? (
              <ArtImage src={t.art} alt="" className="khu-tab-anh" />
            ) : (
              <t.Icon className="size-5" />
            )}
            {t.goi && <i className="khu-tab-cham" />}
          </span>
          <span className="khu-tab-ten">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
