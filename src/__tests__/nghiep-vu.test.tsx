import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../store/AppStore';
import { emptyData } from '../lib/storage';
import { expeditionStateOf, missionStateOf, stoneBreakdown, xpBreakdown } from '../lib/economy';
import { addDays, dateKey, nextOccurrence, todayKey } from '../lib/date';
import { chestsOfDay, doneOnDay } from '../lib/chest';
import { checkSessionTiming, rewardsSession, sessionStones } from '../lib/validation';
import { appendEntry, rebuildLedger } from '../lib/integrity';
import { boDau, khopTimKiem, timNhiemVu } from '../lib/timKiem';
import { ELEMENTS } from '../lib/spirit';
import { CHEST_GRADES } from '../lib/chest';
import type { AppData, Task } from '../types';

/**
 * Hồi quy cho các lỗi nghiệp vụ QA dựng lại được (xem báo cáo đi kèm). Mỗi
 * khối ứng với một lỗi: nếu một ngày ai đó "tối ưu" lại mà mở lại kẽ hở, test
 * ở đây đỏ trước khi người dùng kịp khai thác.
 */

const KEY = 'my-task-planner/v1';
const at = (offset: number) => dateKey(addDays(new Date(), offset));
const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;
const mount = () => renderHook(() => useApp(), { wrapper });
function seed(over: Partial<AppData> = {}) {
  const data: AppData = { ...emptyData(), gateRealm: 9, ...over };
  localStorage.setItem(KEY, JSON.stringify(data));
}
function task(over: Partial<Task> & { id: string }): Task {
  return {
    title: over.id, note: '', date: todayKey(), priority: 'medium', status: 'todo', tags: [],
    estimateMin: 30, focusMin: 0, subtasks: [], recurrence: 'none', createdAt: new Date().toISOString(), ...over,
  };
}

beforeEach(() => localStorage.clear());

describe('lần lặp kế tiếp (lỗi 1, 2)', () => {
  it('tính từ sau cả ngày cũ lẫn hôm nay, không từ ngày cũ', () => {
    expect(nextOccurrence('2026-08-01', 'daily', '2026-09-30')).toBe('2026-10-01');
    expect(nextOccurrence('2026-09-30', 'daily', '2026-09-30')).toBe('2026-10-01');
    // Việc đặt trước cho tương lai: tính tiếp từ ngày của nó.
    expect(nextOccurrence('2026-10-05', 'daily', '2026-09-30')).toBe('2026-10-06');
    // Hằng tuần giữ đúng thứ: 23/09 là thứ Tư -> thứ Tư kế tiếp sau 30/09.
    expect(nextOccurrence('2026-09-23', 'weekly', '2026-10-01')).toBe('2026-10-07');
    expect(nextOccurrence('2026-09-23', 'weekly', '2026-09-30')).toBe('2026-10-07');
    // Thứ 2-6: sau thứ Sáu 02/10 là thứ Hai 05/10.
    expect(nextOccurrence('2026-08-03', 'weekdays', '2026-10-02')).toBe('2026-10-05');
  });

  it('hằng tháng kẹp vào cuối tháng và giữ ngày neo: 31/01 -> 28/02 -> 31/03', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-01-31', 31)).toBe('2026-02-28');
    expect(nextOccurrence('2026-02-28', 'monthly', '2026-02-28', 31)).toBe('2026-03-31');
    expect(nextOccurrence('2026-03-31', 'monthly', '2026-03-31', 31)).toBe('2026-04-30');
    // Quá hạn từ tháng một, hôm nay 30/09: lần kế là 31/10.
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-09-30', 31)).toBe('2026-10-31');
  });

  it('việc hằng ngày đặt từ hai tháng trước chỉ tick được một lần trong một lượt', () => {
    seed({ tasks: [task({ id: 'cu', date: at(-60), recurrence: 'daily', priority: 'urgent' })] });
    const r = mount();
    let n = 0;
    for (let i = 0; i < 70; i++) {
      const mo = r.result.current.data.tasks.find((t) => t.status !== 'done' && t.date <= todayKey());
      if (!mo) break;
      act(() => { r.result.current.toggleDone(mo.id); });
      n++;
    }
    expect(n).toBe(1);
    const sau = r.result.current.data.tasks.find((t) => t.status !== 'done')!;
    expect(sau.date).toBe(at(1));
  });

  it('tick việc hằng tháng ngày 31 sinh lần kế mang ngày neo', () => {
    seed({ tasks: [task({ id: 'nha', date: todayKey(), recurrence: 'monthly', recurDay: 31 })] });
    const r = mount();
    act(() => { r.result.current.toggleDone('nha'); });
    const next = r.result.current.data.tasks.find((t) => t.id !== 'nha')!;
    expect(next.recurDay).toBe(31);
    expect(next.date).toBe(nextOccurrence(todayKey(), 'monthly', todayKey(), 31));
  });
});

