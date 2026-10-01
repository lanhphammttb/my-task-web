import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { danhSachSaoLuu, emptyData } from '../lib/storage';
import type { AppData } from '../types';
import { ApiError } from '../lib/api';
import { SO_LAN_5XX, khoiPhucVerified, useServerSync } from '../store/useServerSync';
import { todayKey } from '../lib/date';

/**
 * Lớp đồng bộ khi mọi thứ KHÔNG suôn sẻ: máy chủ lạ, lệnh bị từ chối, lệnh
 * xếp hàng từ mấy hôm trước, hàng đợi hỏng, đổi tài khoản, nhiều tab.
 */

const mock = vi.hoisted(() => ({ state: vi.fn(), command: vi.fn(), me: vi.fn(), login: vi.fn(), signup: vi.fn(), logout: vi.fn() }));
vi.mock('../lib/api', async original => ({ ...await original<typeof import('../lib/api')>(), apiEnabled: true,
  api: { trangThai: mock.state, lenh: mock.command, toiLaAi: mock.me, dangNhap: mock.login, dangKy: mock.signup, dangXuat: mock.logout } }));
const user = { id: 'u1', email: 'a@example.com', displayName: 'A' };
const verified = { taskXp: 0, sessionMinutes: 0, taskCount: 0, sessionCount: 0, verified: 0 };
const data = (): AppData => ({ ...emptyData(), verified });
const state = (version = 1, d = data()) => ({ version, data: d, audit: { ok: true }, tomTat: {} });
const reply = (version = 2, extra: object = {}) => ({ version, thayDoi: {}, kiemTra: { tasks: 0, goals: 0, sessions: 0, ledger: 0, taskXp: 0 }, ...extra });
const outbox = (prefix = 'my-task/outbox/') => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => k.startsWith(prefix));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function mount(initial = data()) {
  let current = initial;
  const lich: AppData[] = [];
  const apply = vi.fn((f: (d: AppData) => AppData) => { current = f(current); lich.push(current); });
  const notify = vi.fn();
  const anMung = vi.fn();
  const hook = renderHook(() => useServerSync(apply, notify, () => current, undefined, anMung));
  return { ...hook, apply, notify, anMung, lich, current: () => current };
}
const ready = async (h: ReturnType<typeof mount>) => waitFor(() => expect(h.result.current.status).toBe('da-noi'));
const queued = (requestId: string, over: object = {}) => {
  const item = { name: 'updateSettings', args: { soundEnabled: false }, requestId, today: todayKey(), queuedAt: 1, ...over };
  localStorage.setItem(`my-task/outbox/${user.id}/${requestId}`, JSON.stringify(item));
  return item;
};

beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  mock.me.mockResolvedValue({ user }); mock.state.mockResolvedValue(state());
  mock.command.mockResolvedValue(reply()); mock.logout.mockResolvedValue({ ok: true });
});

describe('máy chủ không tương thích thì giữ lệnh, không bỏ', () => {
  it.each([
    [new ApiError(400, 'body must have required property name', 'bad-request')],
    [new ApiError(404, 'Không có tuyến này')],
    [new ApiError(405, 'Method Not Allowed')],
    [new ApiError(200, 'Máy chủ trả về dữ liệu không phải JSON', 'not-json')],
  ])('%s', async (err) => {
    const h = mount(); await ready(h);
    mock.command.mockRejectedValue(err);
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    await waitFor(() => expect(h.result.current.status).toBe('khong-tuong-thich'));
    expect(h.result.current.pending).toBe(1);
    expect(outbox()).toHaveLength(1);
    expect(h.result.current.loi).toContain(String(err.status));
    expect(h.result.current.ket).toBeNull();
  });

  it('lời đáp lệnh sai hình dạng cũng là không tương thích, không nổ TypeError', async () => {
    const h = mount(); await ready(h);
    mock.command.mockResolvedValue('<html>');
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    await waitFor(() => expect(h.result.current.status).toBe('khong-tuong-thich'));
    expect(outbox()).toHaveLength(1);
  });

  it('bad-args của riêng một lệnh: giữ lại nhưng cho người dùng quyền bỏ', async () => {
    const h = mount(); await ready(h);
    mock.command.mockRejectedValue(new ApiError(400, 'Tham số không hợp lệ', 'bad-args'));
    act(() => h.result.current.gui('addTask', { id: 'x', title: 'y' }));
    await waitFor(() => expect(h.result.current.ket?.loai).toBe('khong-hop-le'));
    expect(outbox()).toHaveLength(1);
    await act(() => h.result.current.xuLyLenhKet('bo'));
    expect(outbox()).toHaveLength(0);
    expect(h.notify).toHaveBeenCalledWith(expect.stringContaining('Đã bỏ thao tác'), 'warn');
  });

  it('5xx là "lỗi máy chủ", lỗi mạng mới là "mất mạng"', async () => {
    const h = mount(); await ready(h);
    mock.command.mockRejectedValueOnce(new ApiError(0, 'offline'));
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    // Đang trong giờ lùi: lệnh mới xếp hàng, chưa gửi dồn lên.
    act(() => h.result.current.gui('updateSettings', { soundEnabled: true }));
    expect(mock.command).toHaveBeenCalledTimes(1);
    expect(h.result.current.pending).toBe(2);
    // Có mạng lại thì thử ngay, không đợi hết giờ lùi.
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(h.result.current.pending).toBe(0));
  });

  it('lệnh độc: 5xx quá ngưỡng thì dừng hàng đợi và hỏi', async () => {
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    queued('11111111-1111-4111-8111-111111111111', { loi5xx: SO_LAN_5XX - 1 });
    mock.command.mockRejectedValue(new ApiError(500, 'Máy chủ gặp sự cố'));
    const h = mount();
    await waitFor(() => expect(h.result.current.status).toBe('lenh-ket'));
    expect(h.result.current.ket?.loai).toBe('may-chu');
    mock.command.mockResolvedValue(reply());
    await act(() => h.result.current.xuLyLenhKet('gui-lai'));
    await waitFor(() => expect(h.result.current.pending).toBe(0));
  });
});

