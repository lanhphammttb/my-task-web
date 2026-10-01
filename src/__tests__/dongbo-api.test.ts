import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apThayDoi, boNullHoSo } from '../lib/api';
import { LENH, gioiHanNhiemVu, kiemGioiHanNhiemVu, tachPhuThuoc } from '../store/lenh';
import { emptyData } from '../lib/storage';
import type { AppData, Task } from '../types';

/**
 * Tầng nói chuyện với máy chủ: phân loại lỗi, quy ước `null` là gỡ, và giới hạn
 * độ dài - ba chỗ mà sai một ly là hàng đợi hoặc bị vứt oan, hoặc kẹt mãi.
 */

const traLoi = (status: number, body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

afterEach(() => vi.unstubAllGlobals());

describe('gọi máy chủ', () => {
  it('chỉ khai content-type khi thật sự có thân (đăng xuất không có thân)', async () => {
    const f = vi.fn(async () => traLoi(200, { ok: true }));
    vi.stubGlobal('fetch', f);
    await api.dangXuat();
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toEqual({});
    await api.dangNhap('a@b.c', 'x');
    const init2 = (f.mock.calls[1] as unknown as [string, RequestInit])[1];
    expect(init2.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('trang HTML trả 200 là không tương thích, không phải TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => traLoi(200, '<!doctype html><html></html>', { 'content-type': 'text/html' })));
    const err = await api.trangThai().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).loai).toBe('khong-tuong-thich');
    expect((err as ApiError).message).toContain('không phải JSON');
  });

  it('lấy `message` khi `error` chỉ là câu chung chung như "Bad Request"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => traLoi(400, { statusCode: 400, code: 'FST_ERR_VALIDATION', error: 'Bad Request', message: 'body/args must be object' })));
    const err = (await api.lenh('addTask', {}, '2026-01-01').catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe('body/args must be object');
    expect(err.loai).toBe('khong-tuong-thich');
  });

  it('đọc Retry-After của 429', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => traLoi(429, { error: 'Chậm lại' }, { 'content-type': 'application/json', 'retry-after': '120' })));
    const err = (await api.trangThai().catch((e: unknown) => e)) as ApiError;
    expect(err.loai).toBe('qua-tai');
    expect(err.retryAfterMs).toBe(120_000);
  });

  it.each([
    [0, undefined, 'mang'],
    [500, undefined, 'may-chu'],
    [503, undefined, 'may-chu'],
    [429, undefined, 'qua-tai'],
    [401, undefined, 'phien'],
    [409, 'version-conflict', 'xung-dot'],
    [422, 'blocked', 'tu-choi'],
    [422, 'bad-today', 'lech-ngay'],
    [400, 'bad-today', 'lech-ngay'],
    [400, 'bad-request', 'khong-tuong-thich'],
    [400, 'bad-json', 'khong-tuong-thich'],
    [404, undefined, 'khong-tuong-thich'],
    [405, undefined, 'khong-tuong-thich'],
    [413, 'too-large', 'khong-tuong-thich'],
    [415, undefined, 'khong-tuong-thich'],
  ] as const)('phân loại %i %s thành %s', (status, code, loai) => {
    expect(new ApiError(status, 'x', code).loai).toBe(loai);
  });
});

