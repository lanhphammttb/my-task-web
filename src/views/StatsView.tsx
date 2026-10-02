import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Crosshair,
  Flame,
  Tag,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Priority } from "../types";
import {
  addDays,
  dateKey,
  format,
  formatDuration,
  parseKey,
  todayKey,
} from "../lib/date";
import {
  allTags,
  bestStreak,
  currentStreak,
  groupByGoal,
} from "../lib/stats";
import { effectiveXp } from "../lib/economy";
import { cultivationOf, realmShort } from "../lib/cultivation";
import { PRIORITY_ORDER, PRIORITY_UI } from "../lib/ui";
import { useApp } from "../store/AppStore";
import ProgressRing from "../components/ProgressRing";
import { Meter, Section, StatTile } from "../components/primitives";
import KhuTabs from "../components/KhuTabs";
import type { KhuTab } from "../components/KhuTabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Nhãn theo đúng chỉ số `Date.getDay()`: 0 là Chủ nhật. */
const WEEKDAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const PERIODS = [7, 30, 90] as const;

/**
 * Một cột của biểu đồ: một ngày, hoặc một tuần khi xem 90 ngày.
 *
 * Vì sao gom tuần: 90 cột trên màn 375 thì riêng khe `gap-1` giữa các cột đã
 * ngốn 356px - cột bị ép về bề ngang 0 và biểu đồ trống trơn. Mà 90 cột mảnh
 * như sợi chỉ cũng chẳng chạm trúng được. 13 cột tuần thì đọc được nhịp, bấm
 * được, và chỉ dựng 13 tooltip thay vì 90.
 */
interface ChartBar {
  key: string;
  endKey: string;
  total: number;
  done: number;
  focusMin: number;
}

const barSize = (days: number) => (days > 30 ? 7 : 1);

interface StatsViewProps {
  onOpenDay?: (date: string) => void;
  onOpenGoals?: () => void;
}

