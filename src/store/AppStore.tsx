import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useServerSync } from './useServerSync';
import type { ServerSync } from './useServerSync';
import { LENH } from './lenh';
import type { AppData, FocusSession, Goal, Settings, Status, Task } from '../types';
import { GOAL_COLORS } from '../types';
import { addDays, dateKey, parseKey, todayKey } from '../lib/date';
import { loadData, saveData, storageLoadError, clearStorageLoadError, uid } from '../lib/storage';
import { seedData } from '../lib/seed';
import { effectiveXp, stoneBalance, verifiedFocusMinutes, verifiedTaskCount } from '../lib/economy';
import { cultivationOf, realmLabel } from '../lib/cultivation';
import { ACHIEVEMENTS, isPerfectDay, unlockedIds } from '../lib/achievements';
import { dayStats } from '../lib/stats';
import { FEED_COST, FEED_GAIN, DUPLICATE_FEED, SUMMON_COST, summonBeast } from '../lib/beasts';
import type { Beast } from '../lib/beasts';
import { ELEMENTS, REFINE_COST, REROLL_COST, condenseCost, condenseRoot, refineRoot, rollRoot } from '../lib/spirit';
import type { Element, SpiritRoot } from '../lib/spirit';
import { CONSOLATION_CHANCE, PILLS, RECIPES, consolationGrade, refineChance, tribulationChance } from '../lib/pills';
import type { PillGrade } from '../lib/pills';
import { TECHNIQUES, techniqueSwapCost } from '../lib/techniques';
import type { TechniqueId } from '../lib/techniques';
import { HERBS, HERB_ORDER, hasHerbs, plotState } from '../lib/field';
import type { HerbId } from '../lib/field';
import { caveRefineBonus, fieldSlots, nextCave } from '../lib/cave';
import { SITES, expeditionState, rollSiteOutcome } from '../lib/expedition';
import { MISSIONS, dueDateOf, missionState, rankOf } from '../lib/sect';
import { chestKey, chestsForDay, rollLoot } from '../lib/chest';
import type { ChestGrade, Loot } from '../lib/chest';
import type { Mission, MissionId } from '../lib/sect';
import type { SiteId, SiteOutcome } from '../lib/expedition';
import { progressOf, tribulationLoss } from '../lib/economy';
import { ASCENSION_INDEX, REALMS } from '../lib/cultivation';
import { ENCOUNTER_CHANCE, pickEncounter, rollOutcome } from '../lib/encounters';
import type { Encounter, Outcome } from '../lib/encounters';
import { checkComplete, checkSession, clampEstimate } from '../lib/validation';
import { appendEntry, auditData, dropEntries, rebuildLedger, taskValue } from '../lib/integrity';
import type { Audit } from '../lib/integrity';
import { beastLevel, MAX_BEAST_LEVEL } from '../lib/beasts';
import {
  burstBig, burstRain, burstTier, setSoundEnabled, soundAchievement, soundAscend, soundComplete,
  soundLevelUp, soundPerfectDay,
} from '../lib/celebrate';

/** Khoảnh khắc đáng ăn mừng, hiện thành lớp phủ toàn màn hình. */
export type Celebration =
  | { kind: 'tier-up'; label: string; realmIndex: number; xp: number }
  | { kind: 'realm-up'; realm: string; note: string; realmIndex: number; xp: number }
  | { kind: 'ascension'; xp: number }
  | { kind: 'awaken'; root: SpiritRoot }
  | { kind: 'summon'; beastId: string; duplicate: boolean }
  | { kind: 'tribulation-failed'; loss: number; nextChance: number; realm: string }
  | { kind: 'perfect-day'; count: number }
  | { kind: 'achievement'; id: string; title: string; description: string };

/** Thứ moi được từ một hòm kỳ ngộ, kèm phẩm cấp hòm để UI tô đúng màu. */
export interface ChestResult {
  loot: Loot;
  grade: ChestGrade;
}

/** Kết quả kết toán một sứ mệnh tông môn. */
export interface MissionResult {
  met: boolean;
  mission: Mission;
  /** Cống hiến nhận thêm, 0 nếu trượt */
  contribution: number;
  /** Linh thạch thu về, gồm cả phần cọc trả lại. 0 nếu trượt */
  stones: number;
  /** Lên bậc mới hay không */
  rankedUp: boolean;
}

/** Kết quả một mẻ đan: hỏng vẫn có thể vớt được phẩm thấp hơn một bậc. */
export interface RefineResult {
  success: boolean;
  /** Viên thực nhận, hoặc `null` nếu cháy sạch */
  got: PillGrade | null;
  /** Tỷ lệ đã dùng để bốc - hiện lại cho người dùng đối chiếu */
  chance: number;
}