describe('lệnh cũ từ lúc mất mạng bị chê ngày', () => {
  it('không lặng lẽ bỏ: dừng lại, gửi lại được theo ngày hôm nay', async () => {
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    queued('22222222-2222-4222-8222-222222222222', { today: '2020-01-01', name: 'toggleDone', args: { id: 't1' } });
    mock.command.mockRejectedValueOnce(new ApiError(422, 'Ngày gửi lên lệch quá xa', 'bad-today'));
    const h = mount();
    await waitFor(() => expect(h.result.current.status).toBe('lenh-ket'));
    expect(h.result.current.ket).toMatchObject({ loai: 'ngay-cu', today: '2020-01-01', name: 'toggleDone' });
    expect(outbox()).toHaveLength(1);
    await act(() => h.result.current.xuLyLenhKet('gui-lai'));
    await waitFor(() => expect(h.result.current.pending).toBe(0));
    const last = mock.command.mock.calls.at(-1)!;
    expect(last[2]).toBe(todayKey());
    expect(last[4]).toBe('22222222-2222-4222-8222-222222222222');
  });
});

describe('từ chối và dây chuyền phụ thuộc', () => {
  it('thêm việc bị từ chối kéo theo lệnh trên việc ấy, một lần tải lại, một thông báo', async () => {
    const h = mount(); await ready(h);
    const waiting = deferred<unknown>();
    mock.command.mockImplementation((name: string) => {
      if (name === 'addTask') return waiting.promise;
      return Promise.resolve(reply());
    });
    act(() => {
      h.result.current.gui('addTask', { id: 'new', title: 'x' });
      h.result.current.gui('toggleDone', { id: 'new' });
      h.result.current.gui('updateTask', { id: 'new', title: 'y' });
      h.result.current.gui('logSession', { id: 's1', minutes: 25, taskId: 'new' });
    });
    const loadsBefore = mock.state.mock.calls.length;
    await act(async () => { waiting.resolve(Promise.reject(new ApiError(422, 'Mã nhiệm vụ này đã có rồi'))); });
    await waitFor(() => expect(h.result.current.pending).toBe(0));
    expect(mock.command.mock.calls.map(c => c[0])).toEqual(['addTask', 'logSession']);
    expect(mock.command.mock.calls[1]![1]).toEqual({ id: 's1', minutes: 25 });
    expect(mock.state.mock.calls.length - loadsBefore).toBe(1);
    expect(h.notify).toHaveBeenCalledTimes(1);
    expect(h.notify.mock.calls[0]![0]).toContain('bỏ kèm 2 thao tác phụ thuộc');
  });

  it('ăn mừng lấy từ lời đáp của server', async () => {
    const h = mount(); await ready(h);
    const c = [{ kind: 'tier-up', label: 'Luyện Khí tầng 2', realmIndex: 0, xp: 120 }];
    mock.command.mockResolvedValue(reply(2, { celebrations: c }));
    act(() => h.result.current.gui('toggleDone', { id: 't' }));
    await waitFor(() => expect(h.anMung).toHaveBeenCalledWith(c, 'toggleDone'));
  });
});

