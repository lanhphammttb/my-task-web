import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { AppData, FocusSession, Goal, Settings, Status, Task } from '../types';
import { addDays, dateKey, parseKey, todayKey } from '../lib/date';
import { loadData, saveData, uid } from '../lib/storage';
import { seedData } from '../lib/seed';
import { levelOf, totalXp } from '../lib/stats';
import { ACHIEVEMENTS, isPerfectDay, unlockedIds } from '../lib/achievements';
import { burstBig, burstRain, setSoundEnabled, soundAchievement, soundLevelUp, soundPerfectDay } from '../lib/celebrate';

/** Khoảnh khắc đáng ăn mừng, hiện thành lớp phủ toàn màn hình. */
export type Celebration =
  | { kind: 'level-up'; level: number; xp: number }
  | { kind: 'perfect-day'; count: number }
  | { kind: 'achievement'; id: string; title: string; description: string };

interface Ctx {
  data: AppData;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  notify: (message: string, tone?: 'ok' | 'warn') => void;
  addTask: (input: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setStatus: (id: string, status: Status) => void;
  toggleDone: (id: string) => void;
  moveTask: (id: string, date: string) => void;
  duplicateTask: (id: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  pushOverdueToToday: () => number;
  clearDone: (before?: string) => number;
  addGoal: (input: Partial<Goal> & { title: string }) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  logSession: (minutes: number, taskId?: string) => void;
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
    return loaded.tasks.length === 0 && loaded.goals.length === 0 ? seedData() : loaded;
  });
  const [queue, setQueue] = useState<Celebration[]>([]);

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

    const lvBefore = levelOf(totalXp(before.tasks, before.sessions)).level;
    const xpAfter = totalXp(after.tasks, after.sessions);
    const lvAfter = levelOf(xpAfter).level;
    if (lvAfter > lvBefore) found.push({ kind: 'level-up', level: lvAfter, xp: xpAfter });

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
        estimateMin: input.estimateMin ?? 30,
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
    (id, p) => patch((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
    [patch],
  );

  const removeTask = useCallback<Ctx['removeTask']>(
    (id) => patch((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
    [patch],
  );

  const setStatus = useCallback<Ctx['setStatus']>(
    (id, status) =>
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
        const next = { ...d, tasks };
        if (status === 'done') detectMilestones(before, next, target.date);
        return next;
      }),
    [patch, detectMilestones],
  );

  const toggleDone = useCallback<Ctx['toggleDone']>(
    (id) => {
      const t = data.tasks.find((x) => x.id === id);
      if (!t) return;
      setStatus(id, t.status === 'done' ? 'todo' : 'done');
      if (t.status !== 'done') notify(`Hoàn thành: ${t.title}`);
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
        patch((d) => ({ ...d, tasks: d.tasks.filter((t) => !(t.status === 'done' && t.date < cutoff)) }));
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
        color: input.color ?? '#6366f1',
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
      }));
      notify(`Đã ghi nhận ${minutes} phút tập trung`);
    },
    [patch, notify],
  );

  const updateSettings = useCallback<Ctx['updateSettings']>(
    (p) => patch((d) => ({ ...d, settings: { ...d.settings, ...p } })),
    [patch],
  );

  const replaceAll = useCallback<Ctx['replaceAll']>((next) => setData(next), []);
  const loadSample = useCallback(() => {
    setData(seedData());
    notify('Đã nạp dữ liệu mẫu');
  }, [notify]);
  const resetAll = useCallback(() => {
    setData((d) => ({ version: 1, tasks: [], goals: [], sessions: [], settings: d.settings }));
    notify('Đã xoá toàn bộ dữ liệu', 'warn');
  }, [notify]);

  const celebration = queue[0] ?? null;

  const dismissCelebration = useCallback(() => setQueue((q) => q.slice(1)), []);

  // Mỗi khoảnh khắc mới xuất hiện thì bắn hiệu ứng tương ứng đúng một lần.
  useEffect(() => {
    if (!celebration) return;
    switch (celebration.kind) {
      case 'level-up':
        burstBig();
        soundLevelUp();
        break;
      case 'perfect-day':
        burstRain();
        soundPerfectDay();
        break;
      case 'achievement':
        burstBig();
        soundAchievement();
        break;
    }
  }, [celebration]);

  const value = useMemo<Ctx>(
    () => ({
      data, celebration, dismissCelebration, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, updateSettings, replaceAll, loadSample, resetAll,
    }),
    [data, celebration, dismissCelebration, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, updateSettings, replaceAll, loadSample, resetAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải được dùng bên trong <AppProvider>');
  return ctx;
}
