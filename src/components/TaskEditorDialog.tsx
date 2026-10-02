import { useEffect, useState } from "react";
import { ChevronDown, Plus, ScrollText, Trash2, TriangleAlert, X } from "lucide-react";
import type { Priority, Recurrence, Subtask, Task } from "../types";
import { todayKey } from "../lib/date";
import { uid } from "../lib/storage";
import { blocking, checkTaskDraft, clampEstimate } from "../lib/validation";
import { PRIORITY_ORDER, PRIORITY_UI, RECURRENCE_UI } from "../lib/ui";
import { useApp } from "../store/AppStore";
import { GIOI_HAN, kiemGioiHanNhiemVu } from "../store/lenh";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLaDienThoai } from "../lib/thietBi";
import { useDialogVisualViewport } from "../hooks/useDialogVisualViewport";
import { useCaiDatNhac } from "../hooks/useNhacViec";

interface Props {
  open: boolean;
  task: Task | null;
  defaultDate?: string;
  defaultGoalId?: string;
  onOpenChange: (open: boolean) => void;
}

interface Draft {
  title: string;
  note: string;
  date: string;
  startTime: string;
  deadline: string;
  priority: Priority;
  estimateMin: string;
  goalId: string;
  tags: string;
  recurrence: Recurrence;
  subtasks: Subtask[];
}

/**
 * Hạn chót lưu dạng ISO có múi (UTC, đuôi `Z`) để máy ở múi giờ khác - và
 * server - hiểu đúng một thời điểm. Ô `datetime-local` thì chỉ nói giờ địa
 * phương, nên phải đổi qua đổi lại ở hai đầu.
 *
 * Bản cũ lưu giờ địa phương không kèm múi (`2026-09-30T17:00:00`): cắt lấy
 * phần ngày giờ là đúng luôn, không được đổi múi thêm lần nữa.
 */
