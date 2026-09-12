import { describe, expect, it } from 'vitest';
import type { AppData, Task } from '../types';
import { emptyData } from '../lib/storage';
import { rebuildLedger } from '../lib/integrity';
import { addDays, dateKey } from '../lib/date';
import { stoneBreakdown, tribulationLoss, xpBreakdown } from '../lib/economy';
import {
  TECHNIQUES, TECHNIQUE_ORDER, techniqueMuls, techniqueSwapCost,
} from '../lib/techniques';
import { HERBS, HERB_ORDER, hasHerbs, plotState } from '../lib/field';
import type { FieldPlot } from '../lib/field';
import { CAVE_LEVELS, MAX_CAVE_LEVEL, caveRefineBonus, fieldSlots, nextCave } from '../lib/cave';
import { RECIPES, consolationGrade, refineChance } from '../lib/pills';
import { condenseCost, condenseRoot, refineRoot } from '../lib/spirit';
import { SITES, SITE_ORDER, expectedXp, expeditionState, rollSiteOutcome } from '../lib/expedition';
import type { Expedition } from '../lib/expedition';
import {
  MAX_RANK, MISSIONS, MISSION_ORDER, RANKS, missionState, nextRank, rankOf, rankRatio, timeLeftLabel,
} from '../lib/sect';
import type { ActiveMission } from '../lib/sect';
import type { SpiritRoot } from '../lib/spirit';

const at = (offset: number) => dateKey(addDays(new Date(), offset));

/**
 * Ba hàm trạng thái trả `null` khi gặp id không còn tồn tại. Trong tệp này mọi
 * id đều hợp lệ nên không bao giờ null - bọc lại cho các bài đọc gọn, và nếu
 * có ngày nào null thật thì bài sẽ đỏ ngay chứ không lặng lẽ bỏ qua.
 */
function must<T>(v: T | null, what: string): T {
  if (v === null) throw new Error(`${what} trả null với dữ liệu hợp lệ`);
  return v;
}

const plotAt = (...a: Parameters<typeof plotState>) => must(plotState(...a), 'plotState');
const tripAt = (...a: Parameters<typeof expeditionState>) =>
  must(expeditionState(...a), 'expeditionState');
const missionAt = (...a: Parameters<typeof missionState>) =>
  must(missionState(...a), 'missionState');


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

/** Dựng AppData như app thật: sổ ghi ký lại, vì tu vi bị kẹp theo sổ đã xác thực. */
function appData(over: Partial<AppData> = {}): AppData {
  const data: AppData = { ...emptyData(), gateRealm: 9, ...over };
  return { ...data, ledger: rebuildLedger(data) };
}

// ---------------------------------------------------------------- công pháp

