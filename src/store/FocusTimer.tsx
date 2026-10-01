import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "./AppStore";
import { clockLabel } from "../lib/date";
import { MIN_REWARD_SESSION_MIN } from "../lib/validation";
import { soundComplete, soundFocusStart } from "../lib/celebrate";

type Mode = "work" | "break";
interface TimerState {
  mode: Mode;
  remaining: number;
  total: number;
  endsAt: number | null;
  taskId?: string;
  rounds: number;
  started: boolean;
}
interface SessionResult { minutes: number; taskId?: string }
const TIMER_STORAGE = "my-task/focus-timer/v1";

function storedTimer(fallback: TimerState): TimerState {
  try {
    const value = JSON.parse(localStorage.getItem(TIMER_STORAGE) ?? "null") as Partial<TimerState> | null;
    if (!value || (value.mode !== "work" && value.mode !== "break") ||
        !Number.isFinite(value.remaining) || !Number.isFinite(value.total) ||
        !Number.isFinite(value.rounds) || typeof value.started !== "boolean" ||
        (value.endsAt !== null && !Number.isFinite(value.endsAt))) return fallback;
    return {
      mode: value.mode,
      remaining: Math.max(0, Number(value.remaining)),
      total: Math.max(60, Number(value.total)),
      endsAt: value.endsAt === null ? null : Number(value.endsAt),
      taskId: typeof value.taskId === "string" ? value.taskId : undefined,
      rounds: Math.max(0, Number(value.rounds)),
      started: value.started,
    };
  } catch { return fallback; }
}
function useTimer() {
  const { data, logSession, notify } = useApp();
  const length = (mode: Mode) =>
    (mode === "work" ? data.settings.focusLength : data.settings.breakLength) *
    60;
  const [state, setState] = useState<TimerState>(() => storedTimer({
    mode: "work", remaining: length("work"), total: length("work"),
    endsAt: null, rounds: 0, started: false,
  }));
  const [lastSession, setLastSession] = useState<SessionResult | null>(null);
  const current = useRef(state);
  const [now, setNow] = useState(Date.now);
  const commit = (next: TimerState) => {
    current.current = next;
    setState(next);
  };
  useEffect(() => {
    try { localStorage.setItem(TIMER_STORAGE, JSON.stringify(state)); } catch { /* The app already reports storage failures elsewhere. */ }
  }, [state]);
  const remaining = (s: TimerState) =>
    s.endsAt === null
      ? s.remaining
      : Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
  const reset = (mode: Mode) =>
    commit({
      ...current.current,
      mode,
      total: length(mode),
      remaining: length(mode),
      endsAt: null,
      started: false,
    });
  const finish = (mode: Mode) => {
    const s = current.current;
    const minutes = Math.floor((s.total - remaining(s)) / 60);
    reset(mode);
    if (s.mode === "work" && s.started && minutes >= 1) {
      logSession(minutes, s.taskId);
      setLastSession({ minutes, taskId: s.taskId });
    } else if (s.mode === "work" && s.started) {
      // Trước đây đồng hồ lặng lẽ quay về 25:00 - người dùng tưởng app nuốt mất phiên.
      notify(
        `Phiên chưa đủ 1 phút nên không được ghi nhận. Phiên dưới ${MIN_REWARD_SESSION_MIN} phút vẫn được ghi nhưng không có linh thạch phiên và không gặp kỳ ngộ.`,
        "warn",
      );
    }
  };

  useEffect(() => {
    const tick = () => {
      const s = current.current;
      if (s.endsAt === null) return;
      setNow(Date.now());
      if (s.endsAt > Date.now()) return;
      const mode = s.mode === "work" ? "break" : "work";
      const total =
        (mode === "work"
          ? data.settings.focusLength
          : data.settings.breakLength) * 60;
      // Clear the deadline before recording, including StrictMode effect replays.
      commit({
        ...s,
        mode,
        total,
        remaining: total,
        endsAt: null,
        started: false,
        rounds: s.rounds + (s.mode === "work" ? 1 : 0),
      });
      if (data.settings.soundEnabled) soundComplete();
      if (s.mode === "work") {
        logSession(s.total / 60, s.taskId);
        setLastSession({ minutes: s.total / 60, taskId: s.taskId });
      }
      else notify("Hết giờ nghỉ. Vào phiên tập trung tiếp theo!");
    };
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    tick();
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [
    logSession,
    notify,
    data.settings.focusLength,
    data.settings.breakLength,
    data.settings.soundEnabled,
  ]);

  const seconds = !state.started
    ? length(state.mode)
    : state.endsAt === null
      ? state.remaining
      : Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  useEffect(() => {
    document.title =
      state.endsAt !== null
        ? `${clockLabel(seconds)} · ${state.mode === "work" ? "Nhập định" : "Điều tức"}`
        : "Đạo Trình · Kế hoạch & tu luyện";
    return () => {
      document.title = "Đạo Trình · Kế hoạch & tu luyện";
    };
  }, [seconds, state.endsAt, state.mode]);

  return {
    mode: state.mode,
    seconds,
    totalSeconds: state.started ? state.total : length(state.mode),
    running: state.endsAt !== null,
    inSession: state.started,
    rounds: state.rounds,
    taskId: state.taskId,
    lastSession,
    dismissLastSession: () => setLastSession(null),
    reset: finish,
    pickTask: (taskId?: string) => {
      if (current.current.started) {
        notify("Kết thúc phiên hiện tại trước khi đổi nhiệm vụ.", "warn");
        return;
      }
      commit({ ...current.current, taskId });
    },
    toggle: () => {
      const s = current.current;
      const total = !s.started ? length(s.mode) : s.total;
      const left = !s.started ? total : remaining(s);
      if (s.endsAt === null && data.settings.soundEnabled) soundFocusStart();
      commit({
        ...s,
        total,
        remaining: left,
        started: true,
        endsAt: s.endsAt === null ? Date.now() + left * 1000 : null,
      });
      setNow(Date.now());
    },
    stopEarly: () => finish("work"),
  };
}
const FocusContext = createContext<ReturnType<typeof useTimer> | null>(null);
export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const timer = useTimer();
  return (
    <FocusContext.Provider value={timer}>{children}</FocusContext.Provider>
  );
}
export function useFocusTimer() {
  const timer = useContext(FocusContext);
  if (!timer) throw new Error("Missing FocusTimerProvider");
  return timer;
}
