import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  BAO_BU_TOI_DA_MS,
  KHOA_DA_BAO,
  KHOA_NHAC,
  danhDauDaBao,
  docCaiDatNhac,
  docDaBao,
  ghiCaiDatNhac,
  nhacBiLo,
  nhacSapToi,
  tinhLoiNhac,
} from '../lib/nhacViec';
import { mayYeu } from '../hooks/useDungKhiRanh';
import { daXongViecDau, hoSoTrang } from '../hooks/useNhapMon';
import { NHAN, THUAT_NGU, tenRoBang } from '../lib/thuatNgu';

function viec(p: Partial<Task>): Task {
  return {
    id: p.id ?? 'v1',
    title: p.title ?? 'Họp nhóm',
    note: '',
    date: p.date ?? '2026-10-01',
    priority: 'medium',
    status: 'todo',
    tags: [],
    estimateMin: 0,
    focusMin: 0,
    subtasks: [],
    recurrence: 'none',
    createdAt: '2026-09-30T00:00:00.000Z',
    ...p,
  };
}

/** 08:00 sáng 01/10/2026 theo giờ máy. */
const NOW = new Date(2026, 9, 1, 8, 0, 0);
const luc = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m, 0).getTime();

describe('tính lời nhắc', () => {
  it('nhắc đúng giờ bắt đầu của việc hôm nay và ngày mai', () => {
    const ds = tinhLoiNhac(
      [
        viec({ id: 'a', startTime: '09:30' }),
        viec({ id: 'b', date: '2026-10-02', startTime: '07:15' }),
        viec({ id: 'c', date: '2026-10-03', startTime: '09:00' }), // ngoài cửa sổ
      ],
      NOW,
      15,
    );
    expect(ds.map((n) => [n.taskId, n.loai, n.luc])).toEqual([
      ['a', 'bat-dau', luc(1, 9, 30)],
      ['b', 'bat-dau', luc(2, 7, 15)],
    ]);
    expect(ds[0].tieuDe).toContain('Họp nhóm');
  });

  it('nhắc trước hạn chót đúng số phút đã chọn, kể cả hạn khác ngày làm', () => {
    const han = new Date(2026, 9, 2, 17, 0).toISOString();
    for (const truoc of [5, 15, 30, 60]) {
      const [n] = tinhLoiNhac([viec({ id: 'h', date: '2026-09-28', deadline: han })], NOW, truoc);
      expect(n.loai).toBe('han-chot');
      expect(n.luc).toBe(luc(2, 17) - truoc * 60_000);
      expect(n.noiDung).toContain(`${truoc} phút`);
    }
  });

  it('bỏ qua việc đã xong và hạn chót ngoài hôm nay/mai', () => {
    const ds = tinhLoiNhac(
      [
        viec({ id: 'xong', status: 'done', startTime: '10:00' }),
        viec({ id: 'xa', deadline: new Date(2026, 9, 5, 12).toISOString() }),
        viec({ id: 'hong', deadline: 'không phải ngày' }),
        viec({ id: 'gio-hong', startTime: '25h' }),
      ],
      NOW,
      15,
    );
    expect(ds).toEqual([]);
  });

  it('đổi giờ của việc thì ra mã lời nhắc mới (không bị dấu cũ chặn)', () => {
    const [a] = tinhLoiNhac([viec({ startTime: '09:00' })], NOW, 15);
    const [b] = tinhLoiNhac([viec({ startTime: '09:10' })], NOW, 15);
    expect(a.id).not.toBe(b.id);
  });

  it('chia đúng phần cần hẹn giờ và phần báo bù trong 10 phút', () => {
    const ds = tinhLoiNhac(
      [
        viec({ id: 'lo-5', startTime: '07:55' }),
        viec({ id: 'lo-30', startTime: '07:30' }),
        viec({ id: 'sap', startTime: '08:20' }),
      ],
      NOW,
      15,
    );
    const now = NOW.getTime();
    expect(nhacSapToi(ds, now).map((n) => n.taskId)).toEqual(['sap']);
    expect(nhacBiLo(ds, now, {}).map((n) => n.taskId)).toEqual(['lo-5']);
    // Đã báo rồi thì không báo bù nữa.
    expect(nhacBiLo(ds, now, { [ds.find((n) => n.taskId === 'lo-5')!.id]: now })).toEqual([]);
    // Đúng mốc 10 phút vẫn còn được báo bù.
    const [mep] = tinhLoiNhac([viec({ startTime: '07:50' })], NOW, 15);
    expect(now - mep.luc).toBe(BAO_BU_TOI_DA_MS);
    expect(nhacBiLo([mep], now, {})).toHaveLength(1);
  });
});

