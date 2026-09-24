import { useEffect, useRef } from "react";
import {
  Mountain,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { ViewKey } from "../../types";
import { useChromeVar } from "./useChromeVar";
import { useFocusTimer } from "../../store/FocusTimer";
import { clockLabel } from "../../lib/date";

/*
 * Thanh dưới chỉ còn MỘT lối: về Sơn Môn.
 *
 * Trước đây đây là dãy tab Sơn Môn / Hành Sự / Bế Quan / Đại Nguyện / Tiên
 * giới. Nhưng thanh tab dưới đáy là kiểu app công việc, mà "đi tới đâu" thì
 * giờ đã có dãy nút tròn bám mép phải lo - để cả hai thì thành hai hệ điều
 * hướng song song, còn khó nhớ hơn lúc chưa sửa.
 *
 * Những thứ còn lại dưới này đều là HÀNH ĐỘNG chứ không phải nơi chốn: tra
 * cứu, về sảnh, thêm việc.
 */
const destinations = [
  {
    key: null,
    icon: Mountain,
    label: "Sơn Môn",
    accessible: "Sơn Môn",
    hint: "Về sảnh",
    art: undefined,
  },
] as const;

interface Props {
  view: ViewKey | null;
  searching: boolean;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  alerts?: Partial<Record<ViewKey, boolean>>;
  onSelect: (view: ViewKey | null) => void;
  onNew: () => void;
  query: string;
  onQuery: (query: string) => void;
}

/** One persistent navigation system for every screen and viewport. */
export default function FooterMenu({
  view,
  searching,
  searchOpen,
  onSearchOpenChange,
  alerts,
  onSelect,
  onNew,
  query,
  onQuery,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const timer = useFocusTimer();
  useChromeVar(ref, "--footer-h");
  useEffect(() => {
    if (searchOpen) document.getElementById("search-input")?.focus();
  }, [searchOpen]);
  const expanded = searchOpen || searching;

  return (
    <nav
      ref={ref}
      aria-label="Thanh điều hướng chính"
      className="app-navigation glass-panel"
    >
      <div className="navigation-tools">
        <button
          type="button"
          className="navigation-tool"
          aria-label={expanded ? "Đóng tra cứu" : "Tra cứu nhiệm vụ"}
          aria-expanded={expanded}
          aria-controls="task-search"
          onClick={() => {
            onSearchOpenChange(!expanded);
            if (expanded) onQuery("");
          }}
        >
          {expanded ? <X className="size-4" /> : <Search className="size-4" />}
        </button>
        <span className="navigation-brand">ĐẠO TRÌNH</span>
      </div>
      <div className="primary-destinations">
        {destinations.map((item) => {
          const active =
            !searching &&
            (view === item.key ||
              (item.key === "today" && (view === "week" || view === "month")));
          return (
            <button
              key={item.key ?? "home"}
              type="button"
              className="primary-destination"
              aria-label={item.accessible}
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect(item.key)}
            >
              <span className="destination-icon">
                {item.art ? (
                  <img
                    src={item.art}
                    alt=""
                    className="size-7 object-contain"
                  />
                ) : (
                  <item.icon className="size-5" />
                )}
                {item.key &&
                  (alerts?.[item.key] ||
                    (item.key === "focus" && timer.inSession)) && (
                    <i className="nav-notification" />
                  )}
              </span>
              <span>{item.label}</span>
              <small>
                {item.key === "focus" && timer.inSession
                  ? `${clockLabel(timer.seconds)} · ${timer.running ? "đang chạy" : "tạm dừng"}`
                  : item.hint}
              </small>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-game navigation-add"
        aria-label="Nhiệm vụ mới"
        title="Nhiệm vụ mới (N)"
        onClick={onNew}
      >
        <Plus className="size-5" />
        <span>Thêm việc</span>
      </button>
      <div id="task-search" className="navigation-search" hidden={!expanded}>
        <Search className="size-4 shrink-0 text-gold" />
        <input
          id="search-input"
          type="search"
          aria-label="Tìm nhiệm vụ hoặc nhãn"
          placeholder="Tìm nhiệm vụ, nhãn... (/)"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Xoá tìm kiếm"
            onClick={() => onQuery("")}
          >
            <X className="size-4" />
          </button>
        )}
        <kbd>/</kbd>
      </div>
    </nav>
  );
}