describe('sứ mệnh và thám hiểm đếm việc xong LẦN ĐẦU (lỗi 3)', () => {
  it('bỏ tick việc cũ, nhận sứ mệnh, tick lại: không có tiến độ', () => {
    const tasks = Array.from({ length: 25 }, (_, i) =>
      task({ id: `t${i}`, priority: 'urgent', status: 'done', completedAt: new Date(Date.now() - 3_600_000).toISOString(), completedOn: todayKey() }));
    seed({ tasks, stonesBonus: 1000 });
    const r = mount();
    for (let i = 0; i < 8; i++) act(() => { r.result.current.toggleDone(`t${i}`); });
    act(() => { r.result.current.acceptMission('quet_san'); });
    act(() => { r.result.current.startExpedition('linh_thao_coc'); });
    for (let i = 0; i < 8; i++) act(() => { r.result.current.toggleDone(`t${i}`); });
    const d = r.result.current.data;
    expect(d.tasks.filter((t) => t.id < 't8' && t.id.length === 2).every((t) => t.firstDoneAt && Date.parse(t.firstDoneAt) < Date.parse(d.mission!.acceptedAt))).toBe(true);
    expect(missionStateOf(d)!.doneTasks).toBe(0);
    expect(missionStateOf(d)!.met).toBe(false);
    expect(expeditionStateOf(d)!.done).toBe(0);
    expect(expeditionStateOf(d)!.ready).toBe(false);
  });

  it('bỏ tick không xoá firstDoneAt', () => {
    seed({ tasks: [task({ id: 'a' })] });
    const r = mount();
    act(() => { r.result.current.toggleDone('a'); });
    const lan1 = r.result.current.data.tasks[0]!.firstDoneAt;
    expect(lan1).toBeTruthy();
    act(() => { r.result.current.toggleDone('a'); });
    expect(r.result.current.data.tasks[0]!.firstDoneAt).toBe(lan1);
  });
});

