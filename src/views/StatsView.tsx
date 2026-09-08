import { useMemo, useState } from 'react';
import { BarChart3, CalendarRange, Crosshair, Flame, Tag, Target, TrendingUp } from 'lucide-react';
import type { Priority } from '../types';
import { addDays, dateKey, format, formatDuration, parseKey } from '../lib/date';
import { allTags, bestStreak, currentStreak, groupByGoal, statsRange } from '../lib/stats';
import { effectiveXp } from '../lib/economy';
import { cultivationOf, realmShort } from '../lib/cultivation';
import { PRIORITY_ORDER, PRIORITY_UI } from '../lib/ui';
import { useApp } from '../store/AppStore';
import ProgressRing from '../components/ProgressRing';
import { EmptyState, Meter, Section, StatTile } from '../components/primitives';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export default function StatsView() {
  const { data } = useApp();
  const [days, setDays] = useState(30);

  const from = useMemo(() => addDays(new Date(), -(days - 1)), [days]);
  const series = useMemo(
    () => statsRange(data.tasks, data.sessions, from, days),
    [data.tasks, data.sessions, from, days],
  );

  const inRange = useMemo(() => {
    const start = dateKey(from);
    return data.tasks.filter((t) => t.date >= start);
  }, [data.tasks, from]);

  const done = inRange.filter((t) => t.status === 'done').length;
  const rate = inRange.length ? done / inRange.length : 0;
  const focusMin = series.reduce((s, d) => s + d.focusMin, 0);
  const maxDone = Math.max(1, ...series.map((d) => d.done));
  const xp = effectiveXp(data);
  const cultivation = cultivationOf(xp);

  const byPriority = useMemo(
    () =>
      PRIORITY_ORDER.map((p: Priority) => {
        const list = inRange.filter((t) => t.priority === p);
        return { p, total: list.length, done: list.filter((t) => t.status === 'done').length };
      }),
    [inRange],
  );

  const byWeekday = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ total: 0, done: 0 }));
    for (const t of inRange) {
      // getDay(): 0 = Chủ nhật, nên dịch về mảng bắt đầu từ Thứ 2.
      const idx = (parseKey(t.date).getDay() + 6) % 7;
      buckets[idx].total += 1;
      if (t.status === 'done') buckets[idx].done += 1;
    }
    return buckets.map((b, i) => ({
      label: WEEKDAY_LABELS[i],
      ...b,
      rate: b.total ? b.done / b.total : 0,
    }));
  }, [inRange]);

  const goalStats = useMemo(() => groupByGoal(inRange), [inRange]);
  const tagRows = useMemo(
    () =>
      allTags(inRange)
        .map((tag) => {
          const list = inRange.filter((t) => t.tags.includes(tag));
          return { tag, total: list.length, done: list.filter((t) => t.status === 'done').length };
        })
        .sort((a, b) => b.total - a.total),
    [inRange],
  );

  const bestWeekday = [...byWeekday].filter((b) => b.total >= 2).sort((a, b) => b.rate - a.rate)[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Thống kê hiệu suất</h2>
          <p className="text-muted-foreground text-xs">Nhìn vào số liệu để biết nên siết chỗ nào.</p>
        </div>
        <ToggleGroup
          type="single"
          value={String(days)}
          onValueChange={(v) => v && setDays(Number(v))}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="7">7 ngày</ToggleGroupItem>
          <ToggleGroupItem value="30">30 ngày</ToggleGroupItem>
          <ToggleGroupItem value="90">90 ngày</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Tỷ lệ hoàn thành"
          value={`${Math.round(rate * 100)}%`}
          hint={`${done}/${inRange.length} nhiệm vụ`}
          icon={TrendingUp}
        />
        <StatTile
          label="Chuỗi hiện tại"
          value={currentStreak(data.tasks)}
          hint={`Kỷ lục ${bestStreak(data.tasks)} ngày`}
          icon={Flame}
        />
        <StatTile
          label="Thời gian nhập định"
          value={formatDuration(focusMin)}
          hint={`~${formatDuration(Math.round(focusMin / days))}/ngày`}
          icon={Crosshair}
        />
        <StatTile
          label="Cảnh giới"
          value={realmShort(cultivation)}
          hint={`${xp} tu vi tích luỹ`}
          icon={cultivation.realm.icon}
        />
      </div>

      {/* ------------------------------------------------- biểu đồ theo ngày */}
      <Section
        icon={BarChart3}
        title="Nhiệm vụ hoàn thành theo ngày"
        subtitle="Cột tím: việc xong · cột xanh: phút tập trung"
      >
        <div className="flex h-40 items-end gap-[3px]">
          {series.map((d) => (
            <Tooltip key={d.key}>
              <TooltipTrigger asChild>
                <div className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="relative flex h-full w-full max-w-6 items-end justify-center">
                    <div
                      className="bg-success/55 absolute bottom-0 w-[46%] rounded-t-sm transition-[height] duration-500"
                      style={{ height: `${Math.min(100, (d.focusMin / 240) * 100)}%` }}
                    />
                    <div
                      className="bg-brand-gradient absolute bottom-0 w-[86%] rounded-t-sm transition-[height] duration-500"
                      style={{ height: `${(d.done / maxDone) * 100}%` }}
                    />
                  </div>
                  {days <= 30 && (
                    <span className="text-muted-foreground tabular text-[8.5px]">{parseKey(d.key).getDate()}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {format(parseKey(d.key), 'dd/MM')}: {d.done}/{d.total} xong · {formatDuration(d.focusMin)} tập trung
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Target} title="Theo mức ưu tiên">
          <div className="space-y-2.5">
            {byPriority.map((r) => (
              <Row
                key={r.p}
                label={PRIORITY_UI[r.p].label}
                labelClassName={PRIORITY_UI[r.p].text}
                value={r.total ? r.done / r.total : 0}
                barClassName={PRIORITY_UI[r.p].dot}
                trailing={`${r.done}/${r.total}`}
              />
            ))}
          </div>
        </Section>

        <Section
          icon={CalendarRange}
          title="Theo ngày trong tuần"
          subtitle={bestWeekday ? `Mạnh nhất: ${bestWeekday.label}` : undefined}
        >
          <div className="space-y-2.5">
            {byWeekday.map((r) => (
              <Row key={r.label} label={r.label} value={r.rate} trailing={`${r.done}/${r.total}`} />
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Target} title="Tiến độ theo mục tiêu">
          {data.goals.length === 0 ? (
            <EmptyState icon={Target} title="Chưa có mục tiêu nào" />
          ) : (
            <div className="space-y-3">
              {data.goals.map((g) => {
                const s = goalStats.get(g.id) ?? { total: 0, done: 0 };
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <ProgressRing
                      size={62}
                      stroke={7}
                      value={s.total ? s.done / s.total : 0}
                      color={g.color}
                      label=""
                      glowOnFull={false}
                      labelClassName="text-[0px]"
                    />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-medium">{g.title}</strong>
                      <span className="text-muted-foreground text-[11px]">
                        {s.done}/{s.total} nhiệm vụ trong {days} ngày
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section icon={Tag} title="Nhãn được dùng nhiều">
          {tagRows.length === 0 ? (
            <EmptyState icon={Tag} title="Chưa gắn nhãn nào" />
          ) : (
            <div className="space-y-2.5">
              {tagRows.slice(0, 8).map((r) => (
                <Row key={r.tag} label={`#${r.tag}`} value={r.total ? r.done / r.total : 0} trailing={`${r.done}/${r.total}`} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  trailing,
  labelClassName,
  barClassName,
}: {
  label: string;
  value: number;
  trailing: string;
  labelClassName?: string;
  barClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[76px_1fr_46px] items-center gap-3">
      <span className={cn('truncate text-xs', labelClassName)}>{label}</span>
      <Meter value={value} barClassName={barClassName} />
      <span className="text-muted-foreground tabular text-right text-[11px]">{trailing}</span>
    </div>
  );
}
