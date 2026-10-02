import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CloudLightning,
  Feather,
  PartyPopper,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ACHIEVEMENTS } from "../lib/achievements";
import { REALMS } from "../lib/cultivation";
import { PERK_LABEL, RARITIES, beastById } from "../lib/beasts";
import type { Element } from "../lib/spirit";
import { gradeOf, rootElementLabel } from "../lib/spirit";
import ElementSeal from "./ElementSeal";
import BeastEmblem from "./BeastEmblem";
import { haptic } from "../lib/celebrate";
import { useApp } from "../store/AppStore";
import RealmSeal from "./RealmSeal";
import { Button } from "@/components/ui/button";

import type { Celebration } from "../store/AppStore";

/** Mốc càng lớn càng đứng đầu thẻ khi nhiều mốc tới cùng lúc. */
const DO_LON: Record<Celebration["kind"], number> = {
  ascension: 8,
  "realm-up": 7,
  "tribulation-failed": 6,
  awaken: 5,
  "tier-up": 4,
  summon: 3,
  achievement: 2,
  "perfect-day": 1,
};

/**
 * Thẻ chỉ để chúc mừng thì tự đóng sau vài giây. Thẻ mang thông tin cần đọc
 * (linh căn vừa khai quang, cảnh giới mới, linh thú, độ kiếp) thì KHÔNG tự đóng:
 * người dùng chưa kịp đọc hệ ngũ hành của mình đã biến mất là mất luôn.
 */
const TU_DONG: ReadonlySet<Celebration["kind"]> = new Set<Celebration["kind"]>(["achievement", "perfect-day"]);

interface MoTa {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  /** Sắc chủ đạo của khoảnh khắc - chỉ dùng làm hào quang trên nền tối. */
  tone: string;
  /** Hệ ngũ hành đem ra khoe khi khai quang linh căn. */
  sealElement: Element | null;
  /** Huy hiệu kỳ ngộ vừa mở - thứ đáng khoe nhất ở khoảnh khắc này. */
  badge: string | null;
  /**
   * Đoạn video ngắn chạy sau thẻ ăn mừng cho hai mốc lớn nhất. Chưa có file thì
   * thẻ vẫn hoạt động y như cũ, chỉ mất phần động.
   */
  clip: string | null;
  /** Cảnh giới cần đóng dấu triện; null thì hiện biểu tượng tròn như cũ. */
  sealRealm: { name: string; tier?: number } | null;
  /** Huy hiệu linh thú thay cho biểu tượng tròn khi chiêu thú. */
  emblemBeastId: string | null;
}

function moTa(c: Celebration): MoTa {
  const m: MoTa = {
    icon: Sparkles,
    eyebrow: "",
    title: "",
    body: "",
    tone: "var(--gold)",
    sealElement: null,
    badge: null,
    clip: null,
    sealRealm: null,
    emblemBeastId: null,
  };
  switch (c.kind) {
    case "tier-up": {
      const realm = REALMS[c.realmIndex];
      m.icon = realm.icon;
      m.eyebrow = "Đột phá";
      m.title = c.label;
      m.body = `Tu vi đạt ${c.xp}. Khí tức vững hơn một bậc — cứ giữ nhịp này.`;
      m.tone = realm.color;
      m.sealRealm = { name: realm.name, tier: Number(c.label.split(" ").at(-1)) || undefined };
      break;
    }
    case "realm-up": {
      const realm = REALMS[c.realmIndex];
      m.icon = Zap;
      m.eyebrow = "Độ kiếp thành công";
      m.title = `Bước vào ${c.realm}`;
      m.body = c.note;
      m.tone = realm.color;
      m.sealRealm = { name: c.realm };
      m.clip = "/art/media/dot-pha.mp4";
      break;
    }
    case "ascension":
      m.icon = Feather;
      m.eyebrow = "Phi thăng";
      m.title = "Đạo lộ viên mãn";
      m.body = `Tu vi ${c.xp}. Bạn đã đi trọn con đường từ Luyện Khí tới Phi Thăng. Đây không phải may mắn — đây là kỷ luật.`;
      m.tone = "var(--gold-bright)";
      m.sealRealm = { name: "Phi Thăng" };
      m.clip = "/art/media/phi-thang.mp4";
      break;
    case "perfect-day":
      m.icon = PartyPopper;
      m.eyebrow = "Nhật khoá viên mãn";
      m.title = "Dọn sạch danh sách!";
      m.body = `${c.count} việc hôm nay đều đã xong. Hôm nay bạn thắng.`;
      break;
    case "achievement":
      m.icon = ACHIEVEMENTS.find((a) => a.id === c.id)?.icon ?? Trophy;
      m.eyebrow = "Kỳ ngộ mới";
      m.title = c.title;
      m.body = c.description;
      m.badge = `/art/award/${c.id}.png`;
      break;
    case "tribulation-failed":
      m.icon = CloudLightning;
      m.eyebrow = "Độ kiếp thất bại";
      m.title = "Thiên lôi quá mạnh";
      m.body = `Khí tức hao tổn ${c.loss} tu vi, nhưng cảnh giới vẫn giữ nguyên. Lần sau cơ hội lên ${Math.round(c.nextChance * 100)}% — người bền chí rồi cũng qua ${c.realm}.`;
      m.tone = "var(--cinnabar)";
      break;
    case "awaken": {
      const grade = gradeOf(c.root);
      m.icon = Sparkles;
      m.eyebrow = "Khai quang linh căn";
      m.title = grade.name;
      m.body = `${rootElementLabel(c.root)} — ${grade.note} Hấp thu linh khí ×${grade.multiplier}.`;
      m.tone = grade.tone;
      // Hệ đầu tiên quyết định ấn ngũ hành đem ra khoe.
      m.sealElement = c.root.elements[0];
      break;
    }
    case "summon": {
      const beast = beastById(c.beastId);
      m.emblemBeastId = c.beastId;
      m.icon = Trophy;
      m.eyebrow = c.duplicate ? "Thú hồn hợp nhất" : `Thu phục ${RARITIES[beast?.rarity ?? "pham"].label}`;
      m.title = beast?.name ?? "Linh thú";
      m.body = c.duplicate
        ? `${beast?.name} đã theo bạn từ trước — hồn thú nhập vào, nuôi dưỡng tăng thêm.`
        : `${beast?.lore ?? ""} Thiên phú: +${beast?.perkPerLevel ?? 0}% ${beast ? PERK_LABEL[beast.perk] : ""} mỗi cấp.`;
      m.tone = beast ? RARITIES[beast.rarity].color : m.tone;
      break;
    }
  }
  return m;
}

