import TodayList from "./TodayList";
import type { Task, ViewKey } from "../../types";
import { useState } from "react";
import { useCountUp } from "../../lib/useCountUp";
import { Quote, Sparkles, Timer, Zap } from "lucide-react";
import { useApp } from "../../store/AppStore";
import { useFocusTimer } from "../../store/FocusTimer";
import { ASCENSION_INDEX, REALMS, cultivationOf } from "../../lib/cultivation";
import { activeBeast, progressOf } from "../../lib/economy";
import { beastById, beastLevel } from "../../lib/beasts";
import { aphorismOfDay, elderPortrait } from "../../lib/elders";
import ArtImage from "../ArtImage";
import ProgressRing from "../ProgressRing";
import RealmSeal from "../RealmSeal";
import { cn } from "@/lib/utils";

interface Props {
  onTribulation: () => void;
  onAwaken: () => void;
  onExplore: (view: ViewKey, anchor?: string) => void;
  onFocusTask: (task: Task) => void;
  onNew: () => void;
}

/**
 * Khu trung tâm của hub - "vùng dopamine" theo đúng cách Tiên Ma Giới bố trí:
 * một vòng tu vi lớn ở giữa, nút hành động chính ngay dưới, và các chỉ số ngày
 * hôm nay bám quanh. Mọi thứ khác chỉ là icon quanh rìa màn hình.
 */
