import { todayKey } from "../lib/date";
import { useMemo, useState } from "react";
import { Gift, Lock, PackageOpen, Sparkles } from "lucide-react";
import { chestsForDay } from "../lib/chest";
import type { ChestState, Loot } from "../lib/chest";
import { HERBS } from "../lib/field";
import { PILLS } from "../lib/pills";
import { dayStats } from "../lib/stats";
import { isPerfectDay } from "../lib/achievements";
import { burstBig, burstTier, soundAchievement } from "../lib/celebrate";
import { useApp } from "../store/AppStore";
import { Meter, MetaChip, Section } from "./primitives";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/** Liệt kê thứ moi được thành mấy chip ngắn. */
function spoils(loot: Loot): string[] {
  const out: string[] = [];
  if (loot.stones) out.push(`+${loot.stones} linh thạch`);
  if (loot.xp) out.push(`+${loot.xp} tu vi`);
  for (const [id, n] of Object.entries(loot.herbs ?? {})) {
    if (n) out.push(`+${n} ${HERBS[id as keyof typeof HERBS].short}`);
  }
  if (loot.pill) out.push(`+1 ${PILLS[loot.pill].short}`);
  return out;
}

/** Một cái hòm: ảnh nếu có, không thì icon nét. */
function ChestArt({ src, tone, dim }: { src: string; tone: string; dim: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) {
    return (
      <Gift
        className={cn("size-10 shrink-0 transition-opacity", dim && "opacity-40")}
        style={{ color: tone }}
        strokeWidth={1.6}
      />
    );
  }
  return (
    <img
        loading="lazy"
        decoding="async"
      src={src}
      alt=""
      onError={() => setOk(false)}
      className={cn(
        "size-12 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] transition-opacity",
        dim && "opacity-40 grayscale",
      )}
    />
  );
}

/**
 * Hòm kỳ ngộ trong ngày.
 *
 * Chỗ dễ đi chệch nhất của cả app: "quà đăng nhập mỗi ngày" là thưởng cho việc
 * **mở app**, mà app này tồn tại để người ta **làm xong việc**. Nên hòm không tự
 * rơi theo ngày - mỗi cái gắn với một mốc công việc thật, xong mốc mới có hòm.
 *
 * Cái bất ngờ nằm ở chỗ mở, không nằm ở chỗ nhận. Nhờ vậy xong một việc là có
 * ngay một thứ đang chờ được mở.
 */
export default function ChestRow({ date }: { date: string }) {
  const { data, openChest } = useApp();
  const isToday = date === todayKey();
  const [revealed, setRevealed] = useState<{ loot: Loot; chest: ChestState } | null>(null);

  const list = useMemo(() => {
    const s = dayStats(data.tasks, data.sessions, date);
    return chestsForDay(
      date,
      s.done,
      s.focusMin,
      isPerfectDay(data.tasks, date),
      data.chestsOpened,
    );
  }, [data.tasks, data.sessions, data.chestsOpened, date]);

  const ready = list.filter((c) => c.earned && !c.opened).length;

  const open = (chest: ChestState) => {
    if (!isToday) return;
    const res = openChest(chest.rule.id);
    if (!res) return;
    // Hòm kim hiếm tới mức cả tháng chưa chắc được một cái - ăn mừng to hơn.
    if (chest.rule.grade === "kim") burstBig();
    else burstTier();
    soundAchievement();
    setRevealed({ loot: res.loot, chest });
  };

  return (
    <Section
      id="today-chest"
      icon={Gift}
      title="Hòm kỳ ngộ"
      subtitle={
        !isToday ? "Lịch sử ngày đã chọn. Chỉ hòm của hôm nay có thể mở." : ready > 0
          ? `${ready} hòm đang chờ mở`
          : "Làm xong việc là có hòm — mở ra mới biết bên trong"
      }
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        {list.map((c) => {
          const canOpen = isToday && c.earned && !c.opened;
          return (
            <div
              key={c.rule.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                canOpen && "shadow-[0_0_18px_-6px_var(--gold-glow)]",
                c.opened && "opacity-55",
              )}
              style={{
                borderColor: canOpen ? `${c.meta.tone}80` : `${c.meta.tone}2e`,
              }}
            >
              <ChestArt src={c.meta.image} tone={c.meta.tone} dim={!c.earned} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h4
                    className="font-title text-sm font-bold"
                    style={{ color: c.meta.tone }}
                  >
                    {c.rule.label}
                  </h4>
                  <span className="text-muted-foreground text-[11px]">{c.meta.name}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">{c.rule.hint}</p>

                {!c.earned && <Meter value={c.ratio} className="mt-1.5" height={4} />}
              </div>

              <div className="shrink-0">
                {c.opened ? (
                  <MetaChip>đã mở</MetaChip>
                ) : c.earned ? (
                  <Button size="sm" className="gap-1.5" onClick={() => open(c)} disabled={!isToday}>
                    <PackageOpen className="size-3.5" /> Mở
                  </Button>
                ) : (
                  <Lock className="text-muted-foreground/60 size-4" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --------------------------------------------------- lộ ra thứ gì */}
      <AlertDialog open={revealed !== null} onOpenChange={(o) => !o && setRevealed(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4" style={{ color: revealed?.chest.meta.tone }} />
              {revealed?.loot.label}
            </AlertDialogTitle>
            <AlertDialogDescription>{revealed?.loot.text}</AlertDialogDescription>
          </AlertDialogHeader>

          {revealed && (
            <div className="flex flex-wrap gap-1.5">
              {spoils(revealed.loot).map((s) => (
                <MetaChip
                  key={s}
                  className="border-success/35 bg-success/12 text-success"
                >
                  {s}
                </MetaChip>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRevealed(null)}>Nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
