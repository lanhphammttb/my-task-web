import { ArrowUp, Home } from 'lucide-react';
import { CAVE_LEVELS, MAX_CAVE_LEVEL, caveAt, nextCave } from '../../lib/cave';
import { stoneBalance } from '../../lib/economy';
import { useApp } from '../../store/AppStore';
import { Meter, MetaChip, Section } from '../primitives';
import SectionArt from '../SectionArt';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * Bậc động phủ - chỗ tiêu linh thạch dài hạn duy nhất trong app.
 *
 * Mọi thứ khác tiêu xong là hết: triệu hồi, cho ăn, mua đan. Nâng động phủ thì
 * đọng lại - mỗi bậc mở thêm ô linh điền và tăng tay nghề luyện đan, nên linh
 * thạch bỏ ra hôm nay còn sinh lợi mãi về sau.
 */
export default function CaveUpgradeSection() {
  const { data, upgradeCave } = useApp();

  const balance = stoneBalance(data);
  const cur = caveAt(data.caveLevel);
  const next = nextCave(data.caveLevel);
  const afford = next ? balance >= next.cost : false;

  return (
    <Section
      id="cave-home"
      icon={Home}
      title="Bậc động phủ"
      subtitle={`${cur.name} · bậc ${cur.level}/${MAX_CAVE_LEVEL}`}
      action={
        next ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={!afford}>
                <ArrowUp className="size-3.5" /> Mở rộng ({next.cost})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mở rộng thành {next.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tốn {next.cost} linh thạch. Linh điền lên {next.plots} ô (đang có {cur.plots}), tay
                  nghề luyện đan +{Math.round(next.refineBonus * 100)}% (đang là +
                  {Math.round(cur.refineBonus * 100)}%). Đây là khoản tiêu không mất đi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Thôi</AlertDialogCancel>
                <AlertDialogAction onClick={() => upgradeCave()}>Mở rộng</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null
      }
    >
      <SectionArt src="/art/encounter/hang-dong.jpg" caption={cur.name} tone="#cbb994">
        {cur.note}
      </SectionArt>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <MetaChip>{cur.plots} ô linh điền</MetaChip>
        <MetaChip>
          Luyện đan {cur.refineBonus > 0 ? `+${Math.round(cur.refineBonus * 100)}%` : 'chưa thêm gì'}
        </MetaChip>
      </div>

      <Meter value={cur.level / MAX_CAVE_LEVEL} className="mt-3" />

      <ol className="mt-3 grid gap-1">
        {CAVE_LEVELS.map((lv) => (
          <li
            key={lv.level}
            className={cn(
              'flex flex-wrap items-baseline gap-x-2 text-[11px]',
              lv.level === cur.level ? 'text-gold-bright font-bold' : 'text-muted-foreground',
              lv.level > cur.level && 'opacity-60',
            )}
          >
            <span className="font-title">{lv.name}</span>
            <span className="tabular">
              {lv.plots} ô · luyện đan +{Math.round(lv.refineBonus * 100)}%
            </span>
            {lv.cost > 0 && <span className="tabular ml-auto">{lv.cost} linh thạch</span>}
          </li>
        ))}
      </ol>
    </Section>
  );
}
