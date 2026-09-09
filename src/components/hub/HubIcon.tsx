import { cn } from '@/lib/utils';

interface Props {
  /** Ảnh icon trong public/art/icon */
  icon: string;
  label: string;
  onClick: () => void;
  /** Con số nhỏ góc phải (số việc, số linh thú...) */
  badge?: number | string;
  /** Chấm sáng nhấp nháy khi có việc cần xử lý */
  alert?: boolean;
  active?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Nút icon nổi ở hai cột hai bên hub - đúng kiểu HubIcon của Tiên Ma Giới:
 * hào quang vàng toả ra khi rê chuột, icon phóng to nhẹ, có chấm báo và số đếm.
 */
export default function HubIcon({
  icon, label, onClick, badge, alert, active, size = 'md', className,
}: Props) {
  const box = size === 'sm' ? 'size-11' : 'size-14';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('group relative flex w-16 flex-col items-center gap-1 outline-none', className)}
    >
      {/* Hào quang vàng phía sau icon */}
      <span
        className={cn(
          'absolute top-0 left-1/2 -translate-x-1/2 rounded-full blur-md transition-opacity duration-300',
          box,
          active ? 'opacity-90' : 'opacity-0 group-hover:opacity-80 group-focus-visible:opacity-80',
        )}
        style={{ background: 'radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)' }}
      />

      <span
        className={cn(
          'glass-panel relative grid place-items-center rounded-xl transition-transform duration-300',
          'group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95',
          box,
          active && 'gold-border',
        )}
      >
        <img
          src={icon}
          alt=""
          className={cn('drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]', size === 'sm' ? 'size-7' : 'size-9')}
        />
        {alert && (
          <span
            className="pulse-dot absolute -top-1 -right-1 size-2.5 rounded-full"
            style={{ background: 'var(--gold-bright)' }}
          />
        )}
        {badge !== undefined && badge !== 0 && (
          <span className="bg-background/90 text-gold-bright border-gold/50 tabular absolute -right-1.5 -bottom-1.5 min-w-4.5 rounded-full border px-1 text-[10px] leading-4 font-bold">
            {badge}
          </span>
        )}
      </span>

      <span className="font-title text-foreground/85 group-hover:text-gold-bright w-full text-center text-[10px] leading-tight font-bold tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-colors">
        {label}
      </span>
    </button>
  );
}
