import { exportFile, exportStoredFile, storageLoadError } from "./lib/storage";
import { FocusTimerProvider, useFocusTimer } from "./store/FocusTimer";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "motion/react";
import { SearchX } from "lucide-react";
import type { Task, ViewKey } from "./types";
import { todayKey } from "./lib/date";
import { dayStats, sortTasks } from "./lib/stats";
import { AppProvider, useApp } from "./store/AppStore";
import { cultivationOf } from "./lib/cultivation";
import { effectiveXp, progressOf } from "./lib/economy";
import { achievementStates, isPerfectDay } from "./lib/achievements";
import { chestsForDay, pendingChests } from "./lib/chest";
import { questStates } from "./lib/quests";
import { missionState } from "./lib/sect";
import { expeditionState } from "./lib/expedition";
import { verifiedFocusMinutes, verifiedTaskCount } from "./lib/economy";
import { PILL_ORDER } from "./lib/pills";
import CelebrationLayer from "./components/CelebrationLayer";
import SettingsDialog from "./components/SettingsDialog";
import TribulationDialog from "./components/TribulationDialog";
import EncounterDialog from "./components/EncounterDialog";
import TaskCard from "./components/TaskCard";
import TaskEditorDialog from "./components/TaskEditorDialog";
import { EmptyState } from "./components/primitives";
import HubScene from "./components/hub/HubScene";
import { SCENE_FALLBACK } from "./lib/realmArt";
import HeaderHUD from "./components/hub/HeaderHUD";
import HubCenter from "./components/hub/HubCenter";
import HubIcon from "./components/hub/HubIcon";
import SideRail from "./components/hub/SideRail";
import OverlayPanel from "./components/hub/OverlayPanel";
import WorkSanctuary from "./components/hub/WorkSanctuary";
import FooterMenu from "./components/hub/FooterMenu";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { skyForRealm } from "./lib/sky";
import { cn } from "@/lib/utils";
const TodayView = lazy(() => import("./views/TodayView"));
const WeekView = lazy(() => import("./views/WeekView"));
const MonthView = lazy(() => import("./views/MonthView"));
const GoalsView = lazy(() => import("./views/GoalsView"));
const FocusView = lazy(() => import("./views/FocusView"));
const CaveView = lazy(() => import("./views/CaveView"));
const AwardsView = lazy(() => import("./views/AwardsView"));
const StatsView = lazy(() => import("./views/StatsView"));

// three.js khá nặng nên lớp 3D được nạp trễ; nền ảnh 2D vẫn nằm phía dưới.
const Scene3DBackdrop = lazy(() => import("./components/Scene3DBackdrop"));

interface PanelMeta {
  title: string;
  subtitle: string;
  /** Ảnh riêng của bảng - thả vào public/art/banner/ theo đúng tên này. */
  banner: string;
}

const PANEL: Record<ViewKey, PanelMeta> = {
  today: {
    title: "Hành Sự Đường",
    subtitle: "Việc đời thường, từng bước thành đạo",
    banner: "/art/banner/today.jpg",
  },
  week: {
    title: "Hành Sự Đường",
    subtitle: "Bảy ngày trước mặt, liệu sức mà chia",
    banner: "/art/banner/week.jpg",
  },
  month: {
    title: "Hành Sự Đường",
    subtitle: "Nhìn xa để dành thời gian cho điều quan trọng",
    banner: "/art/banner/month.jpg",
  },
  goals: {
    title: "Đại Nguyện",
    subtitle: "Mục tiêu dài hạn - gốc rễ của mọi nhật khoá",
    banner: "/art/banner/goals.jpg",
  },
  focus: {
    title: "Bế Quan",
    subtitle: "Nhập định, dồn toàn bộ tâm trí vào một việc",
    banner: "/art/banner/focus.jpg",
  },
  cave: {
    title: "Động Phủ",
    subtitle: "Linh căn, công pháp, linh điền, lò đan và đàn linh thú",
    banner: "/art/banner/cave.jpg",
  },
  awards: {
    title: "Tiên Lộ",
    subtitle: "Chín cảnh giới và những kỳ ngộ đã mở",
    banner: "/art/banner/awards.jpg",
  },
  stats: {
    title: "Tu Hành Lục",
    subtitle: "Sổ chép đường tu - số liệu không biết nói dối",
    banner: "/art/banner/stats.jpg",
  },
};

