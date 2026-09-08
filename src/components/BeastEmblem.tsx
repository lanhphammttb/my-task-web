import { Lock } from 'lucide-react';
import type { Beast, BeastRarity } from '../lib/beasts';
import { RARITIES } from '../lib/beasts';
import { cn } from '@/lib/utils';

/**
 * Chân dung linh thú dùng ảnh art thật, đóng trong khung theo phẩm bậc.
 * Bậc càng quý thì viền càng sáng và có thêm hào quang.
 */
interface Props {
  beast?: Beast;
  size?: number;
  /** Chưa thu phục thì phủ mờ, xám và hiện ổ khoá. */
  locked?: boolean;
  className?: string;
}

export default function BeastEmblem({ beast, size = 72, locked = false, className }: Props) {
  const rarity: BeastRarity = beast?.rarity ?? 'pham';
  const meta = RARITIES[rarity];
  const glow = rarity === 'thoai' || rarity === 'thanh';

  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-lg border-2', className)}
      style={{
        width: size,
        height: size,
        borderColor: locked ? 'var(--border)' : meta.color,
        boxShadow: glow && !locked ? `0 0 14px -2px ${meta.color}` : undefined,
        background: 'var(--muted)',
      }}
      role="img"
      aria-label={beast ? `Chân dung ${beast.name}` : 'Linh thú chưa thu phục'}
    >
      {beast && (
        <img
          src={beast.image}
          alt=""
          loading="lazy"
          className={cn('h-full w-full object-cover', locked && 'grayscale')}
        />
      )}

      {locked && (
        <div className="bg-background/70 absolute inset-0 grid place-items-center backdrop-blur-[1px]">
          <Lock className="text-muted-foreground" style={{ width: size * 0.28, height: size * 0.28 }} />
        </div>
      )}
    </div>
  );
}
