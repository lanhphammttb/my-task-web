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
import { achievementStates } from "./lib/achievements";
import { questStates } from "./lib/quests";
import { PILL_ORDER } from "./lib/pills";
import CelebrationLayer from "./components/CelebrationLayer";
import SettingsDialog from "./components/SettingsDialog";
import TribulationDialog from "./components/TribulationDialog";
import EncounterDialog from "./components/EncounterDialog";
import TaskCard from "./components/TaskCard";
import TaskEditorDialog from "./components/TaskEditorDialog";
import { EmptyState } from "./components/primitives";
import HubScene, { SCENE_FALLBACK } from "./components/hub/HubScene";
import HeaderHUD from "./components/hub/HeaderHUD";
import HubCenter from "./components/hub/HubCenter";
import HubIcon from "./components/hub/HubIcon";
import SideRail from "./components/hub/SideRail";
import OverlayPanel from "./components/hub/OverlayPanel";
import FooterMenu from "./components/hub/FooterMenu";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { skyForRealm } from "./lib/sky";
import { cn } from "@/lib/utils";
import TodayView from "./views/TodayView";
import WeekView from "./views/WeekView";
import MonthView from "./views/MonthView";
import GoalsView from "./views/GoalsView";
import FocusView from "./views/FocusView";
import CaveView from "./views/CaveView";
import AwardsView from "./views/AwardsView";
import StatsView from "./views/StatsView";

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
    title: "Nhật Khoá",
    subtitle: "Việc phải xong trước khi mặt trời lặn",
    banner: "/art/banner/today.jpg",
  },
  week: {
    title: "Tuần Khoá",
    subtitle: "Bảy ngày trước mặt, liệu sức mà chia",
    banner: "/art/banner/week.jpg",
  },
  month: {
    title: "Nguyệt Khoá",
    subtitle: "Một tháng trải ra, thấy ngay chỗ nào còn hổng",
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
  const { data, awaken, celebration } = useApp();
  const [view, setView] = useState<ViewKey | null>(null);
  const [anchor, setAnchor] = useState<string | undefined>();
  const [date, setDate] = useState(todayKey());
  const [editorTask, setEditorTask] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tribulationOpen, setTribulationOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>();
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
    [open],
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

  // Đột phá cảnh giới và phi thăng thì rung cả thế giới một nhịp ngắn.
  const bigMoment =
    celebration?.kind === "realm-up" || celebration?.kind === "ascension";
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (!bigMoment) return;
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), 760);
    return () => window.clearTimeout(t);
  }, [bigMoment]);

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

  return (
    <div
      className={cn(
        "relative h-full min-h-0 overflow-hidden",
        shaking && "world-shake",
      )}
    >
      <HubScene
        realmIndex={c.realmIndex}
        override={view ? PANEL[view].banner : undefined}
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

      {/* ----------------------------------------------------- hai cột icon */}
      <SideRail side="left" label="Hoạt động tu luyện" collapsed={panelOpen}>
        <HubIcon
          icon="be-quan"
          label="Bế Quan"
          active={view === "focus"}
          alert={stats.focusMin < (data.settings.dailyFocusTarget || 60)}
          onClick={() => toggle("focus")}
        />
        <HubIcon
          icon="nhat-khoa"
          label="Tông Khoá"
          badge={questsLeft}
          active={view === "today" && anchor === "quests"}
          onClick={() => open("today", "quests")}
        />
        <HubIcon
          icon="tien-lo"
          label="Tiên Lộ"
          badge={unlocked}
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
          "absolute inset-x-0 z-10 flex items-center justify-center transition-opacity duration-300 lg:right-24 lg:left-24",
          panelOpen && "pointer-events-none opacity-0",
        )}
      >
        {/* my-auto thay cho items-center: căn giữa mà vẫn cuộn được tới đỉnh
            khi màn hình thấp, thay vì bị cắt mất phần trên. */}
        <div className="my-auto w-full">
          <HubCenter
            onTribulation={() => setTribulationOpen(true)}
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
              <GoalsView onEdit={openEdit} onFocus={startFocus} />
            )}
            {view === "focus" && (
              <FocusView taskId={focusTaskId} onPickTask={setFocusTaskId} />
            )}
            {view === "cave" && <CaveView />}
            {view === "awards" && (
              <AwardsView onTribulation={() => setTribulationOpen(true)} />
            )}
            {view === "stats" && <StatsView />}
          </OverlayPanel>
        ) : null}
      </AnimatePresence>

      <FooterMenu
        view={searching ? null : view}
        onSelect={toggle}
        onNew={openNew}
        query={query}
        onQuery={setQuery}
      />

      <TaskEditorDialog
        open={editorOpen}
        task={editorTask}
        defaultDate={date}
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
        <Shell />
      </TooltipProvider>
    </AppProvider>
  );
}
