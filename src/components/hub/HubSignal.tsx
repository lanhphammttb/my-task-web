import { AlarmClock, Compass, Gift, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewKey } from '../../types';
import { useApp } from '../../store/AppStore';
import { todayKey } from '../../lib/date';
import { dayStats } from '../../lib/stats';
import { chestsForDay, pendingChests } from '../../lib/chest';
import { isPerfectDay } from '../../lib/achievements';
import { plotState } from '../../lib/field';
import { expeditionState } from '../../lib/expedition';
import { missionState } from '../../lib/sect';
import { verifiedFocusMinutes, verifiedTaskCount } from '../../lib/economy';

interface Signal {
  icon: LucideIcon;
  text: string;
  view: ViewKey;
  anchor?: string;
  urgent?: boolean;
}

/** The most useful next reward, linked straight to the place that resolves it. */
export default function HubSignal({ onExplore }: {
  onExplore: (view: ViewKey, anchor?: string) => void;
}) {
  const { data } = useApp();
  const key = todayKey();
  const stats = dayStats(data.tasks, data.sessions, key);
  const focus = verifiedFocusMinutes(data);
  const taskCount = verifiedTaskCount(data);
  const signals: Signal[] = [];

  const chests = pendingChests(chestsForDay(
    key, stats.done, stats.focusMin, isPerfectDay(data.tasks, key), data.chestsOpened,
  ));
  if (chests) signals.push({
    icon: Gift,
    text: `${chests} hòm kỳ ngộ đang chờ mở`,
    view: 'today',
    anchor: 'today-chest',
  });

  const ripe = data.field.filter(plot => plotState(plot, focus)?.ready).length;
  if (ripe) signals.push({
    icon: Sprout,
    text: `${ripe} ô linh thảo đã chín`,
    view: 'cave',
    anchor: 'cave-field',
  });

  const trip = data.expedition ? expeditionState(data.expedition, taskCount) : null;
  if (trip?.ready) signals.push({
    icon: Compass,
    text: `Đoàn ${trip.site.short} đã trở về`,
    view: 'awards',
    anchor: 'awards-expedition',
  });

  const mission = data.mission ? missionState(data.mission, taskCount, focus) : null;
  if (mission?.met || mission?.expired) signals.push({
    icon: AlarmClock,
    text: mission.met ? 'Sứ mệnh đã đạt, vào phục mệnh' : 'Sứ mệnh quá hạn cần xử lý',
    view: 'awards',
    anchor: 'awards-sect',
    urgent: mission.expired,
  });

  const first = signals[0];
  if (!first) return null;
  const Icon = first.icon;
  return (
    <button
      type="button"
      className={`hub-signal${first.urgent ? ' is-urgent' : ''}`}
      onClick={() => onExplore(first.view, first.anchor)}
    >
      <span className="hub-signal-icon"><Icon aria-hidden="true" /></span>
      <span className="hub-signal-copy">
        <small>Tín hiệu từ tiên môn</small>
        <strong>{first.text}</strong>
      </span>
      {signals.length > 1 && <span className="hub-signal-more">+{signals.length - 1}</span>}
      <span aria-hidden="true" className="hub-signal-arrow">›</span>
    </button>
  );
}
