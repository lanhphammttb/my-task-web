import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Nhãn metadata nhỏ, thay cho việc nhồi emoji vào chuỗi văn bản. */
export function MetaChip({
  icon: Icon,
  children,
  className,
  style,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap',
        'border-border bg-muted/50 text-muted-foreground',
        className,
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2.25} />}
      {children}
    </span>
  );
}

/** Khối nội dung có tiêu đề - khung chuẩn cho mọi mục trong app. */
export function Section({
  id,
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  tone = 'default',
}: {
  /** Neo để hub cuộn thẳng tới mục này khi mở từ icon bên rìa. */
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'danger';
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-4 rounded-xl border p-4 sm:p-5',
        tone === 'default' && 'border-border bg-card/80 backdrop-blur-[2px]',
        tone === 'accent' && 'border-primary/35 bg-primary/[0.07] backdrop-blur-[2px]',
        tone === 'danger' && 'border-destructive/40 bg-destructive/[0.07] backdrop-blur-[2px]',
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="font-heading flex items-center gap-2 text-[15px] font-bold tracking-wide">
                {Icon && (
                  <Icon
                    className={cn(
                      'size-4',
                      tone === 'danger' ? 'text-destructive' : tone === 'accent' ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                )}
                {title}
              </h3>
            )}
            {subtitle && <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Trạng thái rỗng có gợi ý hành động tiếp theo, không để màn hình trắng trơ. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('border-border/70 rounded-xl border border-dashed px-4 py-8 text-center', className)}>
      <Icon className="text-muted-foreground/70 mx-auto mb-3 size-7" strokeWidth={1.75} />
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">{hint}</p>}
    </div>
  );
}

/** Thanh tiến độ mảnh, tự chạy hoạt ảnh khi giá trị đổi. */
export function Meter({
  value,
  className,
  barClassName,
  height = 6,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className={cn('bg-muted w-full overflow-hidden rounded-full', className)} style={{ height }}>
      <div
        className={cn('bg-primary h-full rounded-full transition-[width] duration-700 ease-out', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Ô chỉ số lớn dùng ở trang thống kê. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('border-border bg-card/80 rounded-lg border p-4', className)}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className="tabular mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
    </div>
  );
}