interface Ctx {
  data: AppData;
  storageError: string | null;
  retrySave: () => void;
  /** Tình trạng nối với server trọng tài. `status: 'tat'` là đang chạy một mình. */
  sync: ServerSync;
  /** Giờ mở app lần trước, chụp trước khi bị ghi đè. Rỗng nếu là lần đầu chạy. */
  lastVisitAt: string;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  /** Kỳ ngộ đang chờ người tu quyết định */
  /** Kết quả kiểm tra toàn vẹn dữ liệu, tính lại mỗi khi dữ liệu đổi */
  audit: Audit;
  /** Ký lại sổ ghi theo dữ liệu hiện tại (người dùng chấp nhận trạng thái này) */
  resealLedger: () => void;
  encounter: Encounter | null;
  resolveEncounter: (optionIndex: number) => Outcome | null;
  dismissEncounter: () => void;
  notify: (message: string, tone?: 'ok' | 'warn') => void;
  addTask: (input: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  /** Trả về false nếu bị chặn vì không hợp lý (ví dụ việc của ngày mai). */
  setStatus: (id: string, status: Status) => boolean;
  /** Trả về false nếu bị chặn; true nếu đã đổi trạng thái. */
  toggleDone: (id: string) => boolean;
  moveTask: (id: string, date: string) => void;
  duplicateTask: (id: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  pushOverdueToToday: () => number;
  clearDone: (before?: string) => number;
  addGoal: (input: Partial<Goal> & { title: string }) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  logSession: (minutes: number, taskId?: string) => void;
  awaken: () => SpiritRoot;
  rerollRoot: () => SpiritRoot | null;
  summon: () => Beast | null;
  feedBeast: (id: string) => boolean;
  setActiveBeast: (id?: string) => void;
  buyPill: (grade: PillGrade, qty?: number) => boolean;
  /** Chọn hoặc đổi công pháp. Lần chọn đầu miễn phí, đổi thì mỗi lần một đắt. */
  pickTechnique: (id: TechniqueId) => boolean;
  /** Gieo hạt vào một ô linh điền. */
  plantSeed: (slot: number, herb: HerbId) => boolean;
  /** Hái ô đã chín. Chưa đủ phút bế quan thì không hái được. */
  harvestPlot: (slot: number) => boolean;
  /** Luyện đan: tốn linh thảo và củi lửa, và có thể hỏng lò. */
  refinePill: (grade: PillGrade) => RefineResult | null;
  /** Tẩy tuỷ: đổi một hệ trong linh căn sang hệ khác, phẩm cấp giữ nguyên. */
  refineRootElement: (from: Element, to: Element) => boolean;
  /** Ngưng luyện: bỏ bớt một hệ để linh căn thuần hơn, đổi lại mất thiên phú. */
  condenseRootElement: (drop: Element) => boolean;
  /** Nâng bậc động phủ: mở thêm ô linh điền và tăng tay nghề luyện đan. */
  upgradeCave: () => boolean;
  /** Lên đường tới một bí cảnh. Mỗi lúc chỉ đi được một nơi. */
  startExpedition: (site: SiteId) => boolean;
  /** Đón đoàn về và bốc kết quả. Chưa đủ nhiệm vụ thì chưa về được. */
  resolveExpedition: () => SiteOutcome | null;
  /** Mở một hòm kỳ ngộ đã có. Trả về thứ moi được, hoặc `null` nếu chưa có hòm. */
  openChest: (ruleId: string) => ChestResult | null;
  /** Nhận một sứ mệnh tông môn, đặt cọc linh thạch. */
  acceptMission: (id: MissionId) => boolean;
  /** Kết toán sứ mệnh: đạt thì lấy cọc và thưởng, chưa đạt thì mất cọc. */
  settleMission: () => MissionResult | null;
  /** Độ kiếp: nuốt đan, bốc xác suất. Trả về true nếu vượt qua. */
  attemptTribulation: (grade: PillGrade) => boolean | null;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: AppData) => void;
  loadSample: () => void;
  resetAll: () => void;
}

const AppContext = createContext<Ctx | null>(null);

/**
 * Bọc mọi hành động lại: chạy như cũ, rồi gửi lệnh tương ứng lên server.
 *
 * Thứ tự quan trọng - **tính ở máy trước, gửi sau**. Nhờ vậy màn hình đổi ngay
 * lúc bấm, không chờ mạng, và lệnh chỉ được gửi khi chính web cũng thấy hợp lệ.
 *
 * Ép kiểu ở đây là chỗ duy nhất trong file: bọc kiểu này giữ nguyên chữ ký của
 * từng hàm nhưng TypeScript không theo nổi qua một vòng lặp trên `Record`.
 */
function bocLenh<T extends Record<string, unknown>>(
  hanhDong: T,
  gui: (name: string, args: Record<string, unknown>) => void,
): T {
  const ra: Record<string, unknown> = { ...hanhDong };
  for (const [ten, doi] of Object.entries(LENH)) {
    const goc = hanhDong[ten];
    if (typeof goc !== 'function') continue;
    ra[ten] = (...tham: never[]) => {
      const ketQua = (goc as (...a: never[]) => unknown)(...tham);
      const args = doi(ketQua, ...tham);
      if (args) gui(ten, args);
      return ketQua;
    };
  }
  return ra as T;
}

/** Ngày kế tiếp của một nhiệm vụ lặp lại. */
function nextOccurrence(date: string, recurrence: Task['recurrence']): string | null {
  const base = parseKey(date);
  switch (recurrence) {
    case 'daily':
      return dateKey(addDays(base, 1));
    case 'weekdays': {
      let d = addDays(base, 1);
      while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
      return dateKey(d);
    }
    case 'weekly':
      return dateKey(addDays(base, 7));
    case 'monthly': {
      const d = new Date(base);
      d.setMonth(d.getMonth() + 1);
      return dateKey(d);
    }
    default:
      return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  /**
   * Dựng trạng thái khởi động một lần.
   *
   * Phải gộp chung với việc chụp `lastVisitAt`: `lastSeenAt` bị ghi đè bằng giờ
   * hiện tại ngay tại đây, nên sau đó không còn cách nào biết lần trước người
   * dùng mở app lúc nào - mà đó chính là thứ để dựng bản tóm tắt "trong lúc bạn
   * vắng mặt".
   */
  const [boot] = useState(() => {
    const loaded = loadData();
    // Empty is a valid personal profile. Sample data is an explicit Settings action.
    const base = loaded;
    // Chưa có sổ ghi (bản cũ hoặc dữ liệu mẫu) thì coi trạng thái hiện tại là
    // mốc đáng tin và ký lại từ đó.
    const ledger = base.ledger.length === 0 ? rebuildLedger(base) : base.ledger;
    return {
      data: { ...base, ledger, lastSeenAt: new Date().toISOString() },
      lastVisitAt: loaded.lastSeenAt,
    };
  });
  const [data, setData] = useState<AppData>(boot.data);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  /** Chặn giải cùng một kỳ ngộ hai lần (nhấn nhanh hai nút) */
  const resolvedRef = useRef<string | null>(null);

  const [storageError, setStorageError] = useState<string | null>(storageLoadError);
  const retrySave = useCallback(() => setStorageError(saveData(data)), [data]);
  useEffect(() => { setStorageError(saveData(data)); }, [data]);

  /*
   * Nối với server trọng tài.
   *
   * `apDung` nhận trạng thái server trả về và thay thẳng bản ở máy. Đây là chỗ
   * "server phán quyết" thành hiện thực: bản tính ở máy chỉ sống tới lúc server
   * trả lời, sau đó con số của server là con số đúng.
   */
  const sync = useServerSync(
    useCallback((doi: (truoc: AppData) => AppData) => setData((truoc) => doi(truoc)), []),
    useCallback((message: string, tone?: 'ok' | 'warn') => {
      if (tone === 'warn') toast.warning(message);
      else toast.success(message);
    }, []),
  );

  useEffect(() => {
    // Tailwind bật chế độ tối qua class `dark` trên thẻ <html>.
    document.documentElement.classList.toggle('dark', data.settings.theme === 'dark');
    document.documentElement.style.colorScheme = data.settings.theme;
  }, [data.settings.theme]);

  useEffect(() => setSoundEnabled(data.settings.soundEnabled), [data.settings.soundEnabled]);

  const notify = useCallback((message: string, tone: 'ok' | 'warn' = 'ok') => {
    if (tone === 'warn') toast.warning(message);
    else toast.success(message);
  }, []);

  const patch = useCallback((fn: (d: AppData) => AppData) => setData((prev) => fn(prev)), []);

  /**
   * So sánh trạng thái trước/sau khi tick xong một nhiệm vụ để tìm mốc đáng
   * ăn mừng. Lên cấp được ưu tiên cao nhất, rồi huy hiệu mới, rồi ngày trọn vẹn.
   */
  const detectMilestones = useCallback((before: AppData, after: AppData, dayKey: string) => {
    const found: Celebration[] = [];

    const cBefore = cultivationOf(effectiveXp(before));
    const xpAfter = effectiveXp(after);
    const cAfter = cultivationOf(xpAfter);

    if (cAfter.ascended && !cBefore.ascended) {
      found.push({ kind: 'ascension', xp: xpAfter });
    } else if (cAfter.realmIndex > cBefore.realmIndex) {
      found.push({
        kind: 'realm-up',
        realm: cAfter.realm.name,
        note: cAfter.realm.note,
        realmIndex: cAfter.realmIndex,
        xp: xpAfter,
      });
    } else if (cAfter.tier > cBefore.tier) {
      found.push({ kind: 'tier-up', label: realmLabel(cAfter), realmIndex: cAfter.realmIndex, xp: xpAfter });
    }

    const had = unlockedIds(before);
    for (const id of unlockedIds(after)) {
      if (had.has(id)) continue;
      const meta = ACHIEVEMENTS.find((a) => a.id === id);
      if (meta) found.push({ kind: 'achievement', id, title: meta.title, description: meta.description });
    }

    if (!isPerfectDay(before.tasks, dayKey) && isPerfectDay(after.tasks, dayKey)) {
      found.push({ kind: 'perfect-day', count: after.tasks.filter((t) => t.date === dayKey).length });
    }

    if (found.length) setQueue((q) => [...q, ...found]);
  }, []);

  const addTask = useCallback<Ctx['addTask']>(
    (input) => {
      const task: Task = {
        id: uid(),
        title: input.title.trim(),
        note: input.note ?? '',
        date: input.date ?? todayKey(),
        startTime: input.startTime,
        deadline: input.deadline,
        priority: input.priority ?? 'medium',
        status: input.status ?? 'todo',
        tags: input.tags ?? [],
        goalId: input.goalId,
        estimateMin: clampEstimate(input.estimateMin ?? 30),
        focusMin: 0,
        subtasks: input.subtasks ?? [],
        recurrence: input.recurrence ?? 'none',
        createdAt: new Date().toISOString(),
      };
      patch((d) => ({ ...d, tasks: [...d.tasks, task] }));
      return task;
    },
    [patch],
  );

  const updateTask = useCallback<Ctx['updateTask']>(
    (id, p) =>
      patch((d) => {
        const before = d.tasks.find((t) => t.id === id);
        const tasks = d.tasks.map((t) => (t.id === id ? { ...t, ...p } : t));
        const after = tasks.find((t) => t.id === id);

        // Sửa mức ưu tiên của một việc đã xong làm đổi giá trị tu vi của nó,
        // nên phải ký lại bản ghi kẻo sổ lệch và bị coi là gian lận.
        const needsResign =
          !!before && !!after && after.status === 'done' && taskValue(before) !== taskValue(after);

        const ledger = needsResign
          ? appendEntry(dropEntries(d.ledger, 'task', id), 'task', id, taskValue(after))
          : d.ledger;

        return { ...d, tasks, ledger };
      }),
    [patch],
  );

  const removeTask = useCallback<Ctx['removeTask']>(
    (id) =>
      patch((d) => ({
        ...d,
        tasks: d.tasks.filter((t) => t.id !== id),
        ledger: dropEntries(d.ledger, 'task', id),
      })),
    [patch],
  );

  const setStatus = useCallback<Ctx['setStatus']>(
    (id, status) => {
      const existing = data.tasks.find(t => t.id === id);
      if (!existing || existing.status === status) return false;
      // Hoàn thành thì phải hợp lý: không thể xong việc của ngày mai hôm nay.
      if (status === 'done') {
        const target = data.tasks.find((t) => t.id === id);
        if (target) {
          const violation = checkComplete(target);   // ở web, ngày của máy chính là ngày của người dùng
          if (violation?.level === 'block') {
            if (violation.fix === 'move-to-today') {
              toast.warning(violation.message, {
                action: {
                  label: 'Dời về hôm nay',
                  onClick: () =>
                    patch((d) => ({
                      ...d,
                      tasks: d.tasks.map((t) => (t.id === id ? { ...t, date: todayKey() } : t)),
                    })),
                },
                duration: 7000,
              });
            } else {
              toast.warning(violation.message);
            }
            return false;
          }
          if (violation?.level === 'warn') toast.info(violation.message);
        }
      }

      patch((d) => {
        const target = d.tasks.find((t) => t.id === id);
        if (!target || target.status === status) return d;
        const before = d;
        const updated: Task = {
          ...target,
          status,
          completedAt: status === 'done' ? new Date().toISOString() : undefined,
        };
        let tasks = d.tasks.map((t) => (t.id === id ? updated : t));

        // Nhiệm vụ lặp lại: hoàn thành xong thì tự sinh lần kế tiếp.
        if (status === 'done' && target.recurrence !== 'none') {
          const next = nextOccurrence(target.date, target.recurrence);
          const exists = next && d.tasks.some((t) => t.date === next && t.title === target.title && t.recurrence === target.recurrence);
          if (next && !exists) {
            tasks = [
              ...tasks,
              {
                ...target,
                id: uid(),
                date: next,
                status: 'todo',
                completedAt: undefined,
                focusMin: 0,
                deadline: target.deadline ? `${next}T${target.deadline.slice(11)}` : undefined,
                subtasks: target.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
                createdAt: new Date().toISOString(),
              },
            ];
          }
        }
        // Mọi thay đổi nguồn tu vi đều phải đi qua sổ ghi.
        const ledger =
          status === 'done'
            ? appendEntry(d.ledger, 'task', target.id, taskValue(target))
            : dropEntries(d.ledger, 'task', target.id);

        const next = { ...d, tasks, ledger };
        if (status === 'done') detectMilestones(before, next, target.date);
        return next;
      });
      return true;
    },
    [data.tasks, patch, detectMilestones],
  );

  const toggleDone = useCallback<Ctx['toggleDone']>(
    (id) => {
      const t = data.tasks.find((x) => x.id === id);
      if (!t) return false;
      const applied = setStatus(id, t.status === 'done' ? 'todo' : 'done');
      // Chỉ chúc mừng khi thật sự đã đổi trạng thái, không chúc mừng lúc bị chặn.
      if (applied && t.status !== 'done') notify(`Hoàn thành: ${t.title}`);
      return applied;
    },
    [data.tasks, setStatus, notify],
  );

  const moveTask = useCallback<Ctx['moveTask']>((id, date) => updateTask(id, { date }), [updateTask]);

  const duplicateTask = useCallback<Ctx['duplicateTask']>(
    (id) =>
      patch((d) => {
        const t = d.tasks.find((x) => x.id === id);
        if (!t) return d;
        return {
          ...d,
          tasks: [
            ...d.tasks,
            {
              ...t,
              id: uid(),
              title: `${t.title} (bản sao)`,
              status: 'todo',
              completedAt: undefined,
              focusMin: 0,
              subtasks: t.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }),
    [patch],
  );

  const toggleSubtask = useCallback<Ctx['toggleSubtask']>(
    (taskId, subId) =>
      patch((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }
            : t,
        ),
      })),
    [patch],
  );

  const pushOverdueToToday = useCallback<Ctx['pushOverdueToToday']>(() => {
    const today = todayKey();
    const moved = data.tasks.filter((t) => t.status !== 'done' && t.date < today);
    if (moved.length) {
      patch((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.status !== 'done' && t.date < today ? { ...t, date: today } : t)),
      }));
      notify(`Đã dời ${moved.length} nhiệm vụ quá hạn sang hôm nay`, 'warn');
    }
    return moved.length;
  }, [data.tasks, patch, notify]);

  const clearDone = useCallback<Ctx['clearDone']>(
    (before) => {
      const cutoff = before ?? todayKey();
      const victims = data.tasks.filter((t) => t.status === 'done' && t.date < cutoff);
      if (victims.length) {
        patch((d) => {
          const tasks = d.tasks.filter((t) => !(t.status === 'done' && t.date < cutoff));
          return { ...d, tasks, ledger: rebuildLedger({ tasks, sessions: d.sessions }) };
        });
        notify(`Đã dọn ${victims.length} nhiệm vụ đã xong`);
      }
      return victims.length;
    },
    [data.tasks, patch, notify],
  );

  const addGoal = useCallback<Ctx['addGoal']>(
    (input) => {
      const goal: Goal = {
        id: uid(),
        title: input.title.trim(),
        description: input.description ?? '',
        color: input.color ?? GOAL_COLORS[0],
        targetDate: input.targetDate,
        archived: false,
        createdAt: new Date().toISOString(),
      };
      patch((d) => ({ ...d, goals: [...d.goals, goal] }));
      return goal;
    },
    [patch],
  );

  const updateGoal = useCallback<Ctx['updateGoal']>(
    (id, p) => patch((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...p } : g)) })),
    [patch],
  );

  const removeGoal = useCallback<Ctx['removeGoal']>(
    (id) =>
      patch((d) => ({
        ...d,
        goals: d.goals.filter((g) => g.id !== id),
        tasks: d.tasks.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)),
      })),
    [patch],
  );

  const logSession = useCallback<Ctx['logSession']>(
    (minutes, taskId) => {
      const bad = checkSession(minutes);
      if (bad) {
        notify(bad.message, 'warn');
        return;
      }
      const session: FocusSession = {
        id: uid(),
        taskId,
        minutes,
        date: todayKey(),
        startedAt: new Date().toISOString(),
      };
      patch((d) => ({
        ...d,
        sessions: [...d.sessions, session],
        tasks: taskId ? d.tasks.map((t) => (t.id === taskId ? { ...t, focusMin: t.focusMin + minutes } : t)) : d.tasks,
        ledger: appendEntry(d.ledger, 'session', session.id, minutes),
      }));
      notify(`Đã ghi nhận ${minutes} phút tập trung`);
      // Xuất định là lúc dễ gặp biến cố nhất - đúng mô-típ tu tiên.
      if (Math.random() < ENCOUNTER_CHANCE) setEncounter(pickEncounter());
    },
    [patch, notify],
  );

  /** Chọn một hướng xử lý kỳ ngộ, bốc kết quả rồi áp dụng ngay. */
  const resolveEncounter = useCallback<Ctx['resolveEncounter']>(
    (optionIndex) => {
      if (!encounter || resolvedRef.current === encounter.id) return null;
      const option = encounter.options[optionIndex];
      if (!option) return null;
      resolvedRef.current = encounter.id;
      const outcome = rollOutcome(option);

      patch((d) => {
        switch (outcome.kind) {
          case 'stones':
            return { ...d, stonesBonus: d.stonesBonus + (outcome.amount ?? 0) };
          case 'encounterXp':
            return { ...d, encounterXp: d.encounterXp + (outcome.amount ?? 0) };
          case 'pill':
            return outcome.pill
              ? { ...d, pills: { ...d.pills, [outcome.pill]: d.pills[outcome.pill] + 1 } }
              : d;
          default:
            return d;
        }
      });
      return outcome;
    },
    [encounter, patch],
  );

  const dismissEncounter = useCallback(() => {
    resolvedRef.current = null;
    setEncounter(null);
  }, []);

  /** Khai quang linh căn - chỉ làm được một lần, sau đó phải dùng Tẩy Tuỷ Đan. */
  const awaken = useCallback<Ctx['awaken']>(() => {
    const root = rollRoot();
    patch((d) => (d.root ? d : { ...d, root }));
    setQueue((q) => [...q, { kind: 'awaken', root }]);
    return root;
  }, [patch]);

  const rerollRoot = useCallback<Ctx['rerollRoot']>(() => {
    if (stoneBalance(data) < REROLL_COST) {
      notify(`Không đủ linh thạch (cần ${REROLL_COST})`, 'warn');
      return null;
    }
    const root = rollRoot();
    patch((d) => ({ ...d, root, stonesSpent: d.stonesSpent + REROLL_COST }));
    setQueue((q) => [...q, { kind: 'awaken', root }]);
    return root;
  }, [data, patch, notify]);

  const summon = useCallback<Ctx['summon']>(() => {
    if (stoneBalance(data) < SUMMON_COST) {
      notify(`Không đủ linh thạch (cần ${SUMMON_COST})`, 'warn');
      return null;
    }
    const beast = summonBeast();
    const duplicate = data.beasts.some((b) => b.id === beast.id);
    patch((d) => ({
      ...d,
      stonesSpent: d.stonesSpent + SUMMON_COST,
      // Trùng thú thì hồn thú nhập vào con cũ thay vì nằm chết trong túi.
      beasts: duplicate
        ? d.beasts.map((b) => (b.id === beast.id ? { ...b, fed: b.fed + DUPLICATE_FEED } : b))
        : [...d.beasts, { id: beast.id, fed: 0, obtainedAt: new Date().toISOString() }],
      activeBeastId: d.activeBeastId ?? beast.id,
    }));
    setQueue((q) => [...q, { kind: 'summon', beastId: beast.id, duplicate }]);
    return beast;
  }, [data, patch, notify]);

  const feedBeast = useCallback<Ctx['feedBeast']>(
    (id) => {
      const owned = data.beasts.find((b) => b.id === id);
      if (!owned) return false;
      // Đã tối đa cấp thì không cho cho ăn nữa, kẻo tiêu linh thạch vô ích.
      if (beastLevel(owned.fed) >= MAX_BEAST_LEVEL) {
        notify('Linh thú đã đạt cấp tối đa', 'warn');
        return false;
      }
      if (stoneBalance(data) < FEED_COST) {
        notify(`Không đủ linh thạch (cần ${FEED_COST})`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + FEED_COST,
        beasts: d.beasts.map((b) => (b.id === id ? { ...b, fed: b.fed + FEED_GAIN } : b)),
      }));
      return true;
    },
    [data, patch, notify],
  );

  const setActiveBeast = useCallback<Ctx['setActiveBeast']>(
    (id) => patch((d) => ({ ...d, activeBeastId: id })),
    [patch],
  );

  const buyPill = useCallback<Ctx['buyPill']>(
    (grade, qty = 1) => {
      const cost = PILLS[grade].cost * qty;
      if (stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch (cần ${cost})`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + cost,
        pills: { ...d.pills, [grade]: d.pills[grade] + qty },
      }));
      notify(`Đã mua ${qty} viên ${PILLS[grade].name}`);
      return true;
    },
    [data, patch, notify],
  );

  // --------------------------------------------------------------- công pháp

  const pickTechnique = useCallback<Ctx['pickTechnique']>(
    (id) => {
      if (data.technique === id) return false;
      // Lần chọn đầu miễn phí. Không ai đáng bị phạt vì chưa biết mình hợp lối
      // nào; nhưng đổi tới đổi lui thì phải trả giá, kẻo công pháp thành cái
      // nút bật tắt theo tâm trạng chứ không còn là một cam kết.
      const cost = data.technique ? techniqueSwapCost(data.techniqueSwaps) : 0;
      if (cost > 0 && stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch để đổi công pháp (cần ${cost})`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        technique: id,
        techniqueSwaps: d.technique ? d.techniqueSwaps + 1 : d.techniqueSwaps,
        stonesSpent: d.stonesSpent + cost,
      }));
      notify(
        cost > 0
          ? `Đã chuyển sang ${TECHNIQUES[id].name} (-${cost} linh thạch)`
          : `Bắt đầu tu ${TECHNIQUES[id].name}`,
      );
      return true;
    },
    [data, patch, notify],
  );

  // --------------------------------------------------------------- linh điền

  const plantSeed = useCallback<Ctx['plantSeed']>(
    (slot, herb) => {
      if (slot < 0 || slot >= fieldSlots(data.caveLevel)) return false;
      if (data.field.some((pl) => pl.slot === slot)) {
        notify('Ô đất này đang có cây', 'warn');
        return false;
      }
      const cost = HERBS[herb].seedCost;
      if (stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch mua hạt (cần ${cost})`, 'warn');
        return false;
      }
      // Ghi lại mốc phút bế quan ngay lúc gieo - cây lớn tới đâu là lấy tổng
      // phút hiện tại trừ đi con số này, nên không có bộ đếm nào để chỉnh.
      const plantedAtFocus = verifiedFocusMinutes(data);
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + cost,
        field: [...d.field, { slot, herb, plantedAtFocus, plantedAt: new Date().toISOString() }],
      }));
      notify(
        `Đã gieo ${HERBS[herb].name}. Cần ${HERBS[herb].needFocus} phút bế quan nữa mới hái được.`,
      );
      return true;
    },
    [data, patch, notify],
  );

  const harvestPlot = useCallback<Ctx['harvestPlot']>(
    (slot) => {
      const plot = data.field.find((pl) => pl.slot === slot);
      if (!plot) return false;
      const state = plotState(plot, verifiedFocusMinutes(data));
      if (!state) {
        // Loại linh thảo không còn tồn tại - dọn ô đất đi, nếu không người
        // dùng kẹt vĩnh viễn với một ô không hái được mà cũng không gieo lại được.
        patch((d) => ({ ...d, field: d.field.filter((pl) => pl.slot !== slot) }));
        notify('Ô đất mang loại linh thảo không còn tồn tại, đã dọn đi', 'warn');
        return false;
      }
      if (!state.ready) {
        notify(`Còn ${state.remain} phút bế quan nữa cây mới chín`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        field: d.field.filter((pl) => pl.slot !== slot),
        herbs: { ...d.herbs, [plot.herb]: (d.herbs[plot.herb] ?? 0) + state.herb.yield },
      }));
      notify(`Hái được ${state.herb.yield} nhánh ${state.herb.name}`);
      return true;
    },
    [data, patch, notify],
  );

  // --------------------------------------------------------------- luyện đan

  const refinePill = useCallback<Ctx['refinePill']>(
    (grade) => {
      const recipe = RECIPES[grade];
      if (!hasHerbs(data.herbs, recipe.herbs)) {
        notify('Không đủ linh thảo cho đơn thuốc này', 'warn');
        return null;
      }
      if (stoneBalance(data) < recipe.stones) {
        notify(`Không đủ linh thạch mua củi lửa (cần ${recipe.stones})`, 'warn');
        return null;
      }

      const fireRoot = !!data.root?.elements.includes('hoa');
      const chance = refineChance(grade, caveRefineBonus(data.caveLevel), fireRoot);
      const success = Math.random() < chance;
      // Cháy lò vẫn còn vớt vát được phẩm thấp hơn một bậc - trồng cả chục
      // tiếng bế quan mà mất trắng cả mẻ thì cay quá.
      const salvage = success
        ? null
        : Math.random() < CONSOLATION_CHANCE
          ? consolationGrade(grade)
          : null;
      const got = success ? grade : salvage;

      patch((d) => {
        const herbs = { ...d.herbs };
        for (const id of HERB_ORDER) herbs[id] = Math.max(0, herbs[id] - (recipe.herbs[id] ?? 0));
        return {
          ...d,
          stonesSpent: d.stonesSpent + recipe.stones,
          herbs,
          pills: got ? { ...d.pills, [got]: d.pills[got] + 1 } : d.pills,
        };
      });

      if (success) notify(`Đan thành! Thu được một viên ${PILLS[grade].name}`);
      else if (got) notify(`Lò cháy quá tay, chỉ vớt được một viên ${PILLS[got].name}`, 'warn');
      else notify('Hỏng lò, cả mẻ thành tro', 'warn');

      return { success, got, chance };
    },
    [data, patch, notify],
  );

  // ----------------------------------------------------------------- tẩy tuỷ

  const refineRootElement = useCallback<Ctx['refineRootElement']>(
    (from, to) => {
      if (!data.root) return false;
      const next = refineRoot(data.root, from, to);
      if (!next) {
        notify('Không đổi được: hệ này không có trong linh căn, hoặc hệ kia đã có rồi', 'warn');
        return false;
      }
      if (stoneBalance(data) < REFINE_COST) {
        notify(`Không đủ linh thạch (cần ${REFINE_COST})`, 'warn');
        return false;
      }
      patch((d) => ({ ...d, root: next, stonesSpent: d.stonesSpent + REFINE_COST }));
      notify(`Đã tẩy hệ ${ELEMENTS[from].label} thành ${ELEMENTS[to].label}`);
      return true;
    },
    [data, patch, notify],
  );

  const condenseRootElement = useCallback<Ctx['condenseRootElement']>(
    (drop) => {
      if (!data.root) return false;
      const next = condenseRoot(data.root, drop);
      if (!next) {
        notify('Không bỏ được hệ này', 'warn');
        return false;
      }
      const cost = condenseCost(data.root.elements.length);
      if (stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch (cần ${cost})`, 'warn');
        return false;
      }
      patch((d) => ({ ...d, root: next, stonesSpent: d.stonesSpent + cost }));
      // Linh căn đổi phẩm cấp là chuyện lớn, cho hiện lớp ăn mừng như khai quang.
      setQueue((q) => [...q, { kind: 'awaken', root: next }]);
      return true;
    },
    [data, patch, notify],
  );

  // ---------------------------------------------------------------- động phủ

  const upgradeCave = useCallback<Ctx['upgradeCave']>(() => {
    const next = nextCave(data.caveLevel);
    if (!next) {
      notify('Động phủ đã ở bậc cao nhất', 'warn');
      return false;
    }
    if (stoneBalance(data) < next.cost) {
      notify(`Không đủ linh thạch (cần ${next.cost})`, 'warn');
      return false;
    }
    patch((d) => ({ ...d, caveLevel: d.caveLevel + 1, stonesSpent: d.stonesSpent + next.cost }));
    notify(`Động phủ đã mở rộng thành ${next.name}`);
    return true;
  }, [data, patch, notify]);

  // ------------------------------------------------------------ hòm kỳ ngộ

  const openChest = useCallback<Ctx['openChest']>(
    (ruleId) => {
      const key = todayKey();
      const stats = dayStats(data.tasks, data.sessions, key);
      const list = chestsForDay(
        key,
        stats.done,
        stats.focusMin,
        isPerfectDay(data.tasks, key),
        data.chestsOpened,
      );
      const chest = list.find((c) => c.rule.id === ruleId);

      // Chưa đạt mốc thì chưa có hòm; đã mở rồi thì thôi. Cả hai đều suy ra từ
      // số liệu công việc nên không thể bấm vòng lại để lấy thêm.
      if (!chest || !chest.earned || chest.opened) return null;

      const loot = rollLoot(chest.rule.grade);
      patch((d) => {
        const herbs = { ...d.herbs };
        for (const [id, n] of Object.entries(loot.herbs ?? {})) {
          const k = id as keyof typeof herbs;
          herbs[k] = Math.max(0, (herbs[k] ?? 0) + (n ?? 0));
        }
        return {
          ...d,
          chestsOpened: [...d.chestsOpened, chestKey(key, ruleId)],
          herbs,
          // Đi vào đúng hai kênh đã có cho cơ duyên, nên hồ sơ công việc thật
          // vẫn không bị đụng tới lần nào.
          stonesBonus: d.stonesBonus + (loot.stones ?? 0),
          encounterXp: d.encounterXp + (loot.xp ?? 0),
          pills: loot.pill ? { ...d.pills, [loot.pill]: d.pills[loot.pill] + 1 } : d.pills,
        };
      });

      return { loot, grade: chest.rule.grade };
    },
    [data, patch],
  );

  // ---------------------------------------------------------------- tông môn

  const acceptMission = useCallback<Ctx['acceptMission']>(
    (id) => {
      if (data.mission) {
        notify('Đang gánh một sứ mệnh chưa xong', 'warn');
        return false;
      }
      const mission = MISSIONS[id];
      const rank = rankOf(data.contribution);
      if (rank.level < mission.minRank) {
        notify(`Chưa đủ bậc để nhận sứ mệnh này`, 'warn');
        return false;
      }
      if (stoneBalance(data) < mission.stake) {
        notify(`Không đủ linh thạch đặt cọc (cần ${mission.stake})`, 'warn');
        return false;
      }

      patch((d) => ({
        ...d,
        // Cọc đi vào mục đã tiêu: nó bị khoá lại thật, xong việc mới trả về.
        stonesSpent: d.stonesSpent + mission.stake,
        mission: {
          id,
          startTasks: verifiedTaskCount(d),
          startFocus: verifiedFocusMinutes(d),
          acceptedAt: new Date().toISOString(),
          dueAt: dueDateOf(mission),
          stake: mission.stake,
        },
      }));
      notify(`Đã nhận ${mission.name}. Cọc ${mission.stake} linh thạch, hạn ${mission.days} ngày.`);
      return true;
    },
    [data, patch, notify],
  );

  const settleMission = useCallback<Ctx['settleMission']>(() => {
    if (!data.mission) return null;
    const state = missionState(
      data.mission,
      verifiedTaskCount(data),
      verifiedFocusMinutes(data),
    );
    if (!state) {
      // Sứ mệnh không còn tồn tại trong bảng - gỡ ra và trả lại cọc. Người
      // dùng không có lỗi gì ở đây, không được phạt họ vì ta đổi bảng.
      const refund = data.mission.stake;
      patch((d) => ({ ...d, mission: undefined, stonesBonus: d.stonesBonus + refund }));
      notify('Sứ mệnh này không còn nữa, đã hoàn lại tiền cọc', 'warn');
      return null;
    }
    const { mission, met } = state;
    const stake = data.mission.stake;
    const before = rankOf(data.contribution).level;
    const after = rankOf(data.contribution + (met ? mission.contribution : 0)).level;

    patch((d) => ({
      ...d,
      mission: undefined,
      contribution: d.contribution + (met ? mission.contribution : 0),
      // Đạt thì trả lại cọc và cộng thưởng; trượt thì cọc ở nguyên bên đã tiêu.
      stonesBonus: d.stonesBonus + (met ? stake + mission.reward : 0),
    }));

    if (met) notify(`Hoàn thành ${mission.name}: +${mission.contribution} cống hiến`);
    else notify(`Trượt ${mission.name}, mất ${stake} linh thạch tiền cọc`, 'warn');

    return {
      met,
      mission,
      contribution: met ? mission.contribution : 0,
      stones: met ? stake + mission.reward : 0,
      rankedUp: after > before,
    };
  }, [data, patch, notify]);

  // --------------------------------------------------------------- thám hiểm

  const startExpedition = useCallback<Ctx['startExpedition']>(
    (siteId) => {
      if (data.expedition) {
        notify('Đang có một chuyến chưa về', 'warn');
        return false;
      }
      const site = SITES[siteId];
      if (stoneBalance(data) < site.cost) {
        notify(`Không đủ linh thạch lên đường (cần ${site.cost})`, 'warn');
        return false;
      }
      // Mốc đo đường về là số nhiệm vụ đã xác thực ngay lúc này. Đoàn về sau
      // đúng `needTasks` việc nữa - đo bằng việc đã xong chứ không bằng đồng hồ.
      const startedAtTasks = verifiedTaskCount(data);
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + site.cost,
        expedition: { site: siteId, startedAtTasks, startedAt: new Date().toISOString() },
      }));
      notify(`Đã lên đường tới ${site.name}. Xong ${site.needTasks} nhiệm vụ nữa là đoàn về.`);
      return true;
    },
    [data, patch, notify],
  );

  const resolveExpedition = useCallback<Ctx['resolveExpedition']>(() => {
    if (!data.expedition) return null;
    const state = expeditionState(data.expedition, verifiedTaskCount(data));
    if (!state) {
      // Bí cảnh không còn tồn tại - kết thúc chuyến đi và hoàn phí lên đường.
      const refund = SITES[data.expedition.site]?.cost ?? 0;
      patch((d) => ({ ...d, expedition: undefined, stonesBonus: d.stonesBonus + refund }));
      notify('Bí cảnh này không còn nữa, đã kết thúc chuyến đi', 'warn');
      return null;
    }
    if (!state.ready) {
      notify(`Còn ${state.remain} nhiệm vụ nữa đoàn mới về`, 'warn');
      return null;
    }

    const outcome = rollSiteOutcome(state.site);
    patch((d) => {
      const herbs = { ...d.herbs };
      for (const [id, n] of Object.entries(outcome.herbs ?? {})) {
        const key = id as keyof typeof herbs;
        herbs[key] = Math.max(0, (herbs[key] ?? 0) + (n ?? 0));
      }
      return {
        ...d,
        expedition: undefined,
        herbs,
        // Thu hoạch đi vào đúng hai kênh đã có sẵn cho cơ duyên, nên hồ sơ công
        // việc thật vẫn không bị đụng tới lần nào.
        stonesBonus: d.stonesBonus + (outcome.stones ?? 0),
        encounterXp: d.encounterXp + (outcome.xp ?? 0),
        pills: outcome.pill ? { ...d.pills, [outcome.pill]: d.pills[outcome.pill] + 1 } : d.pills,
      };
    });
    return outcome;
  }, [data, patch, notify]);

  /**
   * Độ kiếp. Thành công thì mở cửa cảnh giới kế; thất bại thì hao tổn một nửa
   * tu vi đã tích trong cảnh giới này nhưng KHÔNG bao giờ tụt xuống cảnh giới
   * cũ, và lần sau được cộng thêm cơ hội.
   */
  const attemptTribulation = useCallback<Ctx['attemptTribulation']>(
    (grade) => {
      const p = progressOf(data);
      if (!p.readyForTribulation) {
        notify('Chưa đủ tu vi để độ kiếp', 'warn');
        return null;
      }
      if (data.pills[grade] < 1) {
        notify(`Không có ${PILLS[grade].name}`, 'warn');
        return null;
      }

      const chance = tribulationChance(grade, data.failStreak);
      const success = Math.random() < chance;
      const nextRealmIndex = Math.min(ASCENSION_INDEX, p.gateRealm + 1);
      const nextRealm = REALMS[nextRealmIndex];
      const loss = success ? 0 : tribulationLoss(data);

      patch((d) => ({
        ...d,
        pills: { ...d.pills, [grade]: d.pills[grade] - 1 },
        gateRealm: success ? nextRealmIndex : d.gateRealm,
        tuViPenalty: success ? d.tuViPenalty : d.tuViPenalty + loss,
        failStreak: success ? 0 : d.failStreak + 1,
      }));

      if (success) {
        setQueue((q) => [
          ...q,
          nextRealmIndex >= ASCENSION_INDEX
            ? { kind: 'ascension', xp: p.net }
            : {
                kind: 'realm-up',
                realm: nextRealm.name,
                note: nextRealm.note,
                realmIndex: nextRealmIndex,
                xp: p.net,
              },
        ]);
      } else {
        setQueue((q) => [
          ...q,
          {
            kind: 'tribulation-failed',
            loss,
            nextChance: tribulationChance(grade, data.failStreak + 1),
            realm: nextRealm.name,
          },
        ]);
      }
      return success;
    },
    [data, patch, notify],
  );

  const updateSettings = useCallback<Ctx['updateSettings']>(
    (p) => patch((d) => {
      const settings = { ...d.settings, ...p };
      for (const [key, min, max] of [
        ['focusLength', 1, 240], ['breakLength', 1, 240],
        ['dailyTarget', 1, 30], ['dailyFocusTarget', 1, 1440],
      ] as const) {
        const value = settings[key];
        settings[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : d.settings[key];
      }
      return { ...d, settings };
    }),
    [patch],
  );

  const replaceAll = useCallback<Ctx['replaceAll']>(
    (next) => {
      clearStorageLoadError();
      setData({
        ...next,
        ledger: rebuildLedger(next),
        lastSeenAt: new Date().toISOString(),
      });
    },
    [],
  );
  const loadSample = useCallback(() => {
    const sample = seedData();
    setData({ ...sample, ledger: rebuildLedger(sample), lastSeenAt: new Date().toISOString() });
    notify('Đã nạp dữ liệu mẫu');
  }, [notify]);
  const resetAll = useCallback(() => {
    clearStorageLoadError();
    setData((d) => ({
      version: 1, tasks: [], goals: [], sessions: [], settings: d.settings,
      root: d.root, beasts: d.beasts, activeBeastId: d.activeBeastId, stonesSpent: 0,
      pills: d.pills, tuViPenalty: 0, gateRealm: 0, failStreak: 0,
      encounterXp: 0, stonesBonus: 0, ledger: [], lastSeenAt: new Date().toISOString(),
      technique: d.technique, techniqueSwaps: d.techniqueSwaps, caveLevel: d.caveLevel,
      herbs: d.herbs,
      // Linh điền và chuyến thám hiểm đều phải dọn: cả hai đo bằng lịch sử làm
      // việc, mà lịch sử ấy vừa bị xoá sạch nên mọi mốc đã ghi thành vô nghĩa.
      field: [],
      expedition: undefined,
      // Cống hiến là danh phận đã gây dựng nên giữ lại; còn sứ mệnh đang gánh
      // thì đo bằng lịch sử vừa bị xoá sạch nên phải bỏ.
      contribution: d.contribution,
      mission: undefined,
      // Hòm căn cứ vào công việc trong ngày, mà công việc vừa bị xoá sạch.
      chestsOpened: [],
    }));
    notify('Đã xoá toàn bộ dữ liệu', 'warn');
  }, [notify]);

  const audit = useMemo(() => auditData(data), [data]);

  /** Người dùng chấp nhận trạng thái hiện tại: ký lại sổ từ đầu. */
  const resealLedger = useCallback(() => {
    patch((d) => ({ ...d, ledger: rebuildLedger(d), lastSeenAt: new Date().toISOString() }));
    notify('Đã ký lại sổ ghi theo dữ liệu hiện tại');
  }, [patch, notify]);

  const celebration = queue[0] ?? null;

  const dismissCelebration = useCallback(() => setQueue((q) => q.slice(1)), []);

  // Mỗi khoảnh khắc mới xuất hiện thì bắn hiệu ứng tương ứng đúng một lần.
  useEffect(() => {
    if (!celebration) return;
    switch (celebration.kind) {
      case 'tier-up':
        burstTier();
        soundLevelUp();
        break;
      case 'realm-up':
        burstBig();
        soundLevelUp();
        break;
      case 'ascension':
        burstBig();
        burstRain(2600);
        soundAscend();
        break;
      case 'perfect-day':
        burstRain();
        soundPerfectDay();
        break;
      case 'achievement':
        burstBig();
        soundAchievement();
        break;
      case 'awaken':
        burstBig();
        soundLevelUp();
        break;
      case 'summon':
        burstTier();
        soundAchievement();
        break;
      case 'tribulation-failed':
        // Thất bại thì không confetti, chỉ một tiếng trầm.
        soundComplete();
        break;
    }
  }, [celebration]);

  const value = useMemo<Ctx>(
    () => bocLenh({
      data, storageError, retrySave, sync, lastVisitAt: boot.lastVisitAt, audit, resealLedger, celebration, dismissCelebration, encounter, resolveEncounter, dismissEncounter, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill, attemptTribulation,
      pickTechnique, plantSeed, harvestPlot, refinePill, refineRootElement, condenseRootElement, upgradeCave,
      startExpedition, resolveExpedition, acceptMission, settleMission, openChest,
      updateSettings, replaceAll, loadSample, resetAll,
    }, sync.gui),
    [data, storageError, retrySave, sync, boot, audit, resealLedger, celebration, dismissCelebration, encounter, resolveEncounter, dismissEncounter, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill, attemptTribulation,
      pickTechnique, plantSeed, harvestPlot, refinePill, refineRootElement, condenseRootElement, upgradeCave,
      startExpedition, resolveExpedition, acceptMission, settleMission, openChest,
      updateSettings, replaceAll, loadSample, resetAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải được dùng bên trong <AppProvider>');
  return ctx;
}
