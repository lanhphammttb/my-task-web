import { ArrowUpRight, Compass, ScrollText, Flame } from 'lucide-react';
import { useApp } from '../../store/AppStore';
import { expeditionState } from '../../lib/expedition';
import { plotState } from '../../lib/field';
import { verifiedFocusMinutes, verifiedTaskCount } from '../../lib/economy';
import { todayKey } from '../../lib/date';
import type { ViewKey } from '../../types';
import ArtImage from '../ArtImage';

/** Places to enter, with live information from the player's actual activity. */
export default function WorldDestinations({ onExplore }: { onExplore: (view: ViewKey, anchor?: string) => void }) {
  const { data } = useApp();
  const remaining = data.tasks.filter(t => t.date === todayKey() && t.status !== 'done').length;
  const trip = data.expedition ? expeditionState(data.expedition, verifiedTaskCount(data)) : null;
  const plots = data.field.map(p => plotState(p, verifiedFocusMinutes(data))).filter(p => p !== null);
  const ripe = plots.filter(p => p.ready).length;
  const fieldHint = ripe ? `${ripe} ô linh thảo đã chín` : plots.length ? `Bế quan thêm ${Math.ceil(Math.min(...plots.map(p => p.remain)))} phút để hái` : `Động phủ bậc ${data.caveLevel}`;
  const places = [
    { title: 'Hành Sự Đường', subtitle: 'Ghi việc · chọn một việc để làm', status: remaining ? `${remaining} việc đang chờ` : 'Nhật khoá thanh thản', image: '/art/world/daily-pavilion-v1.webp', icon: ScrollText, view: 'today' as const, anchor: undefined },
    { title: 'Bí Cảnh', subtitle: 'Khám phá tiên giới', status: trip ? trip.ready ? 'Đoàn đã về · nhận thành quả' : `Thêm ${trip.remain} việc để đoàn trở về` : 'Chọn hành trình mới', image: '/art/world/expedition-gate-v1.webp', icon: Compass, view: 'awards' as const, anchor: 'awards-expedition' },
    { title: 'Động Phủ', subtitle: 'Tu luyện & luyện đan', status: fieldHint, image: '/art/scene/cave.jpg', icon: Flame, view: 'cave' as const, anchor: plots.length ? 'cave-field' : undefined },
  ];
  return <section aria-label="Khám phá tiên giới" className="world-destinations pointer-events-auto w-full max-w-3xl text-left">
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="font-title text-gold-bright text-[11px] font-bold tracking-[0.16em] uppercase">Một bước trên tiên lộ</h2>
      <span className="text-muted-foreground hidden text-[10px] sm:block">Chọn nơi bạn muốn đến</span>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {places.map(p => <button key={p.title} onClick={() => onExplore(p.view, p.anchor)} aria-label={`${p.title} — ${p.subtitle}`} className="destination-card group relative min-w-0 overflow-hidden rounded-xl border border-gold/30 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
        <ArtImage src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-110" />
        <span className="absolute inset-0 bg-gradient-to-t from-[#071419] via-[#071419]/30 to-transparent" />
        <span className="absolute top-2 right-2 rounded-full border border-white/25 bg-black/25 p-1.5 text-white backdrop-blur-sm"><ArrowUpRight className="size-3" /></span>
        <span className="relative flex h-full flex-col justify-end p-2.5 sm:p-4">
          <span className="mb-1 hidden items-center gap-1.5 text-[10px] text-amber-200 sm:flex"><p.icon className="size-3" />{p.status}</span>
          <strong className="font-title text-[12px] font-bold text-white sm:text-base">{p.title}</strong>
          <span className="mt-0.5 text-[9px] text-white/75 sm:text-[11px]">{p.subtitle}</span>
        </span>
      </button>)}
    </div>
  </section>;
}
