import {
  BarChart3, CalendarDays, CalendarRange, Crosshair, Flame, Gem, Mountain, Route, Settings, Sparkles,
  Target, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewKey } from '../types';
import { formatDuration, todayKey } from '../lib/date';
import { currentStreak, dayStats } from '../lib/stats';
import { effectiveXp, progressOf, stoneBalance } from '../lib/economy';
import { cultivationOf } from '../lib/cultivation';
import { achievementStates } from '../lib/achievements';
import { useApp } from '../store/AppStore';
import RealmSeal from './RealmSeal';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const NAV: { key: ViewKey; icon: LucideIcon; label: string; hint: string }[] = [
  { key: 'today', icon: CalendarDays, label: 'Hôm nay', hint: 'Nhật khoá - việc phải xong trong ngày' },
  { key: 'week', icon: CalendarRange, label: 'Tuần', hint: 'Bảng kế hoạch 7 ngày' },
  { key: 'month', icon: CalendarDays, label: 'Tháng', hint: 'Lịch tổng thể' },
  { key: 'goals', icon: Target, label: 'Mục tiêu', hint: 'Đại nguyện dài hạn' },
  { key: 'focus', icon: Crosshair, label: 'Bế quan', hint: 'Nhập định - đồng hồ Pomodoro' },
  { key: 'cave', icon: Mountain, label: 'Động Phủ', hint: 'Linh căn, linh thạch và linh thú' },
  { key: 'awards', icon: Route, label: 'Tiên Lộ', hint: 'Cảnh giới và kỳ ngộ đã đạt' },
  { key: 'stats', icon: BarChart3, label: 'Thống kê', hint: 'Hiệu suất & chuỗi ngày' },
];

interface Props {
  view: ViewKey;
  onChange: (v: ViewKey) => void;
  onSettings: () => void;
  onTribulation: () => void;
}