/**
 * Lớp phủ ăn mừng: khoảnh khắc phần thưởng khi người tu vượt mốc. Đột phá tầng
 * là mốc nhỏ, độ kiếp sang cảnh giới mới là mốc lớn, phi thăng là đích cuối.
 *
 * Nhiều mốc tới cùng lúc thì gộp vào MỘT thẻ: mốc lớn nhất làm chủ, những mốc
 * còn lại thành danh sách bên dưới. Trước đây xong việc đầu tiên là ba lớp phủ
 * nối đuôi nhau, mỗi lớp một trận confetti.
 */
export default function CelebrationLayer() {
  const { celebrations, dismissCelebration } = useApp();
  /** Huy hiệu tải được hay không; tải lỗi thì lùi về icon nét. */
  const [badgeOk, setBadgeOk] = useState(true);
  /** Video mốc lớn tải được hay không; thiếu file thì chỉ mất phần động. */
  const [clipOk, setClipOk] = useState(true);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  // Cùng một khoảnh khắc có thể vào hàng đợi hai lần (StrictMode gọi lại bộ
  // cập nhật state ở bản dev) - mỗi mốc chỉ kể một lần.
  const daThay = new Set<string>();
  const moc = celebrations.filter((c) => {
    const k = JSON.stringify(c);
    if (daThay.has(k)) return false;
    daThay.add(k);
    return true;
  });
  // Mốc lớn nhất làm chủ thẻ; giữ thứ tự tới cho phần còn lại.
  const celebration = moc.reduce<Celebration | null>(
    (best, c) => (!best || DO_LON[c.kind] > DO_LON[best.kind] ? c : best),
    null,
  );
  const others = moc.filter((c) => c !== celebration);
  const soMoc = celebrations.length;
  const dong = useCallback(() => dismissCelebration(soMoc), [dismissCelebration, soMoc]);
  const dongRef = useRef(dong);
  useEffect(() => {
    dongRef.current = dong;
  }, [dong]);

  const tuDong = soMoc === 1 && !!celebration && TU_DONG.has(celebration.kind);

  useEffect(() => {
    if (!celebration) return;
    setBadgeOk(true);
    setClipOk(true);
    // Rung máy theo mức của khoảnh khắc: mốc càng lớn, nhịp càng dài.
    if (celebration.kind === "ascension") haptic([60, 50, 60, 50, 180]);
    else if (celebration.kind === "realm-up") haptic([40, 40, 120]);
    else if (celebration.kind === "tribulation-failed") haptic(220);
    else haptic(28);
  }, [celebration]);

  useEffect(() => {
    if (!tuDong) return;
    const t = window.setTimeout(() => dongRef.current(), 5000);
    return () => window.clearTimeout(t);
  }, [tuDong, celebration]);

  /*
   * Hộp thoại thật chứ không chỉ là lớp phủ đẹp.
   *
   * Lúc thẻ ăn mừng hiện, phần app phía sau phải rời hẳn khỏi luồng Tab và cây
   * trợ năng (`inert` trên #root - lớp này portal ra <body> nên không tự khoá
   * mình), tiêu điểm nhảy vào nút "Tiếp tục", Esc là đóng, và đóng xong thì
   * tiêu điểm quay về đúng chỗ cũ thay vì rơi về đầu trang.
   */
  const open = !!celebration;
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    // Chờ một nhịp cho motion gắn nút vào DOM.
    const focusTimer = window.setTimeout(() => continueRef.current?.focus({ preventScroll: true }), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Chặn ngay ở pha capture của window: hộp thoại Radix (nếu còn mở bên
      // dưới) nghe Esc ở document, không chặn thì một phím đóng hai lớp.
      e.stopPropagation();
      e.preventDefault();
      dongRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey, true);
      if (root) root.inert = wasInert;
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [open]);

  const { icon, eyebrow, title, body, tone, sealElement, badge, clip, sealRealm, emblemBeastId } =
    moTa(celebration ?? { kind: "perfect-day", count: 0 });

  const Icon = icon;

  return createPortal(
    <AnimatePresence>
      {celebration && (
        <motion.div
          key="celebration"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          data-celebration={celebration.kind}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={dong}
          // pointer-events-auto: hộp thoại Radix còn đang đóng dở thì <body> vẫn bị
          // khoá chuột; thẻ ăn mừng không được "đơ" theo.
          className="pointer-events-auto fixed inset-0 z-[70] grid place-items-center bg-black/55 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.82, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="celebration-reward-frame glass-panel panel-solid corner-marks w-full max-w-sm overflow-hidden rounded-2xl text-center"
            style={{
              boxShadow: `0 0 0 1px ${tone}55, 0 24px 60px rgb(0 0 0 / 70%), 0 0 60px ${tone}33`,
            }}
          >
            <div className="relative overflow-hidden px-6 pt-8 pb-6">
              {/* Video mốc lớn chạy sau ấn triện; chỉ có ở đột phá cảnh giới và phi thăng */}
              {clip && clipOk && (
                <video
                  // Máy bật "giảm chuyển động": không chạy phim, chỉ đứng ở
                  // khung hình đẹp nhất (điểm nhấn nằm ở giây 6-8).
                  src={reduceMotion ? `${clip}#t=6` : clip}
                  autoPlay={!reduceMotion}
                  preload={reduceMotion ? "metadata" : "auto"}
                  muted
                  loop={!reduceMotion}
                  playsInline
                  aria-hidden
                  onError={() => setClipOk(false)}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
                />
              )}
              {/* Hào quang sắc riêng của khoảnh khắc, hắt từ trên xuống trên nền tối */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(120% 96% at 50% -10%, ${tone}, transparent 68%)`,
                  opacity: 0.42,
                }}
              />
              <div className="mist-layer pointer-events-none absolute inset-0 opacity-[0.08]" />

              <div className="animate-trophy relative mx-auto w-fit">
                {emblemBeastId ? (
                  <span className="border-gold/45 bg-background/55 grid size-24 place-items-center rounded-full border">
                    <BeastEmblem beast={beastById(emblemBeastId)} size={84} />
                  </span>
                ) : sealRealm ? (
                  <RealmSeal
                    name={sealRealm.name}
                    tier={sealRealm.tier}
                    size="lg"
                  />
                ) : badge && badgeOk ? (
                  <img
        loading="lazy"
        decoding="async"
                    src={badge}
                    alt=""
                    onError={() => setBadgeOk(false)}
                    className="size-24 object-contain"
                  />
                ) : sealElement ? (
                  <ElementSeal
                    element={sealElement}
                    size={84}
                    className="rounded-xl"
                  />
                ) : (
                  <span
                    className="border-gold/45 bg-background/55 text-gold-bright grid size-20 place-items-center rounded-full border"
                    style={{ boxShadow: `0 0 24px ${tone}55` }}
                  >
                    <Icon className="size-9" strokeWidth={2.25} />
                  </span>
                )}
              </div>

              <p className="text-gold/85 font-title relative mt-4 text-[11px] font-bold tracking-[0.22em] uppercase">
                {eyebrow}
              </p>
              <h2 id={titleId} className="glow-text font-heading relative mt-1 text-[26px] font-bold tracking-wide">
                {title}
              </h2>
            </div>
            <div className="rule-gold" />

            <div className="p-6">
              <p id={bodyId} className="text-muted-foreground text-sm leading-relaxed italic">
                {body}
              </p>
              {others.length > 0 && (
                <ul className="celebration-more mt-4 space-y-1.5 text-left" aria-label="Cùng lúc đó">
                  {others.map((c, i) => {
                    const o = moTa(c);
                    const OIcon = o.icon;
                    return (
                      <li key={i} className="border-gold/25 bg-background/40 flex items-start gap-2.5 rounded-lg border px-3 py-2">
                        <OIcon className="text-gold-bright mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0 text-xs leading-snug">
                          <span className="text-gold/90 block text-[10px] font-bold tracking-[0.14em] uppercase">{o.eyebrow}</span>
                          <strong className="text-foreground font-semibold">{o.title}</strong>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                ref={continueRef}
                className="btn-game mt-5 w-full"
                onClick={dong}
              >
                {celebration.kind === "tribulation-failed"
                  ? "Luyện lại từ đầu"
                  : "Tiếp tục tu luyện"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
