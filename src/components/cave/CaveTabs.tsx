import type { LucideIcon } from "lucide-react";
import ArtImage from "../ArtImage";
import { cn } from "@/lib/utils";

/**
 * Thanh tab của Động Phủ.
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

export interface CaveTab {
  id: string;
  label: string;
  /** Ảnh riêng; thiếu file thì tự lùi về icon nét */
  art?: string;
  Icon: LucideIcon;
  /** Chấm báo có việc đáng làm trong mục này */
  goi?: boolean;
}

export default function CaveTabs({
  tabs,
  dang,
  onChon,
}: {
  tabs: CaveTab[];
  dang: string;
  onChon: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Các mục trong Động Phủ"
      className="cave-tabs"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === dang}
          aria-controls={t.id}
          className={cn("cave-tab", t.id === dang && "cave-tab-dang")}
          onClick={() => onChon(t.id)}
        >
          <span className="cave-tab-vien">
            {t.art ? (
              <ArtImage src={t.art} alt="" className="cave-tab-anh" />
            ) : (
              <t.Icon className="size-5" />
            )}
            {t.goi && <i className="cave-tab-cham" />}
          </span>
          <span className="cave-tab-ten">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
