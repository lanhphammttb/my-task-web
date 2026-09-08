import { useMemo, useState } from 'react';
import {
  Check, Gem, Heart, Lock, Mountain, PawPrint, RefreshCw, Sparkles, Star, Wand2,
} from 'lucide-react';
import {
  BEASTS, FEED_COST, RARITIES, RARITY_ORDER, SUMMON_COST, beastById, beastLevel, feedToNext,
  MAX_BEAST_LEVEL, PERK_LABEL,
} from '../lib/beasts';
import type { Beast, BeastRarity } from '../lib/beasts';
import { ELEMENTS, REROLL_COST, ROOT_GRADES, gradeOf } from '../lib/spirit';
import { PILLS, PILL_ORDER } from '../lib/pills';
import { stoneBreakdown, xpBreakdown } from '../lib/economy';
import { useApp } from '../store/AppStore';
import BeastEmblem from '../components/BeastEmblem';
import { EmptyState, Meter, MetaChip, Section } from '../components/primitives';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * Động Phủ: nơi ở của người tu. Chứa linh căn, túi linh thạch và đàn linh thú.
 * Đây là phần "chơi" của app - nhưng mọi nguồn lực đều đến từ việc làm thật.
 */
export default function CaveView() {
  const { data, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill } = useApp();
  const [revealed, setRevealed] = useState<Beast | null>(null);

  const stones = useMemo(() => stoneBreakdown(data), [data]);
  const xp = useMemo(() => xpBreakdown(data), [data]);
  const root = data.root;
  const grade = root ? gradeOf(root) : null;
  const owned = data.beasts;
  const active = owned.find((b) => b.id === data.activeBeastId);
  const activeSpecies = active ? beastById(active.id) : undefined;

  const doSummon = () => {
    const beast = summon();
    if (beast) setRevealed(beast);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Động Phủ</h2>
        <p className="text-muted-foreground text-xs">
          Linh căn quyết định tốc độ hấp thu, linh thú đi theo trợ đạo. Linh thạch chỉ đến từ việc
          bạn thật sự làm xong.
        </p>
      </div>

      {/* ------------------------------------------------------ túi linh thạch */}
      <Section icon={Gem} title="Túi linh thạch" tone="accent">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/art/icon/stone.png" alt="" className="size-14 object-contain drop-shadow-lg" />
            <div className="flex items-baseline gap-2">
              <span className="font-heading tabular text-gold text-4xl font-bold">{stones.balance}</span>
              <span className="text-muted-foreground text-xs">linh thạch</span>
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-1.5 text-[11px]">
            <MetaChip>+{stones.fromTasks} nhiệm vụ</MetaChip>
            <MetaChip>+{stones.fromSessions} bế quan</MetaChip>
            <MetaChip>+{stones.fromPerfectDays} ngày viên mãn</MetaChip>
            <MetaChip>+{stones.fromQuests} nhật khoá</MetaChip>
            {stones.fromEncounters !== 0 && (
              <MetaChip className="border-warning/35 bg-warning/12 text-warning">
                {stones.fromEncounters > 0 ? '+' : ''}
                {stones.fromEncounters} kỳ ngộ
              </MetaChip>
            )}
            {stones.beastPercent > 0 && (
              <MetaChip className="border-success/35 bg-success/12 text-success">
                +{stones.beastPercent}% linh thú
              </MetaChip>
            )}
            {stones.spent > 0 && <MetaChip>−{stones.spent} đã tiêu</MetaChip>}
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------------- linh căn */}
      <Section
        icon={Sparkles}
        title="Linh căn"
        subtitle={root ? 'Thiên phú đang phát huy tác dụng' : 'Chưa khai quang'}
        action={
          root ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="size-3.5" /> Tẩy Tuỷ ({REROLL_COST})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Dùng Tẩy Tuỷ Đan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tốn {REROLL_COST} linh thạch để khai quang lại. Linh căn mới có thể tốt hơn,
                    cũng có thể kém hơn — thiên ý khó lường.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Thôi</AlertDialogCancel>
                  <AlertDialogAction onClick={() => rerollRoot()}>Tẩy tuỷ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null
        }
      >
        {!root ? (
          <div className="space-y-4">
            <p className="text-sm">
              Mọi người tu đều phải khai quang một lần để biết mình mang hệ gì. Càng ít hệ thì hấp
              thu linh khí càng nhanh, nhưng càng nhiều hệ thì càng nhiều thiên phú.
            </p>
            <div className="grid gap-2 sm:grid-cols-5">
              {ROOT_GRADES.map((g) => (
                <div key={g.name} className="border-border bg-surface/60 rounded-lg border p-2.5 text-center">
                  <div className="tabular text-sm font-bold" style={{ color: g.tone }}>
                    {Math.round(g.chance * 100)}%
                  </div>
                  <div className="text-[11px] font-medium">{g.name}</div>
                  <div className="text-muted-foreground text-[10.5px]">×{g.multiplier} tu vi</div>
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full gap-2" onClick={() => awaken()}>
              <Wand2 className="size-4" /> Khai quang linh căn
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="font-heading rounded-md px-3 py-1.5 text-sm font-bold"
                style={{ background: `${grade!.tone}22`, color: grade!.tone }}
              >
                {grade!.name}
              </span>
              <span className="text-muted-foreground tabular text-xs">
                hấp thu ×{grade!.multiplier}
              </span>
              <div className="flex gap-2">
                {root.elements.map((e) => (
                  <span
                    key={e}
                    className="relative grid size-11 place-items-center overflow-hidden rounded-md border"
                    style={{ borderColor: `${ELEMENTS[e].color}66` }}
                    title={`Hệ ${ELEMENTS[e].label}`}
                  >
                    <img src={`/art/element/${e}.png`} alt="" className="h-full w-full object-cover" />
                  </span>
                ))}
              </div>
            </div>

            <p className="text-muted-foreground text-xs italic">{grade!.note}</p>

            <ul className="grid gap-2 sm:grid-cols-2">
              {root.elements.map((e) => (
                <li
                  key={e}
                  className="border-border bg-surface/60 flex items-start gap-2.5 rounded-lg border p-2.5"
                >
                  <img
                    src={`/art/element/${e}.png`}
                    alt=""
                    className="size-9 shrink-0 rounded object-cover"
                  />
                  <div>
                    <strong className="block text-xs font-semibold" style={{ color: ELEMENTS[e].color }}>
                      {ELEMENTS[e].perk}
                    </strong>
                    <span className="text-muted-foreground text-[11px]">{ELEMENTS[e].perkNote}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-border bg-surface/60 rounded-lg border p-3 text-xs">
              <p className="mb-1.5 font-semibold">Tu vi đang có</p>
              <div className="text-muted-foreground grid gap-1 sm:grid-cols-4">
                <span>Gốc: <b className="text-foreground tabular">{xp.base}</b></span>
                <span>Ngũ hành: <b className="text-success tabular">+{xp.elementBonus}</b></span>
                <span>Linh thú: <b className="text-success tabular">+{xp.beastBonus}</b></span>
                <span>Tổng: <b className="text-gold tabular">{xp.total}</b> (×{xp.multiplier})</span>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ---------------------------------------------------------- đan đường */}
      <Section
        icon={Wand2}
        title="Đan Đường"
        subtitle="Độ Kiếp Đan - thứ duy nhất chống nổi thiên lôi khi vượt cảnh giới"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {PILL_ORDER.map((g) => {
            const pill = PILLS[g];
            const afford = stones.balance >= pill.cost;
            return (
              <div key={g} className="border-border bg-surface/60 flex flex-col gap-2.5 rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <img src={pill.image} alt="" className="size-14 shrink-0 object-contain" />
                  <div className="min-w-0">
                    <strong className="block text-xs font-semibold">
                      {pill.name.replace('Độ Kiếp Đan ', '')}
                    </strong>
                    <span className="text-success tabular block text-[11px] font-bold">
                      {Math.round(pill.chance * 100)}% thành công
                    </span>
                    <span className="text-muted-foreground tabular block text-[11px]">
                      đang có {data.pills[g]} viên
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground text-[11px] leading-snug">{pill.note}</p>
                <Button
                  size="sm"
                  variant={afford ? 'default' : 'outline'}
                  className="mt-auto h-8 gap-1.5 text-xs"
                  disabled={!afford}
                  onClick={() => buyPill(g)}
                >
                  <Gem className="size-3.5" /> Mua ({pill.cost})
                </Button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ---------------------------------------------------------- linh thú */}
      <Section
        icon={PawPrint}
        title="Linh thú"
        subtitle={`Đã thu phục ${owned.length}/${BEASTS.length}`}
        action={
          <Button size="sm" className="gap-1.5" onClick={doSummon} disabled={stones.balance < SUMMON_COST}>
            <img src="/art/icon/summon.png" alt="" className="size-4 object-contain" /> Chiêu thú ({SUMMON_COST})
          </Button>
        }
      >
        {active && activeSpecies ? (
          <div className="border-primary/35 bg-primary/[0.07] mb-4 flex flex-wrap items-center gap-4 rounded-xl border p-4">
            <BeastEmblem beast={activeSpecies} size={84} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-heading text-base font-bold">{activeSpecies.name}</strong>
                <MetaChip style={{ color: RARITIES[activeSpecies.rarity].color }}>
                  {RARITIES[activeSpecies.rarity].label}
                </MetaChip>
                <MetaChip style={{ color: ELEMENTS[activeSpecies.element].color }}>
                  Hệ {ELEMENTS[activeSpecies.element].label}
                </MetaChip>
                <MetaChip icon={Star}>Cấp {beastLevel(active.fed)}/{MAX_BEAST_LEVEL}</MetaChip>
              </div>
              <p className="text-muted-foreground text-xs italic">{activeSpecies.lore}</p>
              <p className="text-success text-xs font-semibold">
                Thiên phú: +{activeSpecies.perkPerLevel * beastLevel(active.fed)}%{' '}
                {PERK_LABEL[activeSpecies.perk]}
              </p>
              {beastLevel(active.fed) < MAX_BEAST_LEVEL && (
                <div className="flex items-center gap-3">
                  <Meter
                    value={1 - feedToNext(active.fed) / (3 * beastLevel(active.fed))}
                    className="max-w-40"
                    height={5}
                  />
                  <span className="text-muted-foreground text-[11px]">
                    còn {feedToNext(active.fed)} lần cho ăn
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    disabled={stones.balance < FEED_COST}
                    onClick={() => feedBeast(active.id)}
                  >
                    <Heart className="size-3.5" /> Cho ăn ({FEED_COST})
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={PawPrint}
            title="Chưa có linh thú nào theo bên mình"
            hint={`Tích đủ ${SUMMON_COST} linh thạch rồi chiêu thú. Thú càng quý, thiên phú càng mạnh.`}
            className="mb-4"
          />
        )}

        {/* Đồ giám: hiện cả con chưa thu phục để biết còn gì ngoài kia */}
        <div className="space-y-4">
          {RARITY_ORDER.map((r: BeastRarity) => {
            const list = BEASTS.filter((b) => b.rarity === r);
            return (
              <div key={r}>
                <h4 className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                  <span style={{ color: RARITIES[r].color }}>{RARITIES[r].label}</span>
                  <span className="text-muted-foreground font-normal normal-case">
                    tỷ lệ {Math.round(RARITIES[r].chance * 100)}%
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {list.map((b) => {
                    const mine = owned.find((o) => o.id === b.id);
                    const isActive = data.activeBeastId === b.id;
                    return (
                      <button
                        key={b.id}
                        disabled={!mine}
                        onClick={() => setActiveBeast(isActive ? undefined : b.id)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                          isActive
                            ? 'border-primary bg-primary/12'
                            : mine
                              ? 'border-border bg-surface/60 hover:border-primary/50'
                              : 'border-border/60 bg-card/40 cursor-default',
                        )}
                      >
                        <BeastEmblem beast={b} size={44} locked={!mine} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            {mine ? b.name : '???'}
                            {isActive && <Check className="text-primary size-3" strokeWidth={3} />}
                            {!mine && <Lock className="text-muted-foreground size-3" />}
                          </span>
                          <span className="text-muted-foreground block text-[10.5px]">
                            {mine
                              ? `Cấp ${beastLevel(mine.fed)} · +${b.perkPerLevel * beastLevel(mine.fed)}% ${PERK_LABEL[b.perk]}`
                              : `+${b.perkPerLevel}%/cấp ${PERK_LABEL[b.perk]}`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {revealed && (
        <p className="sr-only" aria-live="polite">
          Thu phục được {revealed.name}
        </p>
      )}

      <p className="text-muted-foreground flex items-start gap-2 text-[11px]">
        <Mountain className="mt-0.5 size-3.5 shrink-0" />
        Mọi linh thạch đều sinh ra từ nhiệm vụ đã hoàn thành, phiên bế quan và nhật khoá — không có
        cách nào khác để có chúng.
      </p>
    </div>
  );
}
