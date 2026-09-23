import type { ReactNode } from 'react';
import { ArrowRight, Check, ScrollText, Sparkles } from 'lucide-react';
import type { ViewKey } from '../../types';
import { useApp } from '../../store/AppStore';
import { completedDay, todayKey } from '../../lib/date';
import ArtImage from '../ArtImage';

const chapters = [
  { key: 'today' as const, title: 'Nhật Khoá', hint: 'Làm hôm nay' },
  { key: 'week' as const, title: 'Tuần Khoá', hint: 'Chia sức 7 ngày' },
  { key: 'month' as const, title: 'Nguyệt Khoá', hint: 'Nhìn xa một tháng' },
];

/** One place, three pages of the same personal journal. No invented rewards. */
export default function WorkSanctuary({ view, onSelect, children }: {
  view: ViewKey; onSelect: (view: ViewKey) => void; children: ReactNode;
}) {
  const { data } = useApp();
  const work = ['today', 'week', 'month'].includes(view);
  if (!work && view !== 'goals') return children;
  const done = data.tasks.filter(t => t.status === 'done' && completedDay(t) === todayKey()).length;
  const minutes = data.sessions.filter(s => s.date === todayKey()).reduce((sum, s) => sum + s.minutes, 0);
  const goalCount = data.goals.filter(g => !g.archived).length;
  return <div className="sanctuary">
    <section className="sanctuary-scene" aria-label={work ? 'Góc hành sự trong tiên môn' : 'Nơi gửi đại nguyện'}>
      <ArtImage src={work ? '/art/world/sect-study-v1.webp' : '/art/world/daily-pavilion-v1.webp'} alt="" className="sanctuary-scene-art" />
      <div className="sanctuary-scene-shade" />
      <div className="sanctuary-scene-copy">
        <span className="sanctuary-eyebrow"><Sparkles className="size-3" />{work ? 'TIÊN MÔN · HÀNH SỰ ĐƯỜNG' : 'ĐẠO TÂM · ĐẠI NGUYỆN'}</span>
        <h2>{work ? 'Việc nhỏ hôm nay,\nđạo lộ ngày mai.' : 'Bạn muốn trở thành\nngười như thế nào?'}</h2>
        <p>{work ? 'Đọc sách, vận động, chăm sóc bản thân hay làm việc — mỗi việc thật là một bước tu hành.' : 'Gửi một mong muốn cho tương lai. Chia thành việc nhỏ, rồi mang về Hành Sự Đường để thực hiện.'}</p>
        <div className="sanctuary-record" aria-live="polite">
          <ScrollText className="size-3.5" />
          {work ? `${done} việc đã làm · ${minutes} phút nhập định hôm nay` : `${goalCount} đại nguyện đang theo đuổi`}
        </div>
      </div>
      {work && <div className="sanctuary-seals" aria-label={`${done} việc hoàn thành hôm nay`}>
        {[0, 1, 2].map(i => <span key={i} className={done > i ? 'is-lit' : ''} aria-hidden="true">{done > i ? <Check className="size-4" /> : '·'}</span>)}
        <small>Dấu hành công{done > 3 ? ` · +${done - 3}` : ''}</small>
      </div>}
    </section>
    {work ? <nav className="journal-chapters" aria-label="Các trang sổ hành sự">
      {chapters.map(c => <button key={c.key} aria-current={view === c.key ? 'page' : undefined} onClick={() => onSelect(c.key)}>
        <strong>{c.title}</strong><span>{c.hint}</span>
      </button>)}
    </nav> : <div className="vow-path"><span>Đại nguyện</span><ArrowRight /><span>Việc nhỏ mỗi ngày</span><ArrowRight /><button onClick={() => onSelect('today')}>Về Hành Sự Đường</button></div>}
    <div className="sanctuary-journal">{children}</div>
  </div>;
}
