import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import { ApiError, api, apiEnabled, apThayDoi, laKhongDoi } from '../lib/api';
import type { ApiUser, KiemTra } from '../lib/api';
import { todayKey } from '../lib/date';
import { uid } from '../lib/storage';

export type SyncStatus =
  /** Chưa cấu hình VITE_API_URL - chạy hoàn toàn ở máy, như trước khi có server */
  | 'tat'
  /** Có server nhưng chưa đăng nhập */
  | 'chua-dang-nhap'
  /** Đang nối */
  | 'dang-noi'
  /** Đã nối, hàng đợi trống */
  | 'da-noi'
  /** Đang gửi lệnh */
  | 'dang-gui'
  /** Không gọi được server - lệnh nằm chờ trong hàng đợi */
  | 'mat-mang';

interface QueueItem {
  name: string;
  args: Record<string, unknown>;
  requestId: string;
  today: string;
  queuedAt: number;
}

export interface ServerSync {
  status: SyncStatus;
  user: ApiUser | null;
  /** Số lệnh đang chờ gửi */
  pending: number;
  /** Lỗi gần nhất, để hiện cho người dùng đọc */
  loi: string | null;
  dangNhap: (email: string, matKhau: string) => Promise<void>;
  dangKy: (email: string, matKhau: string, ten?: string) => Promise<void>;
  dangXuat: () => Promise<void>;
  /** Đẩy hồ sơ đang có ở máy lên server. Chỉ làm được khi tài khoản còn trắng. */
  nhapLenServer: (data: AppData) => Promise<void>;
  taiLai: () => Promise<void>;
  /** Gửi một lệnh lên server. Gọi sau khi đã tính xong ở máy. */
  gui: (name: string, args?: Record<string, unknown>) => void;
  /**
   * Server có đang làm trọng tài không.
   *
   * Khác `status === 'da-noi'`: khi đang gửi dở hàng đợi thì trạng thái là
   * `dang-gui` nhưng server vẫn là trọng tài. Dùng để biết KẾT QUẢ NGẪU NHIÊN
   * do ai quyết - xem `attemptTribulation` trong AppStore.
   */
  laTrongTai: boolean;
}

/**
 * Vá xong có khớp với server không. Trả về chỗ lệch, hoặc `null` nếu khớp.
 *
 * Nói rõ lệch ở đâu chứ không chỉ true/false: khi chốt này bật lên thì web phải
 * tải lại cả hồ sơ, và nếu chuyện đó xảy ra thường xuyên thì có bug ở phần vá -
 * mà không biết lệch trường nào thì không có đường mà lần.
 */
function lechChoNao(data: AppData, kt: KiemTra): string | null {
  const doi: [string, number, number][] = [
    ['tasks', data.tasks.length, kt.tasks],
    ['goals', data.goals.length, kt.goals],
    ['sessions', data.sessions.length, kt.sessions],
    ['ledger', data.ledger.length, kt.ledger],
    ['taskXp', data.verified?.taskXp ?? -1, kt.taskXp],
  ];
  const xau = doi.filter(([, a, b]) => a !== b);
  return xau.length === 0 ? null : xau.map(([t, a, b]) => `${t}: web ${a} ≠ server ${b}`).join(', ');
}

// Each command has its own key: one tab cannot overwrite another tab's outbox.
const OUTBOX = 'my-task/outbox/';
const LAST_USER = 'my-task/sync-user';
const itemKey = (userId: string, item: QueueItem) => OUTBOX + userId + '/' + item.requestId;
function readQueue(userId: string): QueueItem[] {
  const prefix = OUTBOX + userId + '/';
  const result: QueueItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const item = JSON.parse(localStorage.getItem(key)!);
    if (typeof item.name !== 'string' || typeof item.requestId !== 'string' ||
        typeof item.today !== 'string' || !Number.isFinite(item.queuedAt) ||
        !item.args || typeof item.args !== 'object') throw new Error('Hàng đợi lưu trên máy không đọc được');
    result.push(item);
  }
  return result.sort((a, b) => a.queuedAt - b.queuedAt);
}
function lastUser(): ApiUser | null {
  try {
    const u = JSON.parse(localStorage.getItem(LAST_USER) ?? 'null');
    return u && typeof u.id === 'string' && typeof u.email === 'string' ? u : null;
  } catch { return null; }
}