describe('hàng đợi hỏng', () => {
  it('cất riêng lệnh hỏng, gửi lệnh lành, báo đúng một lần', async () => {
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    localStorage.setItem(`my-task/outbox/${user.id}/bad`, '{không phải json');
    localStorage.setItem(`my-task/outbox/${user.id}/bad2`, JSON.stringify({ name: 1 }));
    queued('33333333-3333-4333-8333-333333333333');
    const h = mount();
    await ready(h);
    expect(mock.command).toHaveBeenCalledTimes(1);
    expect(outbox()).toHaveLength(0);
    expect(outbox('my-task/outbox-hong/')).toHaveLength(2);
    await act(() => h.result.current.taiLai());
    expect(h.notify.mock.calls.filter(c => String(c[0]).includes('bị hỏng'))).toHaveLength(1);
  });
});

describe('vào tài khoản không làm mất dữ liệu', () => {
  it('tạo tài khoản khi máy có dữ liệu: sao lưu, xếp lệnh đưa lên TRƯỚC khi áp bản trắng', async () => {
    mock.me.mockRejectedValue(new ApiError(401, 'Chưa đăng nhập'));
    const local = { ...emptyData(), tasks: [{ id: 't1', title: 'việc của tôi' }] } as unknown as AppData;
    const h = mount(local);
    await waitFor(() => expect(h.result.current.status).toBe('chua-dang-nhap'));
    mock.signup.mockResolvedValue({ user });
    const blank = state(1);
    mock.state.mockResolvedValueOnce(blank).mockResolvedValue(state(2, { ...data(), tasks: [{ id: 't1' }] as AppData['tasks'] }));
    mock.command.mockResolvedValue(reply(2, { thayDoi: { tasks: { them: [{ id: 't1' }] } }, kiemTra: { tasks: 1, goals: 0, sessions: 0, ledger: 0, taskXp: 0 } }));
    await act(() => h.result.current.dangKy(user.email, 'password123', undefined, local));
    expect(mock.command.mock.calls[0]![0]).toBe('importLocalData');
    expect(mock.command.mock.calls[0]![1]).toMatchObject({ data: { tasks: [{ id: 't1' }] } });
    // Không lúc nào màn hình bị thay bằng bản trắng của tài khoản mới.
    expect(h.lich.length).toBeGreaterThan(0);
    expect(h.lich.every((d) => d.tasks.length === 1)).toBe(true);
    expect(h.current().tasks).toHaveLength(1);
    expect(danhSachSaoLuu()).toHaveLength(1);
  });

  it('đăng nhập tài khoản khác: sao lưu hồ sơ đang có, giữ tối đa ba bản', async () => {
    const local = { ...emptyData(), tasks: [{ id: 't1', title: 'x' }] } as unknown as AppData;
    for (let i = 0; i < 4; i++) {
      localStorage.removeItem('my-task/sync-user');
      mock.me.mockRejectedValue(new ApiError(401, 'no'));
      const h = mount(local);
      await waitFor(() => expect(h.result.current.status).toBe('chua-dang-nhap'));
      mock.login.mockResolvedValue({ user: { ...user, id: `u${i + 10}` } });
      await act(() => h.result.current.dangNhap('x@y.z', 'pw'));
      h.unmount();
      await new Promise(r => setTimeout(r, 2));
    }
    expect(danhSachSaoLuu()).toHaveLength(3);
  });

  it('M6: còn lệnh chờ lúc nối lại thì gửi trước, chưa áp bản server', async () => {
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    queued('44444444-4444-4444-8444-444444444444');
    const waiting = deferred<ReturnType<typeof reply>>();
    mock.command.mockReturnValue(waiting.promise);
    const local = { ...data(), settings: { ...emptyData().settings, soundEnabled: false } };
    const h = mount(local);
    await waitFor(() => expect(mock.command).toHaveBeenCalled());
    expect(h.apply).not.toHaveBeenCalled();
    await act(async () => { waiting.resolve(reply()); await waiting.promise; });
    await ready(h);
    expect(h.apply).toHaveBeenCalled();
  });
});

