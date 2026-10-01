import { parseISO, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { completedDay, dateKey, parseKey } from '../lib/date';
import { questStates, questStones } from '../lib/quests';
import { seedData } from '../lib/seed';
import type { AppData, Task } from '../types';

/**
 * Các đường tắt cho nhanh phải cho ra ĐÚNG kết quả của cách làm chậm cũ.
 *
 * Linh thạch từ nhật khoá là tiền thật trong game: tối ưu mà lệch một viên là
 * người dùng thấy số dư nhảy, còn server (chạy cùng luật) thì báo sổ lệch.
 */

function naiveQuestStones(data: AppData): number {
  const days = new Set<string>();
  for (const t of data.tasks) {
    days.add(t.date);
    if (t.completedAt) days.add(completedDay(t));
  }
  for (const s of data.sessions) days.add(s.date);
  let total = 0;
  for (const key of [...days].sort()) {
    for (const q of questStates(data, key)) if (q.done) total += q.reward;
  }
  return total;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function randomData(seed: number): AppData {
  const r = rng(seed);
  const base = seedData();
  const priorities: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const day = (offset: number) => dateKey(new Date(2026, 8, 1 + offset));
  const tasks: Task[] = Array.from({ length: 400 }, (_, i) => {
    const date = day(Math.floor(r() * 60));
    const done = r() < 0.6;
    const completedAt = done && r() < 0.9 ? new Date(2026, 8, 1 + Math.floor(r() * 62), Math.floor(r() * 24)).toISOString() : undefined;
    return {
      ...base.tasks[0],
      id: `t${seed}-${i}`,
      date,
      priority: priorities[Math.floor(r() * 4)],
      status: done ? 'done' : r() < 0.5 ? 'todo' : 'doing',
      completedAt,
      completedOn: done && r() < 0.2 ? day(Math.floor(r() * 62)) : undefined,
      deadline: r() < 0.3 ? new Date(2026, 8, 1 + Math.floor(r() * 62)).toISOString() : undefined,
    };
  });
  const sessions = Array.from({ length: 120 }, (_, i) => ({
    ...(base.sessions[0] ?? { startedAt: new Date().toISOString() }),
    id: `s${seed}-${i}`,
    date: day(Math.floor(r() * 70)),
    minutes: 5 + Math.floor(r() * 60),
  })) as AppData['sessions'];
  return { ...base, tasks, sessions };
}

describe('đường tắt cho nhanh vẫn đúng như cách cũ', () => {
  it('questStones bằng đúng tổng cộng dồn từng ngày', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const data = randomData(seed);
      expect(questStones(data)).toBe(naiveQuestStones(data));
    }
    const sample = seedData();
    expect(questStones(sample)).toBe(naiveQuestStones(sample));
  });

  it('dateKey và parseKey khớp date-fns, kể cả ngày hỏng', () => {
    for (const d of [new Date(2026, 0, 1), new Date(2026, 11, 31, 23, 59), new Date(2024, 1, 29), new Date(1999, 6, 5)]) {
      expect(dateKey(d)).toBe(format(d, 'yyyy-MM-dd'));
    }
    expect(() => dateKey(new Date(NaN))).toThrow(RangeError);
    for (const key of ['2026-01-01', '2024-02-29', '2026-12-31', '2026-02-30', '2026-13-01', '2026-00-10', 'rác', '2026-9-1']) {
      const a = parseKey(key).getTime();
      const b = parseISO(`${key}T00:00:00`).getTime();
      expect(Number.isNaN(a) ? 'hỏng' : a).toBe(Number.isNaN(b) ? 'hỏng' : b);
    }
  });
});
