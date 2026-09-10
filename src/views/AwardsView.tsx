import { useMemo, useState } from "react";
import { Check, Flame, Lock, Route, Sparkles, Trophy, Zap } from "lucide-react";
import { formatDuration } from "../lib/date";
import { bestStreak, currentStreak } from "../lib/stats";
import { effectiveXp, progressOf, xpBreakdown } from "../lib/economy";
import {
  ascensionRatio,
  cultivationOf,
  realmLadder,
  TOTAL_TO_ASCEND,
} from "../lib/cultivation";
import type { RealmProgress } from "../lib/cultivation";
import { achievementStates } from "../lib/achievements";
import type { AchievementState } from "../lib/achievements";
import { TONE_UI } from "../lib/ui";
import { useApp } from "../store/AppStore";
import ProgressRing from "../components/ProgressRing";
import RealmSeal from "../components/RealmSeal";
import RealmScene from "../components/RealmScene";
import { Meter, Section, StatTile } from "../components/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tiên Lộ: bậc thang cảnh giới từ Luyện Khí tới Phi Thăng, cộng với các kỳ ngộ
 * đã mở. Cảnh giới chưa tới vẫn hiện rõ để người dùng thấy đường còn dài bao xa.
 */
export default function AwardsView({
  onTribulation,
}: {
  onTribulation: () => void;
}) {
  const { data } = useApp();
  const all = useMemo(() => achievementStates(data), [data]);
  const unlocked = all.filter((a) => a.unlocked);
  const locked = all
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.ratio - a.ratio);

  const xp = effectiveXp(data);
  const xpParts = xpBreakdown(data);
  const progress = progressOf(data);
  const c = cultivationOf(xp);
  const ladder = realmLadder(xp);
  const streak = currentStreak(data.tasks);
  const focusTotal = data.sessions.reduce((s, x) => s + x.minutes, 0);
  const nextUp = locked[0];
  const RealmIcon = c.realm.icon;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Tiên Lộ</h2>
        <p className="text-muted-foreground text-xs">
          Mỗi nhiệm vụ hoàn thành là một phần tu vi. Đường từ Luyện Khí tới Phi
          Thăng được xây bằng những ngày bình thường.
        </p>
      </div>

      {/* ------------------------------------------------- thẻ cảnh giới */}
      <section
        className="corner-marks relative overflow-hidden rounded-xl border"
        style={{
          borderColor: `${c.realm.color}4d`,
          backgroundImage: `linear-gradient(140deg, ${c.realm.color}1f, transparent 65%)`,
        }}
      >
        {/* Tranh sơn thuỷ của cảnh giới hiện tại, làm dải riêng phía trên */}
        <div className="relative h-44 overflow-hidden sm:h-56">
          <RealmScene realmIndex={c.realmIndex} />
          <div className="absolute bottom-3 left-5">
            <p
              className="font-heading text-lg font-bold drop-shadow-lg"
              style={{ color: c.realm.color }}
            >
              {c.realm.name}
            </p>
            <p className="text-muted-foreground text-[11px] drop-shadow">
              {c.ascended
                ? "Đạo lộ viên mãn"
                : `Tầng ${c.tier} / ${c.realm.tiers}`}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-5 p-5 sm:flex-row">
          <div className="relative shrink-0">
            <ProgressRing
              value={c.ascended ? 1 : c.ratio}
              size={132}
              label={c.ascended ? "Viên mãn" : `Tầng ${c.tier}`}
              labelClassName={c.ascended ? "text-lg" : undefined}
              caption={c.realm.name}
              color={c.realm.color}
              qi
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <RealmSeal
                name={c.realm.name}
                tier={c.ascended ? undefined : c.tier}
                size="md"
              />
              <div className="min-w-0">
                <p
                  className="font-heading flex items-center gap-1.5 text-base font-bold"
                  style={{ color: c.realm.color }}
                >
                  <RealmIcon className="size-4 shrink-0" /> {c.realm.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  <span className="text-gold font-medium">
                    {data.settings.daoName || "Đạo hữu"}
                  </span>{" "}
                  · <span className="tabular">{xp}</span> tu vi
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed italic">“{c.realm.note}”</p>

            {progress.readyForTribulation && (
              <div className="border-warning/45 bg-warning/10 flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Zap className="text-warning size-5 shrink-0" />
                <p className="min-w-40 flex-1 text-xs leading-snug">
                  <strong className="text-warning">Đã tới thiên kiếp.</strong>{" "}
                  Tu vi vượt trần cảnh giới{" "}
                  <span className="tabular">({progress.held} đang bị giữ)</span>
                  . Nuốt đan độ kiếp mới đi tiếp được.
                </p>
                <Button size="sm" className="gap-1.5" onClick={onTribulation}>
                  <Zap className="size-3.5" /> Độ kiếp
                </Button>
              </div>
            )}

            <div>
              <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
                {c.ascended ? (
                  <>
                    <Sparkles className="size-3 text-warning" /> Bạn đã đi trọn
                    đạo lộ.
                  </>
                ) : c.atPeak ? (
                  <>
                    <Zap className="text-warning size-3" />
                    <span className="text-warning font-semibold">
                      Sắp độ kiếp:
                    </span>{" "}
                    còn {c.toNext} tu vi để lên {c.nextLabel}
                  </>
                ) : (
                  <>
                    <Zap className="text-primary size-3" /> Còn {c.toNext} tu vi
                    để đột phá {c.nextLabel}
                  </>
                )}
              </p>
              <Meter value={c.ascended ? 1 : c.ratio} />
            </div>

            {(xpParts.elementBonus > 0 ||
              xpParts.beastBonus > 0 ||
              xpParts.multiplier !== 1) && (
              <p className="text-muted-foreground text-[11px]">
                Tu vi gốc{" "}
                <b className="text-foreground tabular">{xpParts.base}</b>
                {xpParts.elementBonus > 0 && (
                  <>
                    {" "}
                    · ngũ hành{" "}
                    <b className="text-success tabular">
                      +{xpParts.elementBonus}
                    </b>
                  </>
                )}
                {xpParts.beastBonus > 0 && (
                  <>
                    {" "}
                    · linh thú{" "}
                    <b className="text-success tabular">
                      +{xpParts.beastBonus}
                    </b>
                  </>
                )}
                {xpParts.multiplier !== 1 && (
                  <>
                    {" "}
                    · linh căn{" "}
                    <b className="text-gold tabular">×{xpParts.multiplier}</b>
                  </>
                )}
              </p>
            )}

            <div>
              <p className="text-muted-foreground mb-1.5 text-[11px]">
                Tiến độ phi thăng: <span className="tabular">{xp}</span> /{" "}
                <span className="tabular">{TOTAL_TO_ASCEND}</span> tu vi (
                {Math.round(ascensionRatio(xp) * 100)}%)
              </p>
              <Meter
                value={ascensionRatio(xp)}
                height={5}
                barClassName="bg-warning"
              />
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-4">
          <StatTile
            label="Chuỗi tu luyện"
            value={streak}
            hint="ngày liên tiếp"
            icon={Flame}
          />
          <StatTile
            label="Kỷ lục chuỗi"
            value={bestStreak(data.tasks)}
            hint="ngày"
            icon={Trophy}
          />
          <StatTile
            label="Việc đã xong"
            value={data.tasks.filter((t) => t.status === "done").length}
            hint="tổng cộng"
            icon={Check}
          />
          <StatTile
            label="Đã nhập định"
            value={formatDuration(focusTotal)}
            hint="tổng thời gian"
            icon={Sparkles}
          />
        </div>
      </section>

      {/* ---------------------------------------------------- bậc thang */}
      <Section
        icon={Route}
        title="Đạo lộ"
        subtitle="Chín cảnh giới, mỗi cảnh giới chín tầng, rồi phi thăng"
      >
        <ol className="space-y-2">
          {ladder.map((r) => (
            <RealmRow key={r.realm.name} row={r} />
          ))}
        </ol>
      </Section>

      {/* ------------------------------------------------------- kỳ ngộ */}
      <Section
        icon={Trophy}
        title={`Kỳ ngộ đã mở (${unlocked.length}/${all.length})`}
      >
        {unlocked.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa có kỳ ngộ nào. Hoàn thành nhiệm vụ đầu tiên là mở được chiếc
            đầu tiên.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((a) => (
              <AwardCard key={a.id} award={a} />
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Lock}
        title={`Chưa mở (${locked.length})`}
        subtitle="Sắp xếp theo mức độ gần đạt"
      >
        {nextUp && (
          <p className="border-primary/30 bg-primary/[0.07] mb-3 rounded-lg border px-3 py-2 text-xs">
            Gần nhất: <strong className="font-semibold">{nextUp.title}</strong>{" "}
            <span className="tabular text-muted-foreground">
              ({nextUp.current}/{nextUp.target})
            </span>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locked.map((a) => (
            <AwardCard key={a.id} award={a} />
          ))}
        </div>
      </Section>
    </div>
  );
}

/** Một bậc trên đạo lộ. */
function RealmRow({ row }: { row: RealmProgress }) {
  const Icon = row.realm.icon;
  const isCurrent = row.status === "current";
  const isDone = row.status === "done";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        isCurrent ? "bg-card" : "border-border bg-card/50",
      )}
      style={
        isCurrent
          ? {
              borderColor: `${row.realm.color}66`,
              background: `${row.realm.color}12`,
            }
          : undefined
      }
    >
      {/* Ảnh thu nhỏ của cảnh giới: khoá thì phủ mờ và hiện ổ khoá */}
      <span className="border-border relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border">
        <RealmScene realmIndex={row.index} variant="thumb" />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center",
            row.status === "locked" ? "bg-background/70" : "bg-transparent",
          )}
        >
          {row.status === "locked" ? (
            <Lock className="text-muted-foreground size-4" />
          ) : (
            <Icon
              className="size-5 drop-shadow"
              style={{ color: row.realm.color }}
              strokeWidth={2.25}
            />
          )}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <strong
            className={cn(
              "font-heading text-[15px] font-bold tracking-wide",
              row.status === "locked" && "text-muted-foreground",
            )}
            style={isDone || isCurrent ? { color: row.realm.color } : undefined}
          >
            {row.realm.name}
          </strong>
          {isCurrent && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[10px] font-bold">
              {row.realm.tiers > 1
                ? `tầng ${row.tier}/${row.realm.tiers}`
                : "đang ở đây"}
            </span>
          )}
          {isDone && (
            <Check className="text-success size-3.5" strokeWidth={3} />
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug">
          {row.realm.note}
        </p>
        {isCurrent && row.realm.tiers > 1 && (
          <div className="mt-2">
            <Meter value={row.ratio} height={4} barClassName="bg-primary" />
          </div>
        )}
      </div>

      <span className="text-muted-foreground tabular shrink-0 text-[11px]">
        {row.startAt === 0 ? "khởi đầu" : `${row.startAt}+`}
      </span>
    </li>
  );
}

