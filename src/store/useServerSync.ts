import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../types';
import { ApiError, api, apiEnabled, apThayDoi, boNullHoSo, laKhongDoi } from '../lib/api';
import type { ApiUser, CommandReply, KiemTra, StateReply, TrangThaiReply } from '../lib/api';
import { todayKey } from '../lib/date';
import { DEFAULT_SETTINGS, coDuLieu, emptyData, saoLuuHoSo, uid } from '../lib/storage';
import { rebuildLedger } from '../lib/integrity';
import { idTaoRa, tachPhuThuoc, tenLenh } from './lenh';

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
  /** Không tới được máy chủ (mạng) - lệnh nằm chờ, tự thử lại */
  | 'mat-mang'
  /** Máy chủ lỗi 5xx/429 - lệnh nằm chờ, lùi dần rồi thử lại */
  | 'loi-may-chu'
  /**
   * Máy chủ không hiểu web (400/404/405/413/415, trả về HTML...): lệch phiên
   * bản hoặc sai địa chỉ API. Lệnh được GIỮ, chỉ thử lại thưa (5 phút/lần).
   */
  | 'khong-tuong-thich'
  /** Phiên hết hạn (401). Lệnh vẫn xếp hàng dưới tài khoản cũ, chờ đăng nhập lại */
  | 'het-phien'
  /** Một lệnh cụ thể bị kẹt và cần người dùng quyết: xem `ket` */
  | 'lenh-ket'
  /** Đồng hồ máy lệch quá xa giờ máy chủ (`bad-today` với chính ngày hôm nay) */
  | 'lech-gio';

interface QueueItem {
  name: string;
  args: Record<string, unknown>;
  requestId: string;
  today: string;
  queuedAt: number;
  /** Số lần liền máy chủ trả 5xx cho đúng lệnh này - quá ngưỡng thì dừng lại hỏi */
  loi5xx?: number;
}

/**
 * Một lệnh bị kẹt ở đầu hàng đợi.
 *
 *  - `ngay-cu`: lệnh xếp hàng lúc mất mạng từ mấy hôm trước, giờ máy chủ chê
 *    ngày ấy đã quá xa (`bad-today`). KHÔNG tự bỏ: người dùng chọn gửi lại
 *    theo ngày hôm nay, hoặc bỏ hẳn - và thấy rõ mình đang bỏ cái gì.
 *  - `may-chu`: máy chủ lỗi liền nhiều lần với đúng lệnh này. Hàng đợi dừng
 *    để khỏi đập mãi vào một lệnh độc, chờ người dùng thử lại hoặc bỏ.
 *  - `khong-hop-le`: máy chủ chê tham số (`bad-args`) hay thân quá lớn (413).
 *    Có thể chỉ riêng lệnh này hỏng nên cho quyền bỏ, nhưng vẫn không tự bỏ.
 */
export interface LenhKet {
  requestId: string;
  name: string;
  /** Tên dễ đọc của lệnh */
  ten: string;
  /** Ngày ghi trên lệnh */
  today: string;
  loai: 'ngay-cu' | 'may-chu' | 'khong-hop-le';
  lyDo: string;
}

