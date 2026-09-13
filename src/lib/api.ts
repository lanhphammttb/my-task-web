import type { AppData } from '../types';

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

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Chưa cấu hình địa chỉ server thì mọi thứ chạy hoàn toàn ở máy, như cũ. */
export const apiEnabled = BASE !== '';

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

export interface CommandReply {
  ok: true;
  version: number;
  data: AppData;
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
    res = await fetch(BASE + path, {
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
