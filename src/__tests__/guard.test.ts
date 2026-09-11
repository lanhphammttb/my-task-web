import { describe, expect, it } from 'vitest';
import {
  MAX_ESTIMATE_MIN, checkComplete, checkSession, checkTaskDraft, clampEstimate,
} from '../lib/validation';
import { appendEntry, auditData, dropEntries, rebuildLedger, verifiedTotals } from '../lib/integrity';
import { stoneBreakdown, xpBreakdown } from '../lib/economy';
import type { AppData, Task } from '../types';
import { emptyData } from '../lib/storage';
import { addDays, dateKey } from '../lib/date';

const at = (offset: number) => dateKey(addDays(new Date(), offset));

function task(over: Partial<Task> & { id: string }): Task {
  return {
    title: over.id,
    note: '',
    date: at(0),
    priority: 'medium',
    status: 'todo',
    tags: [],
    estimateMin: 30,
    focusMin: 0,
    subtasks: [],
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    ...over,
  };
}

/** Dựng từ `emptyData()` để thêm trường vào AppData không làm gãy test. */
function appData(over: Partial<AppData> = {}): AppData {
  return { ...emptyData(), gateRealm: 9, ...over };
}

describe('chặn hoàn thành không hợp lý', () => {
  it('không cho hoàn thành nhiệm vụ của ngày mai', () => {
    const v = checkComplete(task({ id: 'mai', date: at(1) }));
    expect(v?.level).toBe('block');
    expect(v?.code).toBe('future-task');
    expect(v?.fix).toBe('move-to-today');
  });

  it('nhiệm vụ xa hơn nữa cũng bị chặn', () => {
    expect(checkComplete(task({ id: 'x', date: at(30) }))?.level).toBe('block');
  });

  it('nhiệm vụ hôm nay thì cho hoàn thành', () => {
    expect(checkComplete(task({ id: 'nay' }))).toBeNull();
  });

  it('nhiệm vụ quá hạn của ngày cũ vẫn cho hoàn thành', () => {
    expect(checkComplete(task({ id: 'cu', date: at(-3) }))).toBeNull();
  });

  it('còn bước nhỏ chưa xong thì chỉ nhắc, không chặn', () => {
    const v = checkComplete(
      task({ id: 'b', subtasks: [{ id: 's1', title: 'a', done: false }] }),
    );
    expect(v?.level).toBe('warn');
    expect(v?.code).toBe('open-subtasks');
  });

  it('xong sau hạn chót thì nhắc là trễ', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    expect(checkComplete(task({ id: 'late', deadline: past }))?.code).toBe('late-complete');
  });
});

describe('kiểm tra bản nháp nhiệm vụ', () => {
  const base = { title: 'Việc', date: at(0), estimateMin: 30 };

  it('tên trống thì chặn', () => {
    expect(checkTaskDraft({ ...base, title: '   ' }).some((v) => v.code === 'empty-title')).toBe(true);
  });

  it('hạn chót sớm hơn ngày thực hiện thì chặn', () => {
    const issues = checkTaskDraft({ ...base, date: at(2), deadline: `${at(0)}T10:00:00` });
    expect(issues.some((v) => v.code === 'deadline-before-date' && v.level === 'block')).toBe(true);
  });

  it('thời lượng quá 24 giờ thì chặn', () => {
    const issues = checkTaskDraft({ ...base, estimateMin: MAX_ESTIMATE_MIN + 1 });
    expect(issues.some((v) => v.code === 'estimate-too-big')).toBe(true);
  });

  it('thời lượng âm thì chặn', () => {
    expect(checkTaskDraft({ ...base, estimateMin: -5 }).some((v) => v.code === 'estimate-negative')).toBe(true);
  });

  it('giờ bắt đầu muộn hơn hạn chót thì chỉ nhắc', () => {
    const issues = checkTaskDraft({
      ...base,
      startTime: '23:00',
      deadline: `${at(0)}T09:00:00`,
    });
    expect(issues.some((v) => v.code === 'start-after-deadline' && v.level === 'warn')).toBe(true);
  });

  it('bản nháp hợp lệ thì không có lỗi nào', () => {
    expect(checkTaskDraft({ ...base, deadline: `${at(0)}T18:00:00`, startTime: '09:00' })).toEqual([]);
  });

  it('clampEstimate kẹp về khoảng hợp lệ', () => {
    expect(clampEstimate(-10)).toBe(0);
    expect(clampEstimate(99999)).toBe(MAX_ESTIMATE_MIN);
    expect(clampEstimate(45.6)).toBe(46);
    expect(clampEstimate(Number.NaN)).toBe(0);
  });
});

