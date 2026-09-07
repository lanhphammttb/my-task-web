import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Plus, Search, SearchX, Settings, Sun, X } from 'lucide-react';
import type { Task, ViewKey } from './types';
import { todayKey } from './lib/date';
import { sortTasks } from './lib/stats';
import { AppProvider, useApp } from './store/AppStore';
import AppSidebar, { MobileNav, NAV } from './components/AppSidebar';
import CelebrationLayer from './components/CelebrationLayer';
import SettingsDialog from './components/SettingsDialog';
import TaskCard from './components/TaskCard';
import TaskEditorDialog from './components/TaskEditorDialog';
import { EmptyState, Section } from './components/primitives';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import TodayView from './views/TodayView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import GoalsView from './views/GoalsView';
import FocusView from './views/FocusView';
import AwardsView from './views/AwardsView';
import StatsView from './views/StatsView';

const VIEW_TITLE: Record<ViewKey, string> = {
  today: 'Kế hoạch trong ngày',
  week: 'Kế hoạch tuần',
  month: 'Kế hoạch tháng',
  goals: 'Mục tiêu dài hạn',
  focus: 'Tập trung sâu',
  awards: 'Huy hiệu & thành tích',
  stats: 'Thống kê hiệu suất',
};

function Shell() {
  const { data, updateSettings } = useApp();
  const [view, setView] = useState<ViewKey>('today');
  const [date, setDate] = useState(todayKey());
  const [editorTask, setEditorTask] = useState<Task | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>();
  const [query, setQuery] = useState('');

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
    setView('focus');
  }, []);

  const openDay = useCallback((d: string) => {
    setDate(d);
    setView('today');
  }, []);

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
        setView('today');
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= NAV.length) setView(NAV[num - 1].key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openNew]);

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
  const searching = query.trim().length > 0;

  return (
    // h-full + min-h-0 ở mọi cấp là điều kiện để vùng nội dung cuộn được.
    <div className="flex h-full min-h-0">
      <AppSidebar view={view} onChange={setView} onSettings={() => setSettingsOpen(true)} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Trên màn hình hẹp: tiêu đề + nút ở hàng đầu, ô tìm kiếm chiếm trọn hàng dưới. */}
        <header className="border-border bg-background/85 flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
          <h1 className="order-1 mr-auto truncate text-base font-bold tracking-tight">{VIEW_TITLE[view]}</h1>

          <div className="order-3 w-full sm:order-2 sm:w-auto">
            <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/20 flex items-center gap-2 rounded-full border px-3 transition-colors focus-within:ring-2">
              <Search className="text-muted-foreground size-3.5 shrink-0" />
              <input
                id="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm nhiệm vụ, nhãn... (/)"
                className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2 text-sm outline-none sm:w-52 sm:flex-none"
              />
              {searching && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Xoá tìm kiếm"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="order-2 flex shrink-0 items-center gap-2 sm:order-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Đổi giao diện sáng/tối"
              title="Đổi giao diện sáng/tối"
              onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Cài đặt"
              className="md:hidden"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" />
            </Button>

            <Button className="gap-1.5" onClick={openNew}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nhiệm vụ mới</span>
            </Button>
          </div>
        </header>

        <MobileNav view={view} onChange={setView} />

        {/* Vùng cuộn duy nhất của ứng dụng */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-20 sm:px-6">
          {searching ? (
            <div className="mx-auto w-full max-w-5xl">
              <Section
                icon={Search}
                title={`Kết quả tìm kiếm cho “${query}”`}
                subtitle={`${results.length} nhiệm vụ`}
              >
                {results.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title="Không tìm thấy nhiệm vụ nào"
                    hint="Thử từ khoá ngắn hơn, hoặc tìm theo nhãn."
                  />
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {results.map((t) => (
                        <TaskCard key={t.id} task={t} onEdit={openEdit} onFocus={startFocus} showDate />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </Section>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
                {view === 'awards' && <AwardsView />}
                {view === 'stats' && <StatsView />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <TaskEditorDialog open={editorOpen} task={editorTask} defaultDate={date} onOpenChange={setEditorOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CelebrationLayer />
      <Toaster position="bottom-right" theme={isDark ? 'dark' : 'light'} richColors />
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
