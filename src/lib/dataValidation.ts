import type { AppData } from "../types";
/** Validate external JSON before it can replace the user's working data. */
type Check = (value: unknown) => boolean;
const text: Check = v => typeof v === 'string';
const number: Check = v => typeof v === 'number' && Number.isFinite(v);
const positive: Check = v => number(v) && (v as number) >= 0;
const bool: Check = v => typeof v === 'boolean';
const oneOf = (...values: unknown[]): Check => v => values.includes(v);
const array = (check: Check): Check => v => Array.isArray(v) && v.every(check);
const object = (required: Record<string, Check>, optional: Record<string, Check> = {}): Check => v => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const data = v as Record<string, unknown>;
  return Object.entries(required).every(([k, check]) => check(data[k])) &&
    Object.entries(optional).every(([k, check]) => data[k] === undefined || check(data[k]));
};
const date: Check = v => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string) && !Number.isNaN(Date.parse(v as string)) && new Date(v as string).toISOString().slice(0, 10) === v;
const timestamp: Check = v => text(v) && !Number.isNaN(Date.parse(v as string));
const duration: Check = v => positive(v) && (v as number) >= 1 && (v as number) <= 240;
const unique = (check: Check): Check => v => array(check)(v) && new Set((v as { id: string }[]).map(x => x.id)).size === (v as unknown[]).length;
const task = object({ id: text, title: text, note: text, date, priority: oneOf('low', 'medium', 'high', 'urgent'), status: oneOf('todo', 'doing', 'done'), tags: array(text), estimateMin: positive, focusMin: positive, subtasks: unique(object({ id: text, title: text, done: bool })), recurrence: oneOf('none', 'daily', 'weekdays', 'weekly', 'monthly'), createdAt: timestamp }, { goalId: text, startTime: v => text(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v as string), deadline: timestamp, completedAt: timestamp });
const settings = object({}, { theme: oneOf('dark', 'light'), daoName: text, soundEnabled: bool, ambientEnabled: bool, dailyTarget: positive, dailyFocusTarget: positive, focusLength: duration, breakLength: duration, weekStartsOn: oneOf(0, 1) });
const numericFields = Object.fromEntries(['techniqueSwaps', 'caveLevel', 'contribution', 'stonesSpent', 'tuViPenalty', 'gateRealm', 'failStreak', 'stonesBonus'].map(k => [k, positive]));
const schema = object({ tasks: unique(task) }, {
  version: oneOf(1), settings,
  goals: unique(object({ id: text, title: text, description: text, color: text, archived: bool, createdAt: timestamp }, { targetDate: date })),
  sessions: unique(object({ id: text, date, minutes: duration, startedAt: timestamp }, { taskId: text })),
  beasts: unique(object({ id: text, fed: positive, obtainedAt: timestamp })),
  field: array(object({ slot: positive, herb: text, plantedAtFocus: positive, plantedAt: timestamp })),
  root: object({ elements: v => array(oneOf('kim', 'moc', 'thuy', 'hoa', 'tho'))(v) && (v as unknown[]).length > 0 && new Set(v as unknown[]).size === (v as unknown[]).length, rolledAt: timestamp }),
  herbs: object({}, { thanh_diep: positive, huyet_tinh: positive, kim_tuy: positive, tu_van: positive }),
  pills: object({}, { ha: positive, trung: positive, thuong: positive }),
  expedition: object({ site: text, startedAtTasks: positive, startedAt: timestamp }),
  mission: object({ id: text, startTasks: positive, startFocus: positive, acceptedAt: timestamp, dueAt: timestamp, stake: positive }),
  ledger: array(object({ seq: positive, kind: oneOf('task', 'session'), ref: text, at: timestamp, value: number, hash: text })),
  activeBeastId: text, technique: text, chestsOpened: array(text), lastSeenAt: timestamp, encounterXp: number,
  ...numericFields,
});
export function validateData(value: unknown): asserts value is Partial<AppData> & Pick<AppData, "tasks"> {
  if (!schema(value)) throw new Error('Tệp không đúng cấu trúc dữ liệu hoặc chứa giá trị không hợp lệ');
}
