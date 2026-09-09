import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { AppData, FocusSession, Goal, Settings, Status, Task } from '../types';
import { GOAL_COLORS } from '../types';
import { addDays, dateKey, parseKey, todayKey } from '../lib/date';
import { loadData, saveData, uid } from '../lib/storage';
import { seedData } from '../lib/seed';
import { effectiveXp, stoneBalance } from '../lib/economy';
import { cultivationOf, realmLabel } from '../lib/cultivation';
import { ACHIEVEMENTS, isPerfectDay, unlockedIds } from '../lib/achievements';
import { FEED_COST, FEED_GAIN, DUPLICATE_FEED, SUMMON_COST, summonBeast } from '../lib/beasts';
import type { Beast } from '../lib/beasts';
import { REROLL_COST, rollRoot } from '../lib/spirit';
import type { SpiritRoot } from '../lib/spirit';
import { PILLS, tribulationChance } from '../lib/pills';
import type { PillGrade } from '../lib/pills';
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

interface Ctx {
  data: AppData;
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
  /** Độ kiếp: nuốt đan, bốc xác suất. Trả về true nếu vượt qua. */
  attemptTribulation: (grade: PillGrade) => boolean | null;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: AppData) => void;
  loadSample: () => void;
  resetAll: () => void;
}

const AppContext = createContext<Ctx | null>(null);

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
  const [data, setData] = useState<AppData>(() => {
    const loaded = loadData();
    // Lần chạy đầu tiên: nạp dữ liệu mẫu để giao diện không trống trơn.
    const base = loaded.tasks.length === 0 && loaded.goals.length === 0 ? seedData() : loaded;
    // Chưa có sổ ghi (bản cũ hoặc dữ liệu mẫu) thì coi trạng thái hiện tại là
    // mốc đáng tin và ký lại từ đó.
    const ledger = base.ledger.length === 0 ? rebuildLedger(base) : base.ledger;
    return { ...base, ledger, lastSeenAt: new Date().toISOString() };
  });
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  /** Chặn giải cùng một kỳ ngộ hai lần (nhấn nhanh hai nút) */
  const resolvedRef = useRef<string | null>(null);

  useEffect(() => saveData(data), [data]);

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
      // Hoàn thành thì phải hợp lý: không thể xong việc của ngày mai hôm nay.
      if (status === 'done') {
        const target = data.tasks.find((t) => t.id === id);
        if (target) {
          const violation = checkComplete(target);
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
        if (!target) return d;
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
    (p) => patch((d) => ({ ...d, settings: { ...d.settings, ...p } })),
    [patch],
  );

  const replaceAll = useCallback<Ctx['replaceAll']>(
    (next) =>
      setData({
        ...next,
        ledger: rebuildLedger(next),
        lastSeenAt: new Date().toISOString(),
      }),
    [],
  );
  const loadSample = useCallback(() => {
    const sample = seedData();
    setData({ ...sample, ledger: rebuildLedger(sample), lastSeenAt: new Date().toISOString() });
    notify('Đã nạp dữ liệu mẫu');
  }, [notify]);
  const resetAll = useCallback(() => {
    setData((d) => ({
      version: 1, tasks: [], goals: [], sessions: [], settings: d.settings,
      root: d.root, beasts: d.beasts, activeBeastId: d.activeBeastId, stonesSpent: 0,
      pills: d.pills, tuViPenalty: 0, gateRealm: 0, failStreak: 0,
      encounterXp: 0, stonesBonus: 0, ledger: [], lastSeenAt: new Date().toISOString(),
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
    () => ({
      data, audit, resealLedger, celebration, dismissCelebration, encounter, resolveEncounter, dismissEncounter, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill, attemptTribulation,
      updateSettings, replaceAll, loadSample, resetAll,
    }),
    [data, audit, resealLedger, celebration, dismissCelebration, encounter, resolveEncounter, dismissEncounter, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill, attemptTribulation,
      updateSettings, replaceAll, loadSample, resetAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải được dùng bên trong <AppProvider>');
  return ctx;
}
