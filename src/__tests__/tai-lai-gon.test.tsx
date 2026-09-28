import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { emptyData } from '../lib/storage';
import type { AppData } from '../types';
import { ApiError } from '../lib/api';
import { useServerSync } from '../store/useServerSync';

const mock = vi.hoisted(() => ({ state: vi.fn(), command: vi.fn(), me: vi.fn(), login: vi.fn(), logout: vi.fn() }));
vi.mock('../lib/api', async original => ({ ...await original<typeof import('../lib/api')>(), apiEnabled: true,
  api: { trangThai: mock.state, lenh: mock.command, toiLaAi: mock.me, dangNhap: mock.login, dangXuat: mock.logout } }));
const user = { id: 'u1', email: 'a@example.com', displayName: 'A' };
const verified = { taskXp: 0, sessionMinutes: 0, taskCount: 0, sessionCount: 0, verified: 0 };
const data = (): AppData => ({ ...emptyData(), verified });
const state = (version = 1, d = data()) => ({ version, data: d, audit: { ok: true }, tomTat: {} });
const reply = (version = 2) => ({ version, thayDoi: {}, kiemTra: { tasks: 0, goals: 0, sessions: 0, ledger: 0, taskXp: 0 } });
const outbox = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => k.startsWith('my-task/outbox/'));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function mount(initial = data()) {
  let current = initial;
  const apply = vi.fn((f: (d: AppData) => AppData) => { current = f(current); });
  const hook = renderHook(() => useServerSync(apply, undefined, () => current));
  return { ...hook, apply, current: () => current };
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  mock.me.mockResolvedValue({ user }); mock.state.mockResolvedValue(state());
  mock.command.mockResolvedValue(reply()); mock.logout.mockResolvedValue({ ok: true });
});

