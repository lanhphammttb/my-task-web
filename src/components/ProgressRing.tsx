import { cn } from '@/lib/utils';

interface Props {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  /** Màu vòng: CSS color hoặc var(). Mặc định dùng chuyển sắc thương hiệu. */
  color?: string;
  className?: string;
  labelClassName?: string;
  /** Dịch khối chữ giữa vòng, dùng khi bên trong đã có hình vẽ khác. */
  centerClassName?: string;
  /** Bật hào quang khi đạt 100% - phần thưởng thị giác nhỏ. */
  glowOnFull?: boolean;
  /** Vòng linh khí nét đứt xoay chậm bên ngoài, dùng cho thẻ cảnh giới. */
  qi?: boolean;
}

/**
 * Vòng tiến độ SVG. Dùng gradient thương hiệu mặc định và phát sáng khi tròn
 * 100% để việc "đầy vòng" trở thành mục tiêu đáng theo đuổi.
 */
export default function ProgressRing({
  value,
  size = 128,
  stroke = 11,
  label,
  caption,
  color,
  className,
  labelClassName,
  centerClassName,
  glowOnFull = true,
  qi = false,
}: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const full = clamped >= 1;
  const gradientId = `ring-${Math.round(r * 100)}-${stroke}`;

  return (
    <div
      className={cn('relative grid shrink-0 place-items-center', full && glowOnFull && 'animate-glow', className)}
      style={{ width: size, height: size }}
    >
      {/* Vòng linh khí: nét đứt mảnh xoay chậm quanh vòng tiến độ */}
      {qi && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="animate-qi absolute inset-0 opacity-60"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - stroke) / 2 + stroke * 0.85}
            fill="none"
            stroke={color ?? 'var(--gold)'}
            strokeWidth={1}
            strokeDasharray="2 9"
            strokeLinecap="round"
          />
        </svg>
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--jade)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? `url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className={cn('relative z-10 flex flex-col items-center leading-tight', centerClassName)}>
        <strong className={cn('font-heading tabular text-2xl font-bold tracking-tight', labelClassName)}>
          {label ?? `${Math.round(clamped * 100)}%`}
        </strong>
        {caption && <span className="text-muted-foreground text-[11px]">{caption}</span>}
      </div>
    </div>
  );
}