describe('công pháp', () => {
  it('chưa chọn thì mọi tỷ giá giữ nguyên', () => {
    expect(techniqueMuls(undefined)).toEqual({ taskMul: 1, focusMul: 1, stoneMul: 1, lossMul: 1 });
  });

  it('lần chọn đầu miễn phí, đổi càng nhiều càng đắt', () => {
    expect(techniqueSwapCost(0)).toBeLessThan(techniqueSwapCost(1));
    expect(techniqueSwapCost(1)).toBeLessThan(techniqueSwapCost(2));
  });

  it('công pháp nào cũng phải có chỗ thiệt, không có cái nào toàn lợi', () => {
    for (const id of TECHNIQUE_ORDER) {
      const t = TECHNIQUES[id];
      const gains = [t.taskMul > 1, t.focusMul > 1, t.stoneMul > 1, t.lossMul < 1];
      const losses = [t.taskMul < 1, t.focusMul < 1, t.stoneMul < 1, t.lossMul > 1];
      expect(gains.some(Boolean)).toBe(true);
      expect(losses.some(Boolean)).toBe(true);
    }
  });

  it('Thuỷ Vân ăn bế quan, Kim Cang ăn nhiệm vụ - đúng chỗ đảo ngược nhau', () => {
    const sessions = [{ id: 's1', date: at(-1), minutes: 300, startedAt: `${at(-1)}T09:00:00` }];
    const onlyFocus = (technique: AppData['technique']) =>
      xpBreakdown(appData({ sessions, technique })).total;

    const tasks = Array.from({ length: 12 }, (_, i) =>
      task({ id: `t${i}`, status: 'done', completedAt: `${at(-1)}T10:00:00`, date: at(-1) }),
    );
    const onlyTasks = (technique: AppData['technique']) =>
      xpBreakdown(appData({ tasks, technique })).total;

    expect(onlyFocus('thuy_van')).toBeGreaterThan(onlyFocus(undefined));
    expect(onlyFocus('kim_cang')).toBeLessThan(onlyFocus(undefined));
    expect(onlyTasks('kim_cang')).toBeGreaterThan(onlyTasks(undefined));
    expect(onlyTasks('thuy_van')).toBeLessThan(onlyTasks(undefined));
  });

  it('Hậu Thổ cho thêm linh thạch, Phá Chấp thì bớt', () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      task({ id: `t${i}`, status: 'done', completedAt: `${at(-1)}T10:00:00`, date: at(-1) }),
    );
    const stones = (technique: AppData['technique']) =>
      stoneBreakdown(appData({ tasks, technique })).earned;

    expect(stones('hau_tho')).toBeGreaterThan(stones(undefined));
    expect(stones('pha_chap')).toBeLessThan(stones(undefined));
  });

  it('Phá Chấp mất đau hơn khi độ kiếp hỏng, Hậu Thổ đỡ đòn giỏi hơn', () => {
    const sessions = [{ id: 's1', date: at(-1), minutes: 600, startedAt: `${at(-1)}T09:00:00` }];
    const loss = (technique: AppData['technique']) =>
      tribulationLoss(appData({ sessions, technique, gateRealm: 0 }));

    expect(loss('pha_chap')).toBeGreaterThan(loss(undefined));
    expect(loss('hau_tho')).toBeLessThan(loss(undefined));
  });
});

// ---------------------------------------------------------------- linh điền

describe('linh điền', () => {
  const plot = (over: Partial<FieldPlot> = {}): FieldPlot => ({
    slot: 0,
    herb: 'thanh_diep',
    plantedAtFocus: 100,
    plantedAt: new Date().toISOString(),
    ...over,
  });

  it('cây lớn theo phút bế quan tích được kể từ lúc gieo', () => {
    const s = plotAt(plot(), 130);
    expect(s.grown).toBe(30);
    expect(s.need).toBe(HERBS.thanh_diep.needFocus);
    expect(s.ready).toBe(false);
    expect(s.remain).toBe(HERBS.thanh_diep.needFocus - 30);
  });

  it('đủ phút thì chín', () => {
    const s = plotAt(plot(), 100 + HERBS.thanh_diep.needFocus);
    expect(s.ready).toBe(true);
    expect(s.ratio).toBe(1);
    expect(s.remain).toBe(0);
  });

  it('tổng phút tụt xuống thì cây về 0 chứ không âm', () => {
    // Sổ ghi có thể hạ tổng phút nếu phát hiện dữ liệu bị sửa. Lúc ấy cây coi
    // như vừa gieo, không được ra số âm rồi tính ra tỷ lệ quái đản.
    const s = plotAt(plot({ plantedAtFocus: 500 }), 10);
    expect(s.grown).toBe(0);
    expect(s.ratio).toBe(0);
    expect(s.ready).toBe(false);
  });

  it('thảo dược càng quý càng phải bế quan lâu và hạt càng đắt', () => {
    for (let i = 1; i < HERB_ORDER.length; i++) {
      const prev = HERBS[HERB_ORDER[i - 1]];
      const cur = HERBS[HERB_ORDER[i]];
      expect(cur.needFocus).toBeGreaterThan(prev.needFocus);
      expect(cur.seedCost).toBeGreaterThan(prev.seedCost);
    }
  });

  it('đếm đủ nguyên liệu mới cho luyện', () => {
    expect(hasHerbs({ thanh_diep: 2 }, { thanh_diep: 2 })).toBe(true);
    expect(hasHerbs({ thanh_diep: 1 }, { thanh_diep: 2 })).toBe(false);
    expect(hasHerbs({ thanh_diep: 9 }, { thanh_diep: 1, huyet_tinh: 1 })).toBe(false);
    expect(hasHerbs({}, {})).toBe(true);
  });
});

