import { todayKey } from './date';
import { DEFAULT_SETTINGS } from './storage';
import type { AppData, FocusSession, Goal, Task } from '../types';
import type { LedgerEntry } from './integrity';

/**
 * Nói chuyện với server trọng tài (`my-task-api`).
 *
 * Web vẫn tự tính mọi thứ để bấm cái là thấy ngay và để dùng được lúc mất mạng.
 * Nhưng khi đã đăng nhập thì **server mới là bên quyết định**: mỗi hành động
 * được gửi lên dưới dạng một lệnh, server chạy luật của nó rồi trả về trạng thái
 * thật, và web lấy đó làm chuẩn. Phần tính ở máy chỉ là dự đoán để đỡ phải chờ.
 *
 * Không dùng thư viện nào: cả tệp này chỉ là `fetch` với `credentials: include`.
 */

const RAW = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

/**
 * Gốc để ghép đường dẫn API.
 *
 * `same-origin` nghĩa là **API nằm cùng nguồn với web** - đây là cách chạy
 * thật: server phục vụ cả web lẫn API nên trình duyệt chỉ thấy một địa chỉ.
 * Lúc ấy gốc phải là chuỗi rỗng để `fetch('/lenh')` đi đúng chỗ.
 *
 * Vì sao là chữ `same-origin` chứ không phải dấu `/`: trên Windows, Git Bash
 * tự đổi tham số trông giống đường dẫn Unix thành đường dẫn Windows, nên
 * `VITE_API_URL=/ npm run build` nung thẳng `C:/Program Files/Git` vào bản
 * build, và web đi gọi `file:///C:/Program Files/Git/auth/toi`. Một chữ không
 * giống đường dẫn thì không shell nào đụng vào. Vẫn nhận `/` cho ai đặt trong
 * tệp `.env`, nơi không có shell nào xen vào.
 */
const BASE = !RAW || RAW === '/' || RAW === 'same-origin' ? '' : RAW.replace(/\/+$/, '');

/**
 * Tiền tố đường dẫn API.
 *
 * Khi web và API nằm chung một tên miền (bản trên Vercel chuyển tiếp `/api/*`
 * sang project backend), mọi lời gọi phải mang tiền tố `/api` - nếu không thì
 * `/lenh` rơi vào chính trang web và trả về HTML.
 *
 * Chạy bằng server gộp ở máy thì không có tiền tố, vì ở đó Fastify phục vụ cả
 * web lẫn API ngay tại gốc.
 */
const TIEN_TO = (import.meta.env.VITE_API_PREFIX as string | undefined)?.trim() ?? '';

/**
 * Chưa khai báo `VITE_API_URL` thì mọi thứ chạy hoàn toàn ở máy, như cũ.
 *
 * Phân biệt "không khai báo" với "khai báo là `/`": cả hai đều cho `BASE` rỗng
 * nhưng ý nghĩa ngược nhau - một cái là chạy một mình, một cái là API ngay bên
 * cạnh. Bám vào `BASE` để quyết định thì bản chạy thật sẽ tưởng mình không có
 * server.
 */
export const apiEnabled = !!RAW;

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
}

export interface TomTat {
  xp: number;
  stones: number;
  realm: string;
  realmIndex: number;
  tier: number;
  ascended: boolean;
  readyForTribulation: boolean;
}

export interface StateReply {
  version: number;
  data: AppData;
  tomTat: TomTat;
  audit: { ok: boolean; findings: { code: string; severity: string; message: string }[] };
}

/**
 * Trả lời cho câu "có gì mới không".
 *
 * Gửi kèm số hiệu đang giữ mà server vẫn ở đúng số hiệu ấy thì nó không gửi hồ
 * sơ về nữa - chỉ mấy con số đủ để máy tự đối chiếu bản đang giữ.
 */
export interface KhongDoiReply {
  version: number;
  khongDoi: true;
  kiemTra: KiemTra;
  /**
   * Tổng tu vi đã vào sổ, do server đếm.
   *
   * Bắt buộc chứ không phải tuỳ chọn. Trường `verified` chỉ sống trong bộ nhớ -
   * `loadData` dựng lại hồ sơ từng trường một nên nạp lại trang là mất - mà máy
   * khách cũng không tự tính lại được, vì sổ ghi ký bằng khoá nằm trên server.
   * Thiếu nó thì đi nhánh "không có gì đổi" xong tu vi hiện 0.
   */
  verified: NonNullable<AppData['verified']>;
}

