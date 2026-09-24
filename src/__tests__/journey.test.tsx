import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import ArtImage from '../components/ArtImage';
import { AppProvider, useApp } from '../store/AppStore';
import { completedDay, dateKey, todayKey } from '../lib/date';
import { dayRecord } from '../lib/quests';
import { emptyData } from '../lib/storage';
import { seedData } from '../lib/seed';
const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;
beforeEach(() => localStorage.clear());

describe('personal cultivation journey', () => {
  it('starts with the user’s own work instead of awarding sample progress', () => {
    render(<App />);
    expect(screen.getByRole('button', {name:'Thêm việc'})).toBeDefined();
    const saved = JSON.parse(localStorage.getItem('my-task-planner/v1')!);
    expect(saved.tasks).toEqual([]);
    expect(saved.ledger).toEqual([]);
  });
  it('does not replace an empty task list that still has focus history', () => {
    const data = emptyData();
    data.sessions = [{id:'practice',date:todayKey(),minutes:25,startedAt:new Date().toISOString()}];
    localStorage.setItem('my-task-planner/v1',JSON.stringify(data));
    const {result} = renderHook(()=>useApp(),{wrapper});
    expect(result.current.data.tasks).toEqual([]);
    expect(result.current.data.sessions).toHaveLength(1);
  });
  it('records a completion once, including rapid repeated requests', () => {
    const {result}=renderHook(()=>useApp(),{wrapper});
    let id='';
    act(()=>{ id=result.current.addTask({title:'Đi bộ 20 phút',date:todayKey()}).id; });
    act(()=>{ result.current.setStatus(id,'done'); result.current.setStatus(id,'done'); });
    expect(result.current.data.ledger.filter(x=>x.ref===id)).toHaveLength(1);
    const at=result.current.data.tasks[0].completedAt;
    act(()=>{ expect(result.current.setStatus(id,'done')).toBe(false); });
    expect(result.current.data.tasks[0].completedAt).toBe(at);
  });
  it('attributes midnight work to the local calendar day', () => {
    const local = new Date(2026,8,23,0,30);
    const data=seedData();
    const task={...data.tasks[0],status:'done' as const,date:'2026-09-22',completedAt:local.toISOString()};
    data.tasks=[task];
    expect(completedDay(task)).toBe(dateKey(local));
    expect(dayRecord(data,dateKey(local)).completed).toHaveLength(1);
    expect(dayRecord(data,'2026-09-22').completed).toHaveLength(0);
  });
  it('hides a broken fallback and can display a new source', () => {
    const {rerender}=render(<ArtImage src="/missing.png" fallback="/also-missing.png" alt="Cảnh" />);
    fireEvent.error(screen.getByAltText('Cảnh'));
    expect(screen.getByAltText('Cảnh').getAttribute('src')).toBe('/also-missing.png');
    fireEvent.error(screen.getByAltText('Cảnh'));
    expect(screen.queryByAltText('Cảnh')).toBeNull();
    rerender(<ArtImage src="/new.png" fallback="/also-missing.png" alt="Cảnh" />);
    expect(screen.getByAltText('Cảnh').getAttribute('src')).toBe('/new.png');
  });
});
