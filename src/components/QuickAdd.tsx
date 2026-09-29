import { useState } from "react";
import { CornerDownLeft, ScrollText } from "lucide-react";
import { useApp } from "../store/AppStore";
import { clampEstimate } from "../lib/validation";
import { parseQuick } from "../lib/quickParse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


const HINTS: { syntax: string; meaning: string }[] = [
  { syntax: "!cao", meaning: "ưu tiên" },
  { syntax: "@09:00", meaning: "giờ bắt đầu" },
  { syntax: "~90", meaning: "số phút" },
  { syntax: "#nhãn", meaning: "gắn nhãn" },
];

export default function QuickAdd({ date }: { date: string }) {
  const { addTask, notify } = useApp();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const parsed = parseQuick(value);
    if (!parsed.title) return;
    addTask({
      title: parsed.title,
      date,
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Thêm nhanh nhiệm vụ vào Nhật Khoá..."
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
      {focused && (
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
