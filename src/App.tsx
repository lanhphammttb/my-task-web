import { exportFile, exportStoredFile, storageLoadError } from "./lib/storage";
import { FocusTimerProvider, useFocusTimer } from "./store/FocusTimer";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { SearchX } from "lucide-react";
import type { Task, ViewKey } from "./types";
import { todayKey } from "./lib/date";
import { sortTasks } from "./lib/stats";
import { AppProvider, useApp } from "./store/AppStore";
import { cultivationOf } from "./lib/cultivation";
import { effectiveXp } from "./lib/economy";
import { chestsOfDay, pendingChests } from "./lib/chest";
import { timNhiemVu } from "./lib/timKiem";
import CelebrationLayer from "./components/CelebrationLayer";
import SettingsDialog from "./components/SettingsDialog";
import TribulationDialog from "./components/TribulationDialog";
import EncounterDialog from "./components/EncounterDialog";
import TaskCard from "./components/TaskCard";
import TaskEditorDialog from "./components/TaskEditorDialog";
import { EmptyState } from "./components/primitives";
import HubScene from "./components/hub/HubScene";
import HubMobile from "./components/hub/HubMobile";
import { useLaDienThoai } from "./lib/thietBi";
import { nenPhong, nenPhongLui } from "./lib/room";
import { SCENE_FALLBACK } from "./lib/realmArt";
import HeaderHUD from "./components/hub/HeaderHUD";
import HubCenter from "./components/hub/HubCenter";
import WorldRail from "./components/hub/WorldRail";
import OverlayPanel from "./components/hub/OverlayPanel";
import WorkSanctuary from "./components/hub/WorkSanctuary";
import MobileNavigation from "./components/hub/MobileNavigation";
import FooterMenu from "./components/hub/FooterMenu";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { hasKeyboardLayer } from "./lib/keyboard";
import { OPEN_VIEW } from "./lib/section";
import ErrorBoundary from "./components/ErrorBoundary";
import { lazyWithRetry } from "./lazyWithRetry";
// Nạp trễ qua `lazyWithRetry`: chunk cũ 404 sau khi deploy thì tự tải lại
// trang một lần thay vì làm trắng cả app.
const TodayView = lazyWithRetry(() => import("./views/TodayView"));
const WeekView = lazyWithRetry(() => import("./views/WeekView"));
const MonthView = lazyWithRetry(() => import("./views/MonthView"));
const GoalsView = lazyWithRetry(() => import("./views/GoalsView"));
const FocusView = lazyWithRetry(() => import("./views/FocusView"));
const CaveView = lazyWithRetry(() => import("./views/CaveView"));
const AwardsView = lazyWithRetry(() => import("./views/AwardsView"));
const StatsView = lazyWithRetry(() => import("./views/StatsView"));

// three.js khá nặng nên lớp 3D được nạp trễ; nền ảnh 2D vẫn nằm phía dưới.
const Scene3DBackdrop = lazyWithRetry(() => import("./components/Scene3DBackdrop"));

/**
 * Máy yếu thì bỏ hẳn lớp 3D - tranh nền 2D (HubScene) vẫn đủ đẹp.
 *
 * Ngưỡng cố ý rộng tay: WebGL chạy liên tục trên máy 2 GB RAM / 4 nhân là đổi
 * pin và độ mượt của thao tác lấy chút hạt bay lấp lánh. Người bật "Tiết kiệm
 * dữ liệu" cũng không muốn tải thêm ~550 kB three.js.
 */
function mayYeu(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return true;
  return false;
}

/**
 * Chỉ dựng lớp 3D khi trình duyệt rảnh tay.
 *
 * Lượt vẽ đầu là lúc người dùng đang chờ thấy sảnh; chen việc nạp và dựng cảnh
 * three.js vào đúng lúc ấy là giành CPU với chính giao diện. Đợi tới khi rảnh
 * (tối đa 2,5 giây) thì sảnh đã lên xong, lớp 3D phủ thêm vào sau.
 */
function useDungKhiRanh(): boolean {
  const [ranh, setRanh] = useState(false);
  useEffect(() => {
    if (mayYeu()) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setRanh(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setRanh(true), 1200);
    return () => window.clearTimeout(id);
  }, []);
  return ranh;
}

