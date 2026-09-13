import { useMemo, useState } from "react";
import { AlarmClock, Compass, Gift, Sprout, Sunrise, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { chestsForDay, pendingChests } from "../lib/chest";
import { plotState } from "../lib/field";
import { expeditionState } from "../lib/expedition";
import { missionState, timeLeftLabel } from "../lib/sect";
import { verifiedFocusMinutes, verifiedTaskCount } from "../lib/economy";
import { dayStats, isOverdue } from "../lib/stats";
import { isPerfectDay } from "../lib/achievements";
import { todayKey } from "../lib/date";
import { useApp } from "../store/AppStore";
import { Section } from "./primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Vắng mặt dưới ngần này thì coi như vẫn đang dùng, không cần tóm tắt lại. */
const AWAY_MS = 6 * 3600_000;

interface Line {
  icon: LucideIcon;
  text: string;
  /** Việc cần xử lý gấp thì tô cảnh báo */
  urgent?: boolean;
}

/**
 * "Trong lúc bạn vắng mặt".
 *
 * App có đủ thứ đang diễn ra - linh thảo lớn dần, đoàn thám hiểm trên đường về,
 * sứ mệnh đếm ngược, hòm chờ mở - nhưng tất cả đều nằm rải trong ba bảng khác
 * nhau. Mở app lên thì không có gì nói cho biết, phải tự đi từng chỗ mà xem.
 *
 * Đây **không phát thưởng**. Nó chỉ gom thứ vốn đã có về một chỗ, đúng lúc
 * người ta vừa quay lại. Thưởng cho việc mở app là hỏng cả nguyên tắc; nhắc
 * rằng công sức hôm trước đã ra quả thì không.
 */
export default function ReturnDigest() {
  const { data, lastVisitAt } = useApp();
  const [hidden, setHidden] = useState(false);
  // Đọc giờ đúng một lần lúc mở. Nếu đọc lại mỗi lần dựng hình thì dòng "đã 2
  // ngày" sẽ nhích theo từng thao tác trong phiên, mà quãng vắng thì đã cố định.
  const [openedAt] = useState(() => Date.now());

  const awayMs = lastVisitAt ? openedAt - new Date(lastVisitAt).getTime() : 0;

  const lines = useMemo(() => {
    const out: Line[] = [];
    const key = todayKey();

    const s = dayStats(data.tasks, data.sessions, key);
    const chests = pendingChests(
      chestsForDay(
        key,
        s.done,
        s.focusMin,
        isPerfectDay(data.tasks, key),
        data.chestsOpened,
      ),
    );
    if (chests > 0) {
      out.push({ icon: Gift, text: `${chests} hòm kỳ ngộ đang chờ mở` });
    }

    const focus = verifiedFocusMinutes(data);
    const ripe = data.field.filter((p) => plotState(p, focus)?.ready).length;
    if (ripe > 0) {
      out.push({
        icon: Sprout,
        text: `${ripe} ô linh thảo đã chín, hái được rồi`,
      });
    }

    if (data.expedition) {
      const trip = expeditionState(data.expedition, verifiedTaskCount(data));
      if (trip?.ready) {
        out.push({
          icon: Compass,
          text: `Đoàn từ ${trip.site.name} đã về tới cửa động`,
        });
      }
    }

    if (data.mission) {
      const m = missionState(data.mission, verifiedTaskCount(data), focus);
      if (m?.met) {
        out.push({
          icon: AlarmClock,
          text: `${m.mission.name} đã đạt, vào phục mệnh lấy thưởng`,
        });
      } else if (m?.expired) {
        out.push({
          icon: AlarmClock,
          text: `${m.mission.name} đã quá hạn — tiền cọc đang treo`,
          urgent: true,
        });
      } else if (m && m.msLeft < 2 * 86400_000) {
        out.push({
          icon: AlarmClock,
          text: `${m.mission.name} ${timeLeftLabel(m.msLeft)}`,
          urgent: true,
        });
      }
    }

    const overdue = data.tasks.filter(isOverdue).length;
    if (overdue > 0) {
      out.push({
        icon: AlarmClock,
        text: `${overdue} nhiệm vụ đã trễ hạn`,
        urgent: true,
      });
    }

    return out;
  }, [data]);

  // Vừa mới dùng xong thì không tóm tắt lại; không có gì để báo cũng thôi.
  if (hidden || awayMs < AWAY_MS || lines.length === 0) return null;

  const hours = Math.round(awayMs / 3600_000);
  const away = hours >= 48 ? `${Math.round(hours / 24)} ngày` : `${hours} giờ`;

  return (
    <Section
      icon={Sunrise}
      title="Trong lúc bạn vắng mặt"
      subtitle={`Đã ${away} kể từ lần trước`}
      tone="accent"
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setHidden(true)}
          aria-label="Ẩn bản tóm tắt"
          className="size-8 shrink-0 p-0"
        >
          <X className="size-4" />
        </Button>
      }
    >
      <ul className="grid gap-1.5">
        {lines.map((l) => (
          <li key={l.text} className="flex items-start gap-2 text-xs">
            <l.icon
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                l.urgent ? "text-warning" : "text-gold",
              )}
            />
            <span className={cn(l.urgent && "text-warning")}>{l.text}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
