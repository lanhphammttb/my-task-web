import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Cột icon nổi ở rìa màn hình. Máy rộng thì là cột dọc bám mép trái/phải,
 * máy hẹp thì rải thành hàng ngang ngay dưới HUD.
 */
export default function SideRail({
  side,
  label,
  /** Máy hẹp: bảng phủ che kín màn hình nên hai hàng icon phải nhường chỗ. */
  collapsed,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  collapsed?: boolean;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'absolute z-20 flex transition-opacity duration-200',
        collapsed ? 'pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-100' : 'pointer-events-auto',
        // Máy hẹp: hàng ngang, cuộn ngang nếu chật.
        'right-0 left-0 justify-center gap-1 overflow-x-auto px-2',
        side === 'left' ? 'top-[76px]' : 'top-[150px]',
        // Máy rộng: cột dọc bám mép, canh giữa theo chiều cao.
        'lg:top-1/2 lg:w-20 lg:flex-col lg:justify-start lg:gap-3 lg:overflow-visible lg:px-0',
        'lg:-translate-y-1/2',
        side === 'left' ? 'lg:right-auto lg:left-3' : 'lg:right-3 lg:left-auto',
      )}
    >
      {children}
    </nav>
  );
}
