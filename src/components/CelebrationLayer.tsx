import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/achievements';
import { useApp } from '../store/AppStore';
import { Button } from '@/components/ui/button';

/**
 * Lớp phủ ăn mừng: khoảnh khắc phần thưởng rõ ràng khi người dùng vượt mốc.
 * Tự đóng sau 5 giây để không cản đường nếu người dùng đang làm nhanh.
 */
export default function CelebrationLayer() {
  const { celebration, dismissCelebration } = useApp();

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(dismissCelebration, 5000);
    return () => window.clearTimeout(t);
  }, [celebration, dismissCelebration]);

  let icon: LucideIcon = Sparkles;
  let eyebrow = '';
  let title = '';
  let body = '';

  if (celebration?.kind === 'level-up') {
    icon = ArrowUpRight;
    eyebrow = 'Lên cấp';
    title = `Cấp ${celebration.level}`;
    body = `Bạn đã tích lũy ${celebration.xp} XP. Cứ đà này thì mục tiêu nào cũng tới.`;
  } else if (celebration?.kind === 'perfect-day') {
    icon = PartyPopper;
    eyebrow = 'Ngày trọn vẹn';
    title = 'Dọn sạch danh sách!';
    body = `${celebration.count} nhiệm vụ hôm nay đều đã xong. Hôm nay bạn thắng.`;
  } else if (celebration?.kind === 'achievement') {
    icon = ACHIEVEMENTS.find((a) => a.id === celebration.id)?.icon ?? Trophy;
    eyebrow = 'Mở huy hiệu mới';
    title = celebration.title;
    body = celebration.description;
  }

  const Icon = icon;

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={dismissCelebration}
          className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.82, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="border-border bg-card w-full max-w-sm overflow-hidden rounded-2xl border text-center shadow-2xl"
          >
            <div className="bg-brand-gradient relative px-6 pt-8 pb-6 text-white">
              <div className="animate-trophy mx-auto grid size-20 place-items-center rounded-full bg-white/18 ring-4 ring-white/25">
                <Icon className="size-9" strokeWidth={2.25} />
              </div>
              <p className="mt-4 text-[11px] font-bold tracking-[0.18em] uppercase opacity-90">{eyebrow}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              <Button className="mt-5 w-full" onClick={dismissCelebration}>
                Tiếp tục chiến đấu
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