// ----------------------------------------------------------------- động phủ

describe('động phủ', () => {
  it('bậc càng cao càng nhiều ô đất và luyện đan càng chắc tay', () => {
    for (let i = 1; i < CAVE_LEVELS.length; i++) {
      expect(CAVE_LEVELS[i].plots).toBeGreaterThan(CAVE_LEVELS[i - 1].plots);
      expect(CAVE_LEVELS[i].refineBonus).toBeGreaterThan(CAVE_LEVELS[i - 1].refineBonus);
      expect(CAVE_LEVELS[i].cost).toBeGreaterThan(CAVE_LEVELS[i - 1].cost);
    }
  });

  it('bậc đầu miễn phí - ai cũng bắt đầu từ đó', () => {
    expect(CAVE_LEVELS[0].cost).toBe(0);
  });

  it('bậc ngoài khoảng thì kẹp lại chứ không vỡ', () => {
    expect(fieldSlots(0)).toBe(CAVE_LEVELS[0].plots);
    expect(fieldSlots(99)).toBe(CAVE_LEVELS[MAX_CAVE_LEVEL - 1].plots);
    expect(caveRefineBonus(-5)).toBe(0);
  });

  it('tới bậc cao nhất thì hết đường nâng', () => {
    expect(nextCave(1)?.level).toBe(2);
    expect(nextCave(MAX_CAVE_LEVEL)).toBeNull();
  });
});

// ---------------------------------------------------------------- luyện đan

describe('luyện đan', () => {
  it('đan càng quý thì đơn thuốc càng nặng và càng dễ hỏng', () => {
    expect(RECIPES.thuong.base).toBeLessThan(RECIPES.trung.base);
    expect(RECIPES.trung.base).toBeLessThan(RECIPES.ha.base);
    expect(RECIPES.thuong.stones).toBeGreaterThan(RECIPES.trung.stones);
  });

  it('động phủ và linh căn hệ Hoả đều cộng vào tay nghề', () => {
    const plain = refineChance('trung', 0, false);
    expect(refineChance('trung', 0.16, false)).toBeGreaterThan(plain);
    expect(refineChance('trung', 0, true)).toBeGreaterThan(plain);
  });

  it('tỷ lệ luôn nằm trong khoảng còn chơi được', () => {
    expect(refineChance('thuong', 10, true)).toBeLessThanOrEqual(0.95);
    expect(refineChance('thuong', -10, false)).toBeGreaterThanOrEqual(0.05);
  });

  it('hỏng lò thì vớt được phẩm thấp hơn một bậc, đáy thì mất trắng', () => {
    expect(consolationGrade('thuong')).toBe('trung');
    expect(consolationGrade('trung')).toBe('ha');
    expect(consolationGrade('ha')).toBeNull();
  });
});

// ---------------------------------------------------------------- thám hiểm

