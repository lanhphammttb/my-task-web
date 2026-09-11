import { useState } from 'react';
import { Leaf, Scissors, Sprout } from 'lucide-react';
import { HERBS, HERB_ORDER, plotState } from '../../lib/field';
import { fieldSlots, nextCave } from '../../lib/cave';
import { stoneBalance, verifiedFocusMinutes } from '../../lib/economy';
import { formatDuration } from '../../lib/date';
import { useApp } from '../../store/AppStore';
import { Meter, MetaChip, Section } from '../primitives';
import SectionArt from '../SectionArt';
import ChoiceCard from './ChoiceCard';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * Linh điền.
 *
 * Cây ở đây **không lớn theo đồng hồ mà lớn theo số phút bế quan**. Đó là chỗ
 * khác biệt quan trọng nhất: nếu chín theo giờ thật thì app đang thưởng cho
 * việc mở app, và nó sẽ cạnh tranh với chính mục đích của ứng dụng. Đo bằng
 * phút bế quan thì muốn thu hoạch chỉ có một đường - ngồi xuống làm việc thật.
 */
export default function FieldSection() {
  const { data, plantSeed, harvestPlot } = useApp();

  // Một hộp thoại dùng chung cho mọi ô, nhớ đang gieo cho ô nào. Dựng riêng
  // một hộp thoại cho từng ô thì thừa, mà lại khó điều khiển đóng mở.
  const [seedFor, setSeedFor] = useState<number | null>(null);

  const slots = fieldSlots(data.caveLevel);
  const totalFocus = verifiedFocusMinutes(data);
  const balance = stoneBalance(data);
  const upgrade = nextCave(data.caveLevel);

  return (
    <Section
      id="cave-field"
      icon={Sprout}
      title="Linh điền"
      subtitle={`${data.field.length}/${slots} ô đang có cây`}
    >
      <SectionArt
        src="/art/encounter/linh-thao.jpg"
        caption="Linh điền trước cửa động"
        tone="#6fbf73"
        focus="21% 52%"
      >
        Linh thảo hút linh khí của người trồng, nên nó lớn theo <strong>số phút bế quan</strong> chứ
        không theo giờ giấc ngoài đời. Muốn hái thì phải ngồi xuống mà làm.
      </SectionArt>

      {/* ------------------------------------------------------------ ô đất */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: slots }, (_, slot) => {
          const plot = data.field.find((p) => p.slot === slot);

          if (!plot) {
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSeedFor(slot)}
                className="border-border/70 text-muted-foreground hover:border-gold/50 hover:text-gold flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors"
              >
                <Sprout className="size-5" strokeWidth={1.75} />
                <span className="text-xs font-medium">Ô đất trống · gieo hạt</span>
              </button>
            );
          }

          const s = plotState(plot, totalFocus);
          return (
            <div
              key={slot}
              className="flex min-h-24 flex-col justify-between gap-2 rounded-xl border p-3"
              style={{ borderColor: `${s.herb.tone}4d` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-title truncate text-sm font-bold" style={{ color: s.herb.tone }}>
                    {s.herb.name}
                  </h4>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {s.ready
                      ? `Đã chín · thu được ${s.herb.yield} nhánh`
                      : `Còn ${formatDuration(s.remain)} bế quan nữa`}
                  </p>
                </div>
                <Leaf className="size-4 shrink-0" style={{ color: s.herb.tone }} />
              </div>

              <Meter value={s.ratio} />

              <Button
                size="sm"
                variant={s.ready ? 'default' : 'outline'}
                disabled={!s.ready}
                onClick={() => harvestPlot(slot)}
                className="gap-1.5"
              >
                <Scissors className="size-3.5" />
                {s.ready ? 'Hái' : `${Math.round(s.ratio * 100)}%`}
              </Button>
            </div>
          );
        })}
      </div>

      {upgrade && (
        <p className="text-muted-foreground mt-3 text-[11px]">
          Nâng động phủ lên {upgrade.name} để mở ô đất thứ {upgrade.plots}.
        </p>
      )}

      {/* --------------------------------------------------------- túi thuốc */}
      <div className="mt-4">
        <h4 className="font-title text-muted-foreground mb-1.5 text-[11px] font-bold tracking-wide uppercase">
          Túi linh thảo
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {HERB_ORDER.map((id) => {
            const n = data.herbs[id] ?? 0;
            return (
              <MetaChip
                key={id}
                className={cn(n === 0 && 'opacity-45')}
                style={n > 0 ? { borderColor: `${HERBS[id].tone}59`, color: HERBS[id].tone } : undefined}
              >
                {HERBS[id].short} × {n}
              </MetaChip>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------ chọn hạt giống */}
      <AlertDialog open={seedFor !== null} onOpenChange={(open) => !open && setSeedFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gieo gì vào ô này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hạt trả bằng linh thạch, cây chín bằng phút bế quan. Đang có {balance} linh thạch.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid min-w-0 gap-2">
            {HERB_ORDER.map((id) => {
              const herb = HERBS[id];
              const afford = balance >= herb.seedCost;
              return (
                <ChoiceCard
                  key={id}
                  disabled={!afford}
                  tone={herb.tone}
                  title={herb.name}
                  trailing={
                    <span className="tabular text-gold text-xs">{herb.seedCost} linh thạch</span>
                  }
                  onClick={() => {
                    if (seedFor !== null) plantSeed(seedFor, id);
                    setSeedFor(null);
                  }}
                >
                  <span className="text-muted-foreground text-[11px]">
                    Chín sau {formatDuration(herb.needFocus)} bế quan · thu {herb.yield} nhánh
                  </span>
                  <span className="text-muted-foreground/80 text-[11px]">{herb.note}</span>
                </ChoiceCard>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Thôi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
