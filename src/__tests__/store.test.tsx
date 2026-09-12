import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../store/AppStore';
import { emptyData } from '../lib/storage';
import { stoneBalance } from '../lib/economy';
import { HERBS } from '../lib/field';
import { RECIPES } from '../lib/pills';
import { MISSIONS } from '../lib/sect';
import { SITES } from '../lib/expedition';
import { CAVE_LEVELS } from '../lib/cave';
import { todayKey } from '../lib/date';
import { techniqueSwapCost } from '../lib/techniques';
import type { AppData, Goal, Task } from '../types';

/**
 * Test cho tầng store - nơi tài nguyên thật sự bị cộng trừ.
 *
 * Mọi test khác đều nhắm vào hàm thuần trong `lib/`, nên các đường đi tiêu linh
 * thạch, trừ linh thảo, khoá cọc và trả cọc chưa từng được kiểm lần nào. Đây
 * đúng là chỗ dễ sinh lỗi mất hoặc nhân đôi tài nguyên nhất, mà cũng khó thấy
 * nhất vì phải chơi một lúc mới lộ ra.
 */

const KEY = 'my-task-planner/v1';

const goal: Goal = {
  id: 'g1',
  title: 'Đại nguyện',
  description: '',
  color: '#d4a24c',
  archived: false,
  createdAt: new Date().toISOString(),
};

/**
 * Nạp sẵn trạng thái rồi mới dựng store.
 *
 * Phải có ít nhất một mục tiêu: thấy dữ liệu trống là store tự nạp bộ mẫu, và
 * mọi con số trong test thành vô nghĩa. Sổ ghi để trống cho store tự ký lại,
 * nhờ đó phần đã xác thực khớp đúng với dữ liệu vừa nạp.
 */
function seed(over: Partial<AppData> = {}) {
  const data: AppData = { ...emptyData(), goals: [goal], gateRealm: 9, ...over };
  localStorage.setItem(KEY, JSON.stringify(data));
}

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;
const mount = () => renderHook(() => useApp(), { wrapper });

/** Số dư linh thạch, tính đúng theo cách app tính. */
const stones = (r: ReturnType<typeof mount>) => stoneBalance(r.result.current.data);

const doneTasks = (n: number): Task[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `việc ${i}`,
    note: '',
    date: '2026-01-01',
    priority: 'low',
    status: 'done',
    tags: [],
    estimateMin: 30,
    focusMin: 0,
    subtasks: [],
    recurrence: 'none',
    createdAt: '2026-01-01T08:00:00',
    completedAt: '2026-01-01T09:00:00',
  }));

describe('công pháp', () => {
  beforeEach(() => localStorage.clear());

  it('lần chọn đầu miễn phí', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.pickTechnique('thuy_van');
    });

    expect(r.result.current.data.technique).toBe('thuy_van');
    expect(stones(r)).toBe(before);
    expect(r.result.current.data.techniqueSwaps).toBe(0);
  });

  it('đổi lần sau thì mất tiền, và lần kế còn đắt hơn', () => {
    seed({ stonesBonus: 500, technique: 'thuy_van' });
    const r = mount();
    const before = stones(r);
    const cost = techniqueSwapCost(0);

    act(() => {
      r.result.current.pickTechnique('kim_cang');
    });

    expect(r.result.current.data.technique).toBe('kim_cang');
    expect(stones(r)).toBe(before - cost);
    expect(r.result.current.data.techniqueSwaps).toBe(1);
    expect(techniqueSwapCost(1)).toBeGreaterThan(cost);
  });

  it('không đủ linh thạch thì không đổi được và không mất gì', () => {
    seed({ stonesBonus: 5, technique: 'thuy_van' });
    const r = mount();
    const before = stones(r);

    let ok = true;
    act(() => {
      ok = r.result.current.pickTechnique('kim_cang');
    });

    expect(ok).toBe(false);
    expect(r.result.current.data.technique).toBe('thuy_van');
    expect(stones(r)).toBe(before);
  });
});

