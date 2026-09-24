import { useEffect, useState } from "react";

/**
 * Máy đang dùng là điện thoại hay màn rộng.
 *
 * Dùng để dựng HAI giao diện khác nhau chứ không phải để co giãn một giao diện.
 * Đó là chủ ý: sảnh trên điện thoại và sảnh trên máy tính có mục tiêu khác
 * nhau. Màn rộng có chỗ bày cả khung cảnh lẫn số liệu cùng lúc; màn điện thoại
 * thì mỗi thứ thêm vào là một thứ khác bị đẩy khỏi tầm mắt, nên nó phải chọn:
 * cảnh và việc cần làm, còn lại cắt.
 *
 * Ép một bộ mã phục vụ cả hai bằng `sm:` thì cái nào cũng dở - màn rộng thừa
 * chỗ mà vẫn bày theo lối tiết kiệm, còn điện thoại thì è cổ gánh những khối
 * sinh ra cho màn rộng.
 *
 * Mốc 768px và `pointer: coarse` đi cùng nhau: máy tính bảng dựng đứng rộng
 * 768 vẫn nên dùng bản màn rộng, còn điện thoại xoay ngang rộng 850 thì vẫn là
 * điện thoại - ngón tay không bé lại khi xoay máy.
 */
const CAU_TRUY = "(max-width: 767px), (pointer: coarse) and (max-width: 900px)";

export function useLaDienThoai(): boolean {
  const [la, setLa] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(CAU_TRUY).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(CAU_TRUY);
    const doi = () => setLa(mq.matches);
    doi();
    mq.addEventListener("change", doi);
    return () => mq.removeEventListener("change", doi);
  }, []);

  return la;
}
