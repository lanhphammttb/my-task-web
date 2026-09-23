import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from './AppStore';
import { clockLabel } from '../lib/date';
import { soundComplete } from '../lib/celebrate';

type Mode = 'work' | 'break';
interface TimerState { mode: Mode; remaining: number; total: number; endsAt: number | null; taskId?: string; rounds: number }
function useTimer() {
  const { data, logSession, notify } = useApp();
  const length = (mode: Mode) => (mode === 'work' ? data.settings.focusLength : data.settings.breakLength) * 60;
  const [state, setState] = useState<TimerState>(() => ({ mode: 'work', remaining: length('work'), total: length('work'), endsAt: null, rounds: 0 }));
  const current = useRef(state);
  const [now, setNow] = useState(Date.now);
  const commit = (next: TimerState) => { current.current = next; setState(next); };
  const remaining = (s: TimerState) => s.endsAt === null ? s.remaining : Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
  const reset = (mode: Mode) => commit({ ...current.current, mode, total: length(mode), remaining: length(mode), endsAt: null });

  useEffect(() => {
    const tick = () => {
      const s = current.current;
      if (s.endsAt === null) return;
      setNow(Date.now());
      if (s.endsAt > Date.now()) return;
      const mode = s.mode === 'work' ? 'break' : 'work';
      const total = (mode === 'work' ? data.settings.focusLength : data.settings.breakLength) * 60;
      // Clear the deadline before recording, including StrictMode effect replays.
      commit({ ...s, mode, total, remaining: total, endsAt: null, rounds: s.rounds + (s.mode === 'work' ? 1 : 0) });
      soundComplete();
      if (s.mode === 'work') logSession(s.total / 60, s.taskId);
      else notify('Hết giờ nghỉ. Vào phiên tập trung tiếp theo!');
    };
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    tick();
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [logSession, notify, data.settings.focusLength, data.settings.breakLength]);

  const seconds = state.endsAt === null ? state.remaining : Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  useEffect(() => {
    document.title = state.endsAt !== null ? `${clockLabel(seconds)} · ${state.mode === 'work' ? 'Nhập định' : 'Điều tức'}` : 'Đạo Trình · Kế hoạch & tu luyện';
    return () => { document.title = 'Đạo Trình · Kế hoạch & tu luyện'; };
  }, [seconds, state.endsAt, state.mode]);

  return {
    mode: state.mode, seconds, totalSeconds: state.total, running: state.endsAt !== null, rounds: state.rounds, taskId: state.taskId,
    reset,
    pickTask: (taskId?: string) => {
      if (current.current.remaining !== current.current.total || current.current.endsAt !== null) {
        notify('Kết thúc phiên hiện tại trước khi đổi nhiệm vụ.', 'warn');
        return;
      }
      commit({ ...current.current, taskId });
    },
    toggle: () => {
      const s = current.current;
      const total = s.endsAt === null && s.remaining === s.total ? length(s.mode) : s.total;
      const left = s.remaining === s.total && s.endsAt === null ? total : remaining(s);
      commit({ ...s, total, remaining: left, endsAt: s.endsAt === null ? Date.now() + left * 1000 : null });
      setNow(Date.now());
    },
    stopEarly: () => {
      const s = current.current;
      const minutes = Math.floor((s.total - remaining(s)) / 60);
      reset('work');
      if (s.mode === 'work' && minutes >= 1) logSession(minutes, s.taskId);
    },
  };
}
const FocusContext = createContext<ReturnType<typeof useTimer> | null>(null);
export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const timer = useTimer();
  return <FocusContext.Provider value={timer}>{children}</FocusContext.Provider>;
}
export function useFocusTimer() {
  const timer = useContext(FocusContext);
  if (!timer) throw new Error('Missing FocusTimerProvider');
  return timer;
}