describe('phiên hết hạn và đổi tài khoản', () => {
  it('lúc mở trang mà phiên đã hết: vẫn giữ chủ, lệnh mới vẫn xếp hàng dưới người ấy', async () => {
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    mock.me.mockRejectedValue(new ApiError(401, 'Phiên đã hết hạn'));
    const h = mount();
    await waitFor(() => expect(h.result.current.status).toBe('het-phien'));
    expect(h.result.current.chu?.id).toBe(user.id);
    expect(h.result.current.laTrongTai).toBe(true);
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    expect(outbox()).toHaveLength(1);
    expect(mock.command).not.toHaveBeenCalled();
    // Người khác đăng nhập: hàng đợi cũ ở yên dưới tên người cũ.
    mock.login.mockResolvedValue({ user: { ...user, id: 'u2' } });
    await act(() => h.result.current.dangNhap('b@example.com', 'pw'));
    expect(mock.command).not.toHaveBeenCalled();
    expect(outbox(`my-task/outbox/${user.id}/`)).toHaveLength(1);
  });

  it('đăng xuất có chọn xoá thì xoá cả hàng đợi và hồ sơ của tài khoản trên máy', async () => {
    const h = mount({ ...data(), tasks: [{ id: 't' }] as AppData['tasks'] });
    await ready(h);
    mock.command.mockRejectedValue(new ApiError(0, 'offline'));
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    await act(() => h.result.current.dangXuat(true));
    expect(outbox()).toHaveLength(0);
    expect(h.current().tasks).toEqual([]);
    expect(localStorage.getItem('my-task/sync-user')).toBeNull();
    expect(h.result.current.chu).toBeNull();
  });

  it('đăng xuất giữ bản sao thì hàng đợi còn nguyên, sổ ký lại cho chạy một mình', async () => {
    const h = mount();
    await ready(h);
    mock.command.mockRejectedValue(new ApiError(0, 'offline'));
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    await act(() => h.result.current.dangXuat());
    expect(outbox()).toHaveLength(1);
    expect(h.current().verified).toBeUndefined();
  });

  it('phiên đã hết thì đăng xuất vẫn được', async () => {
    const h = mount(); await ready(h);
    mock.logout.mockRejectedValue(new ApiError(401, 'Phiên đã hết hạn'));
    await act(() => h.result.current.dangXuat());
    expect(h.result.current.status).toBe('chua-dang-nhap');
  });
});

describe('nhiều tab và bộ đệm tu vi', () => {
  it('tab khác thêm lệnh vào hàng đợi thì ở đây thấy ngay', async () => {
    const h = mount(); await ready(h);
    mock.command.mockReturnValue(new Promise(() => {}));
    const item = queued('55555555-5555-4555-8555-555555555555');
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: `my-task/outbox/${user.id}/${item.requestId}`, newValue: JSON.stringify(item) }));
    });
    expect(h.result.current.pending).toBe(1);
    expect(mock.command).toHaveBeenCalledWith('updateSettings', item.args, item.today, 1, item.requestId, user.id);
  });

  it('tab khác đăng xuất thì ở đây cũng rời tài khoản', async () => {
    const h = mount(); await ready(h);
    localStorage.removeItem('my-task/sync-user');
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'my-task/sync-user', newValue: null })); });
    expect(h.result.current.chu).toBeNull();
    expect(h.result.current.status).toBe('chua-dang-nhap');
  });

  it('khôi phục tổng đã xác thực chỉ khi đúng chủ', () => {
    const v = { taskXp: 90, sessionMinutes: 50, taskCount: 3, sessionCount: 2, verified: 5 };
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    localStorage.setItem('my-task/verified', JSON.stringify({ userId: user.id, verified: v }));
    expect(khoiPhucVerified(emptyData()).verified).toEqual(v);
    localStorage.setItem('my-task/verified', JSON.stringify({ userId: 'khac', verified: v }));
    expect(khoiPhucVerified(emptyData()).verified).toBeUndefined();
  });

  it('hỏi thăm định kỳ đi đường rẻ (kèm số hiệu) và không vẽ lại khi không có gì đổi', async () => {
    const h = mount(); await ready(h);
    const count = h.apply.mock.calls.length;
    mock.state.mockResolvedValue({ version: 1, khongDoi: true, verified, kiemTra: reply().kiemTra });
    await act(() => h.result.current.kiemTraMoi());
    expect(mock.state).toHaveBeenLastCalledWith(1, user.id);
    expect(h.apply.mock.calls.length).toBe(count);
  });

  it('đối tượng đồng bộ giữ danh tính khi không có gì đổi', async () => {
    const h = mount(); await ready(h);
    const truoc = h.result.current;
    h.rerender();
    expect(h.result.current).toBe(truoc);
  });
});
