import { describe, expect, it } from 'vitest';
import { parseQuick } from '../lib/quickParse';

describe('parseQuick - tiếng Việt có dấu', () => {
  it('hiểu từ khoá ưu tiên có dấu lẫn không dấu', () => {
    expect(parseQuick('Nộp thuế !khẩn').priority).toBe('urgent');
    expect(parseQuick('Nộp thuế !KHẨN').priority).toBe('urgent');
    expect(parseQuick('Nộp thuế !gấp').priority).toBe('urgent');
    expect(parseQuick('Tưới cây !thấp').priority).toBe('low');
    expect(parseQuick('Tưới cây !thap').priority).toBe('low');
    expect(parseQuick('Dọn bàn !vừa').priority).toBe('medium');
    const tb = parseQuick('Dọn bàn !trung bình');
    expect(tb.priority).toBe('medium');
    expect(tb.priorityHit).toBe(true);
    expect(tb.title).toBe('Dọn bàn');
    expect(parseQuick('Dọn bàn !trungbinh').priorityHit).toBe(true);
  });

  it('hiểu thời lượng dạng 15p, 90 phút, 1h30, 2h', () => {
    expect(parseQuick('Đọc sách 15p')).toMatchObject({ title: 'Đọc sách', estimateMin: 15 });
    expect(parseQuick('Viết báo cáo 90p').estimateMin).toBe(90);
    expect(parseQuick('Viết báo cáo 90 phút').estimateMin).toBe(90);
    expect(parseQuick('Học tiếng Anh 1h30')).toMatchObject({ title: 'Học tiếng Anh', estimateMin: 90 });
    expect(parseQuick('Chạy bộ 2h').estimateMin).toBe(120);
    expect(parseQuick('Thiền ~25').estimateMin).toBe(25);
  });

  it('không nhầm số trong tên việc hay giờ trong ngày là thời lượng', () => {
    expect(parseQuick('Đọc 10 trang sách')).toMatchObject({ title: 'Đọc 10 trang sách', estimateMin: undefined });
    expect(parseQuick('Chạy 10km').estimateMin).toBeUndefined();
    expect(parseQuick('Dậy 5h sáng').estimateMin).toBeUndefined();
    expect(parseQuick('Gọi mẹ lúc 8h').estimateMin).toBeUndefined();
  });

  it('hiểu giờ bắt đầu @9:00, @9h30', () => {
    expect(parseQuick('Họp @9:00').startTime).toBe('09:00');
    expect(parseQuick('Họp @9h30').startTime).toBe('09:30');
    expect(parseQuick('Họp @14h').startTime).toBe('14:00');
    expect(parseQuick('Họp @25:00').startTime).toBeUndefined();
  });

  it('hiểu từ chỉ ngày và bỏ khỏi tên việc', () => {
    expect(parseQuick('Viết báo cáo hôm nay')).toMatchObject({ title: 'Viết báo cáo', dayOffset: 0 });
    expect(parseQuick('Viết báo cáo ngày mai')).toMatchObject({ title: 'Viết báo cáo', dayOffset: 1 });
    expect(parseQuick('Viết báo cáo mai')).toMatchObject({ title: 'Viết báo cáo', dayOffset: 1 });
    expect(parseQuick('Mai đi chợ')).toMatchObject({ title: 'đi chợ', dayOffset: 1 });
    expect(parseQuick('Nộp hồ sơ ngày kia')).toMatchObject({ title: 'Nộp hồ sơ', dayOffset: 2 });
    expect(parseQuick('Nộp hồ sơ kia')).toMatchObject({ title: 'Nộp hồ sơ', dayOffset: 2 });
    expect(parseQuick('Nộp hồ sơ ngày mốt').dayOffset).toBe(2);
  });

  it('không nhầm tên riêng hay "cái kia" là ngày', () => {
    expect(parseQuick('Gọi chị Mai')).toMatchObject({ title: 'Gọi chị Mai', dayOffset: undefined });
    expect(parseQuick('Mua hoa mai')).toMatchObject({ title: 'Mua hoa mai', dayOffset: undefined });
    expect(parseQuick('Sửa cái kia')).toMatchObject({ title: 'Sửa cái kia', dayOffset: undefined });
    expect(parseQuick('Đọc một chương').dayOffset).toBeUndefined();
    expect(parseQuick('mai').title).toBe('mai');
  });

  it('gộp được tất cả trong một câu', () => {
    const r = parseQuick('Viết báo cáo !cao @9:00 1h30 #công-việc mai');
    expect(r).toMatchObject({
      title: 'Viết báo cáo',
      priority: 'high',
      startTime: '09:00',
      estimateMin: 90,
      dayOffset: 1,
      tags: ['công-việc'],
    });
  });
});