describe('kiểm tra phiên bế quan', () => {
  it('dưới 1 phút thì chặn', () => {
    expect(checkSession(0)?.code).toBe('session-too-short');
    expect(checkSession(-5)?.code).toBe('session-too-short');
  });

  it('trên 4 giờ thì chặn', () => {
    expect(checkSession(1000)?.code).toBe('session-too-long');
  });

  it('trong khoảng hợp lý thì cho qua', () => {
    expect(checkSession(25)).toBeNull();
    expect(checkSession(240)).toBeNull();
  });
});

describe('sổ ghi chống sửa dữ liệu', () => {
  it('chuỗi băm dựng đúng thì kiểm tra sạch', () => {
    let ledger = appendEntry([], 'task', 't1', 20, '2026-09-01T08:00:00.000Z');
    ledger = appendEntry(ledger, 'session', 's1', 25, '2026-09-01T09:00:00.000Z');
    const data = appData({
      ledger,
      tasks: [task({ id: 't1', status: 'done', completedAt: '2026-09-01T08:00:00.000Z' })],
      sessions: [{ id: 's1', date: at(0), minutes: 25, startedAt: '2026-09-01T09:00:00.000Z' }],
    });
    const audit = auditData(data, new Date('2026-09-02T00:00:00.000Z'));
    expect(audit.verified).toBe(2);
    expect(audit.findings.filter((f) => f.code === 'chain-broken')).toEqual([]);
  });

  it('sửa một giá trị trong sổ thì phát hiện đứt chuỗi', () => {
    const ledger = appendEntry(appendEntry([], 'task', 't1', 20), 'task', 't2', 20);
    const tampered = ledger.map((e, i) => (i === 0 ? { ...e, value: 9999 } : e));
    const audit = auditData(appData({ ledger: tampered }));
    expect(audit.ok).toBe(false);
    expect(audit.findings.some((f) => f.code === 'chain-broken')).toBe(true);
  });

  it('thêm nhiệm vụ đã xong mà không qua sổ thì bị bắt', () => {
    const audit = auditData(
      appData({ tasks: [task({ id: 'hack', status: 'done', completedAt: new Date().toISOString() })] }),
    );
    expect(audit.ok).toBe(false);
    expect(audit.findings.some((f) => f.code === 'unledgered-tasks')).toBe(true);
  });

  it('hoàn thành ở tương lai thì bị bắt', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const t = task({ id: 'f', status: 'done', completedAt: future });
    const data = appData({ tasks: [t], ledger: rebuildLedger({ tasks: [t], sessions: [] }) });
    expect(auditData(data).findings.some((f) => f.code === 'future-completion')).toBe(true);
  });

  it('phiên bế quan dài hơn thời gian thực đã trôi qua thì bị bắt', () => {
    const sessions = [
      { id: 's', date: at(0), minutes: 240, startedAt: new Date(Date.now() - 60_000).toISOString() },
    ];
    const data = appData({ sessions, ledger: rebuildLedger({ tasks: [], sessions }) });
    expect(auditData(data).findings.some((f) => f.code === 'session-impossible')).toBe(true);
  });

  it('tu vi trong sổ lệch với nhiệm vụ thì bị bắt', () => {
    const t = task({ id: 't1', status: 'done', priority: 'urgent', completedAt: new Date().toISOString() });
    // Sổ ghi giá trị của việc ưu tiên thấp trong khi nhiệm vụ là Khẩn cấp.
    const ledger = appendEntry([], 'task', 't1', 10, t.completedAt);
    expect(auditData(appData({ tasks: [t], ledger })).findings.some((f) => f.code === 'xp-mismatch')).toBe(true);
  });

  it('bỏ bản ghi rồi móc lại thì chuỗi vẫn liền mạch', () => {
    let ledger = appendEntry([], 'task', 't1', 20);
    ledger = appendEntry(ledger, 'task', 't2', 30);
    ledger = appendEntry(ledger, 'task', 't3', 40);
    const after = dropEntries(ledger, 'task', 't2');
    expect(after).toHaveLength(2);
    expect(after.map((e) => e.seq)).toEqual([1, 2]);
    const audit = auditData(appData({ ledger: after }));
    expect(audit.verified).toBe(2);
  });

  it('rebuildLedger tạo ra sổ khớp hoàn toàn với dữ liệu', () => {
    const tasks = [
      task({ id: 'a', status: 'done', priority: 'urgent', completedAt: '2026-09-01T08:00:00.000Z' }),
      task({ id: 'b', status: 'done', completedAt: '2026-09-01T10:00:00.000Z' }),
      task({ id: 'c' }),
    ];
    const sessions = [{ id: 's1', date: at(0), minutes: 25, startedAt: '2026-09-01T09:00:00.000Z' }];
    const data = appData({ tasks, sessions, ledger: rebuildLedger({ tasks, sessions }) });
    const audit = auditData(data, new Date('2026-09-02T00:00:00.000Z'));
    expect(audit.ok).toBe(true);
    expect(audit.verified).toBe(3);
  });
});

