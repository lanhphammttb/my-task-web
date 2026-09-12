import type { AppData, Settings } from '../types';
import { HERBS } from './field';
import type { HerbId } from './field';
import { SITES } from './expedition';
import { MISSIONS } from './sect';
import { TECHNIQUES } from './techniques';

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
  chestsOpened: [],
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

/**
 * Gỡ khỏi dữ liệu mọi thứ trỏ tới id không còn tồn tại.
 *
 * Hai đường sinh ra chuyện này: người dùng nhập một file JSON tự sửa (app có
 * chức năng nhập, mà `readFile` gần như không kiểm gì), và chính ta đổi tên
 * một loại linh thảo hay một sứ mệnh ở bản sau - lúc ấy mọi bản lưu cũ đều
 * mang id đã chết.
 *
 * Phải dọn ngay tại đây chứ không chỉ chặn ở giao diện: ô đất hỏng mà để lại
 * thì nó chiếm chỗ vĩnh viễn (gieo lại không được vì ô đang "có cây"), còn sứ
 * mệnh hỏng thì chặn luôn việc nhận sứ mệnh mới.
 *
 * Chỗ nào người dùng đã bỏ tiền thì hoàn lại: mất sứ mệnh vì ta đổi bảng không
 * phải lỗi của họ.
 */
function dropDeadIds(d: AppData): AppData {
  let refund = 0;

  const field = d.field.filter((plot) => plot.herb in HERBS);

  let mission = d.mission;
  if (mission && !(mission.id in MISSIONS)) {
    refund += mission.stake;
    mission = undefined;
  }

  let expedition = d.expedition;
  if (expedition && !(expedition.site in SITES)) {
    // Phí lên đường đã tiêu rồi nhưng chuyến đi không bao giờ về được nữa.
    expedition = undefined;
  }

  const technique = d.technique && d.technique in TECHNIQUES ? d.technique : undefined;

  return {
    ...d,
    field,
    mission,
    expedition,
    technique,
    stonesBonus: d.stonesBonus + refund,
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return dropDeadIds({
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
      chestsOpened: parsed.chestsOpened ?? [],
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
        resolve(
          dropDeadIds({
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
          chestsOpened: parsed.chestsOpened ?? [],
          stonesSpent: parsed.stonesSpent ?? 0,
          pills: { ha: 0, trung: 0, thuong: 0, ...(parsed.pills ?? {}) },
          tuViPenalty: parsed.tuViPenalty ?? 0,
          gateRealm: parsed.gateRealm ?? 0,
          failStreak: parsed.failStreak ?? 0,
          encounterXp: parsed.encounterXp ?? 0,
          stonesBonus: parsed.stonesBonus ?? 0,
          ledger: parsed.ledger ?? [],
          lastSeenAt: parsed.lastSeenAt ?? new Date().toISOString(),
          }),
        );
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
