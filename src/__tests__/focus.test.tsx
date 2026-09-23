import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { act, renderHook, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../store/AppStore';
import { FocusTimerProvider, useFocusTimer } from '../store/FocusTimer';
import { clearStorageLoadError } from '../lib/storage';
const wrapper = ({ children }: { children: ReactNode }) => <StrictMode><AppProvider><FocusTimerProvider>{children}</FocusTimerProvider></AppProvider></StrictMode>;
beforeEach(() => { localStorage.clear(); clearStorageLoadError(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
it('accounts for a sleeping/background tab and records a completed session only once', () => {
  const { result } = renderHook(() => ({ timer: useFocusTimer(), app: useApp() }), { wrapper });
  const count = result.current.app.data.sessions.length;
  act(() => result.current.timer.toggle());
  act(() => { vi.setSystemTime(Date.now() + 26 * 60000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(result.current.timer.mode).toBe('break');
  expect(result.current.app.data.sessions).toHaveLength(count + 1);
  act(() => { document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(3000); });
  expect(result.current.app.data.sessions).toHaveLength(count + 1);
});
it('excludes paused time and keeps the original duration after changing settings', () => {
  const { result } = renderHook(() => ({ timer: useFocusTimer(), app: useApp() }), { wrapper });
  act(() => result.current.timer.toggle());
  act(() => vi.advanceTimersByTime(60000));
  act(() => result.current.timer.toggle());
  act(() => { vi.advanceTimersByTime(300000); result.current.app.updateSettings({ focusLength: 5 }); });
  expect(result.current.timer.seconds).toBe(24 * 60);
  act(() => result.current.timer.toggle());
  act(() => result.current.timer.stopEarly());
  expect(result.current.app.data.sessions.at(-1)?.minutes).toBe(1);
});

it('keeps running while its screen is unmounted and remounted', () => {
  function Screen() {
    const timer = useFocusTimer();
    return <button onClick={timer.toggle}>{timer.seconds}:{String(timer.running)}</button>;
  }
  const { rerender } = render(<Screen />, { wrapper });
  fireEvent.click(screen.getByRole('button'));
  rerender(<></>);
  act(() => vi.advanceTimersByTime(60000));
  rerender(<Screen />);
  expect(screen.getByRole('button').textContent).toBe('1440:true');
});