/** Thanh điều hướng dọc cho màn hình rộng, kèm thẻ cảnh giới và chuỗi tu luyện. */
export default function AppSidebar({ view, onChange, onSettings, onTribulation }: Props) {
  const { data, audit } = useApp();
  const xp = effectiveXp(data);
  const c = cultivationOf(xp);
  const progress = progressOf(data);
  const streak = currentStreak(data.tasks);
  const focusTotal = data.sessions.reduce((s, x) => s + x.minutes, 0);
  const unlocked = achievementStates(data).filter((a) => a.unlocked).length;
  const todayDone = dayStats(data.tasks, data.sessions, todayKey()).done;
  const streakAtRisk = streak > 0 && todayDone === 0;
  const nearBreakthrough = !c.ascended && c.ratio >= 0.8;
  const RealmIcon = c.realm.icon;

  return (
    <aside className="bg-sidebar/80 border-sidebar-border hidden w-[248px] shrink-0 flex-col gap-4 overflow-y-auto border-r p-4 backdrop-blur-sm md:flex">
      <div className="flex items-center gap-2.5 px-1">
        <div className="bg-brand-gradient shadow-primary/25 grid size-9 place-items-center rounded-lg text-white shadow-lg">
          <Sparkles className="size-4.5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <strong className="font-heading block text-[15px] font-bold tracking-wide">Đạo Trình</strong>
          <span className="text-muted-foreground text-[11px]">Mỗi ngày một tầng tu vi</span>
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

      {/* ------------------------------------ thẻ cảnh giới kiểu bài ngọc */}
      <div
        className="corner-marks bg-card/70 relative overflow-hidden rounded-lg border p-3 pt-3.5"
        style={{
          borderColor: `${c.realm.color}4d`,
          backgroundImage: `linear-gradient(160deg, ${c.realm.color}22, transparent 72%)`,
        }}
      >
        <div className="mist-layer pointer-events-none absolute inset-0 opacity-[0.06]" />

        <div className="relative flex items-center gap-3">
          <RealmSeal name={c.realm.name} tier={c.ascended ? undefined : c.tier} size="sm" />
          <div className="min-w-0 leading-tight">
            <strong
              className="font-heading flex items-center gap-1.5 truncate text-[13.5px] font-bold"
              style={{ color: c.realm.color }}
            >
              <RealmIcon className="size-3.5 shrink-0" strokeWidth={2.4} />
              {c.realm.name}
            </strong>
            <span className="text-muted-foreground text-[11px]">
              {c.ascended ? 'Đạo lộ viên mãn' : `Tầng ${c.tier} / ${c.realm.tiers}`}
            </span>
            <span className="text-gold/90 block truncate text-[11px]">{data.settings.daoName || 'Đạo hữu'}</span>
          </div>
        </div>

        <div className="rule-gold my-2.5" />

        <div className="text-muted-foreground relative flex items-center justify-between text-[11px]">
          <span>Tu vi</span>
          <span className="tabular text-gold font-semibold">{xp}</span>
        </div>

        <div className="text-muted-foreground relative mt-1 flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1">
            <Gem className="size-3" /> Linh thạch
          </span>
          <span className="tabular font-semibold">{stoneBalance(data)}</span>
        </div>

        <div className={cn('bg-muted relative mt-1.5 h-1.5 overflow-hidden rounded-full', nearBreakthrough && 'shimmer')}>
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.round(c.ratio * 100)}%`,
              backgroundImage: `linear-gradient(90deg, ${c.realm.color}, var(--gold))`,
            }}
          />
        </div>

        {progress.readyForTribulation ? (
          <Button size="sm" className="relative mt-2.5 w-full gap-1.5" onClick={onTribulation}>
            <Zap className="size-3.5" /> Độ kiếp lên {c.nextLabel}
          </Button>
        ) : (
          <p className="text-muted-foreground relative mt-2 text-[11px] leading-snug">
            {c.ascended ? (
              'Bạn đã phi thăng. Mọi việc từ đây là để giữ đạo.'
            ) : c.atPeak ? (
              <span className="text-warning inline-flex items-start gap-1 font-semibold">
                <Zap className="mt-px size-3 shrink-0" />
                Đỉnh {c.realm.name}! Còn {c.toNext} tu vi là tới thiên kiếp.
              </span>
            ) : (
              <>Còn {c.toNext} tu vi để đột phá {c.nextLabel}</>
            )}
          </p>
        )}
        {progress.penalty > 0 && (
          <p className="text-destructive/90 relative mt-1.5 text-[10.5px]">
            Hao tổn do độ kiếp: −{progress.penalty} tu vi
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={cn(
            'border-border bg-card/70 rounded-lg border p-2.5 text-center',
            streakAtRisk && 'border-warning/50 bg-warning/[0.07]',
          )}
        >
          <Flame
            className={cn('mx-auto size-4', streak > 0 ? 'text-destructive' : 'text-muted-foreground')}
            strokeWidth={2.5}
          />
          <strong className="tabular mt-1 block text-lg leading-none">{streak}</strong>
          <span className="text-muted-foreground text-[10.5px]">ngày tu luyện</span>
        </div>
        <div className="border-border bg-card/70 rounded-lg border p-2.5 text-center">
          <Crosshair className="text-success mx-auto size-4" strokeWidth={2.5} />
          <strong className="tabular mt-1 block text-lg leading-none">{formatDuration(focusTotal)}</strong>
          <span className="text-muted-foreground text-[10.5px]">đã nhập định</span>
        </div>
      </div>

      {!audit.ok && (
        <p className="border-destructive/45 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-[11.5px] leading-snug font-medium">
          Sổ ghi có dấu hiệu bị sửa. Xem chi tiết ở Cài đặt → Dữ liệu.
        </p>
      )}

      {streakAtRisk && (
        <p className="border-warning/40 bg-warning/10 text-warning animate-rise rounded-lg border px-3 py-2 text-[11.5px] leading-snug font-medium">
          Đạo tâm lung lay! Chuỗi {streak} ngày sẽ đứt nếu hôm nay không xong việc nào.
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