describe('null nghĩa là gỡ', () => {
  it('bản vá mang null gỡ đúng trường, kể cả sau một vòng JSON', () => {
    const goc: AppData = {
      ...emptyData(),
      activeBeastId: 'thanh-long',
      mission: { id: 'x', startTasks: 0, startFocus: 0, acceptedAt: '', dueAt: '', stake: 1 } as unknown as AppData['mission'],
      tasks: [{ id: 't1', title: 'a', note: '', date: '2026-01-01', priority: 'medium', status: 'todo', tags: [], goalId: 'g1',
        deadline: '2026-01-01T10:00:00.000Z', estimateMin: 30, focusMin: 0, subtasks: [], recurrence: 'none', createdAt: '' } as Task],
    };
    const doi = JSON.parse(JSON.stringify({
      truong: { activeBeastId: null, mission: null, settings: { ...goc.settings, daoName: null } },
      tasks: { sua: [{ ...goc.tasks[0], goalId: null, deadline: null }] },
    }));
    const ra = apThayDoi(goc, doi);
    expect('activeBeastId' in ra).toBe(false);
    expect('mission' in ra).toBe(false);
    expect(ra.settings.daoName).toBe('Đạo hữu'); // mục cài đặt bị gỡ quay về mặc định
    expect('goalId' in ra.tasks[0]!).toBe(false);
    expect('deadline' in ra.tasks[0]!).toBe(false);
    expect(ra.tasks[0]!.title).toBe('a');
  });

  it('hồ sơ đầy đủ từ server cũng bỏ null', () => {
    const d = boNullHoSo(JSON.parse(JSON.stringify({ ...emptyData(), activeBeastId: null, technique: null })));
    expect('activeBeastId' in d).toBe(false);
    expect('technique' in d).toBe(false);
  });

  it('xoá hạn chót / mục tiêu / ngày đích thì lệnh gửi null, sống qua JSON', () => {
    const task = JSON.parse(JSON.stringify(LENH.updateTask(undefined, 't1' as never, { deadline: undefined, goalId: undefined, startTime: undefined, title: 'x' } as never)));
    expect(task).toEqual({ id: 't1', deadline: null, goalId: null, startTime: null, title: 'x' });
    const goal = JSON.parse(JSON.stringify(LENH.updateGoal(undefined, 'g1' as never, { targetDate: undefined, title: 'y' } as never)));
    expect(goal).toEqual({ id: 'g1', targetDate: null, title: 'y' });
  });

  it('ghi phiên bế quan gửi kèm id của phiên', () => {
    const s = { id: 's1', minutes: 25, taskId: 't1', date: '2026-01-01', startedAt: '' };
    // Mốc hỏng: không gửi giờ, server tự lấy "bây giờ".
    expect(LENH.logSession(s)).toEqual({ id: 's1', minutes: 25, taskId: 't1' });
    // Mốc thật: gửi cả giờ bắt đầu lẫn kết thúc, để lệnh gửi muộn không chồng lên nhau.
    expect(LENH.logSession({ ...s, startedAt: '2026-01-01T02:00:00.000Z' })).toEqual({
      id: 's1', minutes: 25, taskId: 't1', startedAt: '2026-01-01T02:00:00.000Z', endedAt: '2026-01-01T02:25:00.000Z',
    });
    expect(LENH.logSession(null)).toBeNull();
  });
});

describe('giới hạn và lệnh phụ thuộc', () => {
  it('soát đúng các con số của lược đồ server', () => {
    const qua = kiemGioiHanNhiemVu({
      title: 'a'.repeat(201), note: 'b'.repeat(4001), tags: [...Array(21)].map((_, i) => `t${i}`).concat('x'.repeat(41)),
      subtasks: [...Array(51)].map(() => ({ title: 'c' })),
    }).map((v) => v.code);
    expect(qua).toEqual(['title-too-long', 'note-too-long', 'too-many-tags', 'tag-too-long', 'too-many-subtasks']);
    expect(kiemGioiHanNhiemVu({ title: 'a'.repeat(200), note: '', tags: ['x'.repeat(40)], subtasks: [] })).toEqual([]);
    const cat = gioiHanNhiemVu({ title: 'a'.repeat(300), tags: ['y'.repeat(50)] });
    expect(cat.title).toHaveLength(200);
    expect(cat.tags![0]).toHaveLength(40);
  });

  it('bỏ lệnh nhắm vào id chết, gỡ trường phụ ở lệnh chỉ nhắc tới nó, và lan theo bản sao', () => {
    const hang = [
      { name: 'updateTask', args: { id: 'dead', title: 'x' } },
      { name: 'duplicateTask', args: { id: 'dead', newId: 'copy' } },
      { name: 'toggleDone', args: { id: 'copy' } },
      { name: 'logSession', args: { id: 's1', minutes: 25, taskId: 'dead' } },
      { name: 'toggleDone', args: { id: 'song' } },
    ];
    const { bo, sua } = tachPhuThuoc(['dead'], hang);
    expect(bo.map((x) => x.name)).toEqual(['updateTask', 'duplicateTask', 'toggleDone']);
    expect(sua).toEqual([{ name: 'logSession', args: { id: 's1', minutes: 25 } }]);
  });
});
