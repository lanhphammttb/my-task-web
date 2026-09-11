import { Check, Scroll } from 'lucide-react';
import { TECHNIQUES, TECHNIQUE_ORDER, techniqueSwapCost } from '../../lib/techniques';
import type { Technique } from '../../lib/techniques';
import { stoneBalance } from '../../lib/economy';
import { useApp } from '../../store/AppStore';
import { MetaChip, Section } from '../primitives';
import SectionArt from '../SectionArt';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/** "+35%" hoặc "−15%" - hệ số 1.0 nghĩa là không đổi gì nên không hiện. */
function delta(mul: number): string | null {
  if (mul === 1) return null;
  const sign = mul > 1 ? '+' : '−';
  return `${sign}${Math.round(Math.abs(mul - 1) * 100)}%`;
}

/** Chip cho một mặt của công pháp; lợi thì xanh, thiệt thì đỏ. */
function Trait({ label, mul, goodWhenHigh = true }: { label: string; mul: number; goodWhenHigh?: boolean }) {
  const text = delta(mul);
  if (!text) return null;
  const good = goodWhenHigh ? mul > 1 : mul < 1;
  return (
    <MetaChip
      className={cn(
        good ? 'border-success/35 bg-success/12 text-success' : 'border-warning/35 bg-warning/12 text-warning',
      )}
    >
      {label} {text}
    </MetaChip>
  );
}

function TechniqueCard({
  t,
  active,
  cost,
  affordable,
  onPick,
}: {
  t: Technique;
  active: boolean;
  cost: number;
  affordable: boolean;
  onPick: () => void;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 rounded-xl border p-3 transition-colors',
        active ? 'gold-border bg-muted/40' : 'border-border bg-muted/20',
      )}
      style={active ? undefined : { borderColor: `${t.tone}33` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-title text-sm font-bold tracking-wide" style={{ color: t.tone }}>
            {t.name}
          </h4>
          <p className="text-muted-foreground mt-0.5 text-[11px]">{t.fit}</p>
        </div>
        {active && (
          <span className="text-gold-bright inline-flex shrink-0 items-center gap-1 text-[11px] font-bold">
            <Check className="size-3.5" /> Đang tu
          </span>
        )}
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">{t.note}</p>

      <div className="flex flex-wrap gap-1.5">
        <Trait label="Nhiệm vụ" mul={t.taskMul} />
        <Trait label="Bế quan" mul={t.focusMul} />
        <Trait label="Linh thạch" mul={t.stoneMul} />
        {/* Hao tổn thì càng thấp càng tốt, nên đảo chiều tô màu. */}
        <Trait label="Hao tổn khi hỏng" mul={t.lossMul} goodWhenHigh={false} />
      </div>

      {!active && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="mt-auto w-full" disabled={!affordable}>
              {cost > 0 ? `Chuyển sang (${cost})` : 'Bắt đầu tu'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Chuyển sang {t.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {cost > 0
                  ? `Tốn ${cost} linh thạch. Đổi công pháp không mất tu vi đã tích, nhưng từ nay tỷ giá quy đổi công sức sẽ khác đi, và lần đổi sau còn đắt hơn.`
                  : 'Lần chọn đầu tiên miễn phí. Công pháp không cho thêm sức mạnh - nó đổi tỷ giá giữa công sức và tu vi, nên hãy chọn cái hợp với lối làm việc thật của bạn.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Thôi</AlertDialogCancel>
              <AlertDialogAction onClick={onPick}>Quyết</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

/**
 * Công pháp - lối tu, không phải cấp tu.
 *
 * Đặt ngay dưới linh căn vì hai thứ này đi với nhau: linh căn là trời cho,
 * công pháp là mình chọn.
 */
export default function TechniqueSection() {
  const { data, pickTechnique } = useApp();
  const balance = stoneBalance(data);
  const current = data.technique ? TECHNIQUES[data.technique] : null;
  const cost = data.technique ? techniqueSwapCost(data.techniqueSwaps) : 0;

  return (
    <Section
      id="cave-technique"
      icon={Scroll}
      title="Công pháp"
      subtitle={current ? `Đang tu ${current.name}` : 'Chưa chọn - lần đầu miễn phí'}
    >
      <SectionArt
        src="/art/encounter/thien-vien.jpg"
        caption="Nơi truyền thụ công pháp"
        tone="#9b7fd4"
      >
        Công pháp không cho thêm sức mạnh, nó đổi <strong>tỷ giá</strong> giữa công sức và tu vi.
        Không có cái nào mạnh hơn cái nào — chỉ có cái hợp với cách bạn thật sự làm việc.
      </SectionArt>

      <div className="grid gap-3 sm:grid-cols-2">
        {TECHNIQUE_ORDER.map((id) => (
          <TechniqueCard
            key={id}
            t={TECHNIQUES[id]}
            active={data.technique === id}
            cost={cost}
            affordable={cost === 0 || balance >= cost}
            onPick={() => pickTechnique(id)}
          />
        ))}
      </div>
    </Section>
  );
}