describe('thám hiểm', () => {
  const trip = (over: Partial<Expedition> = {}): Expedition => ({
    site: 'co_thap',
    startedAtTasks: 10,
    startedAt: new Date().toISOString(),
    ...over,
  });

  it('đoàn về theo số nhiệm vụ xong kể từ lúc lên đường', () => {
    const s = tripAt(trip(), 14);
    expect(s.done).toBe(4);
    expect(s.need).toBe(SITES.co_thap.needTasks);
    expect(s.ready).toBe(false);
    expect(s.remain).toBe(SITES.co_thap.needTasks - 4);
  });

  it('đủ nhiệm vụ thì đoàn về', () => {
    const s = tripAt(trip(), 10 + SITES.co_thap.needTasks);
    expect(s.ready).toBe(true);
    expect(s.ratio).toBe(1);
  });

  it('số nhiệm vụ tụt xuống thì coi như vừa khởi hành, không ra số âm', () => {
    const s = tripAt(trip({ startedAtTasks: 99 }), 3);
    expect(s.done).toBe(0);
    expect(s.ratio).toBe(0);
  });

  it('nơi càng liều thì đi càng lâu và càng đắt', () => {
    for (let i = 1; i < SITE_ORDER.length; i++) {
      const prev = SITES[SITE_ORDER[i - 1]];
      const cur = SITES[SITE_ORDER[i]];
      expect(cur.needTasks).toBeGreaterThan(prev.needTasks);
      expect(cur.cost).toBeGreaterThan(prev.cost);
    }
  });

  it('nơi liều phải có đường thua thật, không thể chỉ toàn thưởng', () => {
    for (const id of ['co_thap', 'u_minh', 'bach_cot'] as const) {
      expect(SITES[id].outcomes.some((o) => o.tone === 'bad')).toBe(true);
    }
    // Chỗ an toàn thì ngược lại: không được có kết cục tệ nào.
    expect(SITES.linh_thao_coc.outcomes.every((o) => o.tone !== 'bad')).toBe(true);
  });

  it('bốc kết quả theo đúng trọng số, đầu dãy và cuối dãy đều với tới được', () => {
    const site = SITES.linh_thao_coc;
    expect(rollSiteOutcome(site, () => 0)).toBe(site.outcomes[0]);
    expect(rollSiteOutcome(site, () => 0.999999)).toBe(site.outcomes[site.outcomes.length - 1]);
  });

  it('càng liều thì kỳ vọng tu vi càng cao - nếu không thì chẳng ai liều', () => {
    for (let i = 1; i < SITE_ORDER.length; i++) {
      expect(expectedXp(SITES[SITE_ORDER[i]])).toBeGreaterThan(expectedXp(SITES[SITE_ORDER[i - 1]]));
    }
  });
});

// ----------------------------------------------------------------- tông môn