/** Thứ tự phím tắt 1..8 */
const HOTKEY_ORDER: ViewKey[] = [
  "today",
  "week",
  "month",
  "goals",
  "focus",
  "cave",
  "awards",
  "stats",
];

function Shell() {
  const { data, awaken, celebration, storageError, retrySave } = useApp();
  const [view, setView] = useState<ViewKey | null>(null);
  const [anchor, setAnchor] = useState<string | undefined>();
  const [date, setDate] = useState(todayKey());
  const [editorTask, setEditorTask] = useState<Task | null>(null);
  const [editorGoalId, setEditorGoalId] = useState<string | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tribulationOpen, setTribulationOpen] = useState(false);
  const { pickTask: setFocusTaskId } = useFocusTimer();
  const [query, setQuery] = useState("");

  const open = useCallback((v: ViewKey, at?: string) => {
    setQuery("");
    setAnchor(at);
    setView(v);
  }, []);

  const toggle = useCallback((v: ViewKey) => {
    setQuery("");
    setAnchor(undefined);
    setView((cur) => (cur === v ? null : v));
  }, []);

  const closePanel = useCallback(() => {
    setView(null);
    setQuery("");
  }, []);

  const openNew = useCallback(() => {
    setEditorGoalId(undefined);
    setEditorTask(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((t: Task) => {
    setEditorTask(t);
    setEditorOpen(true);
  }, []);

  const startFocus = useCallback(
    (t: Task) => {
      setFocusTaskId(t.id);
      open("focus");
    },
    [open, setFocusTaskId],
  );

  const openDay = useCallback(
    (d: string) => {
      setDate(d);
      open("today");
    },
    [open],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
          el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNew();
        return;
      }
      if (e.key.toLowerCase() === "t") {
        setDate(todayKey());
        open("today");
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= HOTKEY_ORDER.length) toggle(HOTKEY_ORDER[num - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, open, toggle]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return sortTasks(
      data.tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      ),
    );
  }, [query, data.tasks]);

  /**
   * Đột phá cảnh giới và phi thăng thì rung cả thế giới một nhịp ngắn.
   *
   * Không cần state hay hẹn giờ: hoạt ảnh CSS `world-shake` chạy đúng một lượt
   * 0,72 giây rồi tự dừng, dù class có nằm lại. Bản trước dựng một state chỉ để
   * gỡ class sau 760ms - thừa một vòng render, mà thời gian lại lệch với chính
   * hoạt ảnh nó điều khiển.
   */
  const bigMoment =
    celebration?.kind === "realm-up" || celebration?.kind === "ascension";

  const isDark = data.settings.theme === "dark";
  const progress = progressOf(data);
  const c = cultivationOf(effectiveXp(data));
  const searching = query.trim().length > 0;
  const panelOpen = searching || view !== null;

  // Chỉ số nhỏ gắn lên icon: cho người dùng biết chỗ nào đang cần ghé.
  const stats = dayStats(data.tasks, data.sessions, todayKey());
  const questsLeft = questStates(data, todayKey()).filter(
    (q) => !q.done,
  ).length;
  const unlocked = achievementStates(data).filter((a) => a.unlocked).length;
  const pills = PILL_ORDER.reduce((s, g) => s + (data.pills[g] ?? 0), 0);
  const beastCount = data.beasts.length;

  /**
   * Chấm báo trên icon Tiên Lộ.
   *
   * Sứ mệnh có đặt cọc và có hạn chót, mà lại không được nhắc ở bất kỳ đâu
   * ngoài chính bảng Tiên Lộ - nhận việc xong quên là mất cọc trong im lặng.
   * Thế thì nó là cái bẫy chứ không phải công cụ cam kết. Báo khi sắp hết hạn,
   * khi đã đạt để vào lấy thưởng, và khi đoàn thám hiểm đã về tới nơi.
   */
  const DAY_MS = 86400000;
  const taskCount = verifiedTaskCount(data);
  const mission = data.mission
    ? missionState(data.mission, taskCount, verifiedFocusMinutes(data))
    : null;
  // Hòm kỳ ngộ nằm trong Nhật Khoá. Không báo ra ngoài thì xong việc rồi vẫn
  // phải mở bảng mới biết có hòm - mà cái hay của nó nằm đúng ở chỗ biết ngay
  // là có thứ đang chờ mình.
  const chestAlert =
    pendingChests(
      chestsForDay(
        todayKey(),
        stats.done,
        stats.focusMin,
        isPerfectDay(data.tasks, todayKey()),
        data.chestsOpened,
      ),
    ) > 0;

  const pathAlert =
    (!!mission && (mission.met || mission.msLeft < DAY_MS)) ||
    (!!data.expedition && !!expeditionState(data.expedition, taskCount)?.ready);

  return (
    <div
      className={cn(
        "relative h-full min-h-0 overflow-hidden",
        bigMoment && "world-shake",
      )}
    >
      <HubScene
        realmIndex={c.realmIndex}
      />
      {/* Lớp 3D phủ lên nền ảnh, tô theo màu cảnh giới đang tu */}
      <Suspense fallback={null}>
        <Scene3DBackdrop
          color={c.realm.color}
          sky={skyForRealm(c.realmIndex)}
          light={!isDark}
          // Mở bảng ra là thế giới lùi lại một bước, nhường mắt cho nội dung.
          intensity={panelOpen ? 0.38 : 1}
          className="pointer-events-none fixed inset-0 -z-10"
        />
      </Suspense>

      <HeaderHUD onSettings={() => setSettingsOpen(true)} />
      {storageError && <div role="alert" className="fixed inset-x-2 top-2 z-[100] rounded-lg border bg-background p-3 text-sm shadow-lg">
        <p>{storageError}</p>
        <button className="mr-4 underline" onClick={() => { try { if (storageLoadError()) exportStoredFile(); else exportFile(data); } catch { /* Keep the error visible if storage is inaccessible. */ } }}>Xuất bản sao JSON</button>
        <button className="underline" onClick={retrySave}>Thử lưu lại</button>
      </div>}

      {/* ----------------------------------------------------- hai cột icon */}
      <SideRail side="left" label="Hoạt động tu luyện" collapsed={panelOpen}>
        <HubIcon
          icon="nhat-khoa"
          label="Tông Khoá"
          badge={questsLeft}
          active={view === "today" && anchor === "quests"}
          onClick={() => { setDate(todayKey()); open("today", "quests"); }}
        />
        <HubIcon
          icon="tien-lo"
          label="Tiên Lộ"
          badge={unlocked}
          alert={pathAlert}
          active={view === "awards"}
          onClick={() => toggle("awards")}
        />
        <HubIcon
          icon="thong-ke"
          label="Tu Hành Lục"
          active={view === "stats"}
          onClick={() => toggle("stats")}
        />
      </SideRail>

      <SideRail
        side="right"
        label="Đạo thể và tài nguyên"
        collapsed={panelOpen}
      >
        <HubIcon
          icon="linh-can"
          label="Linh Căn"
          alert={!data.root}
          active={view === "cave" && anchor === "cave-root"}
          onClick={() => open("cave", "cave-root")}
        />
        <HubIcon
          icon="linh-thu"
          label="Linh Thú"
          badge={beastCount}
          active={view === "cave" && anchor === "cave-beast"}
          onClick={() => open("cave", "cave-beast")}
        />
        <HubIcon
          icon="dan-duong"
          label="Đan Đường"
          badge={pills}
          alert={progress.readyForTribulation && pills === 0}
          active={view === "cave" && anchor === "cave-pill"}
          onClick={() => open("cave", "cave-pill")}
        />
        <HubIcon
          icon="dong-phu"
          label="Động Phủ"
          // Công pháp là lựa chọn đáng giá nhất trong động phủ và lần đầu chọn
          // lại miễn phí, nhưng nằm lẫn giữa tám mục nên người mới không biết
          // mà vào. Báo cho tới khi họ chọn xong, giống hệt chấm báo linh căn.
          alert={!data.technique}
          active={view === "cave" && !anchor}
          onClick={() => toggle("cave")}
        />
      </SideRail>

      {/* --------------------------------------------------- khu trung tâm */}
      <div
        // inert: khi bảng đang mở, hub phía sau phải rời hẳn khỏi luồng Tab và
        // khỏi cây trợ năng, không chỉ mờ đi.
        inert={panelOpen}
        // Máy hẹp: hai hàng icon nằm dưới HUD nên khu giữa phải lùi thêm.
        style={{
          top: "calc(var(--hud-h, 92px) + var(--rail-offset, 192px))",
          bottom: "calc(var(--footer-h, 86px) + 10px)",
        }}
        className={cn(
          "hub-scroll absolute inset-x-0 z-10 flex flex-col items-center overflow-y-auto overscroll-contain transition-opacity duration-300 lg:right-24 lg:left-24",
          panelOpen && "pointer-events-none opacity-0",
        )}
      >
        {/* my-auto thay cho items-center: căn giữa mà vẫn cuộn được tới đỉnh
            khi màn hình thấp, thay vì bị cắt mất phần trên. */}
        <div className="my-auto w-full shrink-0">
          <HubCenter
            onTribulation={() => setTribulationOpen(true)}
            onFocusTask={startFocus}
            onNew={() => { setDate(todayKey()); openNew(); }}
            onExplore={(v, at) => { if (v === "today") setDate(todayKey()); open(v, at); }}
            onFocus={() => open("focus")}
            onAwaken={() => awaken()}
          />
        </div>
      </div>

      {/* ------------------------------------------------------ bảng phủ */}
      <AnimatePresence mode="wait">
        {searching ? (
          <OverlayPanel
            key="search"
            title={`Tra cứu “${query}”`}
            subtitle={`${results.length} nhiệm vụ khớp`}
            banner="/art/banner/today.jpg"
            bannerFallback={SCENE_FALLBACK}
            onClose={() => setQuery("")}
          >
            {results.length === 0 ? (
              <EmptyState
                icon={SearchX}
                art="no-result"
                title="Không tìm thấy nhiệm vụ nào"
                hint="Thử từ khoá ngắn hơn, hoặc tìm theo nhãn."
              />
            ) : (
              <div className="space-y-2">
                <h2 className="sr-only">Kết quả tìm kiếm</h2>
                <AnimatePresence initial={false}>
                  {results.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onEdit={openEdit}
                      onFocus={startFocus}
                      showDate
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </OverlayPanel>
        ) : view ? (
          <OverlayPanel
            key={view}
            title={PANEL[view].title}
            subtitle={PANEL[view].subtitle}
            banner={PANEL[view].banner}
            bannerFallback={SCENE_FALLBACK}
            anchor={anchor}
            onClose={closePanel}
          >
            <WorkSanctuary view={view} onSelect={open}>
            <Suspense fallback={<p role="status">Đang tải…</p>}>
            {view === "today" && (
              <TodayView
                date={date}
                onDateChange={setDate}
                onEdit={openEdit}
                onFocus={startFocus}
              />
            )}
            {view === "week" && (
              <WeekView
                anchor={date}
                onAnchorChange={setDate}
                onEdit={openEdit}
                onOpenDay={openDay}
              />
            )}
            {view === "month" && (
              <MonthView
                anchor={date}
                onAnchorChange={setDate}
                onEdit={openEdit}
                onFocus={startFocus}
              />
            )}
            {view === "goals" && (
              <GoalsView onEdit={openEdit} onFocus={startFocus} onAddTask={(goalId) => { setEditorGoalId(goalId); setDate(todayKey()); setEditorTask(null); setEditorOpen(true); }} />
            )}
            {view === "focus" && (
              <FocusView />
            )}
            {view === "cave" && <CaveView />}
            {view === "awards" && (
              <AwardsView onTribulation={() => setTribulationOpen(true)} />
            )}
            {view === "stats" && <StatsView />}
            </Suspense>
            </WorkSanctuary>
          </OverlayPanel>
        ) : null}
      </AnimatePresence>

      <FooterMenu
        view={searching ? null : view}
        alerts={{ today: chestAlert }}
        onSelect={(v) => { if (v === null) closePanel(); else { if (v === "today") setDate(todayKey()); open(v); } }}
        onNew={openNew}
        query={query}
        onQuery={setQuery}
      />

      <TaskEditorDialog
        open={editorOpen}
        task={editorTask}
        defaultDate={date}
        defaultGoalId={editorGoalId}
        onOpenChange={setEditorOpen}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TribulationDialog
        open={tribulationOpen}
        onOpenChange={setTribulationOpen}
        onGoToPills={() => open("cave", "cave-pill")}
      />
      <EncounterDialog />
      <CelebrationLayer />
      {/* Không dùng richColors: xanh lá/đỏ tươi của sonner chọi hẳn với tông vàng kim. */}
      <Toaster position="top-center" theme={isDark ? "dark" : "light"} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <TooltipProvider delayDuration={300}>
        <FocusTimerProvider><Shell /></FocusTimerProvider>
      </TooltipProvider>
    </AppProvider>
  );
}
