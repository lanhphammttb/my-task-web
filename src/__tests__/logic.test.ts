import { describe, expect, it } from 'vitest';
import { parseQuick } from '../lib/quickParse';
import { countdown, dateKey, formatDuration, monthGrid, weekDays } from '../lib/date';
import { bestStreak, currentStreak, isOverdue, sortTasks, totalXp } from '../lib/stats';
import { ascensionRatio, cultivationOf, realmLabel, realmLadder, TOTAL_TO_ASCEND } from '../lib/cultivation';
import type { FocusSession, Priority, Status, Task } from '../types';
import { addDays } from '../lib/date';

const at = (offset: number) => dateKey(addDays(new Date(), offset));

function make(overrides: Partial<Task> & { title: string }): Task {
  return {
    id: overrides.title,
    note: '',
    date: at(0),
    priority: 'medium' as Priority,
    status: 'todo' as Status,
    tags: [],
    estimateMin: 30,
    focusMin: 0,
    subtasks: [],
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('parseQuick', () => {
  it('tách được ưu tiên, giờ bắt đầu, thời lượng và nhãn', () => {
    const r = parseQuick('Viết báo cáo !cao @9:05 ~90 #công-việc #gấp');
    expect(r.title).toBe('Viết báo cáo');
    expect(r.priority).toBe('high');
    expect(r.startTime).toBe('09:05');
    expect(r.estimateMin).toBe(90);
    expect(r.tags).toEqual(['công-việc', 'gấp']);
  });

  it('giữ nguyên ký tự "!" không phải từ khoá ưu tiên', () => {
    const r = parseQuick('Xong rồi !yeah');
    expect(r.title).toBe('Xong rồi !yeah');
    expect(r.priority).toBe('medium');
  });

  it('mặc định ưu tiên trung bình khi không có cú pháp', () => {
    const r = parseQuick('  Gọi điện cho khách  ');
    expect(r.title).toBe('Gọi điện cho khách');
    expect(r.estimateMin).toBeUndefined();
    expect(r.tags).toEqual([]);
  });
});

describe('isOverdue', () => {
  it('nhiệm vụ đã xong không bao giờ tính là trễ', () => {
    expect(isOverdue(make({ title: 'a', date: at(-5), status: 'done' }))).toBe(false);
  });

  it('quá deadline thì tính là trễ', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    expect(isOverdue(make({ title: 'b', deadline: past }))).toBe(true);
  });

  it('ngày đã qua mà chưa xong thì tính là trễ', () => {
    expect(isOverdue(make({ title: 'c', date: at(-1) }))).toBe(true);
  });

  it('việc hôm nay chưa tới hạn thì chưa trễ', () => {
    expect(isOverdue(make({ title: 'd' }))).toBe(false);
  });
});

describe('chuỗi ngày', () => {
  it('đếm số ngày liên tiếp có việc hoàn thành', () => {
    const tasks = [
      make({ title: '1', date: at(0), status: 'done', completedAt: `${at(0)}T10:00:00` }),
      make({ title: '2', date: at(-1), status: 'done', completedAt: `${at(-1)}T10:00:00` }),
      make({ title: '3', date: at(-2), status: 'done', completedAt: `${at(-2)}T10:00:00` }),
    ];
    expect(currentStreak(tasks)).toBe(3);
    expect(bestStreak(tasks)).toBe(3);
  });

  it('hôm nay chưa xong việc vẫn giữ chuỗi tính từ hôm qua', () => {
    const tasks = [
      make({ title: '1', date: at(-1), status: 'done', completedAt: `${at(-1)}T10:00:00` }),
      make({ title: '2', date: at(0) }),
    ];
    expect(currentStreak(tasks)).toBe(1);
  });

  it('không có việc nào hoàn thành thì chuỗi bằng 0', () => {
    expect(currentStreak([make({ title: '1' })])).toBe(0);
  });
});

describe('điểm và cấp độ', () => {
  it('cộng XP theo mức ưu tiên và thời gian tập trung', () => {
    const tasks = [
      make({ title: '1', status: 'done', priority: 'urgent' }), // 40
      make({ title: '2', status: 'done', priority: 'low' }), // 10
      make({ title: '3' }), // chưa xong
    ];
    const sessions: FocusSession[] = [
      { id: 's', date: at(0), minutes: 50, startedAt: new Date().toISOString() }, // 10
    ];
    expect(totalXp(tasks, sessions)).toBe(60);
  });

});

describe('hệ thống tu tiên', () => {
  it('người mới bắt đầu ở Luyện Khí tầng 1', () => {
    const c = cultivationOf(0);
    expect(c.realm.name).toBe('Luyện Khí');
    expect(c.tier).toBe(1);
    expect(c.into).toBe(0);
    expect(c.ascended).toBe(false);
    expect(realmLabel(c)).toBe('Luyện Khí tầng 1');
  });

  it('đủ tu vi thì lên tầng kế trong cùng cảnh giới', () => {
    expect(cultivationOf(49).tier).toBe(1);
    expect(cultivationOf(50).tier).toBe(2);
    expect(cultivationOf(50).into).toBe(0);
    expect(cultivationOf(75).into).toBe(25);
    expect(cultivationOf(75).toNext).toBe(25);
  });

  it('tầng 9 được đánh dấu là sắp độ kiếp', () => {
    const peak = cultivationOf(449);
    expect(peak.tier).toBe(9);
    expect(peak.atPeak).toBe(true);
    expect(peak.nextLabel).toBe('Trúc Cơ');
  });

  it('vượt ngưỡng thì sang cảnh giới mới', () => {
    const next = cultivationOf(450);
    expect(next.realm.name).toBe('Trúc Cơ');
    expect(next.realmIndex).toBe(1);
    expect(next.tier).toBe(1);
  });

  it('đủ tu vi toàn đạo lộ thì phi thăng', () => {
    const done = cultivationOf(TOTAL_TO_ASCEND);
    expect(done.ascended).toBe(true);
    expect(done.realm.name).toBe('Phi Thăng');
    expect(realmLabel(done)).toBe('Phi Thăng');
    expect(ascensionRatio(TOTAL_TO_ASCEND)).toBe(1);
  });

  it('tu vi âm hoặc lẻ vẫn cho ra cảnh giới hợp lệ', () => {
    expect(cultivationOf(-500).realm.name).toBe('Luyện Khí');
    expect(cultivationOf(-500).tier).toBe(1);
    expect(cultivationOf(12.7).tier).toBe(1);
  });

  it('bậc thang đánh dấu đúng cảnh giới đã qua, đang ở và chưa tới', () => {
    const ladder = realmLadder(500); // Trúc Cơ tầng 1
    expect(ladder[0].status).toBe('done');
    expect(ladder[1].status).toBe('current');
    expect(ladder[2].status).toBe('locked');
    expect(ladder.at(-1)?.realm.name).toBe('Phi Thăng');
  });
});

describe('sortTasks', () => {
  it('đưa việc đang làm lên trước, rồi tới ưu tiên cao', () => {
    const list = [
      make({ title: 'thấp', priority: 'low' }),
      make({ title: 'xong', status: 'done', priority: 'urgent' }),
      make({ title: 'đang làm', status: 'doing', priority: 'low' }),
      make({ title: 'khẩn cấp', priority: 'urgent' }),
    ];
    expect(sortTasks(list).map((t) => t.title)).toEqual(['đang làm', 'khẩn cấp', 'thấp', 'xong']);
  });
});

describe('tiện ích ngày tháng', () => {
  it('formatDuration hiển thị đúng giờ và phút', () => {
    expect(formatDuration(0)).toBe('0p');
    expect(formatDuration(45)).toBe('45p');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(95)).toBe('1h35');
  });

  it('countdown phân loại đúng mức nguy cấp', () => {
    expect(countdown(undefined).level).toBe('none');
    expect(countdown(new Date(Date.now() - 1800_000).toISOString()).level).toBe('late');
    expect(countdown(new Date(Date.now() + 1800_000).toISOString()).level).toBe('urgent');
    expect(countdown(new Date(Date.now() + 5 * 3600_000).toISOString()).level).toBe('soon');
    expect(countdown(new Date(Date.now() + 10 * 86400_000).toISOString()).level).toBe('safe');
  });

  it('monthGrid luôn trả về các tuần đầy đủ', () => {
    const grid = monthGrid(new Date(2026, 8, 15), 1);
    expect(grid.length % 7).toBe(0);
    expect(grid[0].getDay()).toBe(1);
  });

  it('weekDays bắt đầu từ Thứ Hai khi cấu hình weekStartsOn = 1', () => {
    const days = weekDays(new Date(2026, 8, 10), 1);
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });
});