describe('linh điền', () => {
  beforeEach(() => localStorage.clear());

  it('gieo hạt thì trừ đúng giá và chiếm ô đất', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.plantSeed(0, 'thanh_diep');
    });

    expect(r.result.current.data.field).toHaveLength(1);
    expect(r.result.current.data.field[0].herb).toBe('thanh_diep');
    expect(stones(r)).toBe(before - HERBS.thanh_diep.seedCost);
  });

  it('không gieo đè lên ô đang có cây', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    act(() => {
      r.result.current.plantSeed(0, 'thanh_diep');
    });
    const after = stones(r);

    let ok = true;
    act(() => {
      ok = r.result.current.plantSeed(0, 'huyet_tinh');
    });

    expect(ok).toBe(false);
    expect(r.result.current.data.field).toHaveLength(1);
    expect(stones(r)).toBe(after);
  });

  it('cây chưa chín thì hái không được, và cây vẫn còn đó', () => {
    seed({
      stonesBonus: 500,
      field: [
        { slot: 0, herb: 'thanh_diep', plantedAtFocus: 0, plantedAt: new Date().toISOString() },
      ],
    });
    const r = mount();

    let ok = true;
    act(() => {
      ok = r.result.current.harvestPlot(0);
    });

    expect(ok).toBe(false);
    expect(r.result.current.data.field).toHaveLength(1);
    expect(r.result.current.data.herbs.thanh_diep).toBe(0);
  });

  it('đủ phút bế quan thì hái được đúng số nhánh, ô đất trống lại', () => {
    seed({
      sessions: [
        {
          id: 's1',
          date: '2026-01-01',
          minutes: HERBS.thanh_diep.needFocus,
          startedAt: '2026-01-01T09:00:00',
        },
      ],
      field: [
        { slot: 0, herb: 'thanh_diep', plantedAtFocus: 0, plantedAt: new Date().toISOString() },
      ],
    });
    const r = mount();

    act(() => {
      r.result.current.harvestPlot(0);
    });

    expect(r.result.current.data.field).toHaveLength(0);
    expect(r.result.current.data.herbs.thanh_diep).toBe(HERBS.thanh_diep.yield);
  });
});

describe('luyện đan', () => {
  beforeEach(() => localStorage.clear());

  it('thiếu linh thảo thì không nổi lửa, không mất linh thạch', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    const before = stones(r);

    let out: unknown = 'chưa gọi';
    act(() => {
      out = r.result.current.refinePill('trung');
    });

    expect(out).toBeNull();
    expect(stones(r)).toBe(before);
  });

  it('thành đan thì trừ đúng linh thảo, trừ củi lửa và cộng một viên', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // luôn thành
    const recipe = RECIPES.trung;
    seed({ stonesBonus: 500, herbs: { thanh_diep: 9, huyet_tinh: 9, kim_tuy: 0, tu_van: 0 } });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.refinePill('trung');
    });

    expect(r.result.current.data.pills.trung).toBe(1);
    expect(r.result.current.data.herbs.thanh_diep).toBe(9 - (recipe.herbs.thanh_diep ?? 0));
    expect(r.result.current.data.herbs.huyet_tinh).toBe(9 - (recipe.herbs.huyet_tinh ?? 0));
    expect(stones(r)).toBe(before - recipe.stones);
  });

  it('hỏng lò vẫn mất nguyên liệu - đó mới là cái giá của việc thử', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // hỏng, và không vớt được gì
    const recipe = RECIPES.trung;
    seed({ stonesBonus: 500, herbs: { thanh_diep: 9, huyet_tinh: 9, kim_tuy: 0, tu_van: 0 } });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.refinePill('trung');
    });

    expect(r.result.current.data.pills.trung).toBe(0);
    expect(r.result.current.data.herbs.thanh_diep).toBe(9 - (recipe.herbs.thanh_diep ?? 0));
    expect(stones(r)).toBe(before - recipe.stones);
  });
});

