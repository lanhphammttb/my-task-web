import NextPractice from "./NextPractice";
import TodayList from "./TodayList";
import type { Task, ViewKey } from "../../types";
import { useState } from "react";
import { useCountUp } from "../../lib/useCountUp";
import { Quote, Sparkles, Zap } from "lucide-react";
import { useApp } from "../../store/AppStore";
import { ASCENSION_INDEX, REALMS, cultivationOf } from "../../lib/cultivation";
import { activeBeast, progressOf } from "../../lib/economy";
import { beastById, beastLevel } from "../../lib/beasts";
import { aphorismOfDay, elderPortrait } from "../../lib/elders";
import { currentStreak, dayStats } from "../../lib/stats";
import { formatDuration, todayKey } from "../../lib/date";
import ArtImage from "../ArtImage";
import ProgressRing from "../ProgressRing";
import RealmSeal from "../RealmSeal";
import { cn } from "@/lib/utils";

interface Props {
  onTribulation: () => void;
  onFocus: () => void;
  onAwaken: () => void;
  onExplore: (view: ViewKey, anchor?: string) => void;
  onFocusTask: (task: Task) => void;
  onNew: () => void;
}

/**
 * Khu trung tâm của hub - "vùng dopamine" theo đúng cách Tiên Ma Giới bố trí:
 * một vòng tu vi lớn ở giữa, nút hành động chính ngay dưới, và các chỉ số ngày
 * hôm nay bám quanh. Mọi thứ khác chỉ là icon quanh rìa màn hình.
 */
