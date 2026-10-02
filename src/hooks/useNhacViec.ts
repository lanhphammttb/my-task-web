import { useEffect, useState } from 'react';
import type { Task } from '../types';
import {
  SU_KIEN_NHAC,
  danhDauDaBao,
  docCaiDatNhac,
  docDaBao,
  hienThongBao,
  hoTroThongBao,
  nhacBiLo,
  nhacSapToi,
  tinhLoiNhac,
  type CaiDatNhac,
  type LoiNhac,
} from '../lib/nhacViec';

/** Cài đặt nhắc việc của máy này, tự cập nhật khi đổi ở hộp Cài đặt. */
export function useCaiDatNhac(): CaiDatNhac {
  const [c, setC] = useState(docCaiDatNhac);
  useEffect(() => {
    const doc = () => setC(docCaiDatNhac());
    window.addEventListener(SU_KIEN_NHAC, doc);
    // Tab khác đổi cài đặt cũng theo.
    window.addEventListener('storage', doc);
    return () => {
      window.removeEventListener(SU_KIEN_NHAC, doc);
      window.removeEventListener('storage', doc);
    };
  }, []);
  return c;
}

/** Báo một lời nhắc, đúng một lần cho mỗi mã. */
function bao(n: LoiNhac) {
  if (n.id in docDaBao()) return;
  danhDauDaBao(n.id, Date.now());
  void hienThongBao(n);
}

/**
 * Hẹn giờ các lời nhắc của hôm nay và ngày mai trong lúc app còn mở.
 *
 * Lên lịch lại khi danh sách việc đổi, khi cài đặt đổi, và khi app quay lại
 * màn hình (hệ điều hành có thể đã đóng băng hẹn giờ lúc app nằm nền). Mỗi lần
 * lên lịch cũng quét luôn những lời nhắc vừa lỡ trong 10 phút để báo bù.
 */
export function useNhacViec(tasks: Task[]) {
  const cai = useCaiDatNhac();
  const [nhip, setNhip] = useState(0);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setNhip((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!cai.bat || !hoTroThongBao() || Notification.permission !== 'granted') return;
    const now = Date.now();
    const ds = tinhLoiNhac(tasks, new Date(now), cai.truocHan);
    nhacBiLo(ds, now, docDaBao()).forEach(bao);
    const hen = nhacSapToi(ds, now).map((n) => window.setTimeout(() => bao(n), n.luc - now));
    // Qua nửa đêm thì "ngày mai" thành "hôm nay": tính lại cho đúng cửa sổ.
    const dem = new Date(now);
    dem.setHours(24, 0, 5, 0);
    const henDem = window.setTimeout(() => setNhip((n) => n + 1), dem.getTime() - now);
    return () => {
      hen.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(henDem);
    };
  }, [tasks, cai.bat, cai.truocHan, nhip]);
}
