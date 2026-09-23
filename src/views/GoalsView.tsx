import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Check,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import type { Goal, Task } from "../types";
import { GOAL_COLORS } from "../types";
import { differenceInCalendarDays, longDate, parseKey } from "../lib/date";
import { sortTasks } from "../lib/stats";
import { useApp } from "../store/AppStore";
import TaskCard from "../components/TaskCard";
import { EmptyState, MetaChip, Section } from "../components/primitives";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  onEdit: (t: Task) => void;
  onFocus: (t: Task) => void;
  onAddTask: (goalId: string) => void;
}

export default function GoalsView({ onEdit, onFocus, onAddTask }: Props) {
  const { data, addGoal, updateGoal, removeGoal } = useApp();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    targetDate: "",
    color: GOAL_COLORS[0],
  });

  const tasksByGoal = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of data.tasks) {
      if (!t.goalId) continue;
      const arr = map.get(t.goalId);
      if (arr) arr.push(t);
      else map.set(t.goalId, [t]);
    }
    return map;
  }, [data.tasks]);

  const openCreate = () => {
    setDraft({
      title: "",
      description: "",
      targetDate: "",
      color: GOAL_COLORS[data.goals.length % GOAL_COLORS.length],
    });
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (g: Goal) => {
    setDraft({
      title: g.title,
      description: g.description,
      targetDate: g.targetDate ?? "",
      color: g.color,
    });
    setEditing(g);
    setFormOpen(true);
  };

  const submit = () => {
    if (!draft.title.trim()) return;
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      targetDate: draft.targetDate || undefined,
      color: draft.color,
    };
    if (editing) updateGoal(editing.id, payload);
    else addGoal(payload);
    setFormOpen(false);
    setEditing(null);
  };

  const active = data.goals.filter((g) => !g.archived);
  const archived = data.goals.filter((g) => g.archived);
  const unassigned = sortTasks(
    data.tasks.filter((t) => !t.goalId && t.status !== "done"),
  );

  const card = (g: Goal) => {
    const list = tasksByGoal.get(g.id) ?? [];
    const done = list.filter((t) => t.status === "done").length;
    const ratio = list.length ? done / list.length : 0;
    const daysLeft = g.targetDate
      ? differenceInCalendarDays(parseKey(g.targetDate), new Date())
      : null;
    const isOpen = expanded === g.id;
    const complete = list.length > 0 && done === list.length;

    return (
      <article
        key={g.id}
        className={cn(
          "vow-card border-border bg-card overflow-hidden rounded-xl border",
          complete && "ring-success/30 ring-1",
        )}
      >
        <div className="h-[3px] w-full" style={{ background: g.color }} />
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-1.5 size-2.5 shrink-0 rounded-full"
              style={{ background: g.color }}
            />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">{g.title}</strong>
              {g.description && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {g.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label="Tuỳ chọn mục tiêu"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(g)}>
                  <Pencil className="size-3.5" /> Sửa mục tiêu
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateGoal(g.id, { archived: !g.archived })}
                >
                  {g.archived ? (
                    <ArchiveRestore className="size-3.5" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}
                  {g.archived ? "Kích hoạt lại" : "Lưu trữ"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setPendingDelete(g)}
                >
                  <Trash2 className="size-3.5" /> Xoá mục tiêu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button className="btn-game px-3 py-2 text-xs" onClick={() => onAddTask(g.id)}><Plus className="size-3.5" /> Thêm bước nhỏ cho đại nguyện</button>

          {/* Thanh tiến độ tô đúng màu nhận diện của mục tiêu */}
          <div className="flex items-center gap-3">
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${ratio * 100}%`, background: g.color }}
              />
            </div>
            <span className="tabular w-10 text-right text-xs font-bold">
              {Math.round(ratio * 100)}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MetaChip
              icon={ListChecks}
              className={
                complete
                  ? "border-success/35 bg-success/12 text-success"
                  : undefined
              }
            >
              {done}/{list.length} nhiệm vụ
            </MetaChip>
            {daysLeft !== null && (
              <MetaChip
                icon={CalendarClock}
                className={cn(
                  daysLeft < 0 &&
                    "border-destructive/40 bg-destructive/12 text-destructive",
                  daysLeft >= 0 &&
                    daysLeft <= 7 &&
                    "border-warning/40 bg-warning/12 text-warning",
                )}
              >
                {daysLeft < 0
                  ? `Trễ ${Math.abs(daysLeft)} ngày`
                  : `Còn ${daysLeft} ngày`}
              </MetaChip>
            )}
            {g.targetDate && (
              <MetaChip>{longDate(parseKey(g.targetDate))}</MetaChip>
            )}
            <button
              onClick={() => setExpanded(isOpen ? null : g.id)}
              className="text-primary ml-auto text-xs font-semibold hover:underline"
            >
              {isOpen ? "Thu gọn" : `Xem nhiệm vụ (${list.length})`}
            </button>
          </div>

          {isOpen && (
            <div className="space-y-2 pt-1">
              {list.length === 0 ? (
                <EmptyState
                  icon={Target}
                  art="no-task"
                  title="Chưa gắn nhiệm vụ nào cho mục tiêu này"
                />
              ) : (
                <AnimatePresence initial={false}>
                  {sortTasks(list).map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onEdit={onEdit}
                      onFocus={onFocus}
                      showDate
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Mục tiêu dài hạn</h2>
          <p className="text-muted-foreground max-w-lg text-xs">
            Gắn nhiệm vụ hằng ngày vào mục tiêu lớn để thấy rõ mình đang tiến
            tới đâu.
          </p>
        </div>
        <Button className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" /> Mục tiêu mới
        </Button>
      </div>

      {active.length === 0 && (
        <EmptyState
          icon={Target}
          art="no-goal"
          title="Chưa có mục tiêu nào"
          hint="Chọn một điều có ý nghĩa với bạn: khoẻ hơn, học một kỹ năng, hoàn thành một dự án. Sau đó thêm bước nhỏ để làm hôm nay."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">{active.map(card)}</div>

      {archived.length > 0 && (
        <>
          <h4 className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
            Đã lưu trữ
          </h4>
          <div className="grid gap-4 opacity-60 lg:grid-cols-2">
            {archived.map(card)}
          </div>
        </>
      )}

      {unassigned.length > 0 && (
        <Section
          icon={ListChecks}
          title={`Nhiệm vụ chưa gắn mục tiêu (${unassigned.length})`}
          subtitle="Gắn chúng vào một mục tiêu để không làm việc rời rạc"
        >
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {unassigned.slice(0, 8).map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onEdit={onEdit}
                  onFocus={onFocus}
                  showDate
                />
              ))}
            </AnimatePresence>
          </div>
        </Section>
      )}

      {/* ------------------------------------------------- form mục tiêu */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa mục tiêu" : "Mục tiêu mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label htmlFor="goal-title">Tên mục tiêu *</Label>
              <Input
                id="goal-title"
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ví dụ: Ra mắt sản phẩm phiên bản 2.0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-desc">Mô tả / tiêu chí thành công</Label>
              <Textarea
                id="goal-desc"
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-date">Ngày muốn hoàn thành</Label>
              <Input
                id="goal-date"
                type="date"
                value={draft.targetDate}
                onChange={(e) =>
                  setDraft({ ...draft, targetDate: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Màu nhận diện</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    aria-label={`Chọn màu ${c}`}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg border-2 transition-transform",
                      draft.color === c
                        ? "border-foreground scale-105"
                        : "border-transparent",
                    )}
                    style={{ background: c }}
                  >
                    {draft.color === c && (
                      <Check className="size-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={submit} disabled={!draft.title.trim()}>
              Lưu mục tiêu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá mục tiêu?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” sẽ bị xoá. Các nhiệm vụ vẫn giữ nguyên
              nhưng không còn gắn mục tiêu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (pendingDelete) removeGoal(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
