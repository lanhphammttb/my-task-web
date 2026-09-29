import { useMemo, useState } from 'react';
import { Check, ChevronDown, Flame, Lock, Route, Sparkles, Trophy, Zap } from 'lucide-react';
import { formatDuration } from '../lib/date';
import { bestStreak, currentStreak } from '../lib/stats';
import { effectiveXp, progressOf, xpBreakdown } from '../lib/economy';
import { ascensionRatio, cultivationOf, realmLadder, TOTAL_TO_ASCEND } from '../lib/cultivation';
import type { RealmProgress } from '../lib/cultivation';
import { achievementStates } from '../lib/achievements';
import type { AchievementState } from '../lib/achievements';
import { TONE_UI } from '../lib/ui';
import { useApp } from '../store/AppStore';
import ProgressRing from '../components/ProgressRing';
import RealmSeal from '../components/RealmSeal';
import RealmScene from '../components/RealmScene';
import CultivationProp3D from '../components/CultivationProp3D';
import { Meter, Section, StatTile } from '../components/primitives';
import ExpeditionSection from '../components/ExpeditionSection';
import SectSection from '../components/SectSection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import KhuTabs from '../components/KhuTabs';
import type { KhuTab } from '../components/KhuTabs';
import { railSrc } from '../lib/icons';

/**
 * Tiên Lộ: bậc thang cảnh giới từ Luyện Khí tới Phi Thăng, cộng với các kỳ ngộ
 * đã mở. Cảnh giới chưa tới vẫn hiện rõ để người dùng thấy đường còn dài bao xa.
 */
