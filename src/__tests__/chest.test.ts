import { describe, expect, it } from 'vitest';
import {
  CHEST_GRADES, CHEST_RULES, LOOT, chestKey, chestsForDay, pendingChests, rollLoot,
} from '../lib/chest';
import type { ChestGrade, Loot } from '../lib/chest';

const DAY = '2026-09-12';
const GRADES: ChestGrade[] = ['go', 'ngoc', 'kim'];

/** Tổng giá trị quy đổi thô của một món, chỉ để so nặng nhẹ giữa các phẩm hòm. */
function worth(l: Loot): number {
  const herbs = Object.values(l.herbs ?? {}).reduce((s, n) => s + (n ?? 0), 0);
  return (l.stones ?? 0) + (l.xp ?? 0) * 0.5 + herbs * 30 + (l.pill ? 120 : 0);
}

const expected = (g: ChestGrade) => {
  const table = LOOT[g];
  const total = table.reduce((s, o) => s + o.weight, 0);
  return table.reduce((s, o) => s + worth(o) * (o.weight / total), 0);
};

describe('hòm kỳ ngộ', () => {
  it('chưa làm gì thì chưa có hòm nào', () => {
    const list = chestsForDay(DAY, 0, 0, false, []);
    expect(list.every((c) => !c.earned)).toBe(true);
    expect(pendingChests(list)).toBe(0);
  });

  it('xong một việc là có ngay hòm đầu tiên', () => {
    const list = chestsForDay(DAY, 1, 0, false, []);
    const first = list.find((c) => c.rule.id === 'first');
    expect(first?.earned).toBe(true);
    expect(pendingChests(list)).toBe(1);
  });

  it('mỗi mốc một hòm, đạt đủ thì có đủ bốn', () => {
    const list = chestsForDay(DAY, 5, 60, true, []);
    expect(list.every((c) => c.earned)).toBe(true);
    expect(pendingChests(list)).toBe(CHEST_RULES.length);
  });

  it('đã mở rồi thì không tính là đang chờ nữa', () => {
    const list = chestsForDay(DAY, 5, 60, true, [chestKey(DAY, 'first')]);
    expect(list.find((c) => c.rule.id === 'first')?.opened).toBe(true);
    expect(pendingChests(list)).toBe(CHEST_RULES.length - 1);
  });

  it('khoá gắn với đúng một ngày - hôm nay mở không chặn hòm ngày mai', () => {
    const list = chestsForDay('2026-09-13', 1, 0, false, [chestKey(DAY, 'first')]);
    expect(list.find((c) => c.rule.id === 'first')?.opened).toBe(false);
  });

  it('tiến độ nằm gọn trong 0..1 và chạy dần chứ không nhảy', () => {
    for (const [done, focus] of [
      [0, 0],
      [2, 20],
      [4, 59],
      [9, 300],
    ]) {
      for (const c of chestsForDay(DAY, done, focus, false, [])) {
        expect(c.ratio).toBeGreaterThanOrEqual(0);
        expect(c.ratio).toBeLessThanOrEqual(1);
      }
    }
    const half = chestsForDay(DAY, 0, 30, false, []).find((c) => c.rule.id === 'focus60');
    expect(half?.ratio).toBeCloseTo(0.5);
  });

  it('mở hòm không bao giờ ra tay trắng', () => {
    // Hòm phải làm việc mới có. Mở ra mà trống không thì lần sau chẳng ai buồn
    // mở, và cả cơ chế mất tác dụng.
    for (const g of GRADES) {
      for (const item of LOOT[g]) {
        expect(worth(item)).toBeGreaterThan(0);
      }
    }
  });

  it('hòm càng quý thì càng đáng mở', () => {
    expect(expected('ngoc')).toBeGreaterThan(expected('go'));
    expect(expected('kim')).toBeGreaterThan(expected('ngoc'));
  });

  it('bốc theo đúng trọng số, đầu dãy và cuối dãy đều với tới được', () => {
    for (const g of GRADES) {
      expect(rollLoot(g, () => 0)).toBe(LOOT[g][0]);
      expect(rollLoot(g, () => 0.999999)).toBe(LOOT[g][LOOT[g].length - 1]);
    }
  });

  it('mỗi mốc trỏ tới một phẩm hòm có thật', () => {
    for (const r of CHEST_RULES) {
      expect(CHEST_GRADES[r.grade]).toBeDefined();
    }
  });
});
