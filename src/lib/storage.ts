import type { AppData, Settings } from '../types';
import type { HerbId } from './field';

/** Túi linh thảo rỗng. Luôn đủ cả bốn khoá để chỗ nào cũng cộng trừ được thẳng. */
export const emptyHerbs = (): Record<HerbId, number> => ({
  thanh_diep: 0,
  huyet_tinh: 0,
  kim_tuy: 0,
  tu_van: 0,
});

const KEY = 'my-task-planner/v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  daoName: 'Đạo hữu',
  soundEnabled: true,
  ambientEnabled: true,
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
  beasts: [],
  techniqueSwaps: 0,
  caveLevel: 1,
  field: [],
  herbs: emptyHerbs(),
  contribution: 0,
  stonesSpent: 0,
  pills: { ha: 0, trung: 0, thuong: 0 },
  tuViPenalty: 0,
  gateRealm: 0,
  failStreak: 0,
  encounterXp: 0,
  stonesBonus: 0,
  ledger: [],
  lastSeenAt: new Date().toISOString(),
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
      root: parsed.root,
      beasts: parsed.beasts ?? [],
      activeBeastId: parsed.activeBeastId,
      technique: parsed.technique,
      techniqueSwaps: parsed.techniqueSwaps ?? 0,
      // Hồ sơ cũ chưa có động phủ thì coi như đang ở bậc đầu, không phải bậc 0.
      caveLevel: parsed.caveLevel ?? 1,
      field: parsed.field ?? [],
      herbs: { ...emptyHerbs(), ...(parsed.herbs ?? {}) },
      expedition: parsed.expedition,
      contribution: parsed.contribution ?? 0,
      mission: parsed.mission,
      stonesSpent: parsed.stonesSpent ?? 0,
      pills: { ha: 0, trung: 0, thuong: 0, ...(parsed.pills ?? {}) },
      tuViPenalty: parsed.tuViPenalty ?? 0,
      gateRealm: parsed.gateRealm ?? 0,
      failStreak: parsed.failStreak ?? 0,
      encounterXp: parsed.encounterXp ?? 0,
      stonesBonus: parsed.stonesBonus ?? 0,
      ledger: parsed.ledger ?? [],
      lastSeenAt: parsed.lastSeenAt ?? new Date().toISOString(),
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
          root: parsed.root,
          beasts: parsed.beasts ?? [],
          activeBeastId: parsed.activeBeastId,
          technique: parsed.technique,
          techniqueSwaps: parsed.techniqueSwaps ?? 0,
          caveLevel: parsed.caveLevel ?? 1,
          field: parsed.field ?? [],
          herbs: { ...emptyHerbs(), ...(parsed.herbs ?? {}) },
          expedition: parsed.expedition,
          contribution: parsed.contribution ?? 0,
          mission: parsed.mission,
          stonesSpent: parsed.stonesSpent ?? 0,
          pills: { ha: 0, trung: 0, thuong: 0, ...(parsed.pills ?? {}) },
          tuViPenalty: parsed.tuViPenalty ?? 0,
          gateRealm: parsed.gateRealm ?? 0,
          failStreak: parsed.failStreak ?? 0,
          encounterXp: parsed.encounterXp ?? 0,
          stonesBonus: parsed.stonesBonus ?? 0,
          ledger: parsed.ledger ?? [],
          lastSeenAt: parsed.lastSeenAt ?? new Date().toISOString(),
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
