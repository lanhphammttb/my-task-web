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
  /** Mọi trường còn lại đã đổi, gửi nguyên */
  truong?: Partial<AppData>;
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

/** Lỗi có mã, để chỗ gọi phân biệt được "sai luật" với "mất mạng". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  /** Số hiệu trạng thái server đang giữ, có khi bị 409 */
  readonly version: number | undefined;

  constructor(status: number, message: string, code?: string, version?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.version = version;
  }

  /** Mất mạng, server tắt, DNS hỏng... - khác hẳn với "server bảo không được". */
  get offline(): boolean {
    return this.status === 0;
  }
}

async function goi<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + TIEN_TO + path, {
      ...init,
      // Thẻ phiên nằm trong cookie httpOnly nên bắt buộc phải gửi kèm.
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Không nối được tới máy chủ');
  }

  const body = (await res.json().catch(() => null)) as
    | (Partial<CommandReply> & { error?: string; code?: string; chiTiet?: string; version?: number })
    | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? body?.chiTiet ?? `Máy chủ trả về ${res.status}`,
      body?.code,
      body?.version,
    );
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

  trangThai: () => goi<StateReply>('/trang-thai'),

  /**
   * Gửi một lệnh.
   *
   * `today` là ngày theo lịch của MÁY NGƯỜI DÙNG. Server không biết múi giờ nên
   * phải nhận từ đây, và nó có chặn ngày lệch quá xa.
   */
  lenh: (name: string, args: Record<string, unknown>, today: string, version?: number) =>
    goi<CommandReply>('/lenh', {
      method: 'POST',
      body: JSON.stringify({ name, args, today, version }),
    }),
};

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
  const ra: AppData = { ...goc, ...(doi.truong ?? {}) };

  const vaDanhSach = <T extends { id: string }>(cu: T[], d?: DanhSachDoi<T>): T[] => {
    if (!d) return cu;
    const theo = new Map(cu.map((x) => [x.id, x]));
    for (const x of d.sua ?? []) theo.set(x.id, x);
    for (const x of d.them ?? []) theo.set(x.id, x);
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
