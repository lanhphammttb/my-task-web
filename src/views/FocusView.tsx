import { useFocusTimer } from "../store/FocusTimer";
import {
  ArrowLeftRight,
  CheckCircle2,
  Coffee,
  Crosshair,
  ListChecks,
  PartyPopper,
  Pause,
  Play,
  Square,
  Timer,
} from "lucide-react";
import type { Task } from "../types";
import { clockLabel, formatDuration, todayKey } from "../lib/date";
import { sortTasks } from "../lib/stats";
import { PRIORITY_UI } from "../lib/ui";
import { useApp } from "../store/AppStore";
import ProgressRing from "../components/ProgressRing";
import MeditationScene from "../components/MeditationScene";
import { EmptyState, Meter, MetaChip, Section } from "../components/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function FocusView() {
  const { data, setStatus } = useApp();
  const { focusLength, dailyFocusTarget } = data.settings;
  const { mode, seconds, running, rounds, totalSeconds, taskId, pickTask: onPickTask, reset, toggle, stopEarly } = useFocusTimer();
  const task = data.tasks.find((t) => t.id === taskId);
  const candidates = sortTasks(
    data.tasks.filter((t) => t.status !== "done" && t.date <= todayKey()),
  );
  const todaySessions = data.sessions.filter((s) => s.date === todayKey());
  const todayMin = todaySessions.reduce((s, x) => s + x.minutes, 0);
  const isWork = mode === "work";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Bế quan tu luyện</h2>
        <p className="text-muted-foreground text-xs">
          Nhập định {focusLength} phút với đúng một việc. Đồng hồ tiếp tục chạy khi bạn xem lịch hoặc chuyển tab.
        </p>
      </div>

      {/* ------------------------------------------------------ đồng hồ */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6 sm:p-8",
          isWork
            ? "border-primary/30 bg-gradient-to-br from-primary/14 to-card"
            : "border-success/35 bg-gradient-to-br from-success/14 to-card",
        )}
      >
        <div className="relative flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:gap-9">
          {/* Đồng hồ ôm quanh đạo nhân đang ngồi thiền trong động phủ */}
          <div className="border-border relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border sm:aspect-auto sm:h-[288px] sm:w-[340px]">
            <MeditationScene
              running={running}
              resting={!isWork}
              ambient={data.settings.ambientEnabled}
              className="absolute inset-0"
            />
            {/* Làm dịu toàn cảnh một chút để vòng và chữ số luôn nổi lên trên */}
            <div className="pointer-events-none absolute inset-0 bg-black/25" />

            <div className="absolute inset-0 grid place-items-center">
              <div className="relative grid place-items-center">
                {/* Đĩa tối chỉ nằm sau chữ số, không phủ kín người đang ngồi thiền */}
                <span className="pointer-events-none absolute size-[124px] rounded-full bg-black/55 blur-lg" />
                <ProgressRing
                  size={208}
                  stroke={9}
                  value={1 - seconds / totalSeconds}
                  label={clockLabel(seconds)}
                  labelClassName="glow-text text-[38px] leading-none"
                  caption={isWork ? "phiên bế quan" : "điều tức"}
                  color={isWork ? "var(--gold-bright)" : "var(--success)"}
                  track="rgb(0 0 0 / 45%)"
                  qi={running}
                  glowOnFull={false}
                  className="relative"
                />
              </div>
            </div>

            <span
              className={cn(
                "glass-panel absolute top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1",
                "inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.14em] whitespace-nowrap uppercase",
                isWork ? "text-gold-bright" : "text-success",
                !running && "opacity-80",
              )}
            >
              {isWork ? (
                <Crosshair className="size-3" />
              ) : (
                <Coffee className="size-3" />
              )}
              {/* Đồng hồ chưa chạy mà đề "đang nhập định" là nói sai trạng thái. */}
              {running
                ? isWork
                  ? "Đang nhập định"
                  : "Đang điều tức"
                : isWork
                  ? "Sẵn sàng nhập định"
                  : "Sẵn sàng điều tức"}
            </span>
          </div>

          <div className="w-full min-w-0 flex-1 space-y-4">
            <div className="grid gap-2">
              <Label>Nhiệm vụ đang làm</Label>
              <Select
                value={taskId ?? "free"}
                onValueChange={(v) => onPickTask(v === "free" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Tập trung tự do</SelectItem>
                  {candidates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {task && (
              <div className="border-border bg-card space-y-2.5 rounded-xl border p-3.5">
                <strong className="block text-sm font-semibold">
                  {task.title}
                </strong>
                <div className="flex flex-wrap gap-1.5">
                  <MetaChip icon={Timer}>
                    Dự kiến {formatDuration(task.estimateMin)}
                  </MetaChip>
                  <MetaChip
                    icon={Crosshair}
                    className="border-success/35 bg-success/12 text-success"
                  >
                    Đã làm {formatDuration(task.focusMin)}
                  </MetaChip>
                  {task.subtasks.length > 0 && (
                    <MetaChip icon={ListChecks}>
                      {task.subtasks.filter((s) => s.done).length}/
                      {task.subtasks.length} bước
                    </MetaChip>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (setStatus(task.id, "done")) {
                      stopEarly();
                      onPickTask(undefined);
                    }
                  }}
                >
                  <CheckCircle2 className="size-3.5" /> Đánh dấu hoàn thành
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                className="gap-2"
                onClick={toggle}
              >
                {running ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {running ? "Tạm dừng" : "Bắt đầu"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={stopEarly}
              >
                <Square className="size-3.5" /> Kết thúc & ghi nhận
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => reset(isWork ? "break" : "work")}
              >
                <ArrowLeftRight className="size-4" />
                {isWork ? "Sang nghỉ" : "Sang làm"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ tiến độ hôm nay */}
      <Section icon={Crosshair} title="Nhập định hôm nay">
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: String(rounds), label: "phiên lượt này" },
            { value: String(todaySessions.length), label: "phiên hôm nay" },
            { value: formatDuration(todayMin), label: "tổng thời gian" },
          ].map((s) => (
            <div
              key={s.label}
              className="border-border bg-surface/60 rounded-xl border p-3 text-center"
            >
              <strong className="tabular block text-lg leading-none">
                {s.value}
              </strong>
              <span className="text-muted-foreground text-[11px]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Meter
            value={dailyFocusTarget ? todayMin / dailyFocusTarget : 0}
            height={8}
            barClassName="bg-success"
          />
          <p className="text-muted-foreground mt-1.5 text-right text-[11px]">
            Mục tiêu {formatDuration(dailyFocusTarget)}/ngày
          </p>
        </div>
      </Section>

      {/* ---------------------------------------------------- chọn nhanh */}
      <Section
        icon={ListChecks}
        title="Chọn việc để bế quan"
        subtitle="Ưu tiên cao nằm trên cùng"
      >
        {candidates.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            art="all-done"
            title="Không còn nhiệm vụ nào đang chờ"
            hint="Đạo tâm thanh tịnh. Nghỉ ngơi hoặc lên kế hoạch cho ngày mai."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {candidates.slice(0, 8).map((t: Task) => (
              <button
                key={t.id}
                onClick={() => onPickTask(t.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
                  t.id === taskId
                    ? "border-primary bg-primary/12"
                    : "border-border bg-surface/60 hover:border-primary/50 hover:bg-surface",
                )}
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    PRIORITY_UI[t.priority].dot,
                  )}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-medium">
                    {t.title}
                  </strong>
                  <span className="text-muted-foreground text-[11px]">
                    {formatDuration(t.estimateMin)}
                    {t.startTime ? ` · ${t.startTime}` : ""}
                  </span>
                </span>
                {t.id === taskId && (
                  <CheckCircle2 className="text-primary size-4 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