export default function AwardsView({ onTribulation }: { onTribulation: () => void }) {
  const { data } = useApp();
  const all = useMemo(() => achievementStates(data), [data]);
  const unlocked = all.filter((a) => a.unlocked);
  const locked = all.filter((a) => !a.unlocked).sort((a, b) => b.ratio - a.ratio);

  const xp = effectiveXp(data);
  const xpParts = xpBreakdown(data);
  const progress = progressOf(data);
  const c = cultivationOf(xp);
  const ladder = realmLadder(xp);
  const streak = currentStreak(data.tasks);
  const focusTotal = data.sessions.reduce((s, x) => s + x.minutes, 0);
  const nextUp = locked[0];
  const [tab, setTab] = useState('awards-realm');
  const [showLadder, setShowLadder] = useState(false);

  const tabs: KhuTab[] = [
    { id: 'awards-realm', label: 'Cảnh giới', art: railSrc('tien-lo'), Icon: Route },
    { id: 'awards-achievements', label: 'Thành tựu', art: '/art/award/perfect-week.png', Icon: Trophy,
      goi: unlocked.length > 0 },
    { id: 'awards-sect', label: 'Tông môn', art: '/art/section/son-mon.png', Icon: Flame },
    { id: 'awards-expedition', label: 'Thám hiểm', art: '/art/section/bi-canh.png', Icon: Sparkles },
  ];

  return (
    <div className="stagger-in mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Không lặp lại tiêu đề "Tiên Lộ" ở đây: bảng phủ đã có sẵn một h1 đúng
          chữ ấy ngay phía trên, để thêm h2 nữa là bộ đọc màn hình đọc hai lần.

          Đoạn văn mở đầu cũng đã bỏ: nó nói "mỗi nhiệm vụ là một phần tu vi" -
          đúng nhưng thẻ cảnh giới ngay dưới đã hiện đủ số tu vi và còn bao xa
          nữa tới bậc sau, tức là nói cùng một điều bằng số. */}
      <KhuTabs tabs={tabs} dang={tab} onChon={setTab} nhan="Các mục trong Tiên Lộ" />

      {/* ------------------------------------------------- thẻ cảnh giới */}
      {tab === 'awards-realm' && (
      <section
        id="awards-realm"
        className="corner-marks relative overflow-hidden rounded-xl border"
        style={{
          borderColor: `${c.realm.color}4d`,
          backgroundImage: `linear-gradient(140deg, ${c.realm.color}1f, transparent 65%)`,
        }}
      >
        {/* Dùng ảnh đường Phi Thăng ở thẻ này; cảnh giới hiện tại đã làm nền
            toàn màn nên lặp lại cùng bức tranh trong cùng cửa sổ sẽ bị rối. */}
        <div className="relative h-32 overflow-hidden sm:h-56">
          <img
            src="/art/world/ascension-sky-v1.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover object-center"
          />
          <div className="realm-path-tint absolute inset-0" style={{ background: c.realm.color }} />
          <div className="realm-path-vignette absolute inset-0" />
          <CultivationProp3D
            kind="realm-gate"
            active={progress.readyForTribulation}
            className="realm-gate-relic absolute bottom-[-13%] right-[8%] z-[1] size-[112px] sm:bottom-[-11%] sm:right-[10%] sm:size-[190px]"
          />
          <div className="absolute bottom-3 left-5 z-[2]">
            <p className="font-heading text-lg font-bold drop-shadow-lg" style={{ color: c.realm.color }}>
              {c.realm.name}
            </p>
            <p className="text-muted-foreground text-[11px] drop-shadow">
              {c.ascended ? 'Đạo lộ viên mãn' : `Tầng ${c.tier} / ${c.realm.tiers}`}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-3 p-3 sm:flex-row sm:gap-5 sm:p-5">
          <div className="relative shrink-0">
            <ProgressRing
              value={c.ascended ? 1 : c.ratio}
              size={132}
              label={c.ascended ? 'Viên mãn' : `Tầng ${c.tier}`}
              labelClassName={c.ascended ? 'text-lg' : undefined}
              caption={c.realm.name}
              color={c.realm.color}
              qi
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {/* Tên cảnh giới đã nằm trên tranh và trong lòng vòng tu vi ngay
                cạnh đây - ba lần một cái tên trong cùng một thẻ. Giữ ấn cảnh
                giới (là hình, không phải chữ) cùng dòng đạo hiệu và tu vi. */}
            <div className="flex flex-wrap items-center gap-3">
              <RealmSeal name={c.realm.name} tier={c.ascended ? undefined : c.tier} size="md" />
              <p className="text-muted-foreground min-w-0 text-xs">
                <span className="text-gold font-medium">{data.settings.daoName || 'Đạo hữu'}</span> ·{' '}
                <span className="tabular">{xp}</span> tu vi
              </p>
            </div>

            <p className="text-sm leading-relaxed italic">“{c.realm.note}”</p>

            {progress.readyForTribulation && (
              <div className="border-warning/45 bg-warning/10 flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Zap className="text-warning size-5 shrink-0" />
                <p className="min-w-40 flex-1 text-xs leading-snug">
                  <strong className="text-warning">Đã tới thiên kiếp.</strong> Tu vi vượt trần cảnh giới{' '}
                  <span className="tabular">({progress.held} đang bị giữ)</span>. Nuốt đan độ kiếp mới đi tiếp được.
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
                    <Sparkles className="size-3 text-warning" /> Bạn đã đi trọn đạo lộ.
                  </>
                ) : c.atPeak ? (
                  <>
                    <Zap className="text-warning size-3" />
                    <span className="text-warning font-semibold">Sắp độ kiếp:</span> còn {c.toNext} tu vi để lên{' '}
                    {c.nextLabel}
                  </>
                ) : (
                  <>
                    <Zap className="text-primary size-3" /> Còn {c.toNext} tu vi để đột phá {c.nextLabel}
                  </>
                )}
              </p>
              <Meter value={c.ascended ? 1 : c.ratio} />
            </div>

            {(xpParts.elementBonus > 0 || xpParts.beastBonus > 0 || xpParts.multiplier !== 1) && (
              <p className="text-muted-foreground text-[11px]">
                Tu vi gốc <b className="text-foreground tabular">{xpParts.base}</b>
                {xpParts.elementBonus > 0 && <> · ngũ hành <b className="text-success tabular">+{xpParts.elementBonus}</b></>}
                {xpParts.beastBonus > 0 && <> · linh thú <b className="text-success tabular">+{xpParts.beastBonus}</b></>}
                {xpParts.multiplier !== 1 && <> · linh căn <b className="text-gold tabular">×{xpParts.multiplier}</b></>}
              </p>
            )}

            <div>
              <p className="text-muted-foreground mb-1.5 text-[11px]">
                Tiến độ phi thăng: <span className="tabular">{xp}</span> /{' '}
                <span className="tabular">{TOTAL_TO_ASCEND}</span> tu vi (
                {Math.round(ascensionRatio(xp) * 100)}%)
              </p>
              <Meter value={ascensionRatio(xp)} height={5} barClassName="bg-warning" />
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-2 px-3 pb-3 sm:px-5 sm:pb-5 sm:grid-cols-4">
          <StatTile label="Chuỗi tu luyện" value={streak} hint="ngày liên tiếp" icon={Flame} />
          <StatTile label="Kỷ lục chuỗi" value={bestStreak(data.tasks)} hint="ngày" icon={Trophy} />
          <StatTile
            label="Việc đã xong"
            value={data.tasks.filter((t) => t.status === 'done').length}
            hint="tổng cộng"
            icon={Check}
          />
          <StatTile label="Đã nhập định" value={formatDuration(focusTotal)} hint="tổng thời gian" icon={Sparkles} />
        </div>
      </section>
      )}

      {/* ---------------------------------------------------- bậc thang */}
      {tab === 'awards-realm' && (
        <section className="realm-map-panel game-panel rounded-xl border p-3 sm:p-4" aria-labelledby="realm-map-title">
          <header className="realm-map-header">
            <div className="realm-map-heading">
              <span className="realm-map-sigil" aria-hidden="true"><Route className="size-4" /></span>
              <div className="min-w-0">
                <h3 id="realm-map-title">Đạo lộ</h3>
                <p>{c.ascended ? 'Đạo lộ viên mãn · Phi Thăng' : `Chặng ${c.realmIndex + 1}/${ladder.length} · Tiếp theo: ${ladder[c.realmIndex + 1]?.realm.name ?? 'Phi Thăng'}`}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="game-button realm-map-toggle"
              aria-expanded={showLadder}
              aria-controls="realm-ladder-list"
              onClick={() => setShowLadder((open) => !open)}
            >
              {showLadder ? 'Thu gọn' : `Xem ${ladder.length} cảnh giới`}
              <ChevronDown className={`size-3.5 transition-transform ${showLadder ? 'rotate-180' : ''}`} />
            </Button>
          </header>
          <ol className="realm-map-track" aria-label="Tiến trình qua các cảnh giới">
            {ladder.map((row) => {
              const Icon = row.realm.icon;
              const routeState = row.status === 'current' ? 'current' : row.status === 'done' ? 'done' : 'locked';
              const description = row.status === 'current'
                ? `${row.realm.name}, tầng ${row.tier} trên ${row.realm.tiers}, đang tu luyện`
                : row.status === 'done' ? `${row.realm.name}, đã vượt qua` : `${row.realm.name}, chưa khai mở`;
              return (
                <li key={row.realm.name} data-route-state={routeState} aria-label={description} aria-current={row.status === 'current' ? 'step' : undefined}>
                  <span className="realm-map-node" aria-hidden="true"><Icon className="size-3.5" /></span>
                </li>
              );
            })}
          </ol>
          <div id="realm-ladder-list" hidden={!showLadder}>
            {showLadder && (
              <ol className="realm-map-details space-y-2">
                {ladder.map((r) => <RealmRow key={r.realm.name} row={r} />)}
              </ol>
            )}
          </div>
        </section>
      )}

      {/* Tông môn trước, thám hiểm sau: danh phận rồi mới tới chuyện đi lại. */}
      {tab === 'awards-sect' && <SectSection />}

      {/* Thám hiểm đặt ngay trên kỳ ngộ: một bên là cơ duyên tự đến, một bên
          là mình chủ động đi tìm - để cạnh nhau thì đọc ra ngay là một cặp. */}
      {tab === 'awards-expedition' && <ExpeditionSection />}

      {/* ------------------------------------------------------- kỳ ngộ */}
      {tab === 'awards-achievements' && (
      <Section id="awards-achievements" icon={Trophy} title={`Thành tựu đã mở (${unlocked.length}/${all.length})`}>
        {unlocked.length === 0 ? (
          <div className="achievement-empty-state">
            <span className="achievement-empty-icon" aria-hidden="true"><Trophy className="size-5" /></span>
            <div><strong>Chưa lập chiến công đầu tiên</strong><p>Hoàn thành nhiệm vụ đầu tiên để khai mở ấn Nhập Đạo.</p></div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((a) => (
              <AwardCard key={a.id} award={a} />
            ))}
          </div>
        )}
      </Section>
      )}

      {tab === 'awards-achievements' && (
      <Section icon={Lock} title={`Chưa mở (${locked.length})`} subtitle="Ghim cơ duyên gần nhất lên đầu, các mốc còn lại theo tiến độ">
        {nextUp && (
          <article className="achievement-next-seal mb-3" data-achievement-state={nextUp.current > 0 ? 'advancing' : 'locked'}>
            <div className="achievement-next-icon" aria-hidden="true"><nextUp.icon className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="achievement-next-eyebrow">CƠ DUYÊN GẦN NHẤT</p>
              <strong className="achievement-next-title">{nextUp.title}</strong>
              <p className="achievement-next-condition">{nextUp.description}</p>
              <div className="achievement-next-progress" role="progressbar" aria-label={`Tiến độ ${nextUp.title}`} aria-valuemin={0} aria-valuemax={nextUp.target} aria-valuenow={nextUp.current}>
                <Meter value={nextUp.ratio} height={5} />
              </div>
              <p className="achievement-next-count">Tiến độ: {nextUp.current}/{nextUp.target}</p>
            </div>
            <span className="achievement-next-percent">{Math.round(nextUp.ratio * 100)}%</span>
          </article>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locked.filter((a) => a.id !== nextUp?.id).map((a) => (
            <AwardCard key={a.id} award={a} />
          ))}
        </div>
      </Section>
      )}
    </div>
  );
}

