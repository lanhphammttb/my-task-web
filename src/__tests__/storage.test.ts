import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStorageLoadError, emptyData, loadData, readFile, saveData, storageLoadError } from '../lib/storage';
import { seedData } from '../lib/seed';
const KEY = 'my-task-planner/v1';
const read = (value: unknown) => readFile(new File([JSON.stringify(value)], 'backup.json', { type: 'application/json' }));
beforeEach(() => { localStorage.clear(); clearStorageLoadError(); });
describe('safe persistence', () => {
  it('round trips a real backup and accepts older minimal backups', async () => {
    const data = seedData();
    expect((await read(data)).tasks).toEqual(data.tasks);
    expect((await read({ tasks: [] })).settings.focusLength).toBe(25);
  });
  it.each([{ tasks: [null] }, { tasks: [{}] }, { tasks: [], goals: {} }, { tasks: [], settings: { focusLength: 0 } }, { tasks: [], root: { elements: ['bad'], rolledAt: '2026-01-01' } }])('rejects malformed backup %j without replacing existing data', async value => {
    saveData(seedData());
    const previous = localStorage.getItem(KEY);
    await expect(read(value)).rejects.toThrow();
    expect(localStorage.getItem(KEY)).toBe(previous);
  });
  it('preserves legitimate negative encounter balances', async () => {
    const data = { ...emptyData(), stonesBonus: -120, encounterXp: -300 };
    expect((await read(data)).stonesBonus).toBe(-120);
    saveData(data);
    expect(loadData().encounterXp).toBe(-300);
    expect(storageLoadError()).toBeNull();
  });
  it('reports quota failure and recovers on retry', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(saveData(emptyData())).toContain('Không lưu');
    expect(saveData(emptyData())).toBeNull();
    spy.mockRestore();
  });
  it('does not overwrite an unreadable original during autosave', () => {
    localStorage.setItem(KEY, '{broken');
    const fallback = loadData();
    expect(storageLoadError()).not.toBeNull();
    expect(saveData(fallback)).not.toBeNull();
    expect(localStorage.getItem(KEY)).toBe('{broken');
  });
});