function AwardCard({ award }: { award: AchievementState }) {
  const tone = TONE_UI[award.tone];
  const Icon = award.icon;
  // Có huy hiệu vẽ riêng trong public/art/award thì dùng, không thì dùng icon nét.
  const [hasArt, setHasArt] = useState(true);

  return (
    <article
      className={cn(
        "rounded-xl border p-4 transition-colors",
        award.unlocked
          ? cn("border-border bg-card ring-1", tone.ring)
          : "border-border bg-card/50",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Huy hiệu vẽ riêng đã có vành vàng nên không cần ô màu phía sau; chỉ khi
            phải dùng icon nét thay thế mới cần nền. Huy hiệu chưa mở hiện dạng xám
            mờ kèm ổ khoá nhỏ — thấy trước cái mình đang nhắm tới thì mới có động lực. */}
        <div
          className={cn(
            "relative grid size-11 shrink-0 place-items-center rounded-xl",
            hasArt
              ? null
              : award.unlocked
                ? cn(tone.bg, tone.text)
                : "bg-muted text-muted-foreground/50",
          )}
        >
          {hasArt ? (
            <>
              <img
                src={`/art/award/${award.id}.png`}
                alt=""
                onError={() => setHasArt(false)}
                className={cn(
                  "size-11 object-contain transition-all duration-300",
                  !award.unlocked && "opacity-30 grayscale",
                )}
              />
              {!award.unlocked && (
                <Lock className="text-muted-foreground absolute size-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
              )}
            </>
          ) : award.unlocked ? (
            <Icon className="size-5" strokeWidth={2.25} />
          ) : (
            <Lock className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <strong
            className={cn(
              "block text-sm font-semibold",
              !award.unlocked && "text-muted-foreground",
            )}
          >
            {award.title}
          </strong>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {award.description}
          </p>
        </div>
      </div>

      {!award.unlocked && (
        <div className="mt-3">
          <Meter value={award.ratio} height={5} />
          <p className="text-muted-foreground tabular mt-1.5 text-right text-[11px]">
            {award.current}/{award.target}
          </p>
        </div>
      )}
    </article>
  );
}