export type TrangThaiReply = StateReply | KhongDoiReply;

export const laKhongDoi = (r: TrangThaiReply): r is KhongDoiReply =>
  (r as KhongDoiReply).khongDoi === true;

/** Thêm/sửa/xoá trong một danh sách có khoá `id`. */
export interface DanhSachDoi<T> {
  them?: T[];
  sua?: T[];
  xoa?: string[];
}

/**
 * Phần đã đổi sau một lệnh.
 *
 * Server không gửi lại cả hồ sơ nữa - tick xong một việc mà tải về ba năm lịch
 * sử thì càng dùng lâu càng nặng, trong khi phần nặng thêm ấy lần nào cũng y
 * hệt lần trước.
 */
export interface ThayDoi {
  tasks?: DanhSachDoi<Task>;
  goals?: DanhSachDoi<Goal>;
  sessions?: DanhSachDoi<FocusSession>;
  /** Sổ ghi: thường nối thêm, nhưng lúc bị ký lại toàn bộ thì gửi `tatCa` */
  ledger?: { them: LedgerEntry[] } | { tatCa: LedgerEntry[] };
  /** Mọi trường còn lại đã đổi, gửi nguyên. `null` nghĩa là trường ấy đã bị gỡ. */
  truong?: { [K in keyof AppData]?: AppData[K] | null };
}

/** Mấy con số để client tự kiểm xem vá xong có khớp với server không. */
export interface KiemTra {
  tasks: number;
  goals: number;
  sessions: number;
  ledger: number;
  taskXp: number;
}

export interface CommandReply {
  replayed?: boolean;
  ok: true;
  version: number;
  thayDoi: ThayDoi;
  kiemTra: KiemTra;
  tomTat: TomTat;
  note?: string;
  tone?: 'ok' | 'warn';
  result?: unknown;
  celebrations?: unknown[];
}

/**
 * Lỗi thuộc loại nào - quyết định lớp đồng bộ làm gì với lệnh đang gửi.
 *
 *  - `mang`: không tới được máy chủ. Giữ lệnh, thử lại sau.
 *  - `may-chu`: 5xx. Giữ lệnh, lùi dần rồi thử lại.
 *  - `qua-tai`: 429. Như trên, nhưng nghe theo `Retry-After`.
 *  - `phien`: 401. Giữ lệnh, chờ đăng nhập lại.
 *  - `xung-dot`: 409. Tải lại rồi gửi lại đúng lệnh ấy.
 *  - `tu-choi`: 422 kèm mã luật. Chỉ lệnh này bị bỏ.
 *  - `lech-ngay`: `bad-today`. Ngày ghi trên lệnh quá xa giờ máy chủ.
 *  - `khong-tuong-thich`: 400/404/405/413/415, hay trả về không phải JSON.
 *    Máy chủ và web đang nói hai thứ tiếng - KHÔNG được bỏ lệnh, vì lỗi nằm ở
 *    cấu hình hoặc phiên bản chứ không phải ở việc người dùng đã làm.
 */
export type LoaiLoi =
  | 'mang'
  | 'may-chu'
  | 'qua-tai'
  | 'phien'
  | 'xung-dot'
  | 'tu-choi'
  | 'lech-ngay'
  | 'khong-tuong-thich';

/** Lỗi có mã, để chỗ gọi phân biệt được "sai luật" với "mất mạng". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  /** Số hiệu trạng thái server đang giữ, có khi bị 409 */
  readonly version: number | undefined;
  /** Server bảo chờ bao lâu (`Retry-After`), tính bằng mili giây */
  readonly retryAfterMs: number | undefined;

  constructor(status: number, message: string, code?: string, version?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.version = version;
    this.retryAfterMs = retryAfterMs;
  }

  /** Mất mạng, server tắt, DNS hỏng... - khác hẳn với "server bảo không được". */
  get offline(): boolean {
    return this.status === 0;
  }

  get loai(): LoaiLoi {
    const s = this.status;
    if (s === 0) return 'mang';
    if (this.code === 'bad-today') return 'lech-ngay';
    if (s === 401) return 'phien';
    if (s === 409) return 'xung-dot';
    if (s === 429) return 'qua-tai';
    if (s >= 500) return 'may-chu';
    // Hết giờ chờ ở giữa đường (proxy, cân tải) thì cũng chỉ là chuyện tạm thời.
    if (s === 408) return 'mang';
    if (s === 422) return 'tu-choi';
    return 'khong-tuong-thich';
  }
}

