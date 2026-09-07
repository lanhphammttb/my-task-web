import {
  BarChart3, CalendarDays, CalendarRange, Crosshair, Flame, Medal, Settings, Sparkles, Target, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewKey } from '../types';
import { formatDuration, todayKey } from '../lib/date';
import { currentStreak, dayStats, levelOf, totalXp } from '../lib/stats';
import { achievementStates } from '../lib/achievements';
import { useApp } from '../store/AppStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const NAV: { key: ViewKey; icon: LucideIcon; label: string; hint: string }[] = [
  { key: 'today', icon: CalendarDays, label: 'Hôm nay', hint: 'Việc phải xong trong ngày' },
  { key: 'week', icon: CalendarRange, label: 'Tuần', hint: 'Bảng kế hoạch 7 ngày' },
  { key: 'month', icon: CalendarDays, label: 'Tháng', hint: 'Lịch tổng thể' },
  { key: 'goals', icon: Target, label: 'Mục tiêu', hint: 'Kế hoạch dài hạn' },
  { key: 'focus', icon: Crosshair, label: 'Tập trung', hint: 'Đồng hồ Pomodoro' },
  { key: 'awards', icon: Medal, label: 'Huy hiệu', hint: 'Thành tích đã mở' },
  { key: 'stats', icon: BarChart3, label: 'Thống kê', hint: 'Hiệu suất & chuỗi ngày' },
];

interface Props {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  onSettings: () => void;
}

/** Thanh điều hướng dọc cho màn hình rộng, kèm thẻ cấp độ và chuỗi ngày. */
export default function AppSidebar({ view, onChange, onSettings }: Props) {
  const { data } = useApp();
  const xp = totalXp(data.tasks, data.sessions);
  const lv = levelOf(xp);
  const streak = currentStreak(data.tasks);
  const focusTotal = data.sessions.reduce((s, x) => s + x.minutes, 0);
  const unlocked = achievementStates(data).filter((a) => a.unlocked).length;
  const todayDone = dayStats(data.tasks, data.sessions, todayKey()).done;
  const streakAtRisk = streak > 0 && todayDone === 0;
  const nearLevelUp = lv.ratio >= 0.8;

  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-[248px] shrink-0 flex-col gap-4 overflow-y-auto border-r p-4 md:flex">
      <div className="flex items-center gap-2.5 px-1">
        <div className="bg-brand-gradient grid size-9 place-items-center rounded-xl text-white shadow-lg shadow-primary/25">
          <Sparkles className="size-4.5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <strong className="block text-sm font-bold">Kế Hoạch</strong>
          <span className="text-muted-foreground text-[11px]">Làm chủ từng ngày</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(item.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  view === item.key
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-[inset_2px_0_0_var(--primary)]'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
                {item.key === 'awards' && unlocked > 0 && (
                  <span className="bg-primary/15 text-primary ml-auto rounded-full px-1.5 py-px text-[10px] font-bold">
                    {unlocked}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.hint}</TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Thẻ cấp độ - thanh XP lóe sáng khi sắp lên cấp để tạo lực kéo */}
      <div className="border-border bg-card rounded-xl border p-3">
        <div className="flex items-center justify-between">
          <span className="bg-brand-gradient rounded-full px-2 py-0.5 text-[11px] font-bold text-white">
            Cấp {lv.level}
          </span>
          <span className="text-muted-foreground tabular text-xs">{xp} XP</span>
        </div>
        <div className={cn('bg-muted relative mt-2.5 h-1.5 overflow-hidden rounded-full', nearLevelUp && 'shimmer')}>
          <div
            className="bg-brand-gradient h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(lv.ratio * 100)}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-[11px]">
          {nearLevelUp ? (
            <span className="text-primary inline-flex items-center gap-1 font-semibold">
              <Zap className="size-3" /> Còn {lv.need - lv.into} XP là lên cấp!
            </span>
          ) : (
            <>Còn {lv.need - lv.into} XP nữa lên cấp {lv.level + 1}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={cn(
            'border-border bg-card rounded-xl border p-2.5 text-center',
            streakAtRisk && 'border-warning/50 bg-warning/[0.07]',
          )}
        >
          <Flame
            className={cn('mx-auto size-4', streak > 0 ? 'text-destructive' : 'text-muted-foreground')}
            strokeWidth={2.5}
          />
          <strong className="tabular mt-1 block text-lg leading-none">{streak}</strong>
          <span className="text-muted-foreground text-[10.5px]">chuỗi ngày</span>
        </div>
        <div className="border-border bg-card rounded-xl border p-2.5 text-center">
          <Crosshair className="text-success mx-auto size-4" strokeWidth={2.5} />
          <strong className="tabular mt-1 block text-lg leading-none">{formatDuration(focusTotal)}</strong>
          <span className="text-muted-foreground text-[10.5px]">đã tập trung</span>
        </div>
      </div>

      {streakAtRisk && (
        <p className="border-warning/40 bg-warning/10 text-warning animate-rise rounded-lg border px-3 py-2 text-[11.5px] leading-snug font-medium">
          Chuỗi {streak} ngày đang chờ bạn. Xong 1 việc hôm nay là giữ được!
        </p>
      )}

      <Button variant="ghost" className="text-muted-foreground mt-auto justify-start gap-2.5" onClick={onSettings}>
        <Settings className="size-4" /> Cài đặt & dữ liệu
      </Button>
    </aside>
  );
}

/** Thanh điều hướng ngang cuộn được, dành cho màn hình hẹp. */
export function MobileNav({ view, onChange }: { view: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <div className="border-border bg-background/95 sticky top-0 z-20 flex gap-1.5 overflow-x-auto border-b px-3 py-2 backdrop-blur md:hidden">
      {NAV.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            view === item.key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground bg-muted/60 hover:text-foreground',
          )}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