const coMui = (iso: string) => /(Z|[+-]\d{2}:?\d{2})$/i.test(iso);
function sangONhap(deadline: string): string {
  if (!coMui(deadline)) return deadline.slice(0, 16);
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline.slice(0, 16);
  const hai = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}T${hai(d.getHours())}:${hai(d.getMinutes())}`;
}
/** Giờ địa phương trong ô nhập → ISO UTC. `new Date("YYYY-MM-DDTHH:mm")` đọc theo giờ máy. */
function tuONhap(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? `${local}:00` : d.toISOString();
}

const blank = (date: string): Draft => ({
  title: "",
  note: "",
  date,
  startTime: "",
  deadline: "",
  priority: "medium",
  estimateMin: "30",
  goalId: "none",
  tags: "",
  recurrence: "none",
  subtasks: [],
});

export default function TaskEditorDialog({
  open,
  task,
  defaultDate,
  defaultGoalId,
  onOpenChange,
}: Props) {
  const { addTask, updateTask, removeTask, data, notify } = useApp();
  const mobile = useLaDienThoai();
  const nhac = useCaiDatNhac();
  const viewportStyle = useDialogVisualViewport(open, mobile);
  const [draft, setDraft] = useState<Draft>(blank(defaultDate ?? todayKey()));
  const [subInput, setSubInput] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(true);
  /** Đã bấm lưu ít nhất một lần - trước đó không báo lỗi "chưa có tên". */
  const [tried, setTried] = useState(false);
  /**
   * Việc đã xong: ngày và mức ưu tiên bị khoá theo lúc hoàn thành (store và
   * server đều chặn). Khoá luôn ở ô nhập để người dùng thấy ngay, khỏi bấm lưu
   * rồi mới bị từ chối.
   */
  const khoaXong = task?.status === "done";

  useEffect(() => {
    if (!open) return;
    setSubInput("");
    setTried(false);
    const hasAdvancedDetails = Boolean(
      task &&
        (task.startTime || task.deadline || task.recurrence !== "none" || task.goalId || task.tags.length || task.note || task.subtasks.length),
    );
    setAdvancedOpen(window.innerWidth >= 640 || hasAdvancedDetails);
    setDraft(
      task
        ? {
            title: task.title,
            note: task.note,
            date: task.date,
            startTime: task.startTime ?? "",
            deadline: task.deadline ? sangONhap(task.deadline) : "",
            priority: task.priority,
            estimateMin: String(task.estimateMin),
            goalId: task.goalId ?? "none",
            tags: task.tags.join(", "),
            recurrence: task.recurrence,
            subtasks: task.subtasks.map((s) => ({ ...s })),
          }
        : { ...blank(defaultDate ?? todayKey()), goalId: defaultGoalId ?? "none" },
    );
  }, [open, task, defaultDate, defaultGoalId]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addSub = () => {
    const title = subInput.trim();
    if (!title || draft.subtasks.length >= GIOI_HAN.soBuoc) return;
    set("subtasks", [...draft.subtasks, { id: uid(), title, done: false }]);
    setSubInput("");
  };

  const tags = draft.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const allIssues = [
    ...checkTaskDraft({
      title: draft.title,
      date: draft.date,
      startTime: draft.startTime || undefined,
      deadline: tuONhap(draft.deadline),
      estimateMin: Number(draft.estimateMin) || 0,
    }),
    // Giới hạn của server: vượt là bị chặn ngay ở đây, đừng để tới lúc đồng
    // bộ mới thấy máy chủ từ chối.
    ...kiemGioiHanNhiemVu({ title: draft.title, note: draft.note, tags, subtasks: draft.subtasks }).map(
      (v) => ({ ...v, level: "block" as const }),
    ),
  ];
  const blockers = blocking(allIssues);

  /**
   * Lỗi hiện ngay dưới form để sửa liền, nhưng không mắng "chưa có tên" lúc
   * vừa mở form trống - chỉ báo khi người dùng đã gõ hoặc đã bấm lưu.
   */
  const issues =
    tried || draft.title.trim()
      ? allIssues
      : allIssues.filter((v) => v.code !== "empty-title");

  const submit = () => {
    setTried(true);
    if (blockers.length > 0) return;
    const payload = {
      title: draft.title.trim(),
      note: draft.note.trim(),
      date: draft.date,
      startTime: draft.startTime || undefined,
      deadline: tuONhap(draft.deadline),
      priority: draft.priority,
      estimateMin: clampEstimate(Number(draft.estimateMin) || 0),
      goalId: draft.goalId === "none" ? undefined : draft.goalId,
      tags,
      recurrence: draft.recurrence,
      subtasks: draft.subtasks,
    };
    // Hộp thoại đóng lại mà không một lời thì người dùng không chắc đã lưu chưa.
    if (task) {
      if (updateTask(task.id, payload)) notify("Đã lưu");
    } else {
      addTask(payload);
      notify(`Đã thêm: ${payload.title}`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-task-editor-state={task ? "editing" : "inscribing"} className="task-editor-mobile task-editor-inscribing max-h-[92vh] gap-0 overflow-hidden sm:max-w-[640px]" style={viewportStyle} tabIndex={-1} onOpenAutoFocus={(event) => {
        if (!mobile) return;
        event.preventDefault();
        (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
      }}>
        <DialogHeader className="task-editor-heading">
          <p className="task-editor-eyebrow"><ScrollText className="size-3.5" /> {task ? "HIỆU CHỈNH VIỆC" : "KHẮC LỆNH HÀNH SỰ"}</p>
          <DialogTitle>{task ? "Sửa việc" : "Thêm việc"}</DialogTitle>
          <DialogDescription>
            Càng cụ thể càng dễ bắt tay vào làm. Hạn chót hiện thành nhãn đếm
            ngược trên thẻ việc để bạn thấy việc nào sắp tới hạn.
            {nhac.bat
              ? " Nhắc việc đang bật: máy sẽ báo đúng giờ bắt đầu và trước hạn chót."
              : " Muốn được nhắc, bật Nhắc việc trong Cài đặt."}
          </DialogDescription>
        </DialogHeader>

        <div className="task-editor-scroll">
        <div className="grid gap-4 py-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="task-title">Tên việc *</Label>
            <Input
              id="task-title"
              autoFocus={!mobile}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.metaKey || e.ctrlKey) && submit()
              }
              placeholder="Ví dụ: Hoàn thành báo cáo quý 3"
            />
          </div>

          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="text-sm leading-none font-medium">Mức ưu tiên</legend>
            {khoaXong && (
              <p className="text-muted-foreground text-xs">
                Việc đã xong: mức ưu tiên và ngày được khoá theo lúc hoàn thành.
                Bỏ đánh dấu hoàn thành nếu muốn đổi.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITY_ORDER.map((p) => {
                const meta = PRIORITY_UI[p];
                const active = draft.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    data-task-priority={p}
                    aria-pressed={active}
                    disabled={khoaXong}
                    onClick={() => set("priority", p)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                      active
                        ? meta.soft
                        : "border-border text-muted-foreground hover:bg-muted",
                      active && "ring-1 ring-current/30",
                    )}
                  >
                    <meta.icon className="size-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="task-date">Ngày thực hiện</Label>
            <Input
              id="task-date"
              type="date"
              value={draft.date}
              disabled={khoaXong}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-estimate">Dự kiến (phút)</Label>
            <Input
              id="task-estimate"
              type="number"
              min={0}
              step={5}
              value={draft.estimateMin}
              onChange={(e) => set("estimateMin", e.target.value)}
            />
          </div>

          <button
            type="button"
            className="task-editor-advanced-toggle sm:hidden"
            aria-expanded={advancedOpen}
            aria-controls="task-editor-advanced"
            onClick={() => setAdvancedOpen((value) => !value)}
          >
            <span><ScrollText className="size-4" /> Tuỳ chọn chi tiết</span>
            <ChevronDown className={cn("size-4 transition-transform", advancedOpen && "rotate-180")} />
          </button>

          <div id="task-editor-advanced" className="task-editor-advanced grid gap-4 sm:col-span-2 sm:grid-cols-2" hidden={!advancedOpen}>
          <div className="grid gap-2">
            <Label htmlFor="task-start">Giờ bắt đầu</Label>
            <Input
              id="task-start"
              type="time"
              value={draft.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-deadline">Hạn chót</Label>
            <Input
              id="task-deadline"
              type="datetime-local"
              value={draft.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-recurrence">Lặp lại</Label>
            <Select
              value={draft.recurrence}
              onValueChange={(v) => set("recurrence", v as Recurrence)}
            >
              <SelectTrigger id="task-recurrence" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RECURRENCE_UI) as Recurrence[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {RECURRENCE_UI[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-goal">Thuộc mục tiêu</Label>
            <Select
              value={draft.goalId}
              onValueChange={(v) => set("goalId", v)}
            >
              <SelectTrigger id="task-goal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không thuộc mục tiêu nào</SelectItem>
                {data.goals
                  .filter((g) => !g.archived || g.id === draft.goalId)
                  .map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: g.color }}
                        />
                        {g.title}{g.archived && " · Đã lưu trữ"}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="task-tags">Nhãn (phân cách bằng dấu phẩy)</Label>
            <Input
              id="task-tags"
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="công việc, gấp"
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="task-note">Ghi chú</Label>
            <Textarea
              id="task-note"
              rows={3}
              value={draft.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Mô tả chi tiết, tiêu chí hoàn thành..."
            />
          </div>

          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="text-sm leading-none font-medium">Các bước nhỏ</legend>
            <div className="space-y-2">
              {draft.subtasks.map((s, index) => (
                <div key={s.id} className="flex gap-2">
                  <Input
                    aria-label={`Bước nhỏ ${index + 1}`}
                    value={s.title}
                    onChange={(e) =>
                      set(
                        "subtasks",
                        draft.subtasks.map((x) =>
                          x.id === s.id ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Xoá bước ${index + 1}`}
                    onClick={() =>
                      set(
                        "subtasks",
                        draft.subtasks.filter((x) => x.id !== s.id),
                      )
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  aria-label="Thêm bước nhỏ"
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSub();
                    }
                  }}
                  placeholder="Thêm bước nhỏ rồi nhấn Enter..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Thêm bước"
                  onClick={addSub}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </fieldset>
          </div>
        </div>

        {issues.length > 0 && (
          <ul role="alert" className="task-editor-validation mb-2 space-y-1.5">
            {issues.map((v) => (
              <li
                key={v.code}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                  v.level === "block"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-warning/40 bg-warning/10 text-warning",
                )}
              >
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {v.message}
              </li>
            ))}
          </ul>
        )}
        </div>

        <DialogFooter className="task-editor-actions -mx-4 -mb-4 border-t border-border bg-popover px-4 pt-3 pb-4 sm:justify-between">
          {task ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive gap-1.5"
              onClick={() => {
                removeTask(task.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="size-4" /> Xoá việc
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button className="task-editor-save" data-save-state={blockers.length > 0 ? "locked" : "ready"} onClick={submit} disabled={blockers.length > 0}>
              {task ? "Lưu thay đổi" : "Thêm việc"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
