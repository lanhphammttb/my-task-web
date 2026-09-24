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
import { stoneBreakdown, xpBreakdown } from '../lib/economy';
import { railSrc } from '../lib/icons';
import { useCountUp } from '../lib/useCountUp';
import { useApp } from '../store/AppStore';
import ArtImage from '../components/ArtImage';
import BeastEmblem from '../components/BeastEmblem';
import ElementSeal from '../components/ElementSeal';
import { EmptyState, Meter, MetaChip, Section } from '../components/primitives';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import TechniqueSection from '../components/cave/TechniqueSection';
import FieldSection from '../components/cave/FieldSection';
import AlchemySection from '../components/cave/AlchemySection';
import RootRefineSection from '../components/cave/RootRefineSection';
import CaveUpgradeSection from '../components/cave/CaveUpgradeSection';
import CaveRoom from '../components/cave/CaveRoom';
import { cn } from '@/lib/utils';
import CaveTabs from '../components/cave/CaveTabs';
import type { CaveTab } from '../components/cave/CaveTabs';

/**
 * Động Phủ: nơi ở của người tu. Chứa linh căn, túi linh thạch và đàn linh thú.
 * Đây là phần "chơi" của app - nhưng mọi nguồn lực đều đến từ việc làm thật.
 */
export default function CaveView() {
  const { data, awaken, rerollRoot, summon, feedBeast, setActiveBeast } = useApp();
  const [revealed, setRevealed] = useState<Beast | null>(null);
  // Mở Động Phủ ra là đứng ở túi linh thạch - chỗ trả lời câu "tôi đang có gì".
  const [tab, setTab] = useState('cave-stone');

  const stones = useMemo(() => stoneBreakdown(data), [data]);
  const stonesShown = useCountUp(stones.balance);
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

  /* Tẩy tuỷ chỉ có nghĩa khi đã khai quang linh căn, nên chưa khai quang thì
     không bày ra - bớt được một tab trên màn hẹp. */
  const tabs: CaveTab[] = [
    { id: 'cave-stone', label: 'Linh thạch', art: railSrc('linh-thach'), Icon: Gem },
    { id: 'cave-root', label: 'Linh căn', art: railSrc('linh-can'), Icon: Sparkles, goi: !root },
    { id: 'cave-technique', label: 'Công pháp', art: '/art/section/cong-phap.png', Icon: Wand2 },
    { id: 'cave-field', label: 'Linh điền', art: '/art/section/linh-dien.png', Icon: Star },
    { id: 'cave-pill', label: 'Đan đường', art: railSrc('dan-duong'), Icon: Heart },
    ...(root ? [{ id: 'cave-refine', label: 'Tẩy tuỷ', Icon: RefreshCw }] : []),
    { id: 'cave-home', label: 'Nơi ở', art: railSrc('dong-phu'), Icon: Mountain },
    { id: 'cave-beast', label: 'Linh thú', art: railSrc('linh-thu'), Icon: PawPrint },
  ];

  return (
    <div className="stagger-in mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Tiêu đề "Động Phủ" đã nằm ở h1 của bảng phủ, không lặp lại lần nữa.

          Mở Động Phủ ra là NHÌN THẤY CĂN PHÒNG trước đã, không phải đọc một
          đoạn giải thích cơ chế. Đoạn văn cũ nói linh căn/công pháp/linh điền
          dùng để làm gì - mà ngay dưới đây mỗi mục đều đã tự giới thiệu, nên
          nó chỉ là một lớp chữ chắn giữa người chơi và nhà của họ. */}
      <CaveRoom onGo={setTab} />

      <CaveTabs tabs={tabs} dang={tab} onChon={setTab} />

      {/* ------------------------------------------------------ túi linh thạch */}
      {tab === 'cave-stone' && (
      <Section id="cave-stone" icon={Gem} title="Túi linh thạch" tone="accent">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <ArtImage
              src={railSrc('linh-thach')}
              alt=""
              className="size-14 object-contain drop-shadow-lg"
            />
            <div className="flex items-baseline gap-2">
              {/* Con số to nhất bảng này. Nhảy phắt thì não không kịp ghi nhận là vừa
                  được thêm; chạy dần nửa giây mới thành khoảnh khắc thưởng. */}
              <span className="font-heading tabular text-gold text-4xl font-bold">
                {stonesShown}
              </span>
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
      )}

      {/* ----------------------------------------------------------- linh căn */}
      {tab === 'cave-root' && (
      <Section
        id="cave-root"
        icon={Sparkles}
        title="Linh căn"
        subtitle={root ? 'Thiên phú đang phát huy tác dụng' : 'Chưa khai quang'}
        action={
          root ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                {/* Nút này KHÔNG phải tẩy tuỷ. Nó gieo lại toàn bộ linh căn và
                    có thể ra kém hơn hẳn, ngược hẳn với mục "Tẩy tuỷ" phía dưới
                    vốn gột từng hệ một cách chắc chắn. Hai thứ từng trùng tên,
                    nên ai bấm nhầm là mất luôn linh căn tốt. */}
                <Button variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="size-3.5" /> Khai quang lại ({REROLL_COST})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Khai quang lại từ đầu?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tốn {REROLL_COST} linh thạch để gieo lại <strong>toàn bộ</strong> linh căn.
                    Kết quả mới có thể tốt hơn, cũng có thể kém hơn — thiên ý khó lường, và linh
                    căn đang có sẽ mất.
                    <br />
                    <br />
                    Muốn chắc tay thì dùng mục <strong>Tẩy tuỷ</strong> phía dưới: đổi hoặc bỏ bớt
                    đúng một hệ, không đụng tới phần còn lại.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Thôi</AlertDialogCancel>
                  <AlertDialogAction onClick={() => rerollRoot()}>
                    Khai quang lại
                  </AlertDialogAction>
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
                  {/* Mấy hạt sáng = mấy hệ. Đọc ra bậc linh căn trước cả khi
                      kịp đọc tên, mà "một hệ thì quý hơn năm hệ" cũng thành
                      thứ nhìn thấy được chứ không phải chỉ nghe nói. */}
                  <div className="mb-1.5 flex items-center justify-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full"
                        style={
                          i < g.count
                            ? { background: g.tone, boxShadow: `0 0 5px ${g.tone}` }
                            : { background: 'var(--border)' }
                        }
                      />
                    ))}
                  </div>
                  <div className="tone tabular text-sm font-bold" style={{ color: g.tone }}>
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
                className="font-heading tone rounded-md px-3 py-1.5 text-sm font-bold"
                style={{ background: `${grade!.tone}22`, color: grade!.tone }}
              >
                {grade!.name}
              </span>
              <span className="text-muted-foreground tabular text-xs">
                hấp thu ×{grade!.multiplier}
              </span>
              <div className="flex gap-2">
                {root.elements.map((e) => (
                  <ElementSeal key={e} element={e} size={44} />
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
                  <ElementSeal element={e} size={36} />
                  <div>
                    <strong className="tone block text-xs font-semibold" style={{ color: ELEMENTS[e].color }}>
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
      )}

      {/* Công pháp, linh điền, tẩy tuỷ, đan đường và bậc động phủ đều là mục
          riêng - mỗi cái một tệp trong components/cave/, để tệp này không phình
          thành hai nghìn dòng. */}
      {tab === 'cave-technique' && <TechniqueSection />}
      {tab === 'cave-refine' && <RootRefineSection />}
      {tab === 'cave-field' && <FieldSection />}
      {tab === 'cave-pill' && <AlchemySection />}
      {tab === 'cave-home' && <CaveUpgradeSection />}

      {/* ---------------------------------------------------------- linh thú */}
      {tab === 'cave-beast' && (
      <Section
        id="cave-beast"
        collapsible
        defaultOpen={false}
        icon={PawPrint}
        title="Linh thú"
        subtitle={`Đã thu phục ${owned.length}/${BEASTS.length}`}
        action={
          <Button size="sm" className="gap-1.5" onClick={doSummon} disabled={stones.balance < SUMMON_COST}>
            <ArtImage src={railSrc('chieu-thu')} alt="" className="size-4 object-contain" /> Chiêu thú ({SUMMON_COST})
          </Button>
        }
      >
        {active && activeSpecies ? (
          <div className="border-primary/35 bg-primary/[0.07] mb-4 flex flex-wrap items-center gap-4 rounded-xl border p-4">
            <BeastEmblem beast={activeSpecies} size={84} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-heading text-base font-bold">{activeSpecies.name}</strong>
                <MetaChip className="tone" style={{ color: RARITIES[activeSpecies.rarity].color }}>
                  {RARITIES[activeSpecies.rarity].label}
                </MetaChip>
                <MetaChip className="tone" style={{ color: ELEMENTS[activeSpecies.element].color }}>
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
            art="no-beast"
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
                  <span className="tone" style={{ color: RARITIES[r].color }}>{RARITIES[r].label}</span>
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
      )}

      {revealed && (
        <p className="sr-only" aria-live="polite">
          Thu phục được {revealed.name}
        </p>
      )}

    </div>
  );
}
