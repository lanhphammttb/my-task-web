import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  CalendarCheck2,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Task } from "../types";
import {
  dateKey,
  formatDuration,
  longDate,
  monthGrid,
  monthLabel,
  parseKey,
  todayKey,
  weekDays,
  weekdayShort,
} from "../lib/date";
import { isOverdue, sortTasks } from "../lib/stats";
import { PRIORITY_ORDER, PRIORITY_UI } from "../lib/ui";
import { useApp } from "../store/AppStore";
import QuickAdd from "../components/QuickAdd";
import TaskCard from "../components/TaskCard";
import { EmptyState, Meter } from "../components/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  anchor: string;
  onAnchorChange: (d: string) => void;
  onEdit: (t: Task) => void;
  onFocus: (t: Task) => void;
}

export default function MonthView({
  anchor,
  onAnchorChange,
  onEdit,
  onFocus,
}: Props) {
  const { data, moveTask } = useApp();
  const [selected, setSelected] = useState(anchor);
  const [dragId, setDragId] = useState<string | null>(null);

  const cursor = useMemo(() => parseKey(anchor), [anchor]);
  const grid = useMemo(
    () => monthGrid(cursor, data.settings.weekStartsOn),
    [cursor, data.settings.weekStartsOn],
  );
  const headers = useMemo(
    () => weekDays(new Date(), data.settings.weekStartsOn).map(weekdayShort),
    [data.settings.weekStartsOn],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of data.tasks) {
      const arr = map.get(t.date);
      if (arr) arr.push(t);
      else map.set(t.date, [t]);
    }
    return map;
  }, [data.tasks]);

  const monthTasks = grid
    .filter((d) => d.getMonth() === cursor.getMonth())
    .flatMap((d) => byDay.get(dateKey(d)) ?? []);
  const monthDone = monthTasks.filter((t) => t.status === "done").length;
  const monthLoad = monthTasks
    .filter((t) => t.status !== "done")
    .reduce((s, t) => s + t.estimateMin, 0);
  const selectedList = sortTasks(byDay.get(selected) ?? []);

  const shift = (delta: number) => {
    const d = new Date(cursor);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    const key = dateKey(d);
    onAnchorChange(key);
    // Kéo luôn ngày đang chọn sang tháng mới để bảng chi tiết không lệch tháng.
    setSelected(key);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/*
        Đầu tháng xếp hai hàng trên màn hẹp.

        Bản cũ nhét bốn thứ vào một hàng `flex-wrap`: hai nút mũi tên, khối tên
        tháng, và nút "Tháng này". Trên màn 375 thì bốn nút chiếm hết chỗ, tên
        tháng còn hơn trăm px nên "Tháng 9 2026" tụt xuống hai dòng và dòng đếm
        việc tụt xuống ba dòng - đầu bảng cao hơn cả tuần đầu của lịch.

        Tách ra: hàng trên là điều hướng, hàng dưới là số liệu. Nút "Tháng này"
        bỏ chữ trên màn hẹp, giữ icon - nó nằm cạnh hai mũi tên nên đọc ra ngay.
      */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Tháng trước"
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-0 flex-1 truncate text-center text-base font-bold tracking-tight sm:text-left sm:text-lg">
            {monthLabel(cursor)}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            aria-label="Về tháng này"
            onClick={() => {
              onAnchorChange(todayKey());
              setSelected(todayKey());
            }}
          >
            <CalendarCheck2 className="size-3.5" />
            <span className="hidden sm:inline">Tháng này</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Tháng sau"
            onClick={() => shift(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-center text-xs sm:text-left">
          {monthTasks.length} nhiệm vụ · xong {monthDone} · còn{" "}
          {formatDuration(monthLoad)}
        </p>
      </div>

      {/* `min-w-0` nằm trên THẺ LỊCH, không phải trên ô ngày.
          Ô của grid mặc định là `min-width:auto`, nghĩa là không co nhỏ hơn
          bề rộng tối thiểu của nội dung. Thẻ lịch vì thế đứng ì ở 359px
          trong khung chỉ 251px, đẩy hai cột cuối (T7, CN) ra ngoài mép -
          đặt min-w-0 lên từng ô ngày không cứu được, vì thủ phạm là thẻ. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border-border bg-card min-w-0 rounded-xl border p-2 sm:p-3">
          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {headers.map((h) => (
              <span
                key={h}
                className="text-muted-foreground text-center text-[10.5px] font-semibold tracking-wide uppercase"
              >
                {h}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {grid.map((d) => {
              const key = dateKey(d);
              const list = byDay.get(key) ?? [];
              const done = list.filter((t) => t.status === "done").length;
              const outside = d.getMonth() !== cursor.getMonth();
              const late = list.some(isOverdue);

              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId) moveTask(dragId, key);
                    setDragId(null);
                  }}
                  className={cn(
                    // Ô ngày thấp lại trên màn hẹp: sáu hàng 74px là 480px lịch, đẩy hết
                    // phần việc của ngày đang chọn xuống dưới mép màn.
                    "flex min-h-[52px] min-w-0 flex-col gap-0.5 overflow-hidden rounded-lg border p-1 text-left transition-colors sm:min-h-[74px] sm:gap-1 sm:p-1.5",
                    "border-border bg-surface/60 hover:border-border/90 hover:bg-surface",
                    outside && "opacity-40",
                    key === todayKey() && "border-primary/70",
                    key === selected &&
                      "border-primary bg-primary/12 ring-primary/25 ring-2",
                    late && "shadow-[inset_0_-3px_0_var(--destructive)]",
                  )}
                >
                  <span
                    className={cn(
                      "tabular text-xs font-semibold",
                      key === todayKey() && "text-primary",
                    )}
                  >
                    {d.getDate()}
                  </span>

                  {list.length > 0 && (
                    <>
                      <span className="flex flex-wrap items-center gap-1">
                        {list.slice(0, 4).map((t) => (
                          <i
                            key={t.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDragId(t.id);
                            }}
                            title={t.title}
                            className={cn(
                              "size-1.5 cursor-grab rounded-full",
                              t.status === "done"
                                ? "bg-muted-foreground/45"
                                : PRIORITY_UI[t.priority].dot,
                            )}
                          />
                        ))}
                        {list.length > 4 && (
                          <span className="text-muted-foreground text-[9px] leading-none">
                            +{list.length - 4}
                          </span>
                        )}
                      </span>
                      <Meter
                        value={done / list.length}
                        height={2.5}
                        barClassName={late ? "bg-destructive" : "bg-success"}
                        className="mt-auto"
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
            {PRIORITY_ORDER.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <i className={cn("size-2 rounded-full", PRIORITY_UI[p].dot)} />
                {PRIORITY_UI[p].label}
              </span>
            ))}
          </div>
        </div>

        <aside className="border-border bg-card flex min-w-0 flex-col gap-3 self-start rounded-xl border p-3 sm:p-4 lg:sticky lg:top-4">
          <header>
            <strong className="block text-sm font-semibold">
              {longDate(parseKey(selected))}
            </strong>
            <span className="text-muted-foreground text-xs">
              {selectedList.filter((t) => t.status === "done").length}/
              {selectedList.length} hoàn thành
            </span>
          </header>

          <QuickAdd date={selected} />

          <div className="space-y-2">
            {selectedList.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                art="no-task"
                title="Ngày này còn trống"
                hint="Dành chỗ cho việc quan trọng và cả những ngày nghỉ."
              />
            ) : (
              <AnimatePresence initial={false}>
                {selectedList.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onEdit={onEdit}
                    onFocus={onFocus}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
