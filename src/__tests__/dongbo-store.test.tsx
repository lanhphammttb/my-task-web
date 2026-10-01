import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { AppProvider, useApp } from '../store/AppStore';
import { useAppActions } from '../store/appContext';
import TaskEditorDialog from '../components/TaskEditorDialog';
import { emptyData } from '../lib/storage';
import { todayKey, addDays, dateKey } from '../lib/date';
import type { AppData } from '../types';

/**
 * AppStore khi có tài khoản giữ hồ sơ. Máy chủ ở đây không bao giờ trả lời
 * (đang nối mãi), nên mọi lệnh nằm lại trong hàng đợi trên đĩa - vừa đủ để soi
 * xem web định gửi gì mà không cần dựng máy chủ.
 */

const mock = vi.hoisted(() => ({ toast: { warning: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('sonner', () => ({ toast: mock.toast }));
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  apiEnabled: true,
  api: {
    trangThai: () => new Promise(() => {}),
    lenh: () => new Promise(() => {}),
    toiLaAi: () => new Promise(() => {}),
    dangNhap: () => new Promise(() => {}),
    dangKy: () => new Promise(() => {}),
    dangXuat: () => new Promise(() => {}),
  },
}));

const user = { id: 'u1', email: 'a@example.com', displayName: 'A' };
const verified = { taskXp: 100, sessionMinutes: 0, taskCount: 5, sessionCount: 0, verified: 5 };
const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;
const lenh = () =>
  Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
    .filter((k) => k.startsWith(`my-task/outbox/${user.id}/`))
    .map((k) => JSON.parse(localStorage.getItem(k)!) as { name: string; args: Record<string, unknown>; queuedAt: number })
    .sort((a, b) => a.queuedAt - b.queuedAt);

function dangNhapSan(d: AppData = emptyData()) {
  localStorage.setItem('my-task/sync-user', JSON.stringify(user));
  localStorage.setItem('my-task/verified', JSON.stringify({ userId: user.id, verified }));
  // Sổ ký bằng khoá của server: hàm băm ở web chắc chắn thấy "đứt chuỗi".
  d.ledger = [{ seq: 1, kind: 'task', ref: 'x', at: '2026-01-01T00:00:00.000Z', value: 20, hash: 'hmac-cua-server' }];
  localStorage.setItem('my-task-planner/v1', JSON.stringify(d));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('AppStore khi máy chủ là trọng tài', () => {
  it('mở lại trang lúc mất mạng: tu vi không về 0, sổ không bị báo sửa', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.data.verified).toEqual(verified);
    expect(result.current.audit.ok).toBe(true);
    expect(result.current.sync.laTrongTai).toBe(true);
  });

  it('tick xong lúc mất mạng thì tu vi nhích ngay, và lệnh gửi kèm id lần lặp kế tiếp', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    let id = '';
    act(() => { id = result.current.addTask({ title: 'Tập thể dục', recurrence: 'daily', subtasks: [{ id: 's', title: 'khởi động', done: false }] }).id; });
    act(() => { result.current.toggleDone(id); });
    expect(result.current.data.verified!.taskXp).toBeGreaterThan(verified.taskXp);
    const next = result.current.data.tasks.find((t) => t.id !== id)!;
    const gui = lenh().find((x) => x.name === 'toggleDone')!;
    expect(gui.args).toEqual({ id, nextId: next.id, nextSubtaskIds: [next.subtasks[0]!.id] });
  });

  it('ghi phiên bế quan gửi id của chính phiên ấy', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => { result.current.logSession(25); });
    const s = result.current.data.sessions[0]!;
    const args = lenh().find((x) => x.name === 'logSession')!.args;
    // Kèm giờ thật của phiên: bắt đầu = kết thúc - 25 phút (không phải giờ kết thúc).
    expect(args).toEqual({ id: s.id, minutes: 25, startedAt: s.startedAt, endedAt: expect.any(String) });
    expect(Date.parse(args.endedAt as string) - Date.parse(s.startedAt)).toBe(25 * 60_000);
    expect(Date.parse(s.startedAt)).toBeLessThanOrEqual(Date.now() - 25 * 60_000 + 1000);
  });

  it('có trọng tài thì không tự bốc kỳ ngộ; kỳ ngộ của server thì gửi lựa chọn lên', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      dangNhapSan({ ...emptyData(), pendingEncounter: { id: 'ma-tu', sessionId: 's-server', at: new Date().toISOString() } });
      const { result } = renderHook(() => useApp(), { wrapper });
      // Kỳ ngộ đang chờ trên server mở hộp thoại ngay.
      expect(result.current.encounter?.id).toBe('ma-tu');
      const truoc = result.current.data.stonesBonus;
      let ra: unknown;
      act(() => { ra = result.current.resolveEncounter(0); });
      expect(ra).toBe('cho');
      // Không tự cộng thưởng ở máy - chờ server bốc.
      expect(result.current.data.stonesBonus).toBe(truoc);
      expect(result.current.data.pendingEncounter).toBeUndefined();
      expect(lenh().find((x) => x.name === 'resolveEncounter')!.args).toEqual({ choice: 0 });
      // Ghi phiên lúc có trọng tài: dù xúc xắc ở máy ra 0 cũng không bốc kỳ ngộ.
      act(() => result.current.dismissEncounter());
      act(() => { result.current.logSession(25); });
      expect(result.current.encounter).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('xoá việc: hoãn gửi lệnh để còn hoàn tác; hoàn tác thì không gửi gì', () => {
    vi.useFakeTimers();
    try {
      dangNhapSan();
      const { result } = renderHook(() => useApp(), { wrapper });
      let a = '', b = '';
      act(() => { a = result.current.addTask({ title: 'giữ lại' }).id; b = result.current.addTask({ title: 'xoá thật' }).id; });
      act(() => result.current.removeTask(a));
      act(() => result.current.removeTask(b));
      expect(result.current.data.tasks).toHaveLength(0);
      expect(lenh().filter((x) => x.name === 'removeTask')).toHaveLength(0);
      // Bấm "Hoàn tác" trên thông báo của việc thứ nhất.
      const hoanTac = mock.toast.info.mock.calls.find((c) => String(c[0]).includes('giữ lại'))![1].action as { onClick: () => void };
      act(() => hoanTac.onClick());
      expect(result.current.data.tasks.map((t) => t.id)).toEqual([a]);
      act(() => vi.advanceTimersByTime(6100));
      expect(lenh().filter((x) => x.name === 'removeTask').map((x) => x.args)).toEqual([{ id: b }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('việc đã xong: dời ngày hay nâng ưu tiên bị chặn và không gửi lên', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    let id = '';
    act(() => { id = result.current.addTask({ title: 'xong rồi', priority: 'low' }).id; });
    act(() => { result.current.toggleDone(id); });
    let doi = true, sua = true;
    act(() => { doi = result.current.moveTask(id, dateKey(addDays(new Date(), 1))); });
    act(() => { sua = result.current.updateTask(id, { priority: 'urgent' }); });
    expect([doi, sua]).toEqual([false, false]);
    expect(result.current.data.tasks[0]).toMatchObject({ date: todayKey(), priority: 'low' });
    expect(lenh().some((x) => x.name === 'moveTask' || x.name === 'updateTask')).toBe(false);
    // Sửa tên thì vẫn được.
    act(() => { result.current.updateTask(id, { title: 'xong rồi (đã sửa)', priority: 'low', date: todayKey() }); });
    expect(lenh().find((x) => x.name === 'updateTask')!.args).toMatchObject({ id, title: 'xong rồi (đã sửa)' });
  });

  it('xoá hạn chót gửi null chứ không gửi thiếu trường', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    let id = '';
    act(() => { id = result.current.addTask({ title: 'a', deadline: new Date().toISOString() }).id; });
    act(() => result.current.updateTask(id, { deadline: undefined, title: 'b' }));
    expect(lenh().find((x) => x.name === 'updateTask')!.args).toEqual({ id, deadline: null, title: 'b' });
  });

  it('"Dời về hôm nay" trên thông báo gửi luôn lệnh moveTask', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    const tomorrow = dateKey(addDays(new Date(), 1));
    let id = '';
    act(() => { id = result.current.addTask({ title: 'mai mới làm', date: tomorrow }).id; });
    act(() => { result.current.toggleDone(id); });
    const action = mock.toast.warning.mock.calls.find((c) => c[1]?.action)?.[1].action as { onClick: () => void };
    act(() => action.onClick());
    expect(result.current.data.tasks[0]!.date).toBe(todayKey());
    expect(lenh().find((x) => x.name === 'moveTask')!.args).toEqual({ id, date: todayKey() });
  });

  it('hành động chỉ-ở-máy bị chặn khi đang có tài khoản', () => {
    dangNhapSan({ ...emptyData(), tasks: [] });
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.addTask({ title: 'giữ tôi lại' }));
    act(() => result.current.resetAll());
    act(() => result.current.loadSample());
    act(() => result.current.replaceAll(emptyData()));
    expect(result.current.data.tasks).toHaveLength(1);
    expect(mock.toast.warning).toHaveBeenCalledTimes(3);
  });

  it('không tự bung ăn mừng khi có trọng tài - chờ danh sách của server', () => {
    dangNhapSan();
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => { result.current.awaken(); });
    expect(result.current.celebration).toBeNull();
  });

  it('hành động giữ danh tính qua các lần đổi hồ sơ', () => {
    const { result } = renderHook(() => ({ a: useAppActions(), app: useApp() }), { wrapper });
    const truoc = result.current.a;
    act(() => { result.current.app.addTask({ title: 'x' }); });
    act(() => { result.current.app.updateSettings({ daoName: 'Thanh Vân' }); });
    expect(result.current.a).toBe(truoc);
    expect(result.current.app.addTask).toBe(truoc.addTask);
  });
});