describe('server snapshots and durable outbox', () => {
  it('ignores a saved version and optimistic data even if counts match', async () => {
    localStorage.setItem('my-task/dong-bo-version', '1');
    const local = data(); local.settings.daoName = 'unsent edit';
    const h = mount(local);
    await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    expect(mock.state).toHaveBeenCalledWith(undefined, user.id);
    expect(h.current().settings.daoName).not.toBe('unsent edit');
  });
  it('uses only its confirmed in-memory snapshot for an unchanged response', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    h.current().settings = { ...h.current().settings }; // no optimistic document is supplied to the cache
    mock.state.mockResolvedValue({ version: 1, khongDoi: true, verified, kiemTra: reply().kiemTra });
    await act(() => h.result.current.taiLai());
    expect(mock.state).toHaveBeenLastCalledWith(1, user.id);
    expect(h.current().verified).toEqual(verified);
  });
  it('keeps an offline command across reload and uses the same request ID and original day', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockRejectedValue(new ApiError(0, 'offline'));
    act(() => h.result.current.gui('updateSettings', { daoName: 'new' }));
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    expect(outbox()).toHaveLength(1);
    const saved = JSON.parse(localStorage.getItem(outbox()[0]!)!);
    h.unmount(); mock.command.mockResolvedValue(reply());
    const next = mount();
    await waitFor(() => expect(next.result.current.status).toBe('da-noi'));
    expect(mock.command).toHaveBeenLastCalledWith('updateSettings', { daoName: 'new' }, saved.today, 1, saved.requestId, user.id);
    expect(outbox()).toHaveLength(0);
  });
  it('reloads on conflict and retries instead of dropping queued commands', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockRejectedValueOnce(new ApiError(409, 'conflict')).mockResolvedValue(reply(3));
    mock.state.mockResolvedValue(state(2));
    act(() => h.result.current.gui('updateSettings', { soundEnabled: false }));
    await waitFor(() => expect(h.result.current.pending).toBe(0));
    expect(mock.command).toHaveBeenCalledTimes(2);
    expect(mock.command.mock.calls[0]![4]).toBe(mock.command.mock.calls[1]![4]);
    expect(mock.command.mock.calls[1]![3]).toBe(2);
  });
  it('rejects only one command and continues the next independent command', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockRejectedValueOnce(new ApiError(422, 'invalid')).mockResolvedValue(reply());
    act(() => { h.result.current.gui('removeTask', { id: 'missing' }); h.result.current.gui('updateSettings', { soundEnabled: false }); });
    await waitFor(() => expect(h.result.current.pending).toBe(0));
    expect(mock.command).toHaveBeenCalledTimes(2);
    expect(mock.command.mock.calls[1]![0]).toBe('updateSettings');
  });
  it('retains all commands on a temporary server error', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockRejectedValue(new ApiError(503, 'unavailable'));
    act(() => { h.result.current.gui('updateSettings', { soundEnabled: false }); h.result.current.gui('updateSettings', { daoName: 'later' }); });
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    expect(h.result.current.pending).toBe(2); expect(outbox()).toHaveLength(2);
  });
  it('refreshes rather than reapplying a replayed delta', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockResolvedValue({ ...reply(), replayed: true, thayDoi: { tasks: { them: [{ id: 'wrong-old-delta' }] } } });
    act(() => h.result.current.gui('toggleDone', { id: 'done-on-server' }));
    await waitFor(() => expect(h.result.current.pending).toBe(0));
    expect(mock.state).toHaveBeenCalledTimes(2); expect(h.current().tasks).toEqual([]);
  });
  it('never sends account A outbox when account B signs in', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockRejectedValue(new ApiError(0, 'offline'));
    act(() => h.result.current.gui('updateSettings', { daoName: 'A pending' }));
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    mock.command.mockClear(); mock.login.mockResolvedValue({ user: { ...user, id: 'u2' } });
    await act(() => h.result.current.dangNhap('b@example.com', 'password'));
    expect(mock.command).not.toHaveBeenCalled(); expect(outbox()).toHaveLength(1);
    expect(h.result.current.pending).toBe(0);
  });
  it('ignores a response from an old account after switching accounts', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    const waiting = deferred<ReturnType<typeof reply>>(); mock.command.mockReturnValue(waiting.promise);
    act(() => h.result.current.gui('updateSettings', { daoName: 'old account' }));
    mock.login.mockResolvedValue({ user: { ...user, id: 'u2' } });
    await act(() => h.result.current.dangNhap('b@example.com', 'password'));
    const count = h.apply.mock.calls.length;
    await act(async () => { waiting.resolve(reply(20)); await waiting.promise; });
    expect(h.apply).toHaveBeenCalledTimes(count); expect(outbox()).toHaveLength(1);
  });
  it('does not pretend logout succeeded when revocation fails', async () => {
    const h = mount(); await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.logout.mockRejectedValue(new ApiError(0, 'offline'));
    await expect(h.result.current.dangXuat()).rejects.toThrow('offline');
    expect(h.result.current.user?.id).toBe(user.id);
  });
  it('queues new work after an offline reload but waits for authentication before sending', async () => {
    localStorage.setItem('my-task/sync-user', JSON.stringify(user));
    mock.me.mockRejectedValue(new ApiError(0, 'offline'));
    const h = mount();
    await waitFor(() => expect(h.result.current.status).toBe('mat-mang'));
    act(() => h.result.current.gui('updateSettings', { daoName: 'offline edit' }));
    expect(h.result.current.pending).toBe(1);
    expect(mock.command).not.toHaveBeenCalled();
    mock.me.mockResolvedValue({ user });
    await act(() => h.result.current.taiLai());
    expect(h.result.current.pending).toBe(0);
    expect(mock.command.mock.calls[0]![5]).toBe(user.id);
  });
  it('keeps pending work through session expiry and resumes on login', async () => {
    const h = mount();
    await waitFor(() => expect(h.result.current.status).toBe('da-noi'));
    mock.command.mockRejectedValueOnce(new ApiError(401, 'expired'));
    act(() => h.result.current.gui('updateSettings', { daoName: 'pending' }));
    await waitFor(() => expect(h.result.current.status).toBe('chua-dang-nhap'));
    expect(outbox()).toHaveLength(1);
    mock.login.mockResolvedValue({ user });
    await act(() => h.result.current.dangNhap(user.email, 'password'));
    expect(h.result.current.pending).toBe(0);
    expect(outbox()).toHaveLength(0);
    expect(mock.command).toHaveBeenCalledTimes(2);
  });
});
