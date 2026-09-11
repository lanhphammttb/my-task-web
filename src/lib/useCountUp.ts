import { useEffect, useRef, useState } from "react";

/**
 * Đưa một con số chạy dần tới giá trị mới thay vì nhảy phắt.
 *
 * Tu vi và linh thạch là hai con số người dùng nhìn nhiều nhất. Nhảy phắt thì
 * não không kịp ghi nhận là mình vừa được thêm; chạy dần trong khoảng nửa giây
 * mới thành một khoảnh khắc thưởng.
 *
 * Lần dựng đầu tiên thì hiện thẳng giá trị, không chạy từ 0 — mở app lên mà mọi
 * con số đều đếm lại từ đầu thì rườm rà chứ không sướng.
 */
export function useCountUp(value: number, duration = 550) {
  const [shown, setShown] = useState(value);
  const first = useRef(true);
  const raf = useRef(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown(value);
      return;
    }
    const from = shown;
    const delta = value - from;
    if (delta === 0) return;

    // Nhảy quá xa thì đếm cũng không đọc kịp, hiện thẳng cho gọn.
    if (Math.abs(delta) > 5000) {
      setShown(value);
      return;
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      setShown(value);
      return;
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // Chậm dần về cuối: nhanh lúc đầu cho thấy ngay là có thay đổi.
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(from + delta * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // `shown` cố tình không nằm trong deps: chỉ chạy lại khi đích đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return shown;
}
