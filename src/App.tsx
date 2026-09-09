import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { SearchX } from 'lucide-react';
import type { Task, ViewKey } from './types';
import { todayKey } from './lib/date';
import { dayStats, sortTasks } from './lib/stats';
import { AppProvider, useApp } from './store/AppStore';
import { cultivationOf } from './lib/cultivation';
import { effectiveXp, progressOf } from './lib/economy';
import { achievementStates } from './lib/achievements';
import { questStates } from './lib/quests';
import { PILL_ORDER } from './lib/pills';
import CelebrationLayer from './components/CelebrationLayer';
import SettingsDialog from './components/SettingsDialog';
import TribulationDialog from './components/TribulationDialog';
import EncounterDialog from './components/EncounterDialog';
import TaskCard from './components/TaskCard';
import TaskEditorDialog from './components/TaskEditorDialog';
import { EmptyState } from './components/primitives';
import HubScene from './components/hub/HubScene';
import HeaderHUD from './components/hub/HeaderHUD';
import HubCenter from './components/hub/HubCenter';
import HubIcon from './components/hub/HubIcon';
import SideRail from './components/hub/SideRail';
import OverlayPanel from './components/hub/OverlayPanel';
import FooterMenu from './components/hub/FooterMenu';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import TodayView from './views/TodayView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import GoalsView from './views/GoalsView';
import FocusView from './views/FocusView';
import CaveView from './views/CaveView';
import AwardsView from './views/AwardsView';
import StatsView from './views/StatsView';

// three.js khá nặng nên lớp 3D được nạp trễ; nền ảnh 2D vẫn nằm phía dưới.
const Scene3DBackdrop = lazy(() => import('./components/Scene3DBackdrop'));

interface PanelMeta {
  title: string;
  subtitle: string;
  /** Ảnh riêng của bảng - thả vào public/art/banner/ theo đúng tên này. */
  banner: string;
  /** Ảnh dùng tạm khi chưa có ảnh riêng. */
  fallback: string;
}

const PANEL: Record<ViewKey, PanelMeta> = {
  today: {
    title: 'Nhật khoá hôm nay',
    subtitle: 'Việc phải xong trước khi mặt trời lặn',
    banner: '/art/banner/today.jpg',
    fallback: '/art/page/hub.jpg',
  },
  week: {
    title: 'Kế hoạch tuần',
    subtitle: 'Bảy ngày trước mắt, xếp việc cho khỏi dồn',
    banner: '/art/banner/week.jpg',
    fallback: '/art/page/sect.jpg',
  },
  month: {
    title: 'Kế hoạch tháng',
    subtitle: 'Nhìn cả tháng để biết chỗ nào đang trống',
    banner: '/art/banner/month.jpg',
    fallback: '/art/page/bicanh.jpg',
  },
  goals: {
    title: 'Đại nguyện',
    subtitle: 'Mục tiêu dài hạn - gốc rễ của mọi nhật khoá',
    banner: '/art/banner/goals.jpg',
    fallback: '/art/page/tower.jpg',
  },
  focus: {
    title: 'Bế quan',
    subtitle: 'Nhập định, dồn toàn bộ tâm trí vào một việc',
    banner: '/art/banner/focus.jpg',
    fallback: '/art/page/cave.jpg',
  },
  cave: {
    title: 'Động phủ',
    subtitle: 'Linh thạch, linh căn, đan dược và linh thú',
    banner: '/art/banner/cave.jpg',
    fallback: '/art/page/cave.jpg',
  },
  awards: {
    title: 'Tiên lộ',
    subtitle: 'Chín cảnh giới và những kỳ ngộ đã mở',
    banner: '/art/banner/awards.jpg',
    fallback: '/art/scene/main.jpg',
  },
  stats: {
    title: 'Thống kê',
    subtitle: 'Số liệu không biết nói dối',
    banner: '/art/banner/stats.jpg',
    fallback: '/art/page/bone.jpg',
  },
};

/** Thứ tự phím tắt 1..8 */
const HOTKEY_ORDER: ViewKey[] = ['today', 'week', 'month', 'goals', 'focus', 'cave', 'awards', 'stats'];