/** Một bậc trên đạo lộ. */
function RealmRow({ row }: { row: RealmProgress }) {
  const Icon = row.realm.icon;
  const isCurrent = row.status === 'current';
  const isDone = row.status === 'done';

  return (
    <li
      data-realm-state={row.status}
      aria-current={isCurrent ? 'step' : undefined}
      className={cn(
        'realm-path-row flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors sm:gap-3 sm:p-3',
        isCurrent ? 'bg-card' : 'border-border bg-card/50',
      )}
      style={isCurrent ? { borderColor: `${row.realm.color}66`, background: `${row.realm.color}12` } : undefined}
    >
      {/* Ảnh thu nhỏ của cảnh giới: khoá thì phủ mờ và hiện ổ khoá */}
      <span className="border-border relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border sm:h-14 sm:w-20">
        <RealmScene realmIndex={row.index} variant="thumb" />
        <span
          className={cn(
            'absolute inset-0 grid place-items-center',
            row.status === 'locked' ? 'bg-background/70' : 'bg-transparent',
          )}
        >
          {row.status === 'locked' ? (
            <Lock className="text-muted-foreground size-4" />
          ) : (
            <Icon className="size-5 drop-shadow" style={{ color: row.realm.color }} strokeWidth={2.25} />
          )}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <strong
            className={cn(
              'font-heading text-[15px] font-bold tracking-wide',
              row.status === 'locked' && 'text-muted-foreground',
            )}
            style={isDone || isCurrent ? { color: row.realm.color } : undefined}
          >
            {row.realm.name}
          </strong>
          {isCurrent && (
            <span className="realm-path-seal" data-realm-mark="current">
              {row.realm.tiers > 1 ? `Tầng ${row.tier}/${row.realm.tiers}` : 'Đang tu luyện'}
            </span>
          )}
          {isDone && <span className="realm-path-seal" data-realm-mark="done"><Check className="size-3" strokeWidth={3} /> Đã vượt qua</span>}
          {!isCurrent && !isDone && <span className="realm-path-seal" data-realm-mark="locked">Chưa khai mở</span>}
        </div>
        {/* Gói hai dòng trên màn hẹp: mười bậc, mỗi bậc một câu dài bốn
            dòng thì riêng cái thang đã 1437px - dài gấp đôi màn hình. */}
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11.5px] leading-snug sm:line-clamp-none">
          {row.realm.note}
        </p>
        {isCurrent && row.realm.tiers > 1 && (
          <div className="realm-path-progress mt-2" role="progressbar" aria-label={`Tiến độ ${row.realm.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(row.ratio * 100)}>
            <Meter value={row.ratio} height={4} barClassName="bg-primary" />
          </div>
        )}
      </div>

      <span className="text-muted-foreground tabular shrink-0 text-[11px]">
        {row.startAt === 0 ? 'khởi đầu' : `${row.startAt}+`}
      </span>
    </li>
  );
}

function AwardCard({ award }: { award: AchievementState }) {
  const tone = TONE_UI[award.tone];
  const Icon = award.icon;
  const gameState = award.unlocked ? 'unlocked' : award.current > 0 ? 'advancing' : 'locked';
  // Có huy hiệu vẽ riêng trong public/art/award thì dùng, không thì dùng icon nét.
  const [hasArt, setHasArt] = useState(true);

  return (
    <article
      data-achievement-state={gameState}
      className={cn(
        'achievement-game-card rounded-xl border p-4 transition-colors',
        award.unlocked ? cn('border-border bg-card ring-1', tone.ring) : 'border-border bg-card/50',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Huy hiệu vẽ riêng đã có vành vàng nên không cần ô màu phía sau; chỉ khi
            phải dùng icon nét thay thế mới cần nền. Huy hiệu chưa mở hiện dạng xám
            mờ kèm ổ khoá nhỏ — thấy trước cái mình đang nhắm tới thì mới có động lực. */}
        <div
            className={cn(
            'achievement-game-seal relative grid size-11 shrink-0 place-items-center rounded-xl',
            hasArt ? null : award.unlocked ? cn(tone.bg, tone.text) : 'bg-muted text-muted-foreground/50',
          )}
        >
          {hasArt ? (
            <>
              <img
        loading="lazy"
        decoding="async"
                src={`/art/award/${award.id}.png`}
                alt=""
                onError={() => setHasArt(false)}
                className={cn(
                  'size-11 object-contain transition-all duration-300',
                  !award.unlocked && 'opacity-30 grayscale',
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
          <div className="achievement-game-heading">
            <strong className={cn('block text-sm font-semibold', !award.unlocked && 'text-muted-foreground')}>
              {award.title}
            </strong>
            <span className="achievement-game-state">
              {award.unlocked ? <><Check className="size-3" /> Đã khai mở</> : award.current > 0 ? <><Sparkles className="size-3" /> Đang tích lũy</> : <><Lock className="size-3" /> Chưa mở</>}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{award.description}</p>
        </div>
      </div>

      {!award.unlocked && (
        <div className="achievement-game-progress mt-3">
          <div role="progressbar" aria-label={`Tiến độ ${award.title}`} aria-valuemin={0} aria-valuemax={award.target} aria-valuenow={award.current}>
            <Meter value={award.ratio} height={5} />
          </div>
          <p className="text-muted-foreground tabular mt-1.5 flex justify-between text-[11px]">
            <span>{award.current}/{award.target}</span>
            <span>{Math.round(award.ratio * 100)}%</span>
          </p>
        </div>
      )}
    </article>
  );
}