describe('việc đã xong khoá ngày và ưu tiên; hòm đếm theo ngày xong (lỗi 4, 9)', () => {
  it('dời việc đã xong bị chặn, hòm không mở được bằng việc cũ', () => {
    const cu = at(-10);
    const tasks = Array.from({ length: 5 }, (_, i) =>
      task({ id: `o${i}`, date: cu, status: 'done', completedAt: `${cu}T03:00:00.000Z`, completedOn: cu }));
    seed({ tasks });
    const r = mount();
    for (const t of tasks) act(() => { expect(r.result.current.moveTask(t.id, todayKey())).toBe(false); });
    expect(r.result.current.data.tasks.every((t) => t.date === cu)).toBe(true);
    expect(r.result.current.openChest('first')).toBeNull();
    expect(r.result.current.openChest('five')).toBeNull();
  });

  it('hòm đếm việc xong trong ngày theo completedOn, không theo ngày lên lịch', () => {
    const today = todayKey();
    const hom = at(-3);
    const tasks = [
      // Lên lịch hôm nay nhưng đã xong từ hôm trước (hồ sơ cũ từng dời được): không tính.
      task({ id: 'a', date: today, status: 'done', completedOn: hom, completedAt: `${hom}T03:00:00.000Z` }),
      // Việc quá hạn làm xong hôm nay: tính cho hôm nay.
      task({ id: 'b', date: hom, status: 'done', completedOn: today, completedAt: new Date().toISOString() }),
    ];
    expect(doneOnDay(tasks, today)).toBe(1);
    const list = chestsOfDay({ tasks, sessions: [], chestsOpened: [] }, today);
    expect(list.find((c) => c.rule.id === 'first')!.earned).toBe(true);
  });

  it('nâng ưu tiên sau khi tick không nhân tu vi', () => {
    seed({ tasks: [task({ id: 'x', priority: 'low' })] });
    const r = mount();
    act(() => { r.result.current.toggleDone('x'); });
    const truoc = xpBreakdown(r.result.current.data).base;
    act(() => { expect(r.result.current.updateTask('x', { priority: 'urgent' })).toBe(false); });
    expect(r.result.current.data.tasks[0]!.priority).toBe('low');
    expect(xpBreakdown(r.result.current.data).base).toBe(truoc);
    expect(r.result.current.audit.ok).toBe(true);
  });
});

describe('phiên bế quan (lỗi 6, 8)', () => {
  it('ghi startedAt là lúc BẮT ĐẦU, không bật chip "Sổ lệch" ngay sau phiên', () => {
    seed();
    const r = mount();
    act(() => { r.result.current.logSession(25); });
    const s = r.result.current.data.sessions[0]!;
    expect(Date.now() - Date.parse(s.startedAt)).toBeGreaterThanOrEqual(25 * 60_000 - 1000);
    expect(r.result.current.audit.findings.map((f) => f.code)).not.toContain('session-impossible');
  });

  it('phiên dưới 5 phút không có đá, dưới 15 phút không gieo kỳ ngộ', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      seed();
      const r = mount();
      act(() => { r.result.current.logSession(3); });
      expect(r.result.current.encounter).toBeNull();
      expect(stoneBreakdown(r.result.current.data).fromSessions).toBe(0);
      act(() => { r.result.current.logSession(5); });
      expect(r.result.current.encounter).toBeNull();
      // Đá của phiên 5 phút tuỳ mốc đổi luật (`KINH_TE_MOI_TU`): trước mốc 2 viên, sau mốc 0.
      const five = r.result.current.data.sessions.find((s) => s.minutes === 5)!;
      expect(stoneBreakdown(r.result.current.data).fromSessions).toBe(sessionStones(5, five.startedAt));
      act(() => { r.result.current.logSession(15); });
      expect(r.result.current.encounter).not.toBeNull();
    } finally {
      spy.mockRestore();
    }
    expect(rewardsSession(4)).toBe(false);
  });

  it('chốt đồng hồ: chồng giờ, ở tương lai, quá cũ đều bị chặn; nối tiếp thì qua', () => {
    const now = Date.parse('2026-09-30T10:00:00.000Z');
    const s1 = { startedAt: new Date(now - 240 * 60_000).toISOString(), minutes: 240 };
    // Sáu phiên 240 phút trong một giây: phiên thứ hai chồng lên phiên đầu.
    expect(checkSessionTiming(240, now + 100, [s1], now + 100)?.code).toBe('session-overlap');
    expect(checkSessionTiming(25, now + 3 * 60_000, [], now)?.code).toBe('session-future');
    expect(checkSessionTiming(25, now - 31 * 3_600_000, [], now)?.code).toBe('session-too-old');
    // Phiên gửi muộn mang giờ thật, nằm trước phiên đã ghi: hợp lệ.
    expect(checkSessionTiming(25, now - 240 * 60_000, [s1], now)).toBeNull();
    expect(checkSessionTiming(25, now + 25 * 60_000, [s1], now + 25 * 60_000)).toBeNull();
  });
});