describe('động phủ', () => {
  beforeEach(() => localStorage.clear());

  it('nâng bậc thì trừ đúng giá và lên đúng một bậc', () => {
    seed({ stonesBonus: 5000 });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.upgradeCave();
    });

    expect(r.result.current.data.caveLevel).toBe(2);
    expect(stones(r)).toBe(before - CAVE_LEVELS[1].cost);
  });

  it('hết bậc thì không nâng nữa và không mất tiền', () => {
    seed({ stonesBonus: 9000, caveLevel: CAVE_LEVELS.length });
    const r = mount();
    const before = stones(r);

    let ok = true;
    act(() => {
      ok = r.result.current.upgradeCave();
    });

    expect(ok).toBe(false);
    expect(stones(r)).toBe(before);
  });
});

describe('tông môn', () => {
  beforeEach(() => localStorage.clear());

  it('nhận sứ mệnh thì cọc bị khoá lại ngay', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.acceptMission('quet_san');
    });

    expect(r.result.current.data.mission?.id).toBe('quet_san');
    expect(stones(r)).toBe(before - MISSIONS.quet_san.stake);
  });

  it('đang gánh một sứ mệnh thì không nhận thêm được', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    act(() => {
      r.result.current.acceptMission('quet_san');
    });
    const after = stones(r);

    let ok = true;
    act(() => {
      ok = r.result.current.acceptMission('tuan_son');
    });

    expect(ok).toBe(false);
    expect(r.result.current.data.mission?.id).toBe('quet_san');
    expect(stones(r)).toBe(after);
  });

  it('chưa đủ bậc thì không nhận được sứ mệnh của hàng trưởng lão', () => {
    seed({ stonesBonus: 5000 });
    const r = mount();

    let ok = true;
    act(() => {
      ok = r.result.current.acceptMission('tru_ma');
    });

    expect(ok).toBe(false);
    expect(r.result.current.data.mission).toBeUndefined();
  });

  it('phục mệnh thì lấy lại cọc, cộng thưởng và cộng cống hiến', () => {
    const m = MISSIONS.quet_san;
    seed({ stonesBonus: 500, tasks: doneTasks(m.tasks) });
    const r = mount();

    act(() => {
      r.result.current.acceptMission('quet_san');
    });
    const afterAccept = stones(r);

    // Mốc đo là số việc đã xong tại lúc nhận, nên phải xong thêm `m.tasks` việc
    // nữa mới đạt. Lùi mốc về 0 để giả lập đã làm đủ.
    act(() => {
      r.result.current.replaceAll({
        ...r.result.current.data,
        mission: { ...r.result.current.data.mission!, startTasks: 0 },
      });
    });

    let met: boolean | undefined;
    act(() => {
      met = r.result.current.settleMission()?.met;
    });

    expect(met).toBe(true);
    expect(r.result.current.data.mission).toBeUndefined();
    expect(r.result.current.data.contribution).toBe(m.contribution);
    expect(stones(r)).toBe(afterAccept + m.stake + m.reward);
  });

  it('trượt thì mất cọc và không được cống hiến nào', () => {
    seed({ stonesBonus: 500 });
    const r = mount();

    act(() => {
      r.result.current.acceptMission('quet_san');
    });
    const afterAccept = stones(r);

    let met: boolean | undefined;
    act(() => {
      met = r.result.current.settleMission()?.met;
    });

    expect(met).toBe(false);
    expect(r.result.current.data.mission).toBeUndefined();
    expect(r.result.current.data.contribution).toBe(0);
    expect(stones(r)).toBe(afterAccept);
  });
});