function Shell() {
  const { data, awaken } = useApp();
  const [view, setView] = useState<ViewKey | null>(null);
  const [anchor, setAnchor] = useState<string | undefined>();
  const [date, setDate] = useState(todayKey());
  const [editorTask, setEditorTask] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tribulationOpen, setTribulationOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>();
  const [query, setQuery] = useState('');

  const open = useCallback((v: ViewKey, at?: string) => {
    setQuery('');
    setAnchor(at);
    setView(v);
  }, []);

  const toggle = useCallback((v: ViewKey) => {
    setQuery('');
    setAnchor(undefined);
    setView((cur) => (cur === v ? null : v));
  }, []);

  const closePanel = useCallback(() => {
    setView(null);
    setQuery('');
  }, []);

  const openNew = useCallback(() => {
    setEditorTask(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((t: Task) => {
    setEditorTask(t);
    setEditorOpen(true);
  }, []);

  const startFocus = useCallback((t: Task) => {
    setFocusTaskId(t.id);
    open('focus');
  }, [open]);

  const openDay = useCallback((d: string) => {
    setDate(d);
    open('today');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
        return;
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNew();
        return;
      }
      if (e.key.toLowerCase() === 't') {
        setDate(todayKey());
        open('today');
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= HOTKEY_ORDER.length) toggle(HOTKEY_ORDER[num - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const isDark = data.settings.theme === 'dark';
  const progress = progressOf(data);
  const c = cultivationOf(effectiveXp(data));
  const searching = query.trim().length > 0;
  const panelOpen = searching || view !== null;

  // Chỉ số nhỏ gắn lên icon: cho người dùng biết chỗ nào đang cần ghé.
  const stats = dayStats(data.tasks, data.sessions, todayKey());
  const questsLeft = questStates(data, todayKey()).filter((q) => !q.done).length;
  const unlocked = achievementStates(data).filter((a) => a.unlocked).length;
  const pills = PILL_ORDER.reduce((s, g) => s + (data.pills[g] ?? 0), 0);
  const beastCount = data.beasts.length;

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <HubScene
        realmIndex={c.realmIndex}
        override={view ? PANEL[view].banner : undefined}
        overrideFallback={view ? PANEL[view].fallback : undefined}
      />
      {/* Lớp 3D phủ lên nền ảnh, tô theo màu cảnh giới đang tu */}
      <Suspense fallback={null}>
        <Scene3DBackdrop
          color={c.realm.color}
          light={!isDark}
          className="pointer-events-none fixed inset-0 -z-10"
        />
      </Suspense>

      <HeaderHUD onSettings={() => setSettingsOpen(true)} />

      {/* ----------------------------------------------------- hai cột icon */}
      <SideRail side="left" label="Hoạt động tu luyện" collapsed={panelOpen}>
        <HubIcon
          icon="/art/icon/technique.png"
          label="Bế Quan"
          active={view === 'focus'}
          alert={stats.focusMin < (data.settings.dailyFocusTarget || 60)}
          onClick={() => toggle('focus')}
        />
        <HubIcon
          icon="/art/icon/daily_tasks.png"
          label="Nhật Khoá"
          badge={questsLeft}
          active={view === 'today' && anchor === 'quests'}
          onClick={() => open('today', 'quests')}
        />
        <HubIcon
          icon="/art/icon/daopath.png"
          label="Tiên Lộ"
          badge={unlocked}
          active={view === 'awards'}
          onClick={() => toggle('awards')}
        />
        <HubIcon
          icon="/art/icon/ranking.png"
          label="Thống Kê"
          active={view === 'stats'}
          onClick={() => toggle('stats')}
        />
      </SideRail>

      <SideRail side="right" label="Đạo thể và tài nguyên" collapsed={panelOpen}>
        <HubIcon
          icon="/art/icon/linhcan.png"
          label="Linh Căn"
          alert={!data.root}
          active={view === 'cave' && anchor === 'cave-root'}
          onClick={() => open('cave', 'cave-root')}
        />
        <HubIcon
          icon="/art/icon/pet.png"
          label="Linh Thú"
          badge={beastCount}
          active={view === 'cave' && anchor === 'cave-beast'}
          onClick={() => open('cave', 'cave-beast')}
        />
        <HubIcon
          icon="/art/icon/alchemy.png"
          label="Đan Đường"
          badge={pills}
          alert={progress.readyForTribulation && pills === 0}
          active={view === 'cave' && anchor === 'cave-pill'}
          onClick={() => open('cave', 'cave-pill')}
        />
        <HubIcon
          icon="/art/icon/sect.png"
          label="Động Phủ"
          active={view === 'cave' && !anchor}
          onClick={() => toggle('cave')}
        />
      </SideRail>

      {/* --------------------------------------------------- khu trung tâm */}
      <div
        // inert: khi bảng đang mở, hub phía sau phải rời hẳn khỏi luồng Tab và
        // khỏi cây trợ năng, không chỉ mờ đi.
        inert={panelOpen}
        className={cn(
          'absolute inset-x-0 top-[212px] bottom-[96px] z-10 flex items-center justify-center transition-opacity duration-300 lg:top-[76px] lg:right-24 lg:left-24',
          panelOpen && 'pointer-events-none opacity-0',
        )}
      >
        <HubCenter
          onTribulation={() => setTribulationOpen(true)}
          onFocus={() => open('focus')}
          onAwaken={() => awaken()}
        />
      </div>

      {/* ------------------------------------------------------ bảng phủ */}
      <AnimatePresence mode="wait">
        {searching ? (
          <OverlayPanel
            key="search"
            title={`Tra cứu “${query}”`}
            subtitle={`${results.length} nhiệm vụ khớp`}
            banner="/art/banner/today.jpg"
            bannerFallback="/art/page/hub.jpg"
            onClose={() => setQuery('')}
          >
            {results.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Không tìm thấy nhiệm vụ nào"
                hint="Thử từ khoá ngắn hơn, hoặc tìm theo nhãn."
              />
            ) : (
              <div className="space-y-2">
                <h2 className="sr-only">Kết quả tìm kiếm</h2>
                <AnimatePresence initial={false}>
                  {results.map((t) => (
                    <TaskCard key={t.id} task={t} onEdit={openEdit} onFocus={startFocus} showDate />
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
            bannerFallback={PANEL[view].fallback}
            anchor={anchor}
            onClose={closePanel}
          >
            {view === 'today' && (
              <TodayView date={date} onDateChange={setDate} onEdit={openEdit} onFocus={startFocus} />
            )}
            {view === 'week' && (
              <WeekView anchor={date} onAnchorChange={setDate} onEdit={openEdit} onOpenDay={openDay} />
            )}
            {view === 'month' && (
              <MonthView anchor={date} onAnchorChange={setDate} onEdit={openEdit} onFocus={startFocus} />
            )}
            {view === 'goals' && <GoalsView onEdit={openEdit} onFocus={startFocus} />}
            {view === 'focus' && <FocusView taskId={focusTaskId} onPickTask={setFocusTaskId} />}
            {view === 'cave' && <CaveView />}
            {view === 'awards' && <AwardsView onTribulation={() => setTribulationOpen(true)} />}
            {view === 'stats' && <StatsView />}
          </OverlayPanel>
        ) : null}
      </AnimatePresence>

      <FooterMenu view={searching ? null : view} onSelect={toggle} onNew={openNew} query={query} onQuery={setQuery} />

      <TaskEditorDialog open={editorOpen} task={editorTask} defaultDate={date} onOpenChange={setEditorOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TribulationDialog
        open={tribulationOpen}
        onOpenChange={setTribulationOpen}
        onGoToPills={() => open('cave', 'cave-pill')}
      />
      <EncounterDialog />
      <CelebrationLayer />
      {/* Không dùng richColors: xanh lá/đỏ tươi của sonner chọi hẳn với tông vàng kim. */}
      <Toaster position="top-center" theme={isDark ? 'dark' : 'light'} />
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