/**
 * Cầu nối tới đồng hồ bế quan.
 *
 * `useFocusTimer()` đổi giá trị MỖI GIÂY khi đồng hồ chạy. Shell chỉ cần đúng
 * hàm `pickTask`, vậy mà gọi hook ngay trong Shell là kéo cả cây (HUD, sảnh,
 * bảng đang mở, mấy hộp thoại) dựng lại mỗi giây. Đẩy phần đăng ký xuống một
 * component rỗng: nó dựng lại mỗi giây nhưng không vẽ gì, còn Shell đứng yên.
 */
function FocusPickBridge({ onPick }: { onPick: (pick: (taskId?: string) => void) => void }) {
  const { pickTask } = useFocusTimer();
  useLayoutEffect(() => {
    onPick(pickTask);
  });
  return null;
}

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
    subtitle: "Nhà của bạn",
    banner: "/art/banner/cave.jpg",
  },
  awards: {
    title: "Tiên Lộ",
    subtitle: "Đường tu của bạn",
    banner: "/art/banner/awards.jpg",
  },
  stats: {
    title: "Tu Hành Lục",
    subtitle: "Sổ chép đường tu",
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
  const pickTaskRef = useRef<(taskId?: string) => void>(() => {});
  const nhanPickTask = useCallback((pick: (taskId?: string) => void) => {
    pickTaskRef.current = pick;
  }, []);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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
    setAnchor(undefined);
    setQuery("");
  }, []);

  const openNew = useCallback(() => {
    if (view !== "today" && view !== "week" && view !== "month") setDate(todayKey());
    setEditorGoalId(undefined);
    setEditorTask(null);
    setEditorOpen(true);
  }, [view]);

  const openEdit = useCallback((t: Task) => {
    setEditorGoalId(undefined);
    setEditorTask(t);
    setEditorOpen(true);
  }, []);

  const startFocus = useCallback(
    (t: Task) => {
      pickTaskRef.current(t.id);
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

  // Chỗ sâu bên trong một bảng (ví dụ kết quả mở hòm) xin chuyển sang bảng khác.
  useEffect(() => {
    const onOpenView = (e: Event) => {
      const { view: v, at } = (e as CustomEvent<{ view: ViewKey; at?: string }>).detail;
      open(v, at);
    };
    window.addEventListener(OPEN_VIEW, onOpenView);
    return () => window.removeEventListener(OPEN_VIEW, onOpenView);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
          el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey || e.repeat ||
        hasKeyboardLayer()) return;

      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
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

  // Bỏ dấu cả hai phía: người Việt gõ "bao cao" vẫn phải ra "báo cáo". Tìm cả
  // trong bước nhỏ - xem `lib/timKiem.ts`.
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return sortTasks(timNhiemVu(data.tasks, query));
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
  const c = cultivationOf(effectiveXp(data));
  const searching = query.trim().length > 0;
  const panelOpen = searching || view !== null;
  const laDienThoai = useLaDienThoai();
  const dung3D = useDungKhiRanh();

  /**
   * Chấm báo trên icon Tiên Lộ.
   *
   * Sứ mệnh có đặt cọc và có hạn chót, mà lại không được nhắc ở bất kỳ đâu
   * ngoài chính bảng Tiên Lộ - nhận việc xong quên là mất cọc trong im lặng.
   * Thế thì nó là cái bẫy chứ không phải công cụ cam kết. Báo khi sắp hết hạn,
   * khi đã đạt để vào lấy thưởng, và khi đoàn thám hiểm đã về tới nơi.
   */
  // Hòm kỳ ngộ nằm trong Nhật Khoá. Không báo ra ngoài thì xong việc rồi vẫn
  // phải mở bảng mới biết có hòm - mà cái hay của nó nằm đúng ở chỗ biết ngay
  // là có thứ đang chờ mình.
  // Đếm theo NGÀY HOÀN THÀNH, cùng lối với lệnh mở hòm (`chestsOfDay`): chấm
  // báo mà đếm theo ngày lên lịch thì có lúc sáng lên cho một hòm không mở được.
  const chestAlert = pendingChests(chestsOfDay(data, todayKey())) > 0;


  return (
    <>
    <FocusPickBridge onPick={nhanPickTask} />
    <div
      className={cn(
        "relative isolate h-full min-h-0 overflow-hidden",
        laDienThoai && "mobile-shell",
        bigMoment && "world-shake",
      )}
      // Bảng phủ kín màn điện thoại: CSS dựa vào cờ này để dừng các hoạt ảnh
      // của cảnh nền phía sau (không ai thấy mà vẫn tốn khung hình).
      data-phu-kin={laDienThoai && panelOpen ? "" : undefined}
    >
      {/* Về nhà thì cả khung cảnh phía sau đổi theo căn phòng, không chỉ đổi
          nội dung trong bảng. Đi đâu cũng thấy một nền y hệt thì không có cảm
          giác đang bước sang một chỗ khác. */}
      <HubScene
        realmIndex={c.realmIndex}
        override={laDienThoai && !view ? "/art/world/son-mon-dawn-v1.webp" : view === "cave" ? nenPhong(data.caveLevel) : undefined}
        overrideFallback={laDienThoai && !view ? "/art/realm/01-luyen-khi.jpg" : view === "cave" ? nenPhongLui(data.caveLevel) : undefined}
        overridePosition={laDienThoai && !view ? "50% 50%" : undefined}
        className={cn(
          laDienThoai && !view && "mobile-home-scene",
          !laDienThoai && !view && "desktop-home-scene",
        )}
      />
      {/* Three.js phủ nhẹ cả web lẫn mobile; động phủ giữ nguyên cảnh trong nhà. */}
      {/* Lớp 3D là đồ trang trí: nạp hỏng thì im lặng bỏ đi, không kéo cả app. */}
      {view !== "cave" && dung3D && <ErrorBoundary variant="silent"><Suspense fallback={null}>
        <Scene3DBackdrop
          color={c.realm.color}
          light={!isDark}
          // Mở bảng ra là thế giới lùi lại một bước, nhường mắt cho nội dung.
          intensity={panelOpen ? 0.38 : 1}
          phone={laDienThoai}
          // Trên điện thoại bảng hoặc hộp thoại phủ kín cả màn: vẽ 30 hình/giây
          // cho một cảnh không ai nhìn thấy chỉ tốn pin - dừng hẳn vòng vẽ.
          // Màn rộng vẫn thấy cảnh hai bên nên vẫn chạy.
          paused={laDienThoai && (panelOpen || editorOpen || settingsOpen || tribulationOpen)}
          // Đặt scene trong stacking context ở z-0: HubScene nằm tại -z-20,
          // còn HUD/nội dung đều >= z-10, nên WebGL hiện trên tranh nền mà không phủ UI.
          className={cn("pointer-events-none fixed inset-0 z-0 game-scene-3d", laDienThoai && "mobile-scene-3d")}
        />
      </Suspense></ErrorBoundary>}

      <div inert={laDienThoai && panelOpen} aria-hidden={laDienThoai && panelOpen}>
        <HeaderHUD onSettings={() => setSettingsOpen(true)} />
      </div>

      {/* --------------------------------------------------- khu trung tâm */}
      <div
        // inert: khi bảng đang mở, hub phía sau phải rời hẳn khỏi luồng Tab và
        // khỏi cây trợ năng, không chỉ mờ đi.
        inert={panelOpen}
        style={{
          top: "calc(var(--hud-h, 92px) + 12px)",
          bottom: "calc(var(--footer-h, 86px) + 10px)",
        }}
        className={cn(
          "hub-scroll absolute inset-x-0 z-10 flex flex-col items-center overscroll-contain transition-[opacity,visibility] duration-300",
          // Sảnh điện thoại tự vừa màn, không có gì để cuộn; bật cuộn ở đó chỉ
          // tạo ra cái thanh nảy lên nảy xuống khi chạm.
          "overflow-x-hidden overflow-y-auto",
          // `invisible` (đổi ở CUỐI lượt mờ dần): sảnh đã khuất sau bảng thì
          // trình duyệt thôi vẽ nó - kể cả mấy lớp kính mờ và hoạt ảnh bên trong.
          panelOpen && "pointer-events-none invisible opacity-0",
        )}
      >
        {/* Hai sảnh khác hẳn nhau, không phải một sảnh co giãn.
            Điện thoại: cảnh là chính, việc cần làm nổi lên trên cảnh.
            Màn rộng: thừa chỗ nên bày được cả vòng tu vi lẫn châm ngôn. */}
        {laDienThoai ? (
          <HubMobile
            onTribulation={() => setTribulationOpen(true)}
            onFocusTask={startFocus}
            onNew={() => { setDate(todayKey()); openNew(); }}
            onExplore={(v, at) => { if (v === "today") setDate(todayKey()); open(v, at); }}
            onAwaken={() => awaken()}
          />
        ) : (
          <div className="mx-auto my-auto w-full max-w-5xl shrink-0">
            <HubCenter
              onTribulation={() => setTribulationOpen(true)}
              onFocusTask={startFocus}
              onNew={() => { setDate(todayKey()); openNew(); }}
              onExplore={(v, at) => { if (v === "today") setDate(todayKey()); open(v, at); }}
              onAwaken={() => awaken()}
            />
          </div>
        )}
      </div>

      {/* Dãy nút tròn bám mép phải.
          Đặt NGOÀI khu cuộn để nó đứng yên khi nội dung cuộn, và LUÔN hiện kể
          cả lúc bảng đang mở: ẩn đi thì muốn sang nơi khác phải đóng bảng rồi
          mở lại, đúng kiểu lạc đường mà cả đợt sửa này sinh ra để dẹp. */}
      {!laDienThoai && <WorldRail view={view} onSelect={(v, at) => { if (v === "today") setDate(todayKey()); open(v, at); }} />}

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
            {/* Mỗi bảng một lưới đỡ riêng (key theo bảng): một bảng hỏng thì chỉ
                bảng ấy báo lỗi, bấm sang bảng khác là thoát ra được. */}
            <ErrorBoundary key={view} variant="panel">
            <Suspense fallback={
              <div className="game-loading" role="status">
                <span className="game-loading-seal" aria-hidden="true">✧</span>
                <span>Đang mở sổ tu hành…</span>
                <small>Linh khí đang hội tụ</small>
              </div>
            }>
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
              <FocusView onNew={openNew} />
            )}
            {view === "cave" && <CaveView onMeditate={() => open("focus")} initialTab={anchor} />}
            {view === "awards" && (
              <AwardsView onTribulation={() => setTribulationOpen(true)} />
            )}
            {view === "stats" && (
              <StatsView onOpenDay={openDay} onOpenGoals={() => open("goals")} />
            )}
            </Suspense>
            </ErrorBoundary>
            </WorkSanctuary>
          </OverlayPanel>
        ) : null}
      </AnimatePresence>

      {laDienThoai ? (
        <MobileNavigation view={view} searching={searching} query={query} onQuery={setQuery}
          onSelect={(v) => { if (v === null) closePanel(); else { if (v === "today") setDate(todayKey()); open(v); } }}
          alert={chestAlert} />
      ) : (
      <FooterMenu
        view={view}
        searching={searching}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        alerts={{ today: chestAlert }}
        onSelect={(v) => { if (v === null) closePanel(); else { if (v === "today") setDate(todayKey()); open(v); } }}
        onNew={openNew}
        query={query}
        onQuery={setQuery}
      />
      )}

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
    </div>
    {/*
      Thông báo lỗi lưu và toast nằm NGOÀI khối `isolate` phía trên.

      `isolate` dựng một stacking context riêng, nên z-index bên trong chỉ so
      với nhau: z-[100] hay z-[999999] trong đó vẫn nằm DƯỚI hộp thoại Radix
      (portal ra <body>, z-50). Toast "đã lưu" hiện sau lớp nền mờ của hộp
      thoại là toast không ai đọc được. Ra ngoài thì chúng so thẳng với hộp
      thoại và nổi lên trên.

      `pointer-events-auto`: lúc hộp thoại modal mở, Radix khoá chuột cả <body>;
      nút "Thử lưu lại" vẫn phải bấm được.
    */}
    {storageError && <div role="alert" className="pointer-events-auto fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-100 rounded-lg border bg-background p-3 text-sm shadow-lg">
      <p>{storageError}</p>
      <button className="mr-4 underline" onClick={() => { try { if (storageLoadError()) exportStoredFile(); else exportFile(data); } catch { /* Keep the error visible if storage is inaccessible. */ } }}>Xuất bản sao JSON</button>
      <button className="underline" onClick={retrySave}>Thử lưu lại</button>
    </div>}
    {/* Không dùng richColors: xanh lá/đỏ tươi của sonner chọi hẳn với tông vàng kim. */}
    {/* Chừa safe-area trên: app cài lên màn hình chính vẽ tràn dưới thanh trạng thái. */}
    <Toaster
      position="top-center"
      theme={isDark ? "dark" : "light"}
      offset={{ top: "calc(env(safe-area-inset-top, 0px) + 24px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    />
    </>
  );
}

export default function App() {
  return (
    // reducedMotion="user": máy bật "giảm chuyển động" thì motion bỏ các hoạt
    // ảnh dịch chuyển/phóng to, chỉ giữ đổi độ mờ - áp cho MỌI motion.* trong app.
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <TooltipProvider delayDuration={300}>
          <FocusTimerProvider><Shell /></FocusTimerProvider>
        </TooltipProvider>
      </AppProvider>
    </MotionConfig>
  );
}