/**
 * Câu lỗi chung chung mà Fastify hay proxy tự điền vào `error`.
 *
 * Gặp mấy câu này thì `message` mới là chỗ có nội dung thật - "Bad Request"
 * thì chẳng nói được với người dùng điều gì.
 */
const CAU_CHUNG = /^(bad request|not found|method not allowed|unsupported media type|payload too large|request entity too large|internal server error|service unavailable|bad gateway|gateway timeout|too many requests|unprocessable entity|conflict|unauthorized|forbidden)$/i;

/** `Retry-After` có thể là số giây hoặc một mốc giờ HTTP. */
function docRetryAfter(res: Response): number | undefined {
  const v = res.headers.get('retry-after');
  if (!v) return undefined;
  const giay = Number(v);
  if (Number.isFinite(giay)) return Math.max(0, giay * 1000);
  const luc = Date.parse(v);
  return Number.isNaN(luc) ? undefined : Math.max(0, luc - Date.now());
}

const laJson = (res: Response) => /\bjson\b/i.test(res.headers.get('content-type') ?? '');

async function goi<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + TIEN_TO + path, {
      ...init,
      // Thẻ phiên nằm trong cookie httpOnly nên bắt buộc phải gửi kèm.
      signal: AbortSignal.timeout(20_000),
      credentials: 'include',
      // Chỉ khai `content-type` khi thật sự có thân. Fastify gặp
      // `application/json` với thân rỗng (đăng xuất) là trả 400 ngay.
      headers: { ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Không nối được tới máy chủ');
  }

  /*
   * Trả về không phải JSON - thường là trang HTML của chính web vì sai tiền tố
   * API, hoặc trang lỗi của proxy. Coi là KHÔNG TƯƠNG THÍCH chứ không để nó nổ
   * thành `TypeError` ở chỗ đọc `res.version` rồi bị hiểu nhầm là mất mạng.
   */
  if (res.status !== 204 && !laJson(res)) {
    if (res.ok) {
      throw new ApiError(res.status, `Máy chủ trả về dữ liệu không phải JSON (${res.headers.get('content-type') || 'không rõ loại'}) - có thể sai địa chỉ API`, 'not-json');
    }
    // 5xx/429 bằng HTML (trang lỗi của proxy) vẫn là lỗi tạm thời như thường.
    throw new ApiError(res.status, `Máy chủ trả về ${res.status}`, undefined, undefined, docRetryAfter(res));
  }

  let body: (Partial<CommandReply> & { error?: string; message?: string; code?: string; chiTiet?: string; version?: number }) | null = null;
  if (res.status !== 204) {
    try {
      body = await res.json();
    } catch {
      if (res.ok) throw new ApiError(res.status, 'Máy chủ trả về JSON hỏng', 'not-json');
    }
  }

  if (!res.ok) {
    const rieng = body?.error && !CAU_CHUNG.test(body.error.trim()) ? body.error : undefined;
    const chinh = rieng ?? body?.message ?? body?.error;
    const phu = body?.chiTiet && body.chiTiet !== chinh ? body.chiTiet : undefined;
    throw new ApiError(
      res.status,
      [chinh, phu].filter(Boolean).join(': ') || `Máy chủ trả về ${res.status}`,
      body?.code,
      body?.version,
      docRetryAfter(res),
    );
  }
  if (res.status !== 204 && (body === null || typeof body !== 'object')) {
    throw new ApiError(res.status, 'Máy chủ trả về dữ liệu không đúng dạng', 'not-json');
  }
  return body as T;
}