export default function HubCenter({
  onTribulation,
  onAwaken,
  onExplore,
  onFocusTask,
  onNew,
}: Props) {
  const { data } = useApp();
  const timer = useFocusTimer();
  // Phiên bế quan đang dở - kể cả lúc đang nghỉ giữa hiệp.
  const dangBeQuan = timer.inSession || timer.mode === "break";
  const vietDangLam = data.tasks.find((t) => t.id === timer.taskId);
  const progress = progressOf(data);
  const c = cultivationOf(progress.xp);
  const xpShown = useCountUp(progress.xp);
  const intoShown = useCountUp(c.into);
  const aph = aphorismOfDay();
  const portrait = elderPortrait(aph.elder);
  // Chỉ xếp ngang khi ảnh tải được thật, nếu không chữ sẽ lệch trái mà không
  // có mặt bên cạnh.
  const [portraitOk, setPortraitOk] = useState(true);
  const showPortrait = !!portrait && portraitOk;
  const owned = activeBeast(data);
  const beast = owned ? beastById(owned.id) : undefined;

  // Độ kiếp là để bước sang cảnh giới KẾ TIẾP, không phải cảnh giới đang đứng.
  const nextRealm = REALMS[Math.min(ASCENSION_INDEX, progress.gateRealm + 1)];
  const ready = progress.readyForTribulation;

  return (
    <main
      aria-label="Sảnh tu luyện"
      className="cultivation-hub pointer-events-none flex min-h-0 flex-col items-center justify-center text-center"
    >
      <h1 className="sr-only">Sơn Môn</h1>

      {/* Việc hôm nay đứng ĐẦU sảnh.
          Đặt ở cuối thì phải cuộn qua hết nhân vật, vòng cảnh giới và dãy chỉ
          số mới thấy - tức là vẫn giữ nguyên cái lệch cần sửa: thứ làm 20 lần
          mỗi ngày nằm sau thứ làm mỗi tháng một lần. Vỏ tu tiên là lớp sơn cho
          việc thật, nên việc thật phải nằm trên. */}
      {/*
        Đường về phiên bế quan đang dở.

        Nút này vốn nằm trong thẻ "Việc tiếp theo" đã bỏ. Ba nhãn kia của thẻ ấy
        ("Tập trung việc này", "Xem thành quả", "Thêm việc của tôi") đều lặp lại
        thứ danh sách việc ngay dưới đã làm được, nhưng nhãn NÀY thì không: tạm
        dừng bế quan rồi quay ra sảnh mà mất nó là mất hẳn đường quay lại.

        Nên giữ lại một mình nó, và chỉ hiện khi thật sự có phiên đang dở - hơn
        cái thẻ cũ ở chỗ lúc không có việc gì thì nó không chiếm chỗ.
      */}
      {dangBeQuan && (
        <button
          type="button"
          onClick={() => onExplore("focus")}
          className="border-gold/45 bg-background/70 text-gold-bright pointer-events-auto flex min-h-11 w-full max-w-[540px] items-center gap-2 rounded-xl border px-3 text-left text-[12px] font-semibold backdrop-blur"
        >
          <Timer className="size-4 shrink-0" />
          <span className="shrink-0">Về phiên bế quan</span>
          {vietDangLam && (
            <span className="text-muted-foreground min-w-0 truncate text-[11px] font-normal">
              {vietDangLam.title}
            </span>
          )}
        </button>
      )}

      <TodayList
        onOpenAll={() => onExplore("today")}
        onNew={onNew}
        onFocus={onFocusTask}
      />
      {/* ---------------------------------------------------- châm ngôn tiền bối */}
      {/* Châm ngôn tiền bối. Có chân dung thì xếp ngang, chưa có thì canh giữa
          như cũ - ArtImage tự ẩn nên layout không bị hụt chỗ. */}
      <blockquote
        aria-label="Lời tiền bối"
        className={cn(
          "elder-teaching glass-panel pointer-events-auto mx-auto rounded-xl",
          showPortrait && "flex items-center gap-3 text-left",
        )}
      >
        {showPortrait ? (
          <img
            src={portrait}
            alt={`Chân dung ${aph.elder}`}
            onError={() => setPortraitOk(false)}
            className="border-gold/50 size-12 shrink-0 rounded-full border object-cover shadow-[0_0_14px_var(--gold-glow)]"
          />
        ) : (
          <Quote className="text-gold/50 mx-auto mb-1 size-3.5" />
        )}
        <span className="min-w-0">
          <p className="font-heading text-[13px] leading-relaxed italic">
            “{aph.text}”
          </p>
          {/* Tên và chức danh chung một dòng cho đỡ tốn chiều cao, nhưng vẫn
              là hai nút chữ riêng - gộp thành một chuỗi thì không còn tra được
              đúng tên tiền bối nữa. */}
          <footer className="text-gold/80 font-title mt-1 text-[10px] font-bold tracking-widest uppercase">
            <span>{aph.elder}</span>{" · "}
            <span className="text-muted-foreground">{aph.title}</span>
          </footer>
        </span>
      </blockquote>

      {/* ------------------------------------------------------ dải cảnh giới */}
      {/*
        Hai dáng, chọn theo CHIỀU CAO màn chứ không theo chiều ngang.

        Vòng lớn canh giữa cao 198px - khối cao nhất sảnh. Trên máy thấp (360x640,
        375x667) nó đẩy mọi thứ xuống dưới mép màn, nên ở đó khối này xếp ngang
        và chỉ còn 92px. Nhưng máy cao thì thừa chỗ, mà xếp ngang lại làm đạo
        nhân teo lại bằng con tem - xấu hơn hẳn bản cũ.

        Nên mốc phải là chiều cao. Bề ngang không nói lên được gì ở đây: 390x844
        hẹp mà vẫn thừa chỗ dựng vòng lớn. Chi tiết ở `.realm-dai` trong hub.css.
      */}
      <div className="realm-dai pointer-events-auto">
        <div className="realm-vong">
          <ProgressRing
            value={c.ascended ? 1 : c.ratio}
            size={198}
            fluid
            stroke={9}
            color={c.realm.color}
            qi
            glowOnFull
            centerClassName="gap-1"
            className="animate-float drop-shadow-[0_8px_28px_rgba(0,0,0,0.65)]"
            label=""
          />
          {/* Dáng ngang: vòng nhỏ chỉ ôm vừa cái ấn, chữ đẩy ra ngoài */}
          <span className="realm-an-nho">
            <RealmSeal
              name={c.realm.name}
              tier={c.ascended ? undefined : c.tier}
              size="sm"
            />
          </span>
        </div>

        <span className="realm-chu">
          <span className="realm-chu-trong">
            <span className="realm-an-to">
              <RealmSeal
                name={c.realm.name}
                tier={c.ascended ? undefined : c.tier}
                size="lg"
              />
            </span>
            <span className="font-title text-gold-bright text-[11px] font-bold tracking-[0.18em] uppercase">
              {c.ascended ? "Viên mãn" : `Tầng ${c.tier}/${c.realm.tiers}`}
            </span>
            <span className="text-muted-foreground tabular text-[10.5px]">
              {c.ascended
                ? `${xpShown} tu vi`
                : `${intoShown} / ${c.need} tu vi`}
            </span>
          </span>
        </span>

        {/* Đạo nhân chibi. Chưa có file thì ArtImage tự ẩn, layout không đổi. */}
        <ArtImage
          src={`/art/chibi/${ready ? "breakthrough" : "idle"}.png`}
          alt=""
          className="realm-chibi animate-float pointer-events-none drop-shadow-[0_8px_22px_rgba(0,0,0,0.65)]"
        />

        {/* Linh thú đứng cạnh chủ nhân */}
        {beast && owned && (
          <img
            src={beast.image}
            alt={beast.name}
            title={`${beast.name} · cấp ${beastLevel(owned.fed)}`}
            className="realm-thu animate-float border-gold/50 bg-background/60 rounded-full border object-cover shadow-[0_0_18px_var(--gold-glow)]"
            style={{ animationDelay: "1.2s" }}
          />
        )}
      </div>

      {/* --------------------------------------------------------- nút hành động */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {/* Tu vi đã tràn cảnh giới thì độ kiếp luôn là việc gấp nhất - kể cả khi
            chưa khai quang linh căn, vì không qua thiên lôi là không tích thêm được. */}
        {ready ? (
          <button
            type="button"
            onClick={onTribulation}
            className="btn-game animate-glow min-h-11 px-6 py-2.5 text-[13px]"
          >
            <Zap className="size-4" />
            Độ kiếp lên {nextRealm.name}
          </button>
        ) : !data.root ? (
          <button
            type="button"
            onClick={onAwaken}
            className="btn-game shimmer min-h-11 px-6 py-2.5 text-[13px]"
          >
            <Sparkles className="size-4" />
            Khai quang linh căn
          </button>
        ) : null}

        {/* Việc phụ vẫn nhắc, nhưng không tranh chỗ với nút chính */}
        {ready && !data.root && (
          <button
            type="button"
            onClick={onAwaken}
            className="text-gold hover:text-gold-bright inline-flex items-center gap-1.5 text-[11.5px] font-semibold underline-offset-4 hover:underline"
          >
            <Sparkles className="size-3.5" />
            Chưa khai quang linh căn - làm luôn cho kịp
          </button>
        )}
      </div>

      {/*
        Đã bỏ khỏi đây: dãy chỉ số và thẻ "Việc tiếp theo của bạn".
        
        Đo trên màn 360x640: sảnh nhồi 808px nội dung vào khung cao 423px, mà
        chỉ 211px là việc thật. Dãy chỉ số (74px) lặp lại đúng thứ thanh đầu đã
        hiện, còn thẻ "việc tiếp theo" (129px) lặp lại chính danh sách việc vừa
        đưa lên trên - lại còn kém hơn vì ở đó tick được ngay.

        Chuỗi ngày chuyển lên thanh đầu. Nhập định xem ở Tu Hành Lục.
      */}
    </main>
  );
}
