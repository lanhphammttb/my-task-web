import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CloudLightning, Feather, PartyPopper, Sparkles, Trophy, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/achievements';
import { REALMS } from '../lib/cultivation';
import { PERK_LABEL, RARITIES, beastById } from '../lib/beasts';
import { ELEMENTS, gradeOf, rootElementLabel } from '../lib/spirit';
import BeastEmblem from './BeastEmblem';
import { useApp } from '../store/AppStore';
import RealmSeal from './RealmSeal';
import { Button } from '@/components/ui/button';

/**
 * Lớp phủ ăn mừng: khoảnh khắc phần thưởng khi người tu vượt mốc. Đột phá tầng
 * là mốc nhỏ, độ kiếp sang cảnh giới mới là mốc lớn, phi thăng là đích cuối.
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
  let gradient = 'linear-gradient(135deg, var(--jade), var(--gold))';
  /** Cảnh giới cần đóng dấu triện; null thì hiện biểu tượng tròn như cũ. */
  let sealRealm: { name: string; tier?: number } | null = null;
  /** Huy hiệu linh thú thay cho biểu tượng tròn khi chiêu thú. */
  let emblemBeastId: string | null = null;

  switch (celebration?.kind) {
    case 'tier-up': {
      const realm = REALMS[celebration.realmIndex];
      icon = realm.icon;
      eyebrow = 'Đột phá';
      title = celebration.label;
      body = `Tu vi đạt ${celebration.xp}. Khí tức vững hơn một bậc — cứ giữ nhịp này.`;
      gradient = `linear-gradient(135deg, ${realm.color}, var(--gold))`;
      sealRealm = { name: realm.name, tier: Number(celebration.label.split(' ').at(-1)) || undefined };
      break;
    }
    case 'realm-up': {
      const realm = REALMS[celebration.realmIndex];
      icon = Zap;
      eyebrow = 'Độ kiếp thành công';
      title = `Bước vào ${celebration.realm}`;
      body = celebration.note;
      gradient = `linear-gradient(135deg, ${realm.color}, var(--jade))`;
      sealRealm = { name: celebration.realm };
      break;
    }
    case 'ascension':
      icon = Feather;
      eyebrow = 'Phi thăng';
      title = 'Đạo lộ viên mãn';
      body = `Tu vi ${celebration.xp}. Bạn đã đi trọn con đường từ Luyện Khí tới Phi Thăng. Đây không phải may mắn — đây là kỷ luật.`;
      gradient = 'linear-gradient(135deg, #fcd34d, #f59e0b, #b45309)';
      sealRealm = { name: 'Phi Thăng' };
      break;
    case 'perfect-day':
      icon = PartyPopper;
      eyebrow = 'Nhật khoá viên mãn';
      title = 'Dọn sạch danh sách!';
      body = `${celebration.count} nhiệm vụ hôm nay đều đã xong. Hôm nay bạn thắng.`;
      break;
    case 'achievement':
      icon = ACHIEVEMENTS.find((a) => a.id === celebration.id)?.icon ?? Trophy;
      eyebrow = 'Kỳ ngộ mới';
      title = celebration.title;
      body = celebration.description;
      break;
    case 'tribulation-failed':
      icon = CloudLightning;
      eyebrow = 'Độ kiếp thất bại';
      title = 'Thiên lôi quá mạnh';
      body = `Khí tức hao tổn ${celebration.loss} tu vi, nhưng cảnh giới vẫn giữ nguyên. Lần sau cơ hội lên ${Math.round(celebration.nextChance * 100)}% — người bền chí rồi cũng qua ${celebration.realm}.`;
      gradient = 'linear-gradient(135deg, #6b7280, #1f2937)';
      break;
    case 'awaken': {
      const grade = gradeOf(celebration.root);
      icon = Sparkles;
      eyebrow = 'Khai quang linh căn';
      title = grade.name;
      body = `${rootElementLabel(celebration.root)} — ${grade.note} Hấp thu linh khí ×${grade.multiplier}.`;
      gradient = `linear-gradient(135deg, ${grade.tone}, var(--gold))`;
      break;
    }
    case 'summon': {
      const beast = beastById(celebration.beastId);
      emblemBeastId = celebration.beastId;
      icon = Trophy;
      eyebrow = celebration.duplicate ? 'Thú hồn hợp nhất' : `Thu phục ${RARITIES[beast?.rarity ?? 'pham'].label}`;
      title = beast?.name ?? 'Linh thú';
      body = celebration.duplicate
        ? `${beast?.name} đã theo bạn từ trước — hồn thú nhập vào, nuôi dưỡng tăng thêm.`
        : `${beast?.lore ?? ''} Thiên phú: +${beast?.perkPerLevel ?? 0}% ${beast ? PERK_LABEL[beast.perk] : ''} mỗi cấp.`;
      gradient = beast
        ? `linear-gradient(135deg, ${ELEMENTS[beast.element].color}, ${RARITIES[beast.rarity].color})`
        : gradient;
      break;
    }
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
            <div className="relative overflow-hidden px-6 pt-8 pb-6 text-white" style={{ backgroundImage: gradient }}>
              <div className="mist-layer pointer-events-none absolute inset-0 opacity-[0.13]" />
              {/* Màn tối mỏng để chữ trắng luôn đủ tương phản trên mọi màu cảnh giới */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 to-black/40" />

              <div className="animate-trophy relative mx-auto w-fit">
                {emblemBeastId ? (
                  <span className="grid size-24 place-items-center rounded-full bg-white/18 ring-4 ring-white/25">
                    <BeastEmblem beast={beastById(emblemBeastId)} size={84} />
                  </span>
                ) : sealRealm ? (
                  <RealmSeal name={sealRealm.name} tier={sealRealm.tier} size="lg" />
                ) : (
                  <span className="grid size-20 place-items-center rounded-full bg-white/18 ring-4 ring-white/25">
                    <Icon className="size-9" strokeWidth={2.25} />
                  </span>
                )}
              </div>

              <p className="relative mt-4 text-[11px] font-bold tracking-[0.22em] uppercase opacity-90">{eyebrow}</p>
              <h2 className="font-heading relative mt-1 text-[26px] font-bold tracking-wide">{title}</h2>
            </div>

            <div className="p-6">
              <div className="rule-gold mx-auto mb-4 w-2/3" />
              <p className="text-muted-foreground text-sm leading-relaxed italic">{body}</p>
              <Button className="mt-5 w-full" onClick={dismissCelebration}>
                {celebration.kind === 'tribulation-failed' ? 'Luyện lại từ đầu' : 'Tiếp tục tu luyện'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
