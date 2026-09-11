import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Một lựa chọn dạng thẻ trong hộp thoại - dùng cho chọn hạt giống, chọn hệ để
 * tẩy, và mọi chỗ cần bày ra vài phương án kèm mô tả.
 *
 * Cố tình là `<button>` trần chứ không phải `AlertDialogAction`. Nút của shadcn
 * mang sẵn `bg-primary` và `whitespace-nowrap`: cái đầu đè bẹp mọi lớp nền tự
 * đặt nên thẻ hoá vàng chóe và chữ chìm nghỉm, cái sau chặn xuống dòng nên thẻ
 * phình rộng bằng cả câu mô tả rồi tràn ra ngoài hộp thoại. Chống lại hai thứ
 * đó bằng cách chồng class chỉ tổ mong manh - viết thẳng nút mới là xong.
 */
export default function ChoiceCard({
  onClick,
  disabled,
  title,
  tone,
  trailing,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: ReactNode;
  /** Màu chữ tiêu đề, thường là màu của hệ hoặc của loại thảo dược */
  tone?: string;
  /** Nội dung nằm sát mép phải hàng tiêu đề, ví dụ giá tiền */
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-border bg-muted/30 hover:bg-muted hover:border-gold/45',
        'flex w-full min-w-0 flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left',
        'transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-45',
      )}
    >
      <span className="flex w-full min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="font-title text-sm font-bold" style={tone ? { color: tone } : undefined}>
          {title}
        </span>
        {trailing}
      </span>
      {children}
    </button>
  );
}
