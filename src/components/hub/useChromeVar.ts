import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Ghi chiều cao thật của HUD và thanh tab vào biến CSS trên `<html>`, để bảng
 * phủ chừa đúng chỗ cho chúng.
 *
 * Trước đây bảng đóng cứng `top-68px bottom-86px`. Nhưng HUD cao 84–92px tuỳ
 * máy, còn thanh tab trên điện thoại cao tới 129px (có thêm hàng tra cứu và
 * safe-area) — nên đáy bảng chui xuống dưới thanh tab 43px và đỉnh bảng đè lên
 * HUD 16–24px.
 */
export function useChromeVar(ref: RefObject<HTMLElement | null>, name: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const write = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      // jsdom và lúc chưa layout xong đều trả 0; giữ giá trị mặc định của CSS.
      if (h > 0) document.documentElement.style.setProperty(name, `${h}px`);
    };
    write();

    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(name);
    };
  }, [ref, name]);
}