describe('chợ chỉ bán đan hạ phẩm (lỗi 7)', () => {
  it('mua trung/thượng phẩm bị chặn', () => {
    seed({ stonesBonus: 5000 });
    const r = mount();
    let a = true, b = true, c = false;
    act(() => { a = r.result.current.buyPill('trung'); b = r.result.current.buyPill('thuong'); c = r.result.current.buyPill('ha'); });
    expect([a, b, c]).toEqual([false, false, true]);
    expect(r.result.current.data.pills).toEqual({ ha: 1, trung: 0, thuong: 0 });
  });
});

describe('kỳ ngộ khi chạy một mình (lỗi 5 - nhánh cũ giữ nguyên)', () => {
  it('bốc ở máy, cộng ngay và trả kết quả', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      seed();
      const r = mount();
      act(() => { r.result.current.logSession(25); });
      expect(r.result.current.encounter).not.toBeNull();
      let o: unknown;
      act(() => { o = r.result.current.resolveEncounter(0); });
      expect(o).toMatchObject({ msg: expect.any(String) });
      expect(r.result.current.encounterResult).toBe(o);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('xoá có hoàn tác (lỗi 11)', () => {
  it('chạy một mình: hoàn tác trả lại việc và bản ghi sổ', async () => {
    const { toast } = await import('sonner');
    const info = vi.spyOn(toast, 'info');
    seed({ tasks: [task({ id: 'x' })] });
    const r = mount();
    act(() => { r.result.current.toggleDone('x'); });
    const xp = xpBreakdown(r.result.current.data).base;
    act(() => r.result.current.removeTask('x'));
    expect(r.result.current.data.tasks).toHaveLength(0);
    const action = info.mock.calls.at(-1)![1]!.action as unknown as { onClick: () => void };
    act(() => action.onClick());
    expect(r.result.current.data.tasks.map((t) => t.id)).toEqual(['x']);
    expect(xpBreakdown(r.result.current.data).base).toBe(xp);
    expect(r.result.current.audit.ok).toBe(true);
    info.mockRestore();
  });
});

describe('tìm kiếm không phân biệt dấu (lỗi 12)', () => {
  const t = task({ id: 'bc', title: 'Hoàn thành Báo Cáo quý 3', subtasks: [{ id: 's', title: 'Gửi email cho Đức', done: false }] });
  it('bỏ dấu, đ -> d, không phân biệt hoa thường', () => {
    expect(boDau('Đường ĐI khó')).toBe('duong di kho');
    expect(khopTimKiem(t, 'bao cao')).toBe(true);
    expect(khopTimKiem(t, 'BÁO CÁO')).toBe(true);
    expect(khopTimKiem(t, 'quy bao')).toBe(true);
    expect(khopTimKiem(t, 'bao cao nam')).toBe(false);
  });
  it('tìm cả trong tên bước nhỏ', () => {
    expect(khopTimKiem(t, 'duc')).toBe(true);
    expect(timNhiemVu([t, task({ id: 'khac', title: 'Đi chợ' })], 'email')).toEqual([t]);
    expect(timNhiemVu([t], '   ')).toEqual([t]);
  });
});

describe('câu chữ khớp với luật (lỗi 13)', () => {
  it('hòm kim và hệ Mộc mô tả đúng điều kiện thật', () => {
    expect(CHEST_GRADES.kim.note).not.toMatch(/cả tháng/i);
    expect(ELEMENTS.moc.perkNote).toMatch(/chuỗi hiện tại/);
  });
});

describe('sổ ghi vẫn liền khi dựng lại', () => {
  it('appendEntry với mốc cũ vẫn tạo chuỗi hợp lệ', () => {
    const l = rebuildLedger({ tasks: [], sessions: [] });
    expect(appendEntry(l, 'task', 'x', 20, '2020-01-01T00:00:00.000Z')).toHaveLength(1);
  });
});