export const api = {
  dangKy: (email: string, password: string, displayName?: string) =>
    goi<{ user: ApiUser }>('/auth/dang-ky', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),

  dangNhap: (email: string, password: string) =>
    goi<{ user: ApiUser }>('/auth/dang-nhap', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  dangXuat: () => goi<{ ok: boolean }>('/auth/dang-xuat', { method: 'POST' }),

  toiLaAi: () => goi<{ user: ApiUser }>('/auth/toi'),

  /**
   * Trạng thái hiện tại.
   *
   * Biết số hiệu mình đang giữ thì truyền vào: server so trước, còn đúng số ấy
   * thì trả về `khongDoi` kèm mấy con số thay vì cả hồ sơ. Không truyền gì thì
   * luôn nhận bản đầy đủ.
   */
  trangThai: (version?: number, accountId?: string) =>
    goi<TrangThaiReply>(
      `/trang-thai?today=${todayKey()}${version === undefined ? '' : `&version=${version}`}${accountId ? `&accountId=${encodeURIComponent(accountId)}` : ''}`,
    ),

  /**
   * Gửi một lệnh.
   *
   * `today` là ngày theo lịch của MÁY NGƯỜI DÙNG. Server không biết múi giờ nên
   * phải nhận từ đây, và nó có chặn ngày lệch quá xa.
   */
  lenh: (name: string, args: Record<string, unknown>, today: string, version?: number, requestId?: string, accountId?: string) =>
    goi<CommandReply>('/lenh', {
      method: 'POST',
      body: JSON.stringify({ name, args, today, version, requestId, accountId }),
    }),
};

/**
 * Gỡ các khoá mang giá trị `null` ở một tầng của một object thuần.
 *
 * Chỉ một tầng là đủ: các trường tuỳ chọn có thể bị gỡ (`goalId`, `deadline`,
 * `activeBeastId`, từng mục trong `settings`...) đều nằm ngay tầng đầu của bản
 * ghi chứa chúng. Mảng và giá trị nguyên thuỷ đi qua nguyên vẹn.
 */
export function boNull<T>(x: T): T {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return x;
  if (!Object.values(x).includes(null)) return x;
  return Object.fromEntries(Object.entries(x).filter(([, v]) => v !== null)) as T;
}

/** Hồ sơ đầy đủ từ server cũng theo đúng quy ước `null` là không có. */
export function boNullHoSo(d: AppData): AppData {
  const ra = boNull(d);
  return {
    ...ra,
    settings: { ...DEFAULT_SETTINGS, ...boNull(ra.settings) },
    tasks: ra.tasks.map(boNull),
    goals: ra.goals.map(boNull),
    sessions: ra.sessions.map(boNull),
  };
}

/**
 * Vá phần thay đổi vào hồ sơ đang giữ.
 *
 * Dựng lại bằng `Map` theo `id` thay vì `map`/`filter` chồng nhau: một lệnh có
 * thể vừa thêm vừa sửa vừa xoá, mà làm ba lượt riêng thì thứ tự hoá ra lại quan
 * trọng, và sai thứ tự thì hỏng âm thầm.
 *
 * Thứ tự ở đây có chủ ý: sửa trước, thêm sau, xoá cuối. Nhờ vậy một id vừa nằm
 * trong `them` vừa nằm trong `xoa` thì kết quả là bị xoá - giống hệt cách server
 * đã tính ra bản vá ấy.
 */
export function apThayDoi(goc: AppData, doi: ThayDoi): AppData {
  const ra: AppData = { ...goc };
  // `null` trong bản vá nghĩa là "trường này đã bị gỡ" - JSON không chở được
  // `undefined`, nên thiếu quy ước này thì gỡ sứ mệnh hay linh thú đang theo
  // ở server xong, bản ở máy vẫn giữ nguyên cái cũ.
  for (const [khoa, giaTri] of Object.entries(doi.truong ?? {})) {
    if (giaTri === null) delete (ra as unknown as Record<string, unknown>)[khoa];
    else (ra as unknown as Record<string, unknown>)[khoa] = boNull(giaTri);
  }
  // Cài đặt thì không có mục nào được phép vắng: mục bị gỡ quay về mặc định.
  if (doi.truong?.settings) ra.settings = { ...DEFAULT_SETTINGS, ...ra.settings };

  const vaDanhSach = <T extends { id: string }>(cu: T[], d?: DanhSachDoi<T>): T[] => {
    if (!d) return cu;
    const theo = new Map(cu.map((x) => [x.id, x]));
    for (const x of d.sua ?? []) theo.set(x.id, boNull(x));
    for (const x of d.them ?? []) theo.set(x.id, boNull(x));
    for (const id of d.xoa ?? []) theo.delete(id);
    return [...theo.values()];
  };

  ra.tasks = vaDanhSach(goc.tasks, doi.tasks);
  ra.goals = vaDanhSach(goc.goals, doi.goals);
  ra.sessions = vaDanhSach(goc.sessions, doi.sessions);

  if (doi.ledger) {
    ra.ledger = 'tatCa' in doi.ledger ? doi.ledger.tatCa : [...goc.ledger, ...doi.ledger.them];
  }
  return ra;
}