export default function StatsView({ onOpenDay, onOpenGoals }: StatsViewProps) {
  const { data } = useApp();
  const [days, setDays] = useState<number>(7);
  const [tab, setTab] = useState("tu-dao-hanh");
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const today = todayKey();
  const from = useMemo(() => addDays(parseKey(today), -(days - 1)), [today, days]);

  // Lập chỉ mục theo ngày MỘT lần. Cách cũ gọi `dayStats` cho từng ngày, mỗi
  // lần lọc lại cả danh sách việc: 90 ngày x vài nghìn việc là cả trăm nghìn
  // phép so trên mỗi lần bấm - chính là cái khựng hơn một giây trên điện thoại.
  const byDay = useMemo(() => {
    const tasks = new Map<string, { total: number; done: number }>();
    for (const task of data.tasks) {
      const cur = tasks.get(task.date) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (task.status === "done") cur.done += 1;
      tasks.set(task.date, cur);
    }
    const focus = new Map<string, number>();
    for (const session of data.sessions) {
      focus.set(session.date, (focus.get(session.date) ?? 0) + session.minutes);
    }
    return { tasks, focus };
  }, [data.tasks, data.sessions]);

  const bars = useMemo(() => {
    const size = barSize(days);
    const out: ChartBar[] = [];
    for (let i = 0; i < days; i += size) {
      const bar: ChartBar = { key: dateKey(addDays(from, i)), endKey: "", total: 0, done: 0, focusMin: 0 };
      for (let j = i; j < Math.min(days, i + size); j++) {
        const key = dateKey(addDays(from, j));
        const tasks = byDay.tasks.get(key);
        bar.endKey = key;
        bar.total += tasks?.total ?? 0;
        bar.done += tasks?.done ?? 0;
        bar.focusMin += byDay.focus.get(key) ?? 0;
      }
      out.push(bar);
    }
    return out;
  }, [byDay, from, days]);

  const inRange = useMemo(() => {
    const start = dateKey(from);
    return data.tasks.filter((task) => task.date >= start && task.date <= today);
  }, [data.tasks, from, today]);

  const done = useMemo(() => inRange.filter((task) => task.status === "done").length, [inRange]);
  const rate = inRange.length ? done / inRange.length : 0;
  const focusMin = bars.reduce((sum, bar) => sum + bar.focusMin, 0);
  const maxDone = Math.max(1, ...bars.map((bar) => bar.done));
  const maxFocus = Math.max(60, ...bars.map((bar) => bar.focusMin));
  const hasPracticeMarks = bars.some((bar) => bar.done > 0 || bar.focusMin > 0);
  const weekly = barSize(days) > 1;
  const streak = useMemo(() => currentStreak(data.tasks), [data.tasks]);
  const best = useMemo(() => bestStreak(data.tasks), [data.tasks]);
  const xp = effectiveXp(data);
  const cultivation = cultivationOf(xp);

  // Hai tab kia chỉ tính khi đang mở: đổi khoảng ngày ở tab Đạo hạnh không phải
  // trả giá cho bảng mức khẩn, nhịp tuần hay dấu ấn mà màn hình không hiện.
  const byPriority = useMemo(
    () =>
      tab !== "tu-thoi-quen" ? [] : PRIORITY_ORDER.map((priority: Priority) => {
        const list = inRange.filter((task) => task.priority === priority);
        return {
          priority,
          total: list.length,
          done: list.filter((task) => task.status === "done").length,
        };
      }),
    [inRange, tab],
  );

  /*
   * Lưới theo thứ trong tuần, bắt đầu từ ngày người dùng chọn trong cài đặt
   * (`weekStartsOn`) - trước đây luôn bắt đầu Thứ 2 dù đã chọn Chủ nhật, lệch
   * với tuần ở mọi màn khác. Ô thứ `i` là thứ `(weekStartsOn + i) % 7`.
   */
  const weekStartsOn = data.settings.weekStartsOn;
  const byWeekday = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ total: 0, done: 0 }));
    if (tab !== "tu-thoi-quen") return [];
    for (const task of inRange) {
      const index = (parseKey(task.date).getDay() - weekStartsOn + 7) % 7;
      // Ngày hỏng (ví dụ hồ sơ nhập từ bản cũ) cho `NaN`: bỏ qua việc ấy chứ
      // đừng để `buckets[NaN].total` ném lỗi làm sập cả màn thống kê.
      if (!Number.isInteger(index)) continue;
      buckets[index].total += 1;
      if (task.status === "done") buckets[index].done += 1;
    }
    return buckets.map((bucket, index) => ({
      label: WEEKDAY_LABELS[(weekStartsOn + index) % 7],
      shortLabel: WEEKDAY_SHORT[(weekStartsOn + index) % 7],
      ...bucket,
      rate: bucket.total ? bucket.done / bucket.total : 0,
    }));
  }, [inRange, tab, weekStartsOn]);

  const goalStats = useMemo(() => groupByGoal(tab === "tu-nguyen" ? inRange : []), [inRange, tab]);
  const tagRows = useMemo(
    () =>
      (tab === "tu-nguyen" ? allTags(inRange) : [])
        .map((tag) => {
          const list = inRange.filter((task) => task.tags.includes(tag));
          return {
            tag,
            total: list.length,
            done: list.filter((task) => task.status === "done").length,
          };
        })
        .sort((a, b) => b.total - a.total),
    [inRange, tab],
  );

  const bestWeekday = [...byWeekday]
    .filter((day) => day.total >= 2)
    .sort((a, b) => b.rate - a.rate)[0];

  const tabs: KhuTab[] = [
    { id: "tu-dao-hanh", label: "Đạo hạnh", art: "/art/stats/dao-hanh-v1.webp", Icon: BarChart3 },
    { id: "tu-thoi-quen", label: "Thói quen", art: "/art/stats/thoi-quen-v1.webp", Icon: CalendarRange },
    { id: "tu-nguyen", label: "Đại nguyện", art: "/art/stats/dai-nguyen-v1.webp", Icon: Target },
  ];

  const openDayPanel = (dayKey: string) => onOpenDay?.(dayKey);

  return (
    <div className="stats-view mx-auto flex w-full max-w-5xl flex-col gap-3">
      <KhuTabs
        tabs={tabs}
        dang={tab}
        onChon={setTab}
        nhan="Các phần trong Tu Hành Lục"
      />

      {tab === "tu-dao-hanh" && (
        <div id={tab} role="tabpanel" aria-labelledby={`${tab}-tab`} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              className="stats-compact-tile"
              label="Đạo tâm"
              value={`${Math.round(rate * 100)}%`}
              hint={`${done}/${inRange.length} việc`}
              icon={TrendingUp}
            />
            <StatTile
              className="stats-compact-tile"
              label="Chuỗi tu luyện"
              value={streak}
              hint={`Kỷ lục ${best} ngày`}
              icon={Flame}
            />
            <StatTile
              className="stats-compact-tile"
              label="Bế quan"
              value={formatDuration(focusMin)}
              hint={`~${formatDuration(Math.round(focusMin / days))}/ngày`}
              icon={Crosshair}
            />
            <StatTile
              className="stats-compact-tile"
              label="Cảnh giới"
              value={realmShort(cultivation)}
              hint={`${xp} tu vi tích lũy`}
              icon={cultivation.realm.icon}
            />
          </div>

          <Section
            className="stats-section"
            icon={BarChart3}
            title="Nhật ký hành công"
            subtitle={`${done}/${inRange.length} việc hoàn thành · ${formatDuration(focusMin)} nhập định`}
            action={<RangeSelect days={days} onChange={setDays} />}
          >
            <div className="stats-chart">
              {!hasPracticeMarks && (
                <div className="stats-chart-empty" aria-live="polite">
                  <img src="/art/stats/first-seal-v1.webp" alt="" />
                  <span>Hoàn thành việc hoặc nhập định để khai mở dấu ấn.</span>
                </div>
              )}
              <div className={cn("stats-bars flex h-full items-end", bars.length > 16 ? "gap-[2px]" : "gap-1")}>
                {bars.map((day) => {
                  const parsed = parseKey(day.key);
                  const dateLabel = weekly
                    ? `${format(parsed, "dd/MM")} – ${format(parseKey(day.endKey), "dd/MM")}`
                    : format(parsed, "dd/MM");
                  const fullDate = weekly
                    ? `tuần ${dateLabel}`
                    : parsed.toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      });

                  return (
                    <Tooltip key={day.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="stats-bar-day group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-sm"
                          onClick={() => openDayPanel(day.key)}
                          aria-label={`Mở nhật ký ${fullDate}: ${day.done}/${day.total} việc xong, ${formatDuration(day.focusMin)} nhập định`}
                          title={`Mở nhật ký ${dateLabel}`}
                        >
                          <span className="relative flex h-full w-full max-w-8 items-end justify-center">
                            <span
                              className="stats-focus-bar absolute bottom-0 left-[7%] w-[38%] rounded-t-sm transition-[height] duration-300"
                              style={{ height: `${Math.min(100, (day.focusMin / maxFocus) * 100)}%` }}
                            />
                            <span
                              className="stats-done-bar absolute bottom-0 right-[7%] w-[46%] rounded-t-sm transition-[height] duration-300"
                              style={{ height: `${Math.min(100, (day.done / maxDone) * 100)}%` }}
                            />
                          </span>
                          {(days <= 7 || weekly) && (
                            <span className="text-muted-foreground tabular text-[10px] leading-3">
                              {weekly ? `${parsed.getDate()}/${parsed.getMonth() + 1}` : parsed.getDate()}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <strong className="block">{fullDate}</strong>
                        {day.done}/{day.total} việc xong · {formatDuration(day.focusMin)} nhập định
                        <span className="block text-[10px] opacity-70">
                          {weekly ? "Chạm để mở nhật ký ngày đầu tuần" : "Chạm để mở nhật ký ngày này"}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
            <div className="stats-chart-legend mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-3">
                <LegendMark tone="gold" label="Việc hoàn thành" />
                <LegendMark tone="jade" label="Phút nhập định" />
              </div>
              <span className="text-muted-foreground text-[10px]">
                {weekly ? "Mỗi cột là một tuần · chạm để xem sổ việc" : "Chạm một ngày để xem sổ việc"}
              </span>
            </div>
          </Section>
        </div>
      )}

      {tab === "tu-thoi-quen" && (
        <div id={tab} role="tabpanel" aria-labelledby={`${tab}-tab`}>
          <Section
            className="stats-section"
            icon={CalendarRange}
            title="Mạch tu hành"
            subtitle="Nhịp hoàn thành theo mức khẩn và ngày trong tuần"
            action={<RangeSelect days={days} onChange={setDays} />}
          >
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <div>
                <h4 className="stats-subhead">Theo mức khẩn</h4>
                <div className="space-y-2.5">
                  {byPriority.map((row) => (
                    <Row
                      key={row.priority}
                      label={PRIORITY_UI[row.priority].label}
                      labelClassName={PRIORITY_UI[row.priority].text}
                      value={row.total ? row.done / row.total : 0}
                      barClassName={PRIORITY_UI[row.priority].dot}
                      trailing={`${row.done}/${row.total}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="stats-subhead">Nhịp trong tuần</h4>
                  {bestWeekday && (
                    <span className="stats-best-day">Vượng nhất: {bestWeekday.label}</span>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {byWeekday.map((day) => (
                    <div
                      key={day.label}
                      className="stats-weekday-cell"
                      data-best={bestWeekday?.label === day.label || undefined}
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--gold) ${Math.round(day.rate * 25)}%, var(--surface))`,
                      }}
                      title={`${day.label}: ${day.done}/${day.total} việc hoàn thành`}
                    >
                      <span>{day.shortLabel}</span>
                      <strong>{day.total ? `${Math.round(day.rate * 100)}%` : "—"}</strong>
                      <small>{day.done}/{day.total}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {tab === "tu-nguyen" && (
        <div id={tab} role="tabpanel" aria-labelledby={`${tab}-tab`}>
          <Section
            className="stats-section"
            icon={Target}
            title="Dấu ấn đại nguyện"
            subtitle={`Tiến độ trong ${days} ngày gần nhất`}
            action={<RangeSelect days={days} onChange={setDays} />}
          >
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:gap-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="stats-subhead">Đại nguyện</h4>
                  {data.goals.length > 0 && onOpenGoals && (
                    <button type="button" className="stats-text-action" onClick={onOpenGoals}>
                      Mở hành trình <ArrowRight className="size-3.5" />
                    </button>
                  )}
                </div>
                {data.goals.length === 0 ? (
                  <div className="stats-empty-goals">
                    <div className="stats-inline-empty">
                      <Target className="size-5 shrink-0" />
                      <span>
                        <strong>Chưa lập đại nguyện</strong>
                        <small>Ghi một điều lớn muốn theo đuổi.</small>
                      </span>
                    </div>
                    {onOpenGoals && (
                      <button type="button" className="stats-empty-cta" onClick={onOpenGoals}>
                        Lập đại nguyện <ArrowRight className="size-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.goals.slice(0, goalsExpanded ? undefined : 3).map((goal) => {
                      const summary = goalStats.get(goal.id) ?? { total: 0, done: 0 };
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          className="stats-goal-row"
                          onClick={() => onOpenGoals?.()}
                          aria-label={`Mở Đại nguyện: ${goal.title}`}
                        >
                          <ProgressRing
                            size={42}
                            stroke={5}
                            value={summary.total ? summary.done / summary.total : 0}
                            color={goal.color}
                            label=""
                            glowOnFull={false}
                            labelClassName="text-[0px]"
                          />
                          <span className="min-w-0 flex-1 text-left">
                            <strong className="block truncate">{goal.title}</strong>
                            <small>{summary.done}/{summary.total} việc · {days} ngày</small>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-gold/80" />
                        </button>
                      );
                    })}
                    {data.goals.length > 3 && (
                      <button
                        type="button"
                        className="stats-text-action ml-auto"
                        onClick={() => setGoalsExpanded((expanded) => !expanded)}
                      >
                        {goalsExpanded ? "Thu gọn" : `Xem thêm ${data.goals.length - 3} đại nguyện`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="stats-subhead mb-2">Dấu ấn thường gặp</h4>
                {tagRows.length === 0 ? (
                  <div className="stats-inline-empty stats-empty-tags">
                    <Tag className="size-5 shrink-0" />
                    <span>
                      <strong>Chưa có dấu ấn</strong>
                      <small>Gắn nhãn cho việc để nhận ra mạch tu luyện.</small>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tagRows.slice(0, tagsExpanded ? undefined : 6).map((row) => (
                      <span key={row.tag} className="stats-tag-seal">
                        <Tag className="size-3" />
                        <strong>{row.tag}</strong>
                        <small>{row.done}/{row.total}</small>
                      </span>
                    ))}
                    {tagRows.length > 6 && (
                      <button
                        type="button"
                        className="stats-tag-more"
                        onClick={() => setTagsExpanded((expanded) => !expanded)}
                      >
                        {tagsExpanded ? "Thu gọn" : `+${tagRows.length - 6}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function RangeSelect({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={String(days)}
      onValueChange={(value) => value && onChange(Number(value))}
      variant="outline"
      size="sm"
      className="stats-range"
      aria-label="Khoảng thời gian thống kê"
    >
      {PERIODS.map((period) => (
        <ToggleGroupItem
          key={period}
          value={String(period)}
          aria-label={`${period} ngày`}
          title={`${period} ngày`}
        >
          {period}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function LegendMark({ tone, label }: { tone: "gold" | "jade"; label: string }) {
  return (
    <span className="stats-legend-mark">
      <i data-tone={tone} />
      {label}
    </span>
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
    <div className="grid grid-cols-[76px_1fr_42px] items-center gap-2.5">
      <span className={cn("truncate text-xs", labelClassName)}>{label}</span>
      <Meter value={value} barClassName={barClassName} />
      <span className="text-muted-foreground tabular text-right text-[11px]">
        {trailing}
      </span>
    </div>
  );
}
