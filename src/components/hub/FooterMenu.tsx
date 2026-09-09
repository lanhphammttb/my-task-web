import { useState } from 'react';
import { CalendarDays, CalendarRange, LayoutGrid, Plus, Search, Target, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewKey } from '../../types';
import { cn } from '@/lib/utils';

export const FOOTER_TABS: { key: ViewKey; icon: LucideIcon; label: string }[] = [
  { key: 'today', icon: CalendarDays, label: 'Hôm nay' },
  { key: 'week', icon: CalendarRange, label: 'Tuần' },
  { key: 'month', icon: LayoutGrid, label: 'Tháng' },
  { key: 'goals', icon: Target, label: 'Mục tiêu' },
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
export default function FooterMenu({ view, onSelect, onNew, query, onQuery }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav
      aria-label="Thanh điều hướng chính"
      className="glass-panel pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1.5 rounded-t-2xl px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3"
    >
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        {/* Ô tra cứu chỉ dựng một lần; màn hình hẹp thì bấm kính lúp mới hiện. */}
        <div
          className={cn(
            'order-last basis-full sm:order-first sm:basis-56',
            searchOpen ? 'block' : 'hidden sm:block',
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
          {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
        </button>

        <div className="mx-auto flex flex-1 items-center justify-around gap-1 sm:max-w-md">
          {FOOTER_TABS.map((t) => {
            const active = view === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key)}
                aria-label={t.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors',
                  active ? 'text-gold-bright' : 'text-foreground/70 hover:text-gold',
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-2 -top-2 h-0.5 rounded-full"
                    style={{ background: 'var(--gold-bright)', boxShadow: '0 0 8px var(--gold-glow)' }}
                  />
                )}
                <t.icon className={cn('size-5 transition-transform group-hover:scale-110', active && 'scale-110')} />
                <span className="font-title truncate text-[10px] font-bold tracking-wide">{t.label}</span>
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

function SearchField({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
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
        <button onClick={() => onQuery('')} aria-label="Xoá tìm kiếm" className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
