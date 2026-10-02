import { useEffect, useState } from 'react';

type NavMay = Pick<Navigator, 'hardwareConcurrency'> & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/**
 * Máy yếu thì bỏ hẳn lớp 3D - tranh nền 2D (HubScene) vẫn đủ đẹp.
 *
 * Chỉ bỏ ở máy THẬT SỰ yếu: ≤ 2 GB RAM hoặc ≤ 2 nhân, hay người dùng bật "Tiết
 * kiệm dữ liệu" (khỏi tải thêm ~550 kB three.js).
 *
 * Ngưỡng cũ (≤ 4 nhân) gạt nhầm cả iPhone: Safari không có `deviceMemory`, còn
 * `hardwareConcurrency` báo số nhân bị kìm bớt, nên máy mạnh cũng bị coi là
 * máy yếu và mất hẳn lớp 3D. Chuyện pin đã có chỗ khác lo: vòng vẽ dừng khi
 * bảng phủ kín màn điện thoại hoặc khi app bị ẩn.
 */
export function mayYeu(nav: NavMay | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2) return true;
  return false;
}

/**
 * Chỉ dựng lớp 3D khi trình duyệt rảnh tay.
 *
 * Lượt vẽ đầu là lúc người dùng đang chờ thấy sảnh; chen việc nạp và dựng cảnh
 * three.js vào đúng lúc ấy là giành CPU với chính giao diện. Đợi tới khi rảnh
 * (tối đa 2,5 giây) thì sảnh đã lên xong, lớp 3D phủ thêm vào sau.
 */
export function useDungKhiRanh(): boolean {
  const [ranh, setRanh] = useState(false);
  useEffect(() => {
    if (mayYeu()) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setRanh(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setRanh(true), 1200);
    return () => window.clearTimeout(id);
  }, []);
  return ranh;
}
