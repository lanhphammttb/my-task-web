import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, CornerDownLeft, Flag, ScrollText, Timer } from "lucide-react";
import { useApp } from "../store/AppStore";
import { clampEstimate } from "../lib/validation";
import { parseQuick } from "../lib/quickParse";
import { addDays, dateKey, formatDuration, parseKey, todayKey } from "../lib/date";
import { PRIORITY_UI } from "../lib/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


const HINTS: { syntax: string; meaning: string }[] = [
  { syntax: "!cao", meaning: "ưu tiên" },
  { syntax: "@9:00", meaning: "giờ bắt đầu" },
  { syntax: "15p", meaning: "thời lượng" },
  { syntax: "mai", meaning: "ngày" },
  { syntax: "#nhãn", meaning: "gắn nhãn" },
];

const TEN_NGAY = ["Hôm nay", "Ngày mai", "Ngày kia"];

export default function QuickAdd({ date }: { date: string }) {
  const { addTask, notify } = useApp();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const boHen = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(boHen.current), []);

  const parsed = parseQuick(value);
  // "mai"/"ngày kia" tính từ hôm nay thật, không phải từ trang sổ đang mở.
  const ngay =
    parsed.dayOffset === undefined
      ? date
      : dateKey(addDays(parseKey(todayKey()), parsed.dayOffset));
  const coXemTruoc =
    !!parsed.title &&
    (parsed.priorityHit ||
      !!parsed.startTime ||
      parsed.estimateMin !== undefined ||
      parsed.dayOffset !== undefined ||
      parsed.tags.length > 0);

  const submit = () => {
    if (!parsed.title) return;
    addTask({
      title: parsed.title,
      date: ngay,
      priority: parsed.priority,
      startTime: parsed.startTime,
      estimateMin: clampEstimate(parsed.estimateMin ?? 30),
      tags: parsed.tags,
    });
    notify(`Đã thêm: ${parsed.title}`);
    setValue("");
  };

  return (
    <div>
      <div
        data-quick-add-state={focused ? "inscribing" : value.trim() ? "draft" : "idle"}
        className={cn(
          "quick-add-seal flex items-center gap-2.5 rounded-xl border bg-card pr-1.5 pl-3.5 transition-colors",
          focused ? "border-primary ring-primary/20 ring-2" : "border-border",
        )}
      >
        <span className="quick-add-sigil" aria-hidden="true"><ScrollText className="size-4" strokeWidth={2} /></span>
        <input
          id="quick-add-task"
          aria-label="Tên nhiệm vụ cần ghi"
          enterKeyHint="done"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          onFocus={() => {
            window.clearTimeout(boHen.current);
            setFocused(true);
          }}
          // Gỡ dòng gợi ý NGAY lúc mất tiêu điểm là kéo cả danh sách bên dưới
          // nhích lên giữa lúc ngón tay đang chạm: cú chạm rơi trúng thẻ khác
          // (hoặc trượt hẳn). Đợi cú chạm xong rồi mới thu dòng gợi ý lại.
          onBlur={() => {
            boHen.current = window.setTimeout(() => setFocused(false), 250);
          }}
          placeholder="Thêm việc… vd: Họp !cao 15p"
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
        />
        <Button
          size="sm"
          className="quick-add-submit h-8 gap-1.5"
          data-add-state={value.trim() ? "ready" : "locked"}
          onClick={submit}
          disabled={!value.trim()}
        >
          Ghi việc <CornerDownLeft className="size-3.5" />
        </Button>
      </div>
      {/* Xem trước những gì app hiểu được, ngay lúc gõ - gõ "mai" mà việc rơi
          vào hôm nay thì phải thấy trước khi bấm Ghi việc. */}
      {coXemTruoc && (
        <div
          className="quick-add-preview mt-2 flex flex-wrap items-center gap-1.5 pl-1 text-[11px]"
          aria-live="polite"
          aria-label="Xem trước việc sẽ ghi"
        >
          <span className="text-muted-foreground">Sẽ ghi:</span>
          <span className="quick-add-chip font-semibold">{parsed.title}</span>
          {parsed.priorityHit && (
            <span className={cn("quick-add-chip", PRIORITY_UI[parsed.priority].soft)}>
              <Flag className="size-3" /> {PRIORITY_UI[parsed.priority].label}
            </span>
          )}
          {parsed.dayOffset !== undefined && (
            <span className="quick-add-chip">
              <CalendarDays className="size-3" /> {TEN_NGAY[parsed.dayOffset]}
            </span>
          )}
          {parsed.startTime && (
            <span className="quick-add-chip">
              <Clock className="size-3" /> {parsed.startTime}
            </span>
          )}
          {parsed.estimateMin !== undefined && (
            <span className="quick-add-chip">
              <Timer className="size-3" /> {formatDuration(clampEstimate(parsed.estimateMin))}
            </span>
          )}
          {parsed.tags.map((t) => (
            <span key={t} className="quick-add-chip">#{t}</span>
          ))}
        </div>
      )}
      {focused && !coXemTruoc && (
        <div className="animate-rise text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[11px]">
          {HINTS.map((h) => (
            <span key={h.syntax} className="inline-flex items-center gap-1">
              <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-[10.5px]">
                {h.syntax}
              </code>
              {h.meaning}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
