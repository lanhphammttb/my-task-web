import { useRef, useState } from 'react';
import { BookOpen, Ellipsis, Mountain, Search, X } from 'lucide-react';
import type { ViewKey } from '../../types';
import { railSrc, type RailIcon } from '../../lib/icons';
import ArtImage from '../ArtImage';
import { useChromeVar } from './useChromeVar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

// Keep the five most-used locations on the hotbar. Secondary tools live behind
// one door so labels and touch targets remain comfortable on narrow phones.
const destinations: { key: ViewKey | null; label: string; art?: RailIcon }[] = [
  { key: null, label: 'Sơn Môn' },
  { key: 'today', label: 'Hành Sự', art: 'nhat-khoa' },
  { key: 'focus', label: 'Bế Quan', art: 'be-quan' },
  { key: 'cave', label: 'Động Phủ', art: 'dong-phu' },
  { key: 'awards', label: 'Tiên Lộ', art: 'tien-lo' },
];

const moreDestinations: { key: ViewKey | 'search'; label: string; art?: RailIcon }[] = [
  { key: 'goals', label: 'Đại Nguyện', art: 'dai-nguyen' },
  { key: 'stats', label: 'Tu Hành Lục', art: 'thong-ke' },
  { key: 'search', label: 'Tra cứu nhiệm vụ' },
];

/** Mobile game hotbar; secondary destinations open from a single popover. */
export default function MobileNavigation({ view, searching, query, onQuery, onSelect, alert }: {
  view: ViewKey | null; searching: boolean; query: string; onQuery: (q: string) => void;
  onSelect: (v: ViewKey | null) => void; alert: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [search, setSearch] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useChromeVar(ref, '--footer-h');
  const compact = view !== null || searching || search;
  return <nav
    ref={ref}
    className={`mobile-navigation${compact ? ' is-compact' : ''}`}
    aria-label="Thanh điều hướng chính"
  >
    {(search || searching) && <div className="mobile-search">
      <Search size={18} aria-hidden="true" />
      <input id="search-input" autoFocus aria-label="Tra cứu nhiệm vụ" placeholder="Tìm tên việc, ghi chú, nhãn…" value={query} onChange={e => onQuery(e.target.value)} />
      <button type="button" aria-label="Đóng tra cứu" onClick={() => { setSearch(false); onQuery(''); }}><X size={20} /></button>
    </div>}
    <div className="mobile-world">
      {destinations.map(t => <button type="button" key={t.label}
        aria-label={t.label}
        title={t.label}
        aria-current={!searching && (view === t.key || (t.key === 'today' && (view === 'week' || view === 'month'))) ? 'page' : undefined}
        onClick={() => { setSearch(false); if (searching) onQuery(''); onSelect(t.key); }}>
        <span className="mobile-world-medallion">
          {t.art ? <ArtImage src={railSrc(t.art)} alt="" /> : <Mountain size={25} aria-hidden="true" />}
          {t.key === 'today' && alert && <span className="mobile-world-alert" aria-label="Có hòm chờ nhận" />}
        </span>
        <span>{t.label}</span>
      </button>)}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Mở thêm lối tắt" aria-expanded={moreOpen}
            aria-current={view === 'goals' || view === 'stats' || searching || search ? 'page' : undefined}
            title="Đại Nguyện, Tu Hành Lục và tra cứu nhiệm vụ">
            <span className="mobile-world-medallion"><Ellipsis size={24} aria-hidden="true" /></span>
            <span>Khác</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={12} className="mobile-more-menu">
          <div className="mobile-more-heading">
            <span className="mobile-more-sigil"><BookOpen size={18} aria-hidden="true" /></span>
            <span><strong>Đạo tàng</strong><small>Sổ tu hành và tra cứu</small></span>
          </div>
          <nav aria-label="Lối tắt khác" className="mobile-more-links">
            {moreDestinations.map(item => {
              const active = item.key === 'search' ? (search || searching) : view === item.key;
              return <button key={item.key} type="button" aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setMoreOpen(false);
                  if (item.key === 'search') {
                    setSearch(true);
                    if (searching) onQuery('');
                  } else {
                    setSearch(false);
                    if (searching) onQuery('');
                    onSelect(item.key);
                  }
                }}>
                <span className="mobile-more-art">
                  {item.art ? <ArtImage src={railSrc(item.art)} alt="" />
                    : <Search size={19} aria-hidden="true" />}
                </span>
                <span>{item.label}</span>
              </button>;
            })}
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  </nav>;
}
