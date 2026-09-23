import { useEffect, useState } from "react";
import { Plus, Trash2, TriangleAlert, X } from "lucide-react";
import type { Priority, Recurrence, Subtask, Task } from "../types";
import { todayKey } from "../lib/date";
import { uid } from "../lib/storage";
import { blocking, checkTaskDraft, clampEstimate } from "../lib/validation";
import { PRIORITY_ORDER, PRIORITY_UI, RECURRENCE_UI } from "../lib/ui";
import { useApp } from "../store/AppStore";
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
  const { addTask, updateTask, removeTask, data } = useApp();
  const [draft, setDraft] = useState<Draft>(blank(defaultDate ?? todayKey()));
  const [subInput, setSubInput] = useState("");
  /** Đã bấm lưu ít nhất một lần - trước đó không báo lỗi "chưa có tên". */
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubInput("");
    setTried(false);
    setDraft(
      task
        ? {
            title: task.title,
            note: task.note,
            date: task.date,
            startTime: task.startTime ?? "",
            deadline: task.deadline ? task.deadline.slice(0, 16) : "",
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
    if (!title) return;
    set("subtasks", [...draft.subtasks, { id: uid(), title, done: false }]);
    setSubInput("");
  };

  const allIssues = checkTaskDraft({
    title: draft.title,
    date: draft.date,
    startTime: draft.startTime || undefined,
    deadline: draft.deadline ? `${draft.deadline}:00` : undefined,
    estimateMin: Number(draft.estimateMin) || 0,
  });
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
      deadline: draft.deadline ? `${draft.deadline}:00` : undefined,
      priority: draft.priority,
      estimateMin: clampEstimate(Number(draft.estimateMin) || 0),
      goalId: draft.goalId === "none" ? undefined : draft.goalId,
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      recurrence: draft.recurrence,
      subtasks: draft.subtasks,
    };
    if (task) updateTask(task.id, payload);
    else addTask(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{task ? "Sửa nhiệm vụ" : "Nhiệm vụ mới"}</DialogTitle>
          <DialogDescription>
            Càng cụ thể càng dễ bắt tay vào làm. Đặt hạn chót để app nhắc bạn
            đúng lúc.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="task-title">Tên nhiệm vụ *</Label>
            <Input
              id="task-title"
              autoFocus
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.metaKey || e.ctrlKey) && submit()
              }
              placeholder="Ví dụ: Hoàn thành báo cáo quý 3"
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Mức ưu tiên</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITY_ORDER.map((p) => {
                const meta = PRIORITY_UI[p];
                const active = draft.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-date">Ngày thực hiện</Label>
            <Input
              id="task-date"
              type="date"
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>

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

          <div className="grid gap-2">
            <Label>Lặp lại</Label>
            <Select
              value={draft.recurrence}
              onValueChange={(v) => set("recurrence", v as Recurrence)}
            >
              <SelectTrigger>
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
            <Label>Thuộc mục tiêu</Label>
            <Select
              value={draft.goalId}
              onValueChange={(v) => set("goalId", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không thuộc mục tiêu nào</SelectItem>
                {data.goals
                  .filter((g) => !g.archived)
                  .map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: g.color }}
                        />
                        {g.title}
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

          <div className="grid gap-2 sm:col-span-2">
            <Label>Các bước nhỏ</Label>
            <div className="space-y-2">
              {draft.subtasks.map((s) => (
                <div key={s.id} className="flex gap-2">
                  <Input
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
                    aria-label="Xoá bước"
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
          </div>
        </div>

        {issues.length > 0 && (
          <ul className="mb-2 space-y-1.5">
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

        <DialogFooter className="sm:justify-between">
          {task ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive gap-1.5"
              onClick={() => {
                removeTask(task.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="size-4" /> Xoá nhiệm vụ
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button onClick={submit} disabled={blockers.length > 0}>
              {task ? "Lưu thay đổi" : "Thêm nhiệm vụ"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
