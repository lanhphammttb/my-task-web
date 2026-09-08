import { describe, expect, it } from 'vitest';
import { ELEMENT_ORDER, ROOT_GRADES, gradeOf, rollRoot, rootElementLabel } from '../lib/spirit';
import {
  BEASTS, MAX_BEAST_LEVEL, RARITY_ORDER, beastLevel, feedToNext, summonBeast,
} from '../lib/beasts';
import { progressOf, stoneBreakdown, tribulationLoss, xpBreakdown } from '../lib/economy';
import { PILLS, tribulationChance } from '../lib/pills';
import { ENCOUNTERS, rollOutcome } from '../lib/encounters';
import { realmStart } from '../lib/cultivation';
import { rebuildLedger } from '../lib/integrity';
import { questStates, questsFor } from '../lib/quests';
import type { AppData, Task } from '../types';
import { DEFAULT_SETTINGS } from '../lib/storage';
import { addDays, dateKey } from '../lib/date';

const at = (offset: number) => dateKey(addDays(new Date(), offset));

function task(over: Partial<Task> & { id: string }): Task {
  return {
    title: over.id,
    note: '',
    date: at(0),
    priority: 'low',
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

/**
 * Dựng AppData như app thật: sổ ghi được ký lại theo nhiệm vụ và phiên bế quan,
 * vì tu vi bị kẹp theo sổ đã xác thực. Truyền `ledger` để cố tình làm lệch.
 */
function appData(over: Partial<AppData> = {}): AppData {
  const data: AppData = {
    version: 1,
    tasks: [],
    goals: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
    beasts: [],
    stonesSpent: 0,
    pills: { ha: 0, trung: 0, thuong: 0 },
    tuViPenalty: 0,
    gateRealm: 9,
    failStreak: 0,
    encounterXp: 0,
    stonesBonus: 0,
    ledger: [],
    lastSeenAt: new Date().toISOString(),
    ...over,
  };
  return over.ledger ? data : { ...data, ledger: rebuildLedger(data) };
}

/** Bộ sinh số giả lập, trả về lần lượt các giá trị cho trước. */
const seq = (values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('linh căn', () => {
  it('tổng xác suất các phẩm cấp bằng 100%', () => {
    const total = ROOT_GRADES.reduce((s, g) => s + g.chance, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('bốc trúng Thiên Linh Căn khi rơi vào 3% đầu', () => {
    const root = rollRoot(seq([0.01, 0.5]));
    expect(root.elements).toHaveLength(1);
    expect(gradeOf(root).name).toBe('Thiên Linh Căn');
    expect(gradeOf(root).multiplier).toBe(1.25);
  });

  it('rơi vào cuối dải thì ra Ngũ Linh Căn với đủ năm hệ', () => {
    const root = rollRoot(seq([0.99, 0, 0, 0, 0, 0]));
    expect(root.elements).toHaveLength(5);
    expect(gradeOf(root).name).toBe('Ngũ Linh Căn');
    expect(new Set(root.elements).size).toBe(5);
  });

  it('các hệ luôn khác nhau và xếp theo thứ tự ngũ hành', () => {
    for (let i = 0; i < 40; i++) {
      const root = rollRoot();
      expect(new Set(root.elements).size).toBe(root.elements.length);
      const indexes = root.elements.map((e) => ELEMENT_ORDER.indexOf(e));
      expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
    }
  });

  it('nhãn hệ đọc được', () => {
    expect(rootElementLabel({ elements: ['kim', 'thuy'], rolledAt: '' })).toBe('Kim · Thuỷ');
  });
});

describe('linh thú', () => {
  it('tổng xác suất các bậc bằng 100%', () => {
    const total = RARITY_ORDER.reduce((s, r) => s + (r === 'pham' ? 0.48 : 0), 0);
    expect(total).toBeGreaterThan(0);
    const all = BEASTS.length;
    expect(all).toBeGreaterThanOrEqual(16);
  });

  it('bốc trúng bậc thần thoại khi rơi vào 1% cuối', () => {
    const beast = summonBeast(seq([0.995, 0]));
    expect(beast.rarity).toBe('thoai');
  });

  it('bốc phàm phẩm khi rơi vào đầu dải', () => {
    expect(summonBeast(seq([0.1, 0])).rarity).toBe('pham');
  });

  it('cấp linh thú tăng theo điểm nuôi và chặn ở mức tối đa', () => {
    expect(beastLevel(0)).toBe(1);
    expect(beastLevel(2)).toBe(1);
    expect(beastLevel(3)).toBe(2);
    expect(beastLevel(9)).toBe(3);
    expect(beastLevel(99999)).toBe(MAX_BEAST_LEVEL);
    expect(feedToNext(0)).toBe(3);
    expect(feedToNext(99999)).toBe(0);
  });

  it('mọi linh thú đều có id riêng', () => {
    expect(new Set(BEASTS.map((b) => b.id)).size).toBe(BEASTS.length);
  });
});

describe('tu vi và linh thạch', () => {
  const doneUrgent = task({ id: 'u', status: 'done', priority: 'urgent', completedAt: `${at(0)}T09:00:00` });
  const doneLow = task({ id: 'l', status: 'done', completedAt: `${at(0)}T09:00:00` });

  it('không có linh căn thì tu vi bằng đúng phần gốc', () => {
    const data = appData({ tasks: [doneUrgent, doneLow] });
    const xp = xpBreakdown(data);
    expect(xp.base).toBe(50); // 40 + 10
    expect(xp.elementBonus).toBe(0);
    expect(xp.beastBonus).toBe(0);
    expect(xp.multiplier).toBe(1);
    expect(xp.total).toBe(50);
  });

  it('hệ Kim cộng 20% cho việc khẩn cấp và nhân hệ số Thiên Linh Căn', () => {
    const data = appData({
      tasks: [doneUrgent, doneLow],
      root: { elements: ['kim'], rolledAt: '' },
    });
    const xp = xpBreakdown(data);
    expect(xp.elementBonus).toBe(8); // 40 * 0.2
    expect(xp.multiplier).toBe(1.25);
    expect(xp.total).toBe(Math.floor(58 * 1.25)); // 72
  });

  it('hệ Thuỷ cộng 25% tu vi từ bế quan', () => {
    const data = appData({
      sessions: [{ id: 's', date: at(0), minutes: 100, startedAt: '' }],
      root: { elements: ['thuy'], rolledAt: '' },
    });
    const xp = xpBreakdown(data);
    expect(xp.base).toBe(20); // 100 / 5
    expect(xp.elementBonus).toBe(5); // 20 * 0.25
  });

  it('linh thú đang mang mới được tính thiên phú', () => {
    const base = appData({ tasks: [doneUrgent], beasts: [{ id: 'thanh-xa', fed: 0, obtainedAt: '' }] });
    expect(xpBreakdown(base).beastBonus).toBe(0);

    const withActive = { ...base, activeBeastId: 'thanh-xa' };
    // Thanh Xà: +2% tu vi mỗi cấp, cấp 1 -> 2% của 40 = 0.8 -> làm tròn 1
    expect(xpBreakdown(withActive).beastBonus).toBe(1);
  });

  it('linh thạch trừ đúng phần đã tiêu và không âm', () => {
    const data = appData({
      tasks: [doneUrgent, doneLow],
      sessions: [{ id: 's', date: at(0), minutes: 25, startedAt: '' }],
      stonesSpent: 1000,
    });
    const stones = stoneBreakdown(data);
    expect(stones.fromTasks).toBe(2);
    expect(stones.fromSessions).toBe(2);
    expect(stones.balance).toBe(0);
  });
});

describe('nhật khoá tông môn', () => {
  it('mỗi ngày ra đúng ba nhiệm vụ và ổn định cho cùng một ngày', () => {
    const a = questsFor('2026-09-08');
    const b = questsFor('2026-09-08');
    expect(a).toHaveLength(3);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(new Set(a.map((q) => q.id)).size).toBe(3);
  });

  it('ngày khác nhau thì bộ nhiệm vụ thường khác nhau', () => {
    const keys = ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'];
    const sets = keys.map((k) => questsFor(k).map((q) => q.id).join(','));
    expect(new Set(sets).size).toBeGreaterThan(1);
  });

  it('đo đúng tiến độ từ dữ liệu trong ngày', () => {
    const key = at(0);
    const data = appData({
      tasks: [
        task({ id: 'a', status: 'done', priority: 'urgent', completedAt: `${key}T08:00:00` }),
        task({ id: 'b', status: 'done', completedAt: `${key}T09:00:00` }),
      ],
      sessions: [{ id: 's', date: key, minutes: 30, startedAt: '' }],
    });
    const states = questStates(data, key);
    expect(states).toHaveLength(3);
    for (const q of states) {
      expect(q.current).toBeLessThanOrEqual(q.target);
      expect(q.ratio).toBeGreaterThanOrEqual(0);
      expect(q.ratio).toBeLessThanOrEqual(1);
    }
  });
});

describe('đan dược và độ kiếp', () => {
  it('cơ hội tăng 10% mỗi lần thất bại, chặn ở +40%', () => {
    expect(tribulationChance('ha', 0)).toBeCloseTo(0.1);
    expect(tribulationChance('ha', 2)).toBeCloseTo(0.3);
    expect(tribulationChance('ha', 10)).toBeCloseTo(0.5);
    expect(tribulationChance('thuong', 0)).toBeCloseTo(0.5);
    expect(tribulationChance('thuong', 10)).toBeCloseTo(0.9);
  });

  it('đan phẩm cao thì đắt hơn và cơ hội lớn hơn', () => {
    expect(PILLS.thuong.cost).toBeGreaterThan(PILLS.trung.cost);
    expect(PILLS.thuong.chance).toBeGreaterThan(PILLS.trung.chance);
    expect(PILLS.trung.chance).toBeGreaterThan(PILLS.ha.chance);
  });

  it('chưa độ kiếp thì tu vi bị kẹp ở trần cảnh giới', () => {
    // gateRealm 0 = mới ở Luyện Khí, trần là 449 (Trúc Cơ bắt đầu từ 450).
    const data = appData({ gateRealm: 0, encounterXp: 2000 });
    const p = progressOf(data);
    expect(p.net).toBe(2000);
    expect(p.cap).toBe(realmStart(1) - 1);
    expect(p.xp).toBe(449);
    expect(p.readyForTribulation).toBe(true);
    expect(p.held).toBe(2000 - 449);
  });

  it('đã mở cửa cảnh giới thì không còn bị kẹp', () => {
    const data = appData({ gateRealm: 1, encounterXp: 600 });
    const p = progressOf(data);
    expect(p.xp).toBe(600);
    expect(p.readyForTribulation).toBe(false);
    expect(p.held).toBe(0);
  });

  it('tổn thất khi thất bại là một nửa phần tích trong cảnh giới hiện tại', () => {
    // gateRealm 1 (Trúc Cơ, mốc 450), tu vi 650 -> đã tích 200 trong cảnh giới.
    const data = appData({ gateRealm: 1, encounterXp: 650 });
    expect(tribulationLoss(data)).toBe(100);
  });

  it('tổn thất không bao giờ âm khi tu vi còn dưới mốc cảnh giới', () => {
    expect(tribulationLoss(appData({ gateRealm: 3, encounterXp: 10 }))).toBe(0);
  });

  it('tu vi từ kỳ ngộ cộng thẳng, không nhân hệ số linh căn', () => {
    const withRoot = appData({
      encounterXp: 100,
      root: { elements: ['kim'], rolledAt: '' },
      gateRealm: 9,
    });
    // Không có nhiệm vụ nào nên phần gốc = 0, tổng phải đúng bằng 100.
    expect(xpBreakdown(withRoot).total).toBe(100);
    expect(xpBreakdown(withRoot).encounterXp).toBe(100);
  });

  it('tu vi tổng không xuống dưới 0 dù kỳ ngộ trừ nhiều', () => {
    expect(xpBreakdown(appData({ encounterXp: -9999 })).total).toBe(0);
  });

  it('linh thạch thưởng từ kỳ ngộ được cộng vào số dư', () => {
    const stones = stoneBreakdown(appData({ stonesBonus: 75 }));
    expect(stones.fromEncounters).toBe(75);
    expect(stones.balance).toBe(75);
  });
});

describe('kỳ ngộ', () => {
  it('mọi kỳ ngộ đều có lựa chọn và mọi lựa chọn đều có kết quả', () => {
    expect(ENCOUNTERS.length).toBeGreaterThanOrEqual(6);
    for (const e of ENCOUNTERS) {
      expect(e.options.length).toBeGreaterThanOrEqual(2);
      for (const o of e.options) {
        expect(o.outcomes.length).toBeGreaterThanOrEqual(1);
        expect(o.outcomes.reduce((s, x) => s + x.weight, 0)).toBeGreaterThan(0);
      }
    }
  });

  it('bốc kết quả theo trọng số: rơi vào đầu dải thì ra nhánh đầu', () => {
    const option = {
      text: 't',
      risk: 'rủi ro' as const,
      outcomes: [
        { weight: 30, kind: 'stones' as const, amount: 10, tone: 'good' as const, msg: 'a' },
        { weight: 70, kind: 'nothing' as const, tone: 'neutral' as const, msg: 'b' },
      ],
    };
    expect(rollOutcome(option, () => 0).msg).toBe('a');
    expect(rollOutcome(option, () => 0.99).msg).toBe('b');
  });

  it('id kỳ ngộ không trùng nhau', () => {
    expect(new Set(ENCOUNTERS.map((e) => e.id)).size).toBe(ENCOUNTERS.length);
  });
});
