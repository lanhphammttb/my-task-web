import { useRef, useState } from "react";
import { Moon, Mountain, Orbit, Plus, Search, Sun, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ViewKey } from "../../types";
import { useChromeVar } from "./useChromeVar";
import { cn } from "@/lib/utils";

/**
 * Bốn bậc thời khoá.
 *
 * Trước đây chỗ này ghi "Hôm nay / Tuần / Tháng / Mục tiêu" - giọng ứng dụng
 * lịch, chọi hẳn với cột hai bên vốn nói Bế Quan, Linh Căn, Đan Đường. Chữ
 * "khoá" (課) là bài tập thầy giao phải làm trong ngày, nên gọi thế thì cái lịch
 * thôi không còn là lịch: nó thành thời khoá tông môn giao xuống. Bộ Nhật ·
 * Tuần · Nguyệt song song nhau nên bậc thời gian vẫn đọc ra ngay.
 */
const FOOTER_TABS: { key: ViewKey; icon: LucideIcon; label: string }[] =
  [
    { key: "today", icon: Sun, label: "Nhật Khoá" },
    { key: "week", icon: Orbit, label: "Tuần Khoá" },
    { key: "month", icon: Moon, label: "Nguyệt Khoá" },
    { key: "goals", icon: Mountain, label: "Đại Nguyện" },
  ];

interface Props {
  view: ViewKey | null;
  onSelect: (v: ViewKey) => void;
  onNew: () => void;
  query: string;
  onQuery: (q: string) => void;
}

/**
 * Thanh tab dưới cùng - nơi đặt phần "kế hoạch" thật sự của ứng dụng.
 * Bấm lại tab đang mở thì đóng bảng để quay về hub.
 */
export default function FooterMenu({
  view,
  onSelect,
  onNew,
  query,
  onQuery,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useChromeVar(ref, "--footer-h");

  return (
    <nav
      ref={ref}
      aria-label="Thanh điều hướng chính"
      className="glass-panel pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1.5 rounded-t-2xl px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3"
    >
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        {/* Ô tra cứu chỉ dựng một lần; màn hình hẹp thì bấm kính lúp mới hiện. */}
        <div
          className={cn(
            "order-last basis-full sm:order-first sm:basis-56",
            searchOpen ? "block" : "hidden sm:block",
          )}
        >
          <SearchField query={query} onQuery={onQuery} />
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Tra cứu nhiệm vụ"
          className="glass-panel text-gold grid size-10 shrink-0 place-items-center rounded-xl sm:hidden"
        >
          {searchOpen ? (
            <X className="size-4" />
          ) : (
            <Search className="size-4" />
          )}
        </button>

        {/* min-w-0: thiếu nó thì nhóm tab không co được, đẩy nút "+" rớt
            xuống hàng thứ hai ở góc trái trên máy hẹp. */}
        <div className="mx-auto flex min-w-0 flex-1 items-center justify-around gap-1 sm:max-w-md">
          {FOOTER_TABS.map((t) => {
            const active = view === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key)}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 transition-colors",
                  active
                    ? "text-gold-bright"
                    : "text-foreground/70 hover:text-gold",
                )}
              >
                {/* Hào quang vàng phía sau - mượn nguyên cách vẽ của HubIcon để
                    thanh dưới và hai cột bên đọc ra là cùng một bộ HUD. */}
                <span
                  className={cn(
                    "absolute top-1 left-1/2 size-9 -translate-x-1/2 rounded-full blur-md transition-opacity duration-300",
                    active
                      ? "opacity-90"
                      : "opacity-0 group-hover:opacity-80 group-focus-visible:opacity-80",
                  )}
                  style={{
                    background:
                      "radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)",
                  }}
                />
                <span
                  className={cn(
                    "glass-panel relative grid size-9 place-items-center rounded-xl transition-transform duration-300",
                    "group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95",
                    active && "gold-border",
                  )}
                >
                  <t.icon className="size-4.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                </span>
                {/* Phải có w-full thì nhãn mới bị bó theo bề rộng của nút. Thiếu nó,
                    cha đang items-center nên span co đúng bằng chữ, `truncate`
                    chẳng có bề rộng nào để cắt, và nhãn hai chữ như "Nguyệt
                    Khoá" tràn ra đè sang nhãn bên cạnh trên màn hẹp. Cho xuống
                    dòng thay vì cắt cụt, giống hệt nhãn ở hai cột bên. */}
                <span className="font-title flex min-h-[24px] w-full items-start justify-center text-center text-[10px] leading-tight font-bold tracking-wide">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNew}
          aria-label="Nhiệm vụ mới"
          title="Nhiệm vụ mới (N)"
          className="btn-game size-11 shrink-0 rounded-full !p-0"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </nav>
  );
}

function SearchField({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <div className="border-gold/30 bg-background/50 focus-within:border-gold flex items-center gap-2 rounded-full border px-3 transition-colors">
      <Search className="text-gold/70 size-3.5 shrink-0" />
      <input
        id="search-input"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Tìm nhiệm vụ, nhãn... (/)"
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
      />
      {query && (
        <button
          onClick={() => onQuery("")}
          aria-label="Xoá tìm kiếm"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