describe('hack tài nguyên bị vô hiệu, không chỉ bị phát hiện', () => {
  const legit = task({ id: 'thuc', status: 'done', priority: 'medium', completedAt: new Date().toISOString() });

  it('nhiệm vụ hợp lệ có sổ ghi thì tính đủ tu vi', () => {
    const data = appData({ tasks: [legit], ledger: rebuildLedger({ tasks: [legit], sessions: [] }) });
    expect(xpBreakdown(data).base).toBe(20);
  });

  it('nhồi thêm nhiệm vụ đã xong vào localStorage không làm tăng tu vi', () => {
    const hacked = task({ id: 'gian-lan', status: 'done', priority: 'urgent', completedAt: new Date().toISOString() });
    const data = appData({
      tasks: [legit, hacked],
      // Sổ ghi chỉ có nhiệm vụ hợp lệ - kẻ sửa dữ liệu không ký được bản ghi mới.
      ledger: rebuildLedger({ tasks: [legit], sessions: [] }),
    });
    expect(xpBreakdown(data).base).toBe(20);
    expect(auditData(data).ok).toBe(false);
  });

  it('nhồi phiên bế quan giả không làm tăng tu vi', () => {
    const sessions = [
      { id: 'that', date: at(0), minutes: 25, startedAt: new Date(Date.now() - 30 * 60_000).toISOString() },
      { id: 'gia', date: at(0), minutes: 600, startedAt: new Date(Date.now() - 30 * 60_000).toISOString() },
    ];
    const data = appData({
      sessions,
      ledger: rebuildLedger({ tasks: [], sessions: [sessions[0]] }),
    });
    // Chỉ 25 phút được xác thực -> 25/5 = 5 tu vi.
    expect(xpBreakdown(data).base).toBe(5);
  });

  it('sửa giá trị trong sổ thì phần sau bị bỏ, tu vi tụt về phần còn tin được', () => {
    let ledger = appendEntry([], 'task', 'a', 20, '2026-09-01T08:00:00.000Z');
    ledger = appendEntry(ledger, 'task', 'b', 40, '2026-09-01T09:00:00.000Z');
    const tampered = ledger.map((e, i) => (i === 1 ? { ...e, value: 9999 } : e));
    expect(verifiedTotals({ ledger: tampered }).taskXp).toBe(20);
    expect(verifiedTotals({ ledger: tampered }).verified).toBe(1);
  });

  it('sổ ghi rỗng thì tu vi bằng 0 dù dữ liệu nói khác', () => {
    const data = appData({ tasks: [legit], ledger: [] });
    expect(xpBreakdown(data).base).toBe(0);
  });

  it('nhồi nhiệm vụ giả cũng không kiếm thêm được linh thạch', () => {
    const hacked = task({ id: 'gian-lan', status: 'done', completedAt: new Date().toISOString() });
    const clean = appData({ tasks: [legit], ledger: rebuildLedger({ tasks: [legit], sessions: [] }) });
    const dirty = appData({
      tasks: [legit, hacked],
      ledger: rebuildLedger({ tasks: [legit], sessions: [] }),
    });
    expect(stoneBreakdown(dirty).fromTasks).toBe(stoneBreakdown(clean).fromTasks);
  });
});