export default function HubCenter({
  onTribulation,
  onFocus,
  onAwaken,
  onExplore,
  onFocusTask,
  onNew,
}: Props) {
  const { data } = useApp();
  const progress = progressOf(data);
  const c = cultivationOf(progress.xp);
  const xpShown = useCountUp(progress.xp);
  const intoShown = useCountUp(c.into);
  const key = todayKey();
  const stats = dayStats(data.tasks, data.sessions, key);
  const streak = currentStreak(data.tasks);
  const aph = aphorismOfDay();
  const portrait = elderPortrait(aph.elder);
  // Chỉ xếp ngang khi ảnh tải được thật, nếu không chữ sẽ lệch trái mà không
  // có mặt bên cạnh.
  const [portraitOk, setPortraitOk] = useState(true);
  const showPortrait = !!portrait && portraitOk;
  const owned = activeBeast(data);
  const beast = owned ? beastById(owned.id) : undefined;

  // Độ kiếp là để bước sang cảnh giới KẾ TIẾP, không phải cảnh giới đang đứng.
  const nextRealm = REALMS[Math.min(ASCENSION_INDEX, progress.gateRealm + 1)];
  const target = data.settings.dailyTarget || 3;
  const focusTarget = data.settings.dailyFocusTarget || 60;
  const ready = progress.readyForTribulation;

  return (
    <main
      aria-label="Sảnh tu luyện"
      className="cultivation-hub pointer-events-none flex min-h-0 flex-col items-center justify-center text-center"
    >
      <h1 className="sr-only">Sơn Môn</h1>

      {/* Việc hôm nay đứng ĐẦU sảnh.
          Đặt ở cuối thì phải cuộn qua hết nhân vật, vòng cảnh giới và dãy chỉ
          số mới thấy - tức là vẫn giữ nguyên cái lệch cần sửa: thứ làm 20 lần
          mỗi ngày nằm sau thứ làm mỗi tháng một lần. Vỏ tu tiên là lớp sơn cho
          việc thật, nên việc thật phải nằm trên. */}
      <TodayList onOpenAll={() => onExplore("today")} onNew={onNew} />
      {/* ---------------------------------------------------- châm ngôn tiền bối */}
      {/* Châm ngôn tiền bối. Có chân dung thì xếp ngang, chưa có thì canh giữa
          như cũ - ArtImage tự ẩn nên layout không bị hụt chỗ. */}
      <blockquote
        aria-label="Lời tiền bối"
        className={cn(
          "elder-teaching glass-panel pointer-events-auto mx-auto rounded-xl",
          showPortrait && "flex items-center gap-3 text-left",
        )}
      >
        {showPortrait ? (
          <img
            src={portrait}
            alt={`Chân dung ${aph.elder}`}
            onError={() => setPortraitOk(false)}
            className="border-gold/50 size-12 shrink-0 rounded-full border object-cover shadow-[0_0_14px_var(--gold-glow)]"
          />
        ) : (
          <Quote className="text-gold/50 mx-auto mb-1 size-3.5" />
        )}
        <span className="min-w-0">
          <p className="font-heading text-[13px] leading-relaxed italic">
            “{aph.text}”
          </p>
          <footer className="text-gold/80 font-title mt-1 text-[10px] font-bold tracking-widest uppercase">
            {aph.elder}
          </footer>
          <span className="text-muted-foreground mt-1 block text-[10px]">
            {aph.title}
          </span>
        </span>
      </blockquote>

      {/* ------------------------------------------------------- vòng tu vi lớn */}
      <div className="pointer-events-auto relative w-[168px] sm:w-[198px] [&>svg]:h-auto [&>svg]:w-full">
        <ProgressRing
          value={c.ascended ? 1 : c.ratio}
          size={198}
          stroke={9}
          color={c.realm.color}
          qi
          glowOnFull
          centerClassName="gap-1"
          className="animate-float drop-shadow-[0_8px_28px_rgba(0,0,0,0.65)]"
          label=""
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex flex-col items-center gap-1.5">
            <RealmSeal
              name={c.realm.name}
              tier={c.ascended ? undefined : c.tier}
              size="lg"
            />
            <span className="font-title text-gold-bright text-[11px] font-bold tracking-[0.18em] uppercase">
              {c.ascended ? "Viên mãn" : `Tầng ${c.tier}/${c.realm.tiers}`}
            </span>
            <span className="text-muted-foreground tabular text-[10.5px]">
              {c.ascended
                ? `${xpShown} tu vi`
                : `${intoShown} / ${c.need} tu vi`}
            </span>
          </span>
        </span>

        {/* Đạo nhân chibi. Chưa có file thì ArtImage tự ẩn, layout không đổi. */}
        <ArtImage
          src={`/art/chibi/${ready ? "breakthrough" : "idle"}.png`}
          alt=""
          className="animate-float pointer-events-none absolute -bottom-3 -left-16 w-24 drop-shadow-[0_8px_22px_rgba(0,0,0,0.65)] sm:-bottom-6 sm:-left-36 sm:w-36 lg:-left-44 lg:w-44"
        />

        {/* Linh thú đứng cạnh chủ nhân */}
        {beast && owned && (
          <img
            src={beast.image}
            alt={beast.name}
            title={`${beast.name} · cấp ${beastLevel(owned.fed)}`}
            className="animate-float border-gold/50 bg-background/60 absolute -right-6 -bottom-2 size-16 rounded-full border object-cover shadow-[0_0_18px_var(--gold-glow)]"
            style={{ animationDelay: "1.2s" }}
          />
        )}
      </div>

      {/* --------------------------------------------------------- nút hành động */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {/* Tu vi đã tràn cảnh giới thì độ kiếp luôn là việc gấp nhất - kể cả khi
            chưa khai quang linh căn, vì không qua thiên lôi là không tích thêm được. */}
        {ready ? (
          <button
            type="button"
            onClick={onTribulation}
            className="btn-game animate-glow px-6 py-2.5 text-[13px]"
          >
            <Zap className="size-4" />
            Độ kiếp lên {nextRealm.name}
          </button>
        ) : !data.root ? (
          <button
            type="button"
            onClick={onAwaken}
            className="btn-game shimmer px-6 py-2.5 text-[13px]"
          >
            <Sparkles className="size-4" />
            Khai quang linh căn
          </button>
        ) : null}

        {/* Việc phụ vẫn nhắc, nhưng không tranh chỗ với nút chính */}
        {ready && !data.root && (
          <button
            type="button"
            onClick={onAwaken}
            className="text-gold hover:text-gold-bright inline-flex items-center gap-1.5 text-[11.5px] font-semibold underline-offset-4 hover:underline"
          >
            <Sparkles className="size-3.5" />
            Chưa khai quang linh căn - làm luôn cho kịp
          </button>
        )}
        <p className="text-muted-foreground max-w-xs text-[11px] leading-snug">
          {ready
            ? "Tu vi đã tràn cảnh giới - phải qua thiên lôi mới bước tiếp được."
            : c.ascended
              ? "Đã phi thăng. Từ đây mỗi ngày là tự tại."
              : `Còn ${c.toNext} tu vi nữa là tới ${c.nextLabel}.`}
        </p>
      </div>

      {/* ------------------------------------------------------ chỉ số hôm nay */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
        <Stat
          label="Nhiệm vụ"
          value={`${stats.done}/${stats.total}`}
          done={stats.done >= target}
        />
        <Stat
          label="Nhập định"
          value={formatDuration(stats.focusMin)}
          done={stats.focusMin >= focusTarget}
        />
        <Stat label="Chuỗi ngày" value={`${streak}`} done={streak > 0} />
      </div>
      <NextPractice
        onFocus={onFocusTask}
        onResume={onFocus}
        onNew={onNew}
        onReview={() => onExplore("stats")}
      />
    </main>
  );
}

function Stat({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done?: boolean;
}) {
  return (
    <span
      className={cn(
        "glass-panel flex items-center gap-1.5 rounded-full px-3 py-1.5",
        done && "gold-border",
      )}
    >
      <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <strong
        className={cn(
          "tabular font-title text-[12.5px] font-bold",
          done && "text-gold-bright",
        )}
      >
        {value}
      </strong>
    </span>
  );
}