export function useServerSync(
  apDungTrangThai: (doi: (truoc: AppData) => AppData) => void,
  baoTin?: (message: string, tone?: 'ok' | 'warn') => void,
  _layHienTai?: () => AppData,
  nhanKetQua?: (ten: string, ketQua: unknown) => void,
): ServerSync {
  const [status, setStatus] = useState<SyncStatus>(apiEnabled ? 'dang-noi' : 'tat');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [pending, setPending] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const owner = useRef<ApiUser | null>(null);
  const authenticated = useRef(false);
  const epoch = useRef(0);
  const flushing = useRef<number | null>(null);
  const connecting = useRef<symbol | null>(null);
  const queue = useRef<QueueItem[]>([]);
  const version = useRef<number | undefined>(undefined);
  // Only a response from this account's server may populate this snapshot.
  // Never reconstruct it from the optimistic localStorage document or a saved version.
  const banServer = useRef<AppData | null>(null);
  const apply = useRef(apDungTrangThai);
  const notify = useRef(baoTin);
  const result = useRef(nhanKetQua);
  useEffect(() => {
    apply.current = apDungTrangThai;
    notify.current = baoTin;
    result.current = nhanKetQua;
  });

  const storageError = useCallback((err: unknown) => {
    const message = 'Không lưu được hàng đợi. Giữ trang đang mở và thử đồng bộ lại. ' +
      (err instanceof Error ? err.message : '');
    setLoi(message);
    notify.current?.(message, 'warn');
  }, []);

  const mergeQueue = useCallback(() => {
    if (!owner.current) return;
    try {
      const saved = readQueue(owner.current.id);
      const byId = new Map([...saved, ...queue.current].map(item => [item.requestId, item]));
      queue.current = [...byId.values()].sort((a, b) => a.queuedAt - b.queuedAt);
      for (const item of queue.current) localStorage.setItem(itemKey(owner.current.id, item), JSON.stringify(item));
      setPending(queue.current.length);
    } catch (err) { storageError(err); }
  }, [storageError]);

  const load = useCallback(async (generation: number, force = false) => {
    const known = !force && banServer.current ? version.current : undefined;
    const res = await api.trangThai(known, owner.current?.id);
    if (generation !== epoch.current) return;
    if (laKhongDoi(res)) {
      if (!banServer.current || lechChoNao({ ...banServer.current, verified: res.verified }, res.kiemTra)) {
        const full = await api.trangThai(undefined, owner.current?.id);
        if (generation !== epoch.current) return;
        if (laKhongDoi(full)) throw new Error('Máy chủ không trả hồ sơ đầy đủ');
        banServer.current = full.data;
        version.current = full.version;
      } else {
        banServer.current = { ...banServer.current, verified: res.verified };
        version.current = res.version;
      }
    } else {
      banServer.current = res.data;
      version.current = res.version;
      if (!res.audit.ok) notify.current?.('Máy chủ báo sổ ghi có vấn đề', 'warn');
    }
    if (!queue.current.length && banServer.current) {
      const snapshot = banServer.current;
      apply.current(() => snapshot);
    }
  }, []);

  const day = useCallback(async () => {
    if (!owner.current || !authenticated.current || flushing.current !== null) return;
    mergeQueue();
    if (!queue.current.length) return;
    const generation = epoch.current;
    const userId = owner.current.id;
    flushing.current = generation;
    setStatus('dang-gui');
    let conflicts = 0;
    const remove = (item: QueueItem) => {
      // Remove durable storage first. If it fails, retrying the same requestId is safe.
      localStorage.removeItem(itemKey(userId, item));
      queue.current = queue.current.filter(x => x.requestId !== item.requestId);
      setPending(queue.current.length);
    };
    try {
      while (generation === epoch.current && queue.current.length) {
        const item = queue.current[0]!;
        try {
          const res = await api.lenh(item.name, item.args, item.today, version.current, item.requestId, userId);
          if (generation !== epoch.current) return;
          if (res.replayed || !banServer.current) {
            await load(generation, true);
          } else {
            const next = apThayDoi(banServer.current, res.thayDoi);
            if (lechChoNao(next, res.kiemTra)) await load(generation, true);
            else { banServer.current = next; version.current = res.version; }
          }
          if (generation !== epoch.current) return;
          remove(item);
          conflicts = 0;
          setLoi(null);
          if (!queue.current.length && banServer.current) {
            const snapshot = banServer.current;
            apply.current(() => snapshot);
          }
          if (res.result !== undefined && !res.replayed) result.current?.(item.name, res.result);
        } catch (err) {
          if (generation !== epoch.current) return;
          if (!(err instanceof ApiError)) throw err;
          if (err.status === 401) {
            authenticated.current = false;
            setStatus('chua-dang-nhap');
            setUser(null);
            setLoi('Phiên đã hết hạn. Đăng nhập lại để gửi các thao tác đang chờ.');
            return;
          }
          if (err.offline || err.status >= 500 || err.status === 429) throw err;
          if (err.status === 409) {
            await load(generation, true);
            if (++conflicts >= 3) throw err;
            continue;
          }
          // Only this rejected command is removed. Independent commands still run.
          remove(item);
          setLoi(err.message);
          notify.current?.(err.message, 'warn');
          await load(generation, true);
        }
      }
      if (generation === epoch.current) setStatus('da-noi');
    } catch (err) {
      if (generation === epoch.current) {
        setStatus('mat-mang');
        setLoi(err instanceof Error ? err.message : 'Chưa đồng bộ được, thao tác vẫn đang chờ');
      }
    } finally {
      if (flushing.current === generation) flushing.current = null;
    }
  }, [load, mergeQueue]);

  const attach = useCallback((u: ApiUser) => {
    if (owner.current?.id !== u.id) {
      epoch.current++;
      flushing.current = null;
      queue.current = [];
      version.current = undefined;
      banServer.current = null;
    }
    owner.current = u;
    setUser(u);
    try { localStorage.setItem(LAST_USER, JSON.stringify(u)); } catch (err) { storageError(err); }
    mergeQueue();
  }, [mergeQueue, storageError]);

  const sauKhiVao = useCallback(async (u: ApiUser) => {
    attach(u);
    const generation = epoch.current;
    authenticated.current = false;
    await load(generation, true);
    if (generation !== epoch.current) return;
    if (banServer.current) {
      const snapshot = banServer.current;
      apply.current(() => snapshot);
    }
    authenticated.current = true;
    setStatus('da-noi');
    await day();
  }, [attach, day, load]);

  const connect = useCallback(async () => {
    if (connecting.current) return;
    const connection = Symbol('connection');
    connecting.current = connection;
    const generation = epoch.current;
    try {
      const { user: u } = await api.toiLaAi();
      if (generation !== epoch.current || connecting.current !== connection) return;
      await sauKhiVao(u);
    } catch (err) {
      if (connecting.current !== connection) return;
      if (err instanceof ApiError && err.status === 401) {
        authenticated.current = false;
        setUser(null);
        setStatus('chua-dang-nhap');
      } else {
        if (!owner.current) { const cached = lastUser(); if (cached) attach(cached); }
        setStatus('mat-mang');
      }
    } finally { if (connecting.current === connection) connecting.current = null; }
  }, [attach, sauKhiVao]);

  const gui = useCallback((name: string, args: Record<string, unknown> = {}) => {
    if (!apiEnabled || !owner.current || !user) return;
    const item: QueueItem = { name, args, today: todayKey(), requestId: uid(),
      queuedAt: Math.max(Date.now(), (queue.current.at(-1)?.queuedAt ?? 0) + 1) };
    queue.current.push(item);
    setPending(queue.current.length);
    try { localStorage.setItem(itemKey(owner.current.id, item), JSON.stringify(item)); }
    catch (err) { storageError(err); }
    void day();
  }, [day, storageError, user]);

  const stopSessionWork = useCallback(() => {
    epoch.current++;
    authenticated.current = false;
    connecting.current = null;
    flushing.current = null;
  }, []);
  const dangNhap = useCallback(async (email: string, password: string) => {
    stopSessionWork();
    try {
      const { user: u } = await api.dangNhap(email, password);
      await sauKhiVao(u);
    } catch (err) { await connect(); throw err; }
  }, [connect, sauKhiVao, stopSessionWork]);
  const dangKy = useCallback(async (email: string, password: string, name?: string) => {
    stopSessionWork();
    try {
      const { user: u } = await api.dangKy(email, password, name);
      await sauKhiVao(u);
    } catch (err) { await connect(); throw err; }
  }, [connect, sauKhiVao, stopSessionWork]);
  const dangXuat = useCallback(async () => {
    stopSessionWork();
    // Do not report success if the server session could not be revoked.
    try { await api.dangXuat(); }
    catch (err) { await connect(); throw err; }
    owner.current = null;
    queue.current = [];
    banServer.current = null;
    version.current = undefined;
    try { localStorage.removeItem(LAST_USER); } catch (err) { storageError(err); }
    setPending(0);
    setUser(null);
    setStatus('chua-dang-nhap');
  }, [connect, stopSessionWork, storageError]);
  const taiLai = useCallback(async () => {
    if (!authenticated.current) { await connect(); return; }
    if (flushing.current !== null) return;
    await day();
    if (!queue.current.length) {
      const generation = epoch.current;
      flushing.current = generation;
      try { await load(generation); }
      finally { if (flushing.current === generation) flushing.current = null; }
      await day();
    }
  }, [connect, day, load]);
  const nhapLenServer = useCallback(async (data: AppData) => {
    gui('importLocalData', { data });
    await day();
  }, [gui, day]);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void connect(); });
    const retry = () => {
      if (document.visibilityState === 'hidden') return;
      if (authenticated.current) void day(); else void connect();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    const timer = window.setInterval(retry, 10_000);
    return () => {
      cancelled = true;
      stopSessionWork();
      window.clearInterval(timer);
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, [connect, day, stopSessionWork]);

  return { status, user, pending, loi, dangNhap, dangKy, dangXuat, nhapLenServer, taiLai, gui,
    laTrongTai: !!user };
}
