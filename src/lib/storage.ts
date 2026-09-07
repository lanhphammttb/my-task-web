import type { AppData, Settings } from '../types';

const KEY = 'my-task-planner/v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  soundEnabled: true,
  dailyTarget: 5,
  dailyFocusTarget: 120,
  focusLength: 25,
  breakLength: 5,
  weekStartsOn: 1,
};

export const emptyData = (): AppData => ({
  version: 1,
  tasks: [],
  goals: [],
  sessions: [],
  settings: { ...DEFAULT_SETTINGS },
});

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      version: 1,
      tasks: parsed.tasks ?? [],
      goals: parsed.goals ?? [],
      sessions: parsed.sessions ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* hết dung lượng hoặc chế độ ẩn danh - bỏ qua để app vẫn chạy */
  }
}

export function exportFile(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ke-hoach-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readFile(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>;
        if (!Array.isArray(parsed.tasks)) throw new Error('Tệp không đúng định dạng');
        resolve({
          version: 1,
          tasks: parsed.tasks,
          goals: parsed.goals ?? [],
          sessions: parsed.sessions ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