describe('lưu cài đặt và dấu đã báo', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('mặc định tắt, 15 phút; giá trị lạ thì về mặc định', () => {
    expect(docCaiDatNhac()).toEqual({ bat: false, truocHan: 15 });
    localStorage.setItem(KHOA_NHAC, JSON.stringify({ bat: true, truocHan: 7 }));
    expect(docCaiDatNhac()).toEqual({ bat: true, truocHan: 15 });
    localStorage.setItem(KHOA_NHAC, '{hỏng');
    expect(docCaiDatNhac().bat).toBe(false);
  });

  it('ghi cài đặt thì phát sự kiện để lên lịch lại', () => {
    let lan = 0;
    const nghe = () => { lan += 1; };
    window.addEventListener('my-task:nhac-viec', nghe);
    ghiCaiDatNhac({ bat: true, truocHan: 30 });
    window.removeEventListener('my-task:nhac-viec', nghe);
    expect(lan).toBe(1);
    expect(docCaiDatNhac()).toEqual({ bat: true, truocHan: 30 });
  });

  it('dấu đã báo cũ hơn 3 ngày bị dọn', () => {
    const now = NOW.getTime();
    localStorage.setItem(KHOA_DA_BAO, JSON.stringify({ cu: now - 4 * 86_400_000, moi: now - 1000 }));
    danhDauDaBao('x', now);
    expect(Object.keys(docDaBao()).sort()).toEqual(['moi', 'x']);
  });
});

describe('cổng lớp 3D', () => {
  it('giữ 3D cho máy 4 nhân như iPhone, chỉ bỏ máy thật sự yếu', () => {
    expect(mayYeu({ hardwareConcurrency: 4 })).toBe(false);
    expect(mayYeu({ hardwareConcurrency: 6, deviceMemory: 4 })).toBe(false);
    expect(mayYeu({ hardwareConcurrency: 2 })).toBe(true);
    expect(mayYeu({ hardwareConcurrency: 8, deviceMemory: 2 })).toBe(true);
    expect(mayYeu({ hardwareConcurrency: 8, connection: { saveData: true } })).toBe(true);
    expect(mayYeu(undefined)).toBe(false);
  });
});

describe('nhập môn', () => {
  const trong = { tasks: [] as Task[], ledger: [], root: undefined };
  it('chỉ hồ sơ trắng mới là người mới', () => {
    expect(hoSoTrang(trong)).toBe(true);
    expect(hoSoTrang({ ...trong, tasks: [viec({})] })).toBe(false);
    expect(hoSoTrang({ ...trong, root: { elements: [] } as never })).toBe(false);
  });
  it('khai quang mở khoá sau việc đầu tiên xong', () => {
    expect(daXongViecDau({ tasks: [viec({})], ledger: [] })).toBe(false);
    expect(daXongViecDau({ tasks: [viec({ status: 'done' })], ledger: [] })).toBe(true);
    expect(daXongViecDau({ tasks: [], ledger: [{} as never] })).toBe(true);
  });
});

describe('thuật ngữ', () => {
  it('mỗi tên tu tiên có tên đời thường', () => {
    expect(THUAT_NGU.hanhSu.ro).toBe('Việc hằng ngày');
    expect(THUAT_NGU.beQuan.ro).toBe('Tập trung');
    expect(tenRoBang('cave')).toBe('Nhà & vật phẩm');
    expect(tenRoBang('week')).toContain('Tuần');
    expect(NHAN.tapTrungViecNay).toBe('Tập trung vào việc này');
  });
});