export interface ServerSync {
  status: SyncStatus;
  /** Tài khoản đã được máy chủ xác nhận (hoặc đang dùng tạm lúc mất mạng) */
  user: ApiUser | null;
  /**
   * Tài khoản đang giữ hàng đợi và hồ sơ trên máy này.
   *
   * Khác `user`: phiên hết hạn thì `user` về `null` để hiện ô đăng nhập, nhưng
   * `chu` vẫn còn - hồ sơ trên máy vẫn là của người ấy, lệnh mới vẫn xếp hàng
   * dưới tên người ấy, và máy chủ vẫn là bên phán xử.
   */
  chu: ApiUser | null;
  /** Số lệnh đang chờ gửi */
  pending: number;
  /** Lỗi gần nhất, kèm mã HTTP nếu có, để hiện cho người dùng đọc */
  loi: string | null;
  /** Lệnh đang kẹt chờ người dùng quyết, nếu có */
  ket: LenhKet | null;
  dangNhap: (email: string, matKhau: string) => Promise<void>;
  /**
   * Tạo tài khoản. Có `duLieuMay` thì lệnh đưa hồ sơ lên được xếp hàng TRƯỚC
   * khi lấy bản trắng của server về - hồ sơ trên máy không bị thay trước lúc
   * nó kịp lên đường.
   */
  dangKy: (email: string, matKhau: string, ten?: string, duLieuMay?: AppData) => Promise<void>;
  /** Đăng xuất. `xoaDuLieuMay` thì xoá luôn bản sao hồ sơ và hàng đợi của tài khoản trên máy này. */
  dangXuat: (xoaDuLieuMay?: boolean) => Promise<void>;
  /** Đẩy hồ sơ đang có ở máy lên server. Chỉ làm được khi tài khoản còn trắng. */
  nhapLenServer: (data: AppData) => Promise<void>;
  taiLai: () => Promise<void>;
  /** Hỏi máy chủ có gì mới không (rẻ: chỉ so số hiệu). */
  kiemTraMoi: () => Promise<void>;
  /** Gửi một lệnh lên server. Gọi sau khi đã tính xong ở máy. */
  gui: (name: string, args?: Record<string, unknown>) => void;
  /** Quyết cho lệnh đang kẹt: bỏ hẳn, hoặc gửi lại (theo ngày hôm nay nếu kẹt vì ngày cũ). */
  xuLyLenhKet: (cach: 'bo' | 'gui-lai') => Promise<void>;
  /**
   * Server có đang làm trọng tài không.
   *
   * Khác `status === 'da-noi'`: khi đang gửi dở hàng đợi thì trạng thái là
   * `dang-gui` nhưng server vẫn là trọng tài. Mất mạng hay hết phiên cũng vậy:
   * lệnh chỉ nằm chờ, phán quyết vẫn thuộc về server. Dùng để biết KẾT QUẢ
   * NGẪU NHIÊN do ai quyết - xem `attemptTribulation` trong AppStore.
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

/** Lời đáp không đúng hình dạng thì coi là máy chủ lạ, không để nó nổ thành TypeError. */
const sai = (chuyen: string) => new ApiError(200, `Máy chủ trả ${chuyen} không đúng dạng`, 'not-json');

function kiemTrangThai(res: TrangThaiReply): TrangThaiReply {
  const r = res as Partial<StateReply> & { khongDoi?: boolean; kiemTra?: unknown; verified?: unknown };
  if (!r || typeof r !== 'object' || typeof r.version !== 'number') throw sai('hồ sơ');
  if (r.khongDoi === true ? !r.kiemTra || !r.verified : !r.data || !Array.isArray(r.data.tasks)) throw sai('hồ sơ');
  return res;
}

function kiemLenh(res: CommandReply): CommandReply {
  if (!res || typeof res !== 'object' || typeof res.version !== 'number' || !res.thayDoi ||
      typeof res.thayDoi !== 'object' || !res.kiemTra) throw sai('lời đáp lệnh');
  return res;
}

function kiemNguoi(r: { user: ApiUser }): ApiUser {
  if (!r?.user || typeof r.user.id !== 'string' || typeof r.user.email !== 'string') throw sai('thông tin tài khoản');
  return r.user;
}

// Each command has its own key: one tab cannot overwrite another tab's outbox.
const OUTBOX = 'my-task/outbox/';
/** Lệnh hỏng (không đọc được) được cất riêng ở đây thay vì làm hỏng cả hàng đợi */
const OUTBOX_HONG = 'my-task/outbox-hong/';
const LAST_USER = 'my-task/sync-user';
/** Tổng đã xác thực lần cuối, kèm id tài khoản - xem `khoiPhucVerified` */
const VERIFIED = 'my-task/verified';

/** Lùi dần khi gửi hỏng: 10 giây, gấp đôi mỗi lần, trần 5 phút. */
const CHO_DAU = 10_000;
const CHO_TOI_DA = 5 * 60_000;
/** Máy chủ lỗi chừng này lần liền với cùng một lệnh thì dừng lại hỏi người dùng */
export const SO_LAN_5XX = 8;
/** Nhịp hỏi "có gì mới không" khi trang đang mở trước mắt */
const NHIP_HOI = 60_000;

const itemKey = (userId: string, item: QueueItem) => OUTBOX + userId + '/' + item.requestId;

const hopLe = (x: unknown): x is QueueItem => {
  const i = x as Partial<QueueItem> | null;
  return !!i && typeof i === 'object' && typeof i.name === 'string' && typeof i.requestId === 'string' &&
    typeof i.today === 'string' && Number.isFinite(i.queuedAt) && !!i.args && typeof i.args === 'object';
};

/**
 * Đọc hàng đợi của một tài khoản.
 *
 * Mỗi lệnh đọc riêng một lượt: một lệnh hỏng (tab khác ghi dở, tiện ích trình
 * duyệt sửa bậy) chỉ bị cất sang khoá riêng, không kéo sập cả hàng đợi - trước
 * đây một lệnh hỏng là ném lỗi cho cả hàng, và lần nào đọc cũng hiện lại một
 * thông báo.
 *
 * Gom tên khoá xong mới đọc: tab khác có thể vừa gửi xong và xoá một khoá giữa
 * lúc `key(i)` và `getItem`, khi ấy `getItem` trả `null` - không phải lỗi.
 */
function readQueue(userId: string): { items: QueueItem[]; hong: number } {
  const prefix = OUTBOX + userId + '/';
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  const items: QueueItem[] = [];
  let hong = 0;
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    let item: unknown = null;
    try { item = JSON.parse(raw); } catch { /* xử lý như lệnh hỏng ngay dưới */ }
    if (hopLe(item)) { items.push(item); continue; }
    hong++;
    try {
      localStorage.setItem(OUTBOX_HONG + key.slice(OUTBOX.length), raw);
      localStorage.removeItem(key);
    } catch { /* để nguyên chỗ cũ, lần sau cất tiếp */ }
  }
  return { items: items.sort((a, b) => a.queuedAt - b.queuedAt), hong };
}

function khoaTheoTienTo(...tienTo: string[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && tienTo.some((t) => k.startsWith(t))) keys.push(k);
  }
  return keys;
}

