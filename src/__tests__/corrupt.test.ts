import { beforeEach, describe, expect, it } from 'vitest';
import { expeditionState } from '../lib/expedition';
import { plotState } from '../lib/field';
import { missionState } from '../lib/sect';
import { emptyData, loadData } from '../lib/storage';

const KEY = 'my-task-planner/v1';

/**
 * Dữ liệu lưu có thể chứa id không còn tồn tại.
 *
 * App cho nhập file JSON, mà `readFile` chỉ kiểm mỗi `tasks` có phải mảng hay
 * không - phần còn lại vào thẳng. Thêm nữa, hễ sau này đổi tên một loại linh
 * thảo, một bí cảnh hay một sứ mệnh là mọi bản lưu cũ đều mang id đã chết.
 *
 * Ba hàm dưới đây đều tra bảng rồi dùng ngay kết quả, và cả ba đều được gọi
 * trong lúc dựng giao diện. Tra hụt là ném lỗi giữa render, tức là màn hình
 * trắng chứ không phải một mục hỏng.
 */
describe('id lạ trong dữ liệu đã lưu', () => {
  it('linh thảo không còn tồn tại thì bỏ qua ô đất, không làm sập app', () => {
    expect(
      plotState(
        { slot: 0, herb: 'khong_co_that' as never, plantedAtFocus: 0, plantedAt: '' },
        100,
      ),
    ).toBeNull();
  });

  it('bí cảnh không còn tồn tại thì bỏ qua chuyến đi, không làm sập app', () => {
    expect(
      expeditionState({ site: 'khong_co_that' as never, startedAtTasks: 0, startedAt: '' }, 10),
    ).toBeNull();
  });

  it('sứ mệnh không còn tồn tại thì bỏ qua, không làm sập app', () => {
    expect(
      missionState(
        {
          id: 'khong_co_that' as never,
          startTasks: 0,
          startFocus: 0,
          acceptedAt: '',
          dueAt: new Date().toISOString(),
          stake: 10,
        },
        10,
        10,
      ),
    ).toBeNull();
  });
});

describe('dọn id đã chết ngay lúc nạp dữ liệu', () => {
  beforeEach(() => localStorage.clear());

  it('gỡ ô đất, sứ mệnh, chuyến đi và công pháp mang id không còn tồn tại', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...emptyData(),
        tasks: [],
        stonesBonus: 100,
        technique: 'khong_co_that',
        field: [
          { slot: 0, herb: 'khong_co_that', plantedAtFocus: 0, plantedAt: '' },
          { slot: 1, herb: 'thanh_diep', plantedAtFocus: 0, plantedAt: '' },
        ],
        mission: {
          id: 'khong_co_that',
          startTasks: 0,
          startFocus: 0,
          acceptedAt: '',
          dueAt: '',
          stake: 70,
        },
        expedition: { site: 'khong_co_that', startedAtTasks: 0, startedAt: '' },
      }),
    );

    const d = loadData();

    // Ô hỏng bị gỡ, ô lành giữ nguyên - dọn đúng chỗ chứ không xoá sạch.
    expect(d.field).toHaveLength(1);
    expect(d.field[0].herb).toBe('thanh_diep');
    expect(d.mission).toBeUndefined();
    expect(d.expedition).toBeUndefined();
    expect(d.technique).toBeUndefined();
    // Mất sứ mệnh vì ta đổi bảng thì không được phạt người dùng: hoàn lại cọc.
    expect(d.stonesBonus).toBe(100 + 70);
  });

  it('dữ liệu lành thì không đụng vào gì', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...emptyData(),
        stonesBonus: 100,
        technique: 'thuy_van',
        field: [{ slot: 0, herb: 'kim_tuy', plantedAtFocus: 5, plantedAt: '' }],
      }),
    );

    const d = loadData();

    expect(d.field).toHaveLength(1);
    expect(d.technique).toBe('thuy_van');
    expect(d.stonesBonus).toBe(100);
  });
});
