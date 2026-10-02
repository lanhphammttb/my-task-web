import { useCallback, useEffect, useState } from 'react';
import type { AppData } from '../types';

/**
 * Nhập môn: lần đầu mở app thì chỉ đường bằng ba bước.
 *
 * Người mới vào thấy ngay nút to "Khai quang linh căn" - một nút chẳng nói lên
 * app này để làm gì, bấm xong cũng không biết làm gì tiếp. Đảo lại: việc thật
 * đi trước (ghi một việc → làm xong → được tu vi), còn khai quang là phần
 * thưởng mở ra SAU việc đầu tiên.
 *
 * Người dùng cũ không bị đụng tới: đã có việc, đã có sổ ghi, hay đã khai quang
 * thì không bao giờ thấy thẻ nhập môn.
 */

export const KHOA_NHAP_MON = 'my-task/nhap-mon';

function daQuaNhapMon(): boolean {
  try {
    return localStorage.getItem(KHOA_NHAP_MON) === 'xong';
  } catch {
    return false;
  }
}

function ghiQuaNhapMon() {
  try {
    localStorage.setItem(KHOA_NHAP_MON, 'xong');
  } catch {
    /* không lưu được thì lần sau hiện lại - vô hại */
  }
}

/** Hồ sơ chưa từng có việc nào: không việc, không sổ ghi, chưa khai quang. */
export const hoSoTrang = (data: Pick<AppData, 'tasks' | 'ledger' | 'root'>) =>
  data.tasks.length === 0 && data.ledger.length === 0 && !data.root;

/**
 * Đã xong ít nhất một việc - mốc mở khoá nút khai quang.
 *
 * Tính cả sổ ghi: "Dọn việc đã xong" xoá việc cũ đi nhưng công đã làm thì vẫn
 * là đã làm, không bắt người ta xong thêm một việc nữa mới thấy lại nút.
 */
export const daXongViecDau = (data: Pick<AppData, 'tasks' | 'ledger'>) =>
  data.ledger.length > 0 || data.tasks.some((t) => t.status === 'done' || !!t.firstDoneAt);

/** Hiện thẻ nhập môn không, và hàm để đóng nó lại. */
export function useNhapMon(data: Pick<AppData, 'tasks' | 'ledger' | 'root'>) {
  const [daDong, setDaDong] = useState(daQuaNhapMon);
  const trang = hoSoTrang(data);
  // Đã có việc thì coi như qua nhập môn: lần mở sau, xoá hết việc đi cũng
  // không bắt xem lại bài hướng dẫn. Chỉ ghi dấu, không đổi state - lúc này
  // thẻ đã ẩn sẵn vì hồ sơ không còn trắng.
  useEffect(() => {
    if (!trang && !daDong) ghiQuaNhapMon();
  }, [trang, daDong]);
  const dong = useCallback(() => {
    ghiQuaNhapMon();
    setDaDong(true);
  }, []);
  return { hien: trang && !daDong, dong };
}