function lastUser(): ApiUser | null {
  try {
    const u = JSON.parse(localStorage.getItem(LAST_USER) ?? 'null');
    return u && typeof u.id === 'string' && typeof u.email === 'string' ? u : null;
  } catch { return null; }
}

/** Ghi lại tổng đã xác thực của tài khoản đang giữ hồ sơ. */
export function luuVerified(userId: string, verified: AppData['verified']) {
  if (!verified) return;
  try { localStorage.setItem(VERIFIED, JSON.stringify({ userId, verified })); }
  catch { /* chỉ là bộ đệm, lần đồng bộ sau có lại */ }
}

/**
 * Gắn lại tổng đã xác thực vào hồ sơ vừa nạp từ đĩa.
 *
 * `loadData` cố tình không đọc `verified` (con số của server, không tin được
 * nếu không biết nó thuộc ai). Nhưng thiếu nó thì đang đăng nhập mà mở lại
 * trang lúc mất mạng là tu vi về 0 và kiểm sổ ở máy báo "sổ bị sửa" - vì sổ ký
 * bằng khoá của server. Nên chỉ gắn lại khi bản lưu mang đúng id của tài khoản
 * đang giữ hồ sơ trên máy.
 */
export function khoiPhucVerified(data: AppData): AppData {
  if (!apiEnabled || data.verified) return data;
  try {
    const u = lastUser();
    const v = JSON.parse(localStorage.getItem(VERIFIED) ?? 'null') as { userId?: string; verified?: AppData['verified'] } | null;
    if (!u || !v || v.userId !== u.id || !v.verified || typeof v.verified.taskXp !== 'number') return data;
    return { ...data, verified: v.verified };
  } catch { return data; }
}

/**
 * Hồ sơ giữ lại sau khi đăng xuất để chạy một mình.
 *
 * Sổ ghi đang ký bằng khoá của server, mà bên máy không kiểm được khoá ấy -
 * để nguyên thì vừa đăng xuất xong là trang kiểm sổ báo "bị sửa" và tu vi về
 * 0. Ký lại bằng khoá của web thì bản giữ lại dùng tiếp được ngay.
 */
function hoSoChayMotMinh(d: AppData): AppData {
  // Kỳ ngộ đang chờ là của server - chạy một mình thì không còn ai giải nó.
  const { verified: _bo, pendingEncounter: _bo2, ...con } = d;
  return { ...con, ledger: rebuildLedger(con) };
}