describe('thám hiểm', () => {
  beforeEach(() => localStorage.clear());

  it('lên đường thì trừ phí và ghi lại chuyến đi', () => {
    seed({ stonesBonus: 500 });
    const r = mount();
    const before = stones(r);

    act(() => {
      r.result.current.startExpedition('linh_thao_coc');
    });

    expect(r.result.current.data.expedition?.site).toBe('linh_thao_coc');
    expect(stones(r)).toBe(before - SITES.linh_thao_coc.cost);
  });

  it('đoàn chưa về thì không đón được, chuyến đi vẫn còn nguyên', () => {
    seed({
      stonesBonus: 500,
      expedition: {
        site: 'linh_thao_coc',
        startedAtTasks: 0,
        startedAt: new Date().toISOString(),
      },
    });
    const r = mount();

    let out: unknown = 'chưa gọi';
    act(() => {
      out = r.result.current.resolveExpedition();
    });

    expect(out).toBeNull();
    expect(r.result.current.data.expedition).toBeDefined();
  });

  it('đoàn về thì chuyến đi kết thúc và thu hoạch được cộng vào', () => {
    const site = SITES.linh_thao_coc;
    seed({
      stonesBonus: 500,
      tasks: doneTasks(site.needTasks),
      expedition: {
        site: 'linh_thao_coc',
        startedAtTasks: 0,
        startedAt: new Date().toISOString(),
      },
    });
    const r = mount();
    const beforeHerbs = r.result.current.data.herbs.thanh_diep;

    let label: string | undefined;
    act(() => {
      label = r.result.current.resolveExpedition()?.label;
    });

    expect(label).toBeTruthy();
    expect(r.result.current.data.expedition).toBeUndefined();
    // Mọi kết cục của Linh Thảo Cốc đều cho thứ gì đó - nơi an toàn không có
    // đường thua, nên thu hoạch không bao giờ rỗng tay hoàn toàn.
    const gainedSomething =
      r.result.current.data.herbs.thanh_diep > beforeHerbs ||
      r.result.current.data.stonesBonus > 500 ||
      r.result.current.data.encounterXp > 0;
    expect(gainedSomething).toBe(true);
  });
});

describe('hòm kỳ ngộ', () => {
  beforeEach(() => localStorage.clear());

  /** Nhiệm vụ đã xong trong HÔM NAY - mốc hòm chỉ xét ngày hiện tại. */
  const doneToday = (n: number): Task[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `today${i}`,
      title: `việc ${i}`,
      note: '',
      date: todayKey(),
      priority: 'low',
      status: 'done',
      tags: [],
      estimateMin: 30,
      focusMin: 0,
      subtasks: [],
      recurrence: 'none',
      createdAt: `${todayKey()}T08:00:00`,
      completedAt: `${todayKey()}T09:00:00`,
    }));

  it('chưa đạt mốc thì không mở được, và không có gì đổi', () => {
    seed({ stonesBonus: 100 });
    const r = mount();
    const before = r.result.current.data;

    let out: unknown = 'chưa gọi';
    act(() => {
      out = r.result.current.openChest('first');
    });

    expect(out).toBeNull();
    expect(r.result.current.data.chestsOpened).toHaveLength(0);
    expect(r.result.current.data.stonesBonus).toBe(before.stonesBonus);
  });

  it('xong một việc thì mở được, và thứ moi ra được cộng vào thật', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // luôn ra món đầu bảng
    seed({ stonesBonus: 100, tasks: doneToday(1) });
    const r = mount();

    let label: string | undefined;
    act(() => {
      label = r.result.current.openChest('first')?.loot.label;
    });

    expect(label).toBeTruthy();
    expect(r.result.current.data.chestsOpened).toHaveLength(1);
    // Món đầu bảng hòm gỗ là túi đá vụn - phải thấy linh thạch tăng lên.
    expect(r.result.current.data.stonesBonus).toBeGreaterThan(100);
  });

  it('mở hai lần cùng một hòm thì lần sau không được gì nữa', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    seed({ stonesBonus: 100, tasks: doneToday(1) });
    const r = mount();

    act(() => {
      r.result.current.openChest('first');
    });
    const afterFirst = r.result.current.data.stonesBonus;

    let second: unknown = 'chưa gọi';
    act(() => {
      second = r.result.current.openChest('first');
    });

    expect(second).toBeNull();
    expect(r.result.current.data.chestsOpened).toHaveLength(1);
    expect(r.result.current.data.stonesBonus).toBe(afterFirst);
  });

  it('mốc chưa tới thì vẫn khoá, dù mốc thấp hơn đã mở', () => {
    seed({ stonesBonus: 100, tasks: doneToday(1) });
    const r = mount();

    act(() => {
      r.result.current.openChest('first');
    });

    let out: unknown = 'chưa gọi';
    act(() => {
      out = r.result.current.openChest('five');
    });

    expect(out).toBeNull();
    expect(r.result.current.data.chestsOpened).toHaveLength(1);
  });
});