describe('tông môn', () => {
  const mission = (over: Partial<ActiveMission> = {}): ActiveMission => ({
    id: 'tuan_son',
    startTasks: 5,
    startFocus: 100,
    acceptedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    dueAt: new Date('2026-01-08T00:00:00Z').toISOString(),
    stake: MISSIONS.tuan_son.stake,
    ...over,
  });
  const before = new Date('2026-01-05T00:00:00Z');
  const after = new Date('2026-01-09T00:00:00Z');

  it('bậc lên theo cống hiến tích luỹ', () => {
    expect(rankOf(0).level).toBe(1);
    expect(rankOf(RANKS[1].need).level).toBe(2);
    expect(rankOf(RANKS[1].need - 1).level).toBe(1);
    expect(rankOf(999999).level).toBe(MAX_RANK);
  });

  it('bậc càng cao càng cần nhiều cống hiến và thưởng càng đậm', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].need).toBeGreaterThan(RANKS[i - 1].need);
      expect(RANKS[i].stonePct).toBeGreaterThan(RANKS[i - 1].stonePct);
    }
  });

  it('tới Tông Chủ thì hết đường lên', () => {
    expect(nextRank(0)?.level).toBe(2);
    expect(nextRank(999999)).toBeNull();
    expect(rankRatio(999999)).toBe(1);
  });

  it('tiến độ trong bậc nằm gọn trong 0..1', () => {
    for (const c of [0, 50, 120, 399, 400, 2400, 9999]) {
      const r = rankRatio(c);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it('đo phần làm được kể từ lúc nhận, không tính công cũ', () => {
    const s = missionAt(mission(), 17, 100, before);
    expect(s.doneTasks).toBe(12);
    expect(s.doneFocus).toBe(0);
  });

  it('sứ mệnh đòi cả hai mặt thì tiến độ lấy mặt chậm nhất', () => {
    // Toạ Quan đòi cả nhiệm vụ lẫn bế quan: xong hết việc mà chưa ngồi đủ thì
    // vẫn chưa phục mệnh được.
    const m = MISSIONS.toa_quan;
    const s = missionAt(
      mission({ id: 'toa_quan', startTasks: 0, startFocus: 0 }),
      m.tasks,
      0,
      before,
    );
    expect(s.ratio).toBe(0);
    expect(s.met).toBe(false);
  });

  it('đạt đủ mọi chỉ tiêu thì phục mệnh được', () => {
    const m = MISSIONS.toa_quan;
    const s = missionAt(
      mission({ id: 'toa_quan', startTasks: 0, startFocus: 0 }),
      m.tasks,
      m.focus,
      before,
    );
    expect(s.met).toBe(true);
    expect(s.expired).toBe(false);
  });

  it('quá hạn mà chưa đạt thì tính là trượt', () => {
    const s = missionAt(mission(), 6, 100, after);
    expect(s.met).toBe(false);
    expect(s.expired).toBe(true);
    expect(s.msLeft).toBeLessThan(0);
  });

  it('đã đạt rồi thì quá hạn cũng không bị coi là trượt', () => {
    // Làm xong trước hạn nhưng mở app muộn mới bấm phục mệnh - không được phạt.
    const s = missionAt(mission(), 5 + MISSIONS.tuan_son.tasks, 100, after);
    expect(s.met).toBe(true);
    expect(s.expired).toBe(false);
  });

  it('số đã xác thực tụt xuống thì coi như vừa nhận, không ra số âm', () => {
    const s = missionAt(mission({ startTasks: 99, startFocus: 999 }), 3, 10, before);
    expect(s.doneTasks).toBe(0);
    expect(s.doneFocus).toBe(0);
  });

  it('sứ mệnh nặng hơn thì cọc, thưởng và cống hiến đều phải nhiều hơn', () => {
    for (let i = 1; i < MISSION_ORDER.length; i++) {
      const prev = MISSIONS[MISSION_ORDER[i - 1]];
      const cur = MISSIONS[MISSION_ORDER[i]];
      expect(cur.stake).toBeGreaterThan(prev.stake);
      expect(cur.contribution).toBeGreaterThan(prev.contribution);
      expect(cur.reward).toBeGreaterThan(prev.reward);
    }
  });

  it('làm xong luôn có lãi - nếu không thì nhận sứ mệnh là dại', () => {
    for (const id of MISSION_ORDER) {
      expect(MISSIONS[id].reward).toBeGreaterThan(0);
      expect(MISSIONS[id].contribution).toBeGreaterThan(0);
    }
  });

  it('nhãn thời gian nói rõ còn hạn hay đã quá', () => {
    expect(timeLeftLabel(2 * 86400000 + 3600000)).toContain('còn');
    expect(timeLeftLabel(-3600000)).toContain('quá hạn');
  });
});

// ------------------------------------------------------------------ tẩy tuỷ

describe('tẩy tuỷ', () => {
  const root = (elements: SpiritRoot['elements']): SpiritRoot => ({
    elements,
    rolledAt: new Date().toISOString(),
  });

  it('đổi hệ thì giữ nguyên số hệ, nên phẩm cấp không đổi', () => {
    const next = refineRoot(root(['kim', 'thuy']), 'kim', 'hoa');
    expect(next?.elements).toHaveLength(2);
    expect(next?.elements).toContain('hoa');
    expect(next?.elements).not.toContain('kim');
  });

  it('giữ đúng thứ tự ngũ hành sau khi đổi', () => {
    expect(refineRoot(root(['kim', 'tho']), 'kim', 'moc')?.elements).toEqual(['moc', 'tho']);
  });

  it('không đổi được hệ không có, cũng không nhân đôi hệ đã có', () => {
    expect(refineRoot(root(['kim']), 'thuy', 'hoa')).toBeNull();
    expect(refineRoot(root(['kim', 'hoa']), 'kim', 'hoa')).toBeNull();
  });

  it('ngưng luyện bỏ bớt một hệ để lên phẩm', () => {
    expect(condenseRoot(root(['kim', 'moc', 'thuy']), 'moc')?.elements).toEqual(['kim', 'thuy']);
  });

  it('đơn hệ đã là tận cùng, không ngưng thêm được nữa', () => {
    expect(condenseRoot(root(['kim']), 'kim')).toBeNull();
  });

  it('càng thuần thì mỗi bước ngưng luyện càng đắt', () => {
    expect(condenseCost(5)).toBeLessThan(condenseCost(4));
    expect(condenseCost(4)).toBeLessThan(condenseCost(3));
    expect(condenseCost(3)).toBeLessThan(condenseCost(2));
  });
});
