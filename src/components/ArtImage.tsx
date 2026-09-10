import { useState } from "react";

interface Props extends Omit<React.ComponentProps<"img">, "src"> {
  src: string;
  /**
   * Ảnh dùng khi `src` chưa có trong public. Bỏ trống thì ẩn hẳn thẻ ảnh.
   * Nhờ vậy chỉ cần thả file đúng tên vào là web tự dùng, không phải sửa code.
   */
  fallback?: string;
}

/** Ảnh có đường lùi: tải lỗi thì đổi sang `fallback`, hoặc biến mất. */
export default function ArtImage({ src, fallback, ...rest }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = failed === src ? fallback : src;
  if (!url) return null;

  return <img {...rest} src={url} onError={() => setFailed(src)} />;
}