describe('ghi xuống đĩa theo lượt gom', () => {
  it('gom nhiều thay đổi, và ghi ngay khi trang sắp đóng', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useApp(), {
        wrapper: ({ children }) => <AppProvider treLuuMs={300}>{children}</AppProvider>,
      });
      act(() => vi.advanceTimersByTime(400));
      const truoc = localStorage.getItem('my-task-planner/v1');
      act(() => { result.current.addTask({ title: 'một' }); });
      act(() => { result.current.addTask({ title: 'hai' }); });
      expect(localStorage.getItem('my-task-planner/v1')).toBe(truoc);
      act(() => { window.dispatchEvent(new Event('pagehide')); });
      expect(JSON.parse(localStorage.getItem('my-task-planner/v1')!).tasks).toHaveLength(2);
      act(() => { result.current.addTask({ title: 'ba' }); });
      act(() => vi.advanceTimersByTime(300));
      expect(JSON.parse(localStorage.getItem('my-task-planner/v1')!).tasks).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('form nhiệm vụ', () => {
  function MoForm() {
    return <TaskEditorDialog open task={null} onOpenChange={() => {}} />;
  }

  it('hạn chót lưu dạng UTC có múi, giữ đúng thời điểm địa phương', () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: ({ children }) => <AppProvider><MoForm />{children}</AppProvider>,
    });
    fireEvent.change(screen.getByLabelText('Tên nhiệm vụ *'), { target: { value: 'Nộp báo cáo' } });
    const local = `${todayKey()}T23:30`;
    fireEvent.change(screen.getByLabelText('Hạn chót'), { target: { value: local } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhiệm vụ' }));
    const t = result.current.data.tasks[0]!;
    expect(t.deadline).toBe(new Date(local).toISOString());
    expect(t.deadline!.endsWith('Z')).toBe(true);
  });

  it('tên quá 200 ký tự thì báo ngay và khoá nút lưu', () => {
    render(<AppProvider><MoForm /></AppProvider>);
    fireEvent.change(screen.getByLabelText('Tên nhiệm vụ *'), { target: { value: 'a'.repeat(201) } });
    expect(screen.getByRole('alert').textContent).toContain('201/200');
    expect((screen.getByRole('button', { name: 'Thêm nhiệm vụ' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
