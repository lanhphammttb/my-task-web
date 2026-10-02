import { useRef, useState } from 'react';
import { Mountain, Search, X } from 'lucide-react';
import type { ViewKey } from '../../types';
import { railSrc, type RailIcon } from '../../lib/icons';
import ArtImage from '../ArtImage';
import { useChromeVar } from './useChromeVar';

const destinations: { key: ViewKey | null; label: string; art?: RailIcon }[] = [
  { key: null, label: 'Sơn Môn' },
  { key: 'today', label: 'Hành Sự', art: 'nhat-khoa' },
  { key: 'focus', label: 'Bế Quan', art: 'be-quan' },
  { key: 'cave', label: 'Động Phủ', art: 'dong-phu' },
  { key: 'awards', label: 'Tiên Lộ', art: 'tien-lo' },
  { key: 'goals', label: 'Đại Nguyện', art: 'dai-nguyen' },
  { key: 'stats', label: 'Tu Hành Lục', art: 'thong-ke' },
];

/** Every destination is visible. Settings belongs to the character HUD. */
export default function MobileNavigation({ view, searching, query, onQuery, onSelect, alert }: {
  view: ViewKey | null; searching: boolean; query: string; onQuery: (q: string) => void;
  onSelect: (v: ViewKey | null) => void; alert: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [search, setSearch] = useState(false);
  useChromeVar(ref, '--footer-h');
  const compact = view !== null || searching || search;
  return <nav
    ref={ref}
    className={`mobile-navigation${compact ? ' is-compact' : ''}`}
    aria-label="Thanh điều hướng chính"
  >
    {(search || searching) && <div className="mobile-search">
      <Search size={18} aria-hidden="true" />
      <input id="search-input" autoFocus aria-label="Tìm việc" placeholder="Tìm tên việc, ghi chú, nhãn…" value={query} onChange={e => onQuery(e.target.value)} />
      <button type="button" aria-label="Đóng tra cứu" onClick={() => { setSearch(false); onQuery(''); }}><X size={20} /></button>
    </div>}
    <div className="mobile-world">
      {destinations.map(t => {
        // Chấm báo hòm nằm TRONG tên nút: một <span aria-label> rỗng thì trình
        // đọc màn hình bỏ qua, người không nhìn thấy chấm vàng sẽ không biết có
        // hòm đang chờ.
        const coHom = t.key === 'today' && alert;
        const ten = coHom ? `${t.label} - có hòm chờ nhận` : t.label;
        return <button type="button" key={t.label}
        aria-label={ten}
        title={ten}
        aria-current={!searching && (view === t.key || (t.key === 'today' && (view === 'week' || view === 'month'))) ? 'page' : undefined}
        onClick={() => { setSearch(false); onSelect(t.key); }}>
        <span className="mobile-world-medallion">
          {t.art ? <ArtImage src={railSrc(t.art)} alt="" /> : <Mountain size={25} aria-hidden="true" />}
          {coHom && <span className="mobile-world-alert" aria-hidden="true" />}
        </span>
        <span aria-hidden="true">{t.label}</span>
      </button>;
      })}
      <button type="button" aria-label="Tìm việc" aria-expanded={search || searching}
        title="Tìm việc"
        onClick={() => { if (search || searching) { setSearch(false); onQuery(''); } else setSearch(true); }}>
        <span className="mobile-world-medallion"><Search size={24} aria-hidden="true" /></span>
        <span aria-hidden="true">Tra Cứu</span>
      </button>
    </div>
  </nav>;
}