export function useServerSync(
  apDungTrangThai: (doi: (truoc: AppData) => AppData) => void,
  baoTin?: (message: string, tone?: 'ok' | 'warn') => void,
  layHienTai?: () => AppData,
  nhanKetQua?: (ten: string, ketQua: unknown, traLoi: CommandReply) => void,
  nhanAnMung?: (danhSach: unknown[], ten: string) => void,
): ServerSync {
  const [status, setStatus] = useState<SyncStatus>(apiEnabled ? 'dang-noi' : 'tat');
  const [user, setUser] = useState<ApiUser | null>(null);
  // Tài khoản của lần trước: hồ sơ trên máy là của người ấy ngay từ lúc mở
  // trang, chưa cần đợi máy chủ trả lời.
  const [chu, setChu] = useState<ApiUser | null>(() => (apiEnabled ? lastUser() : null));
  const [pending, setPending] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const [ket, setKet] = useState<LenhKet | null>(null);
  const owner = useRef<ApiUser | null>(chu);
  const authenticated = useRef(false);
  const epoch = useRef(0);
  const flushing = useRef<number | null>(null);
  const connecting = useRef<symbol | null>(null);
  const queue = useRef<QueueItem[]>([]);
  /** Lệnh chưa ghi được xuống đĩa (bộ nhớ đầy): chỉ còn trong RAM, đừng đánh rơi */
  const chuaLuu = useRef(new Set<string>());
  const version = useRef<number | undefined>(undefined);
  // Only a response from this account's server may populate this snapshot.
  // Never reconstruct it from the optimistic localStorage document or a saved version.
  const banServer = useRef<AppData | null>(null);
  /** Bản server đã áp lần cuối - để khỏi áp lại y nguyên mỗi lần hỏi thăm */
  const daAp = useRef<AppData | null>(null);
  const ketRef = useRef<LenhKet | null>(null);
  /** Lùi dần: `cho` là độ trễ hiện tại, `luc` là mốc sớm nhất được thử lại */
  const hoan = useRef({ cho: 0, luc: 0 });
  const henGio = useRef<number | undefined>(undefined);
  const henHoi = useRef<number | undefined>(undefined);
  const daBaoHong = useRef(false);
  const thuLaiRef = useRef<() => void>(() => {});
  const apply = useRef(apDungTrangThai);
  const notify = useRef(baoTin);
  const result = useRef(nhanKetQua);
  const anMung = useRef(nhanAnMung);
  const hienTai = useRef(layHienTai);
  useEffect(() => {
    apply.current = apDungTrangThai;
    notify.current = baoTin;
    result.current = nhanKetQua;
    anMung.current = nhanAnMung;
    hienTai.current = layHienTai;
  });

  const storageError = useCallback((err: unknown) => {
    const message = 'Không lưu được hàng đợi. Giữ trang đang mở và thử đồng bộ lại. ' +
      (err instanceof Error ? err.message : '');
    setLoi(message);
    notify.current?.(message, 'warn');
  }, []);

  const datKet = useCallback((k: LenhKet | null) => {
    ketRef.current = k;
    setKet(k);
  }, []);

  /** Áp bản của server lên màn hình - chỉ khi không còn gì đang chờ gửi. */
  const apBan = useCallback((force = false) => {
    const snapshot = banServer.current;
    if (!snapshot || queue.current.length) return;
    if (!force && snapshot === daAp.current) return;
    daAp.current = snapshot;
    apply.current(() => snapshot);
  }, []);

  const mergeQueue = useCallback(() => {
    const u = owner.current;
    if (!u) return;
    let doc: ReturnType<typeof readQueue>;
    try { doc = readQueue(u.id); } catch (err) { storageError(err); return; }
    if (doc.hong && !daBaoHong.current) {
      // Báo đúng một lần mỗi phiên, không phải mỗi lần đọc hàng đợi.
      daBaoHong.current = true;
      notify.current?.(`${doc.hong} thao tác chờ gửi bị hỏng nên đã được cất riêng, không gửi lên máy chủ.`, 'warn');
    }
    // Đĩa là nguồn thật: lệnh tab khác đã gửi xong và xoá thì ở đây cũng bỏ,
    // đừng ghi lại cho nó sống dậy. Chỉ lệnh chưa ghi xuống được mới giữ từ RAM.
    const byId = new Map(doc.items.map((item) => [item.requestId, item]));
    for (const item of queue.current) {
      if (!chuaLuu.current.has(item.requestId) || byId.has(item.requestId)) continue;
      byId.set(item.requestId, item);
      try {
        localStorage.setItem(itemKey(u.id, item), JSON.stringify(item));
        chuaLuu.current.delete(item.requestId);
      } catch { /* vẫn chỉ nằm trong RAM */ }
    }
    queue.current = [...byId.values()].sort((a, b) => a.queuedAt - b.queuedAt);
    setPending(queue.current.length);
  }, [storageError]);

  const luuItem = useCallback((userId: string, item: QueueItem) => {
    try {
      localStorage.setItem(itemKey(userId, item), JSON.stringify(item));
      chuaLuu.current.delete(item.requestId);
    } catch (err) {
      chuaLuu.current.add(item.requestId);
      storageError(err);
    }
  }, [storageError]);

  const boKhoiHang = useCallback((userId: string, item: QueueItem) => {
    // Remove durable storage first. If it fails, retrying the same requestId is safe.
    try { localStorage.removeItem(itemKey(userId, item)); } catch { /* xem trên */ }
    chuaLuu.current.delete(item.requestId);
    queue.current = queue.current.filter((x) => x.requestId !== item.requestId);
    setPending(queue.current.length);
  }, []);

  /** Bỏ lệnh cùng mọi lệnh phụ thuộc vào thứ nó tạo ra. Trả về số lệnh phụ thuộc đã bỏ. */
  const boCaChuoi = useCallback((userId: string, item: QueueItem): number => {
    const { bo, sua } = tachPhuThuoc(idTaoRa(item.name, item.args), queue.current.filter((x) => x !== item));
    boKhoiHang(userId, item);
    for (const x of bo) boKhoiHang(userId, x);
    for (const x of sua) {
      queue.current = queue.current.map((y) => (y.requestId === x.requestId ? x : y));
      luuItem(userId, x);
    }
    return bo.length;
  }, [boKhoiHang, luuItem]);

  const xepHang = useCallback((name: string, args: Record<string, unknown>) => {
    const u = owner.current;
    if (!u) return;
    const item: QueueItem = { name, args, today: todayKey(), requestId: uid(),
      queuedAt: Math.max(Date.now(), (queue.current.at(-1)?.queuedAt ?? 0) + 1) };
    queue.current.push(item);
    setPending(queue.current.length);
    luuItem(u.id, item);
  }, [luuItem]);

  const huyHen = useCallback(() => {
    if (henGio.current !== undefined) window.clearTimeout(henGio.current);
    henGio.current = undefined;
  }, []);
  const datLaiCho = useCallback(() => {
    hoan.current = { cho: 0, luc: 0 };
    huyHen();
  }, [huyHen]);
  /**
   * Hẹn thử lại: lùi gấp đôi mỗi lần, có nhiễu để nhiều máy không cùng dội vào
   * máy chủ đúng một nhịp. Máy chủ bảo chờ (`Retry-After`) thì chờ ít nhất ngần ấy.
   */
  const lui = useCallback((err?: unknown, toiDa = false) => {
    const cho = toiDa ? CHO_TOI_DA : hoan.current.cho ? Math.min(CHO_TOI_DA, hoan.current.cho * 2) : CHO_DAU;
    let tre = cho * (0.8 + Math.random() * 0.4);
    if (err instanceof ApiError && err.retryAfterMs !== undefined) tre = Math.max(tre, err.retryAfterMs);
    hoan.current = { cho, luc: Date.now() + tre };
    huyHen();
    henGio.current = window.setTimeout(() => {
      henGio.current = undefined;
      hoan.current.luc = 0;
      thuLaiRef.current();
    }, tre);
  }, [huyHen]);

  const hetPhien = useCallback((err?: ApiError) => {
    authenticated.current = false;
    setUser(null);
    if (!owner.current) {
      setLoi(null);
      setStatus('chua-dang-nhap');
      return;
    }
    // Không bỏ `owner`: lệnh mới vẫn xếp hàng dưới tài khoản này, và chỉ gửi
    // khi chính tài khoản này đăng nhập lại.
    setLoi(err?.code === 'account-changed'
      ? 'Trình duyệt đang đăng nhập một tài khoản khác. Đăng nhập lại đúng tài khoản để gửi các thao tác đang chờ.'
      : 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để gửi các thao tác đang chờ.');
    setStatus('het-phien');
  }, []);

  const baoLoi = useCallback((err: unknown) => {
    const e = err instanceof ApiError ? err
      : sai(err instanceof Error ? `dữ liệu (${err.message})` : 'dữ liệu');
    const ma = e.status ? ` (${e.status}${e.code ? ` ${e.code}` : ''})` : '';
    switch (e.loai) {
      case 'phien':
        hetPhien(e);
        return;
      case 'mang':
        setStatus('mat-mang');
        setLoi('Mất mạng - không nối được tới máy chủ. Thao tác vẫn nằm chờ và sẽ tự gửi lại.');
        lui(e);
        break;
      case 'may-chu':
      case 'qua-tai':
      case 'xung-dot':
        setStatus('loi-may-chu');
        setLoi(`Lỗi máy chủ${ma}: ${e.message}. Thao tác vẫn nằm chờ, sẽ thử lại sau.`);
        lui(e);
        break;
      case 'lech-ngay':
        setStatus('lech-gio');
        setLoi(`Ngày giờ trên máy lệch quá xa so với máy chủ${ma}. Chỉnh lại đồng hồ máy rồi bấm tải lại.`);
        lui(e, true);
        break;
      default:
        setStatus('khong-tuong-thich');
        setLoi(`Máy chủ không hiểu yêu cầu${ma}: ${e.message}. Có thể web và máy chủ đang lệch phiên bản hoặc sai địa chỉ API. Thao tác vẫn được giữ, chưa gửi.`);
        lui(e, true);
    }
    if (ketRef.current && ketRef.current.loai !== 'khong-hop-le') setStatus('lenh-ket');
  }, [hetPhien, lui]);

  const nhanBan = useCallback((res: StateReply) => {
    banServer.current = boNullHoSo(res.data);
    version.current = res.version;
    if (!res.audit?.ok) notify.current?.('Máy chủ báo sổ ghi có vấn đề', 'warn');
  }, []);

  const load = useCallback(async (generation: number, force = false) => {
    const known = !force && banServer.current ? version.current : undefined;
    const res = kiemTrangThai(await api.trangThai(known, owner.current?.id));
    if (generation !== epoch.current) return;
    if (laKhongDoi(res)) {
      if (!banServer.current || lechChoNao({ ...banServer.current, verified: res.verified }, res.kiemTra)) {
        const full = kiemTrangThai(await api.trangThai(undefined, owner.current?.id));
        if (generation !== epoch.current) return;
        if (laKhongDoi(full)) throw sai('hồ sơ đầy đủ');
        nhanBan(full);
      } else {
        // Giữ nguyên đối tượng nếu không có gì đổi, để khỏi vẽ lại cả app mỗi lần hỏi thăm.
        if (JSON.stringify(banServer.current.verified) !== JSON.stringify(res.verified)) {
          banServer.current = { ...banServer.current, verified: res.verified };
        }
        version.current = res.version;
      }
    } else {
      nhanBan(res);
    }
    apBan();
  }, [apBan, nhanBan]);

  const day = useCallback(async () => {
    if (!owner.current || !authenticated.current || flushing.current !== null) return;
    // Lệnh kẹt cần người dùng quyết thì dừng hẳn; đang trong giờ lùi thì đợi hẹn.
    if (ketRef.current && ketRef.current.loai !== 'khong-hop-le') return;
    if (Date.now() < hoan.current.luc) return;
    mergeQueue();
    if (!queue.current.length) return;
    const generation = epoch.current;
    const userId = owner.current.id;
    flushing.current = generation;
    setStatus('dang-gui');
    let conflicts = 0;
    /** Lời từ chối của cả lượt, gộp lại báo MỘT lần */
    const tuChoi: string[] = [];
    let canTai = false;
    try {
      while (generation === epoch.current && queue.current.length) {
        const item = queue.current[0]!;
        let res: CommandReply;
        try {
          res = kiemLenh(await api.lenh(item.name, item.args, item.today, version.current, item.requestId, userId));
        } catch (err) {
          if (generation !== epoch.current) return;
          if (!(err instanceof ApiError)) throw err;
          const loai = err.loai;
          if (loai === 'xung-dot') {
            await load(generation, true);
            if (++conflicts >= 3) throw err;
            continue;
          }
          if (loai === 'tu-choi') {
            // Chỉ lệnh này (và những lệnh chắc chắn hỏng theo nó) bị bỏ. Lệnh
            // độc lập vẫn chạy tiếp; tải lại một lần ở cuối lượt, không phải
            // một lần cho mỗi lệnh bị từ chối.
            const kem = boCaChuoi(userId, item);
            tuChoi.push(`“${tenLenh(item.name)}”: ${err.message}${kem ? ` (bỏ kèm ${kem} thao tác phụ thuộc)` : ''}`);
            canTai = true;
            continue;
          }
          const chung = { requestId: item.requestId, name: item.name, ten: tenLenh(item.name), today: item.today };
          if (loai === 'lech-ngay' && item.today !== todayKey()) {
            datKet({ ...chung, loai: 'ngay-cu',
              lyDo: `Thao tác này được ghi vào ngày ${item.today}, đã quá xa để máy chủ nhận.` });
          } else if (loai === 'may-chu') {
            item.loi5xx = (item.loi5xx ?? 0) + 1;
            luuItem(userId, item);
            if (item.loi5xx >= SO_LAN_5XX) {
              datKet({ ...chung, loai: 'may-chu',
                lyDo: `Máy chủ lỗi ${item.loi5xx} lần liền với đúng thao tác này (${err.status}: ${err.message}).` });
            }
          } else if (err.code === 'bad-args' || err.status === 413) {
            datKet({ ...chung, loai: 'khong-hop-le',
              lyDo: `Máy chủ không nhận thao tác này (${err.status}${err.code ? ` ${err.code}` : ''}): ${err.message}` });
          }
          throw err;
        }
        if (generation !== epoch.current) return;
        if (res.replayed || !banServer.current) {
          await load(generation, true);
        } else {
          const next = apThayDoi(banServer.current, res.thayDoi);
          if (lechChoNao(next, res.kiemTra)) await load(generation, true);
          else { banServer.current = next; version.current = res.version; }
        }
        if (generation !== epoch.current) return;
        boKhoiHang(userId, item);
        conflicts = 0;
        if (ketRef.current?.requestId === item.requestId) datKet(null);
        if (!res.replayed) {
          if (res.result !== undefined) result.current?.(item.name, res.result, res);
          if (res.celebrations?.length) anMung.current?.(res.celebrations, item.name);
        }
      }
      if (generation !== epoch.current) return;
      if (canTai) await load(generation, true);
      if (generation !== epoch.current) return;
      datLaiCho();
      setLoi(null);
      setStatus('da-noi');
      apBan();
    } catch (err) {
      if (generation === epoch.current) baoLoi(err);
    } finally {
      if (flushing.current === generation) flushing.current = null;
      if (generation === epoch.current && tuChoi.length) {
        const cau = tuChoi.length === 1
          ? `Máy chủ không nhận thao tác ${tuChoi[0]}.`
          : `Máy chủ không nhận ${tuChoi.length} thao tác: ${tuChoi.join('; ')}.`;
        setLoi(cau);
        notify.current?.(`${cau} Hồ sơ đã được lấy lại theo máy chủ.`, 'warn');
      }
    }
  }, [apBan, baoLoi, boCaChuoi, boKhoiHang, datKet, datLaiCho, load, luuItem, mergeQueue]);

  const attach = useCallback((u: ApiUser) => {
    if (owner.current?.id !== u.id) {
      epoch.current++;
      flushing.current = null;
      queue.current = [];
      chuaLuu.current.clear();
      version.current = undefined;
      banServer.current = null;
      daAp.current = null;
      datKet(null);
    }
    owner.current = u;
    setChu(u);
    setUser(u);
    try { localStorage.setItem(LAST_USER, JSON.stringify(u)); } catch (err) { storageError(err); }
    mergeQueue();
  }, [datKet, mergeQueue, storageError]);

  const sauKhiVao = useCallback(async (u: ApiUser, truocKhiGui?: () => void) => {
    /*
     * Sắp thay hồ sơ trên máy bằng hồ sơ của một tài khoản khác với lần trước
     * (hoặc lần đầu đăng nhập): chép ra một bản trước đã. Nếu đó là dữ liệu
     * chạy một mình chưa từng lên đâu thì đây là bản duy nhất còn lại.
     */
    const truoc = owner.current?.id ?? lastUser()?.id;
    if (truoc !== u.id) {
      const dangCo = hienTai.current?.();
      if (dangCo && coDuLieu(dangCo)) saoLuuHoSo(dangCo, `Trước khi vào tài khoản ${u.email}`);
    }
    attach(u);
    const generation = epoch.current;
    truocKhiGui?.();
    authenticated.current = true;
    datLaiCho();
    setLoi(null);
    try {
      // Tải để có nền vá và số hiệu - `load` tự không áp khi hàng đợi còn lệnh.
      await load(generation, true);
    } catch (err) {
      if (generation === epoch.current) baoLoi(err);
      return;
    }
    if (generation !== epoch.current) return;
    if (queue.current.length) {
      /*
       * Còn lệnh chờ thì GỬI TRƯỚC rồi mới lấy bản server làm chuẩn - `day`
       * tự áp khi hàng đợi trống. Áp bản server ngay lúc này là xoá mất khỏi
       * màn hình những thay đổi người dùng vừa làm lúc mất mạng.
       */
      if (ketRef.current && ketRef.current.loai !== 'khong-hop-le') { setStatus('lenh-ket'); return; }
      await day();
      return;
    }
    apBan(true);
    setStatus('da-noi');
  }, [apBan, attach, baoLoi, datLaiCho, day, load]);

  const connect = useCallback(async () => {
    if (connecting.current) return;
    const connection = Symbol('connection');
    connecting.current = connection;
    const generation = epoch.current;
    try {
      let u: ApiUser;
      try {
        u = kiemNguoi(await api.toiLaAi());
      } catch (err) {
        if (connecting.current !== connection) return;
        if (err instanceof ApiError && err.loai === 'phien') { hetPhien(err); return; }
        // Mất mạng lúc mở trang: vẫn làm việc tiếp dưới tài khoản lần trước.
        if (owner.current) { setUser(owner.current); mergeQueue(); }
        baoLoi(err);
        return;
      }
      if (generation !== epoch.current || connecting.current !== connection) return;
      await sauKhiVao(u);
    } finally { if (connecting.current === connection) connecting.current = null; }
  }, [baoLoi, hetPhien, mergeQueue, sauKhiVao]);

  // Chỉ đọc `owner` - không đọc `user` của lần vẽ trước. Vừa tạo tài khoản
  // xong mà đọc `user` thì nó vẫn còn là `null`, và lệnh đưa hồ sơ lên bị nuốt.
  const gui = useCallback((name: string, args: Record<string, unknown> = {}) => {
    if (!apiEnabled || !owner.current) return;
    xepHang(name, args);
    void day();
  }, [day, xepHang]);

  const stopSessionWork = useCallback(() => {
    epoch.current++;
    authenticated.current = false;
    connecting.current = null;
    flushing.current = null;
  }, []);
  const dangNhap = useCallback(async (email: string, password: string) => {
    stopSessionWork();
    let u: ApiUser;
    try { u = kiemNguoi(await api.dangNhap(email, password)); }
    catch (err) { await connect(); throw err; }
    await sauKhiVao(u);
  }, [connect, sauKhiVao, stopSessionWork]);
  const dangKy = useCallback(async (email: string, password: string, name?: string, duLieuMay?: AppData) => {
    stopSessionWork();
    let u: ApiUser;
    try { u = kiemNguoi(await api.dangKy(email, password, name)); }
    catch (err) { await connect(); throw err; }
    const nhap = duLieuMay && coDuLieu(duLieuMay)
      ? () => { const { verified: _bo, ...data } = duLieuMay; xepHang('importLocalData', { data }); }
      : undefined;
    await sauKhiVao(u, nhap);
  }, [connect, sauKhiVao, stopSessionWork, xepHang]);

  /** Rời tài khoản ở phía máy (không gọi máy chủ). */
  const roiCucBo = useCallback(() => {
    owner.current = null;
    authenticated.current = false;
    queue.current = [];
    chuaLuu.current.clear();
    banServer.current = null;
    daAp.current = null;
    version.current = undefined;
    datKet(null);
    datLaiCho();
    setChu(null);
    setPending(0);
    setUser(null);
    setLoi(null);
    setStatus('chua-dang-nhap');
  }, [datKet, datLaiCho]);

  const dangXuat = useCallback(async (xoaDuLieuMay = false) => {
    stopSessionWork();
    // Do not report success if the server session could not be revoked.
    try { await api.dangXuat(); }
    catch (err) {
      // Phiên đã hết hạn sẵn thì chẳng còn gì để thu hồi - coi như đã ra.
      if (!(err instanceof ApiError && err.loai === 'phien')) { await connect(); throw err; }
    }
    const u = owner.current;
    try {
      if (u && xoaDuLieuMay) {
        for (const k of khoaTheoTienTo(OUTBOX + u.id + '/', OUTBOX_HONG + u.id + '/')) localStorage.removeItem(k);
      }
      localStorage.removeItem(LAST_USER);
      localStorage.removeItem(VERIFIED);
    } catch (err) { storageError(err); }
    apply.current((d) => (xoaDuLieuMay
      ? { ...emptyData(), settings: { ...DEFAULT_SETTINGS, theme: d.settings.theme } }
      : hoSoChayMotMinh(d)));
    roiCucBo();
  }, [connect, roiCucBo, stopSessionWork, storageError]);

  const kiemTraMoi = useCallback(async () => {
    if (!authenticated.current || flushing.current !== null) return;
    if (Date.now() < hoan.current.luc) return;
    mergeQueue();
    if (queue.current.length) { await day(); return; }
    const generation = epoch.current;
    flushing.current = generation;
    try {
      await load(generation);
      if (generation === epoch.current) { datLaiCho(); setLoi(null); setStatus('da-noi'); }
    } catch (err) {
      if (generation === epoch.current) baoLoi(err);
    } finally { if (flushing.current === generation) flushing.current = null; }
  }, [baoLoi, datLaiCho, day, load, mergeQueue]);

  const taiLai = useCallback(async () => {
    // Người dùng tự bấm thì bỏ qua giờ lùi.
    datLaiCho();
    if (!authenticated.current) { await connect(); return; }
    await kiemTraMoi();
  }, [connect, datLaiCho, kiemTraMoi]);

  const nhapLenServer = useCallback(async (data: AppData) => {
    const { verified: _bo, ...con } = data;
    gui('importLocalData', { data: con });
    await day();
  }, [gui, day]);

  const xuLyLenhKet = useCallback(async (cach: 'bo' | 'gui-lai') => {
    const k = ketRef.current;
    const u = owner.current;
    datKet(null);
    if (!k || !u) return;
    const item = queue.current.find((x) => x.requestId === k.requestId);
    if (item && cach === 'bo') {
      const kem = boCaChuoi(u.id, item);
      notify.current?.(`Đã bỏ thao tác “${k.ten}”${kem ? ` cùng ${kem} thao tác phụ thuộc` : ''}. Hồ sơ lấy lại theo máy chủ.`, 'warn');
    } else if (item) {
      // Gửi lại theo ngày hôm nay: lệnh ấy chưa từng được nhận (máy chủ chỉ
      // giữ biên nhận của lệnh đã nhận), nên đổi ngày không đụng vào biên nhận nào.
      if (k.loai === 'ngay-cu') {
        item.today = todayKey();
        // Phiên bế quan mang giờ thật của nó, mà giờ ấy đã quá xa để máy chủ
        // nhận (chốt đồng hồ). Người dùng đã chọn gửi lại "theo hôm nay" thì
        // bỏ giờ cũ đi - máy chủ ghi phiên như vừa kết thúc, đúng như trước.
        if (item.name === 'logSession') {
          const { startedAt: _bo, endedAt: _bo2, ...con } = item.args;
          item.args = con;
        }
      }
      item.loi5xx = 0;
      luuItem(u.id, item);
    }
    datLaiCho();
    if (!authenticated.current) { await connect(); return; }
    if (queue.current.length) { await day(); return; }
    const generation = epoch.current;
    flushing.current = generation;
    try {
      await load(generation, true);
      if (generation === epoch.current) { apBan(true); setLoi(null); setStatus('da-noi'); }
    } catch (err) {
      if (generation === epoch.current) baoLoi(err);
    } finally { if (flushing.current === generation) flushing.current = null; }
  }, [apBan, baoLoi, boCaChuoi, connect, datKet, datLaiCho, day, load, luuItem]);

  useEffect(() => {
    thuLaiRef.current = () => {
      if (authenticated.current) void kiemTraMoi();
      else void connect();
    };
  }, [connect, kiemTraMoi]);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void connect(); });
    const online = () => {
      // Có mạng lại thì thử ngay, không đợi hết giờ lùi.
      datLaiCho();
      thuLaiRef.current();
    };
    const nhin = () => {
      if (document.visibilityState !== 'visible') return;
      if (authenticated.current) void kiemTraMoi();
      else if (Date.now() >= hoan.current.luc) void connect();
    };
    /*
     * Tab khác cùng trình duyệt vừa đổi hàng đợi hay đổi tài khoản.
     *
     * Hàng đợi dùng chung ổ đĩa nên đọc lại là đủ biết còn bao nhiêu lệnh. Tab
     * kia gửi xong (khoá bị xoá) thì hỏi máy chủ một câu rẻ để lấy bản mới.
     */
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === LAST_USER) {
        const u = lastUser();
        if ((u?.id ?? null) === (owner.current?.id ?? null)) return;
        // Tab kia đăng xuất thì ở đây cũng rời tài khoản; bản hồ sơ nó để lại
        // đi theo sự kiện của khoá hồ sơ chính (AppStore nghe khoá ấy).
        if (!u) { stopSessionWork(); roiCucBo(); }
        else void connect();
        return;
      }
      const u = owner.current;
      if (!u || !e.key.startsWith(OUTBOX + u.id + '/')) return;
      mergeQueue();
      if (e.newValue !== null) { if (authenticated.current) void day(); return; }
      if (queue.current.length) return;
      if (henHoi.current !== undefined) window.clearTimeout(henHoi.current);
      henHoi.current = window.setTimeout(() => { henHoi.current = undefined; void kiemTraMoi(); }, 400);
    };
    window.addEventListener('online', online);
    window.addEventListener('focus', nhin);
    document.addEventListener('visibilitychange', nhin);
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(nhin, NHIP_HOI);
    return () => {
      cancelled = true;
      stopSessionWork();
      huyHen();
      if (henHoi.current !== undefined) window.clearTimeout(henHoi.current);
      window.clearInterval(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('focus', nhin);
      document.removeEventListener('visibilitychange', nhin);
      window.removeEventListener('storage', onStorage);
    };
  }, [connect, datLaiCho, day, huyHen, kiemTraMoi, mergeQueue, roiCucBo, stopSessionWork]);

  // Một đối tượng ổn định: AppStore đưa nó vào context, đổi danh tính mỗi lần
  // vẽ là cả cây app vẽ lại theo.
  return useMemo<ServerSync>(() => ({
    status, user, chu, pending, loi, ket, dangNhap, dangKy, dangXuat, nhapLenServer, taiLai, kiemTraMoi,
    gui, xuLyLenhKet, laTrongTai: !!chu,
  }), [status, user, chu, pending, loi, ket, dangNhap, dangKy, dangXuat, nhapLenServer, taiLai, kiemTraMoi,
    gui, xuLyLenhKet]);
}
