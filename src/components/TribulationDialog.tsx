import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  FlaskConical,
  Sparkles,
  Zap,
} from "lucide-react";
import { PILLS, PILL_ORDER, tribulationChance } from "../lib/pills";
import type { PillGrade } from "../lib/pills";
import { progressOf, tribulationLoss } from "../lib/economy";
import { ASCENSION_INDEX, REALMS } from "../lib/cultivation";
import { useApp } from "../store/AppStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Bao lâu cho thiên kiếp giáng trước khi lộ kết quả. Khớp với độ dài video
 * chibi đột phá (6,5 giây) để người dùng xem trọn cung: kim quang bùng → mở
 * mắt → lắng lại. Chỉ xảy ra 9 lần trong cả hành trình nên chờ là đáng.
 */
const STRIKE_MS = 6600;

export default function TribulationDialog({
  open,
  onOpenChange,
  onGoToPills,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Mở thẳng Đan Đường khi trong tay chưa có viên đan nào. */
  onGoToPills?: () => void;
}) {
  const { data, attemptTribulation } = useApp();
  const [grade, setGrade] = useState<PillGrade | null>(null);
  const [striking, setStriking] = useState(false);

  const p = progressOf(data);
  const nextIndex = Math.min(ASCENSION_INDEX, p.gateRealm + 1);
  const nextRealm = REALMS[nextIndex];
  const loss = tribulationLoss(data);
  const owned = PILL_ORDER.filter((g) => data.pills[g] > 0);

  useEffect(() => {
    if (!open) {
      setStriking(false);
      setGrade(null);
      return;
    }
    setGrade(owned.at(-1) ?? null);
    // owned đổi theo data nên chỉ chạy khi mở/đóng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = () => {
    if (!grade) return;
    setStriking(true);
    window.setTimeout(() => {
      attemptTribulation(grade);
      setStriking(false);
      onOpenChange(false);
    }, STRIKE_MS);
  };

  const chance = grade ? tribulationChance(grade, data.failStreak) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !striking && onOpenChange(v)}>
      {/*
        KHÔNG thêm `relative` vào đây.

        `DialogContent` tự đặt `fixed` để nổi giữa màn, và `cn()` gộp lớp bằng
        tailwind-merge - nên `relative` truyền vào sẽ ĐÈ MẤT `fixed`. Hộp thoại
        khi ấy rơi về luồng thường ở cuối trang: trên màn 844px mép trên của nó
        nằm ở 963px, tức là hẳn dưới đáy. Người dùng chỉ thấy lớp nền mờ rồi
        "đứng hình", vì nút bấm và đoạn phim đều nằm ngoài màn.

        `fixed` vốn đã là khối chứa cho con `absolute` (đoạn phim nền), nên bỏ
        `relative` không mất gì.
      */}
      <DialogContent className="overflow-hidden bg-black p-0 sm:max-w-[560px]">
        {/*
          Nền video chạy suốt hộp thoại. Hộp thoại cao hơn rộng nên giữ được
          phần lớn khung hình, thay vì nhét vào một dải ngang chỉ thấy 22%.

          Lúc chờ: mây đen tụ lại (thien-loi, ảnh dọc 720×1280), chạy mờ 55% làm
          không khí. Lúc chống kiếp: đổi sang video chibi của chính app — đúng
          nhân vật hứng thiên lôi rồi đột phá, mở lên 100%. `key` để trình duyệt
          phát lại từ đầu khi đổi nguồn.
        */}
        <video
          key={striking ? "strike" : "idle"}
          src={
            striking
              ? "/art/media/do-kiep-chibi.mp4"
              : "/art/media/thien-loi.mp4"
          }
          autoPlay
          muted
          loop={!striking}
          playsInline
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            striking ? "opacity-100" : "opacity-55",
          )}
        />
        {/* Lớp phủ tối để chữ và nút luôn đọc được trên nền video động */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-700",
            striking ? "opacity-35" : "opacity-82",
          )}
          style={{
            background:
              "linear-gradient(to bottom, rgb(0 0 0 / 38%) 0%, rgb(0 0 0 / 84%) 34%, rgb(0 0 0 / 94%) 100%)",
          }}
        />

        <div className="relative z-10 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-warning size-4" />
              Độ kiếp lên {nextRealm.name}
            </DialogTitle>
            {/* Lúc thiên kiếp giáng thì phần mô tả nhường chỗ cho trạng thái,
                tránh chồng chữ lên tiêu đề như cách dùng lớp phủ tuyệt đối. */}
            {striking ? (
              <DialogDescription className="glow-text animate-glow text-sm font-bold tracking-[0.2em] uppercase">
                Thiên kiếp giáng lâm…
              </DialogDescription>
            ) : (
              <DialogDescription>
                Bạn đã tích đủ tu vi ở đỉnh cảnh giới. Nuốt đan dược rồi đón
                thiên kiếp — vượt qua thì bước sang cảnh giới mới, thất bại thì
                hao tổn khí tức.
              </DialogDescription>
            )}
          </DialogHeader>

          {owned.length === 0 ? (
            <div className="border-warning/40 bg-warning/10 mt-5 rounded-lg border p-3.5 text-sm">
              <p className="text-warning flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4" /> Chưa có đan dược
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Ghé Đan Đường trong Động Phủ mua Độ Kiếp Đan. Không có đan thì
                không thể chống nổi thiên lôi.
              </p>
              {onGoToPills && (
                <Button
                  size="sm"
                  className="mt-3 w-full gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    onGoToPills();
                  }}
                >
                  <FlaskConical className="size-4" />
                  Tới Đan Đường mua đan
                </Button>
              )}
            </div>
          ) : (
            <>
              {/*
                Lúc đang chống kiếp thì không còn gì để đọc hay để chọn nữa —
                cho cả khối thông tin mờ hẳn đi để nhường sân cho video, nhưng
                vẫn giữ chỗ nên khung không nhảy.
              */}
              <div
                className={cn(
                  "transition-opacity duration-500",
                  striking && "pointer-events-none opacity-0",
                )}
              >
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {owned.map((g) => {
                    const pill = PILLS[g];
                    const active = grade === g;
                    return (
                      <button
                        key={g}
                        onClick={() => setGrade(g)}
                        disabled={striking}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/12"
                            : "border-border bg-surface/60 hover:border-primary/50",
                        )}
                      >
                        <img
        loading="lazy"
        decoding="async"
                          src={pill.image}
                          alt=""
                          className="size-10 shrink-0 object-contain"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            {pill.short}
                            {active && (
                              <Check
                                className="text-primary size-3"
                                strokeWidth={3}
                              />
                            )}
                          </span>
                          <span className="text-muted-foreground tabular block text-[11px]">
                            {Math.round(pill.chance * 100)}% · còn{" "}
                            {data.pills[g]} viên
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <dl className="border-border bg-surface/50 mt-4 grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Cơ hội thành công</dt>
                    <dd className="tabular text-success font-bold">
                      {Math.round(chance * 100)}%
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">
                      Nếu thất bại, hao tổn
                    </dt>
                    <dd className="tabular text-destructive font-bold">
                      {loss} tu vi
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Tu vi đang bị giữ</dt>
                    <dd className="tabular font-semibold">{p.held}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Đã thất bại</dt>
                    <dd className="tabular font-semibold">
                      {data.failStreak} lần
                      {data.failStreak > 0 && (
                        <span className="text-success">
                          {" "}
                          (+{Math.min(40, data.failStreak * 10)}%)
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>

                <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
                  Thất bại không bao giờ đẩy bạn tụt xuống cảnh giới cũ, và mỗi
                  lần vấp lại cộng thêm 10% cơ hội cho lần sau. Tu vi gốc từ
                  công việc đã làm vẫn được giữ nguyên trong hồ sơ.
                </p>
              </div>

              <Button
                size="lg"
                className="mt-5 w-full gap-2"
                onClick={start}
                disabled={!grade || striking}
              >
                {striking ? (
                  <>Đang chống kiếp…</>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Bắt đầu độ kiếp
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
