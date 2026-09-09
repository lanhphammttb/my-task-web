import { Suspense, lazy, useEffect, useState } from 'react';
import { AlertTriangle, Check, FlaskConical, Sparkles, Zap } from 'lucide-react';
import { PILLS, PILL_ORDER, tribulationChance } from '../lib/pills';
import type { PillGrade } from '../lib/pills';
import { progressOf, tribulationLoss } from '../lib/economy';
import { ASCENSION_INDEX, REALMS } from '../lib/cultivation';
import { useApp } from '../store/AppStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// three.js chỉ nạp khi thật sự mở màn độ kiếp, tránh phình bundle chính.
const TribulationScene = lazy(() => import('./TribulationScene'));

/** Bao lâu cho thiên kiếp giáng trước khi lộ kết quả. */
const STRIKE_MS = 2800;

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
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px]">
        {/* Sân khấu 3D: mây đen, linh khí và thiên lôi */}
        <div className="relative h-56 bg-black">
          <Suspense fallback={<div className="text-muted-foreground grid h-full place-items-center text-xs">Đang tụ mây…</div>}>
            <TribulationScene color={nextRealm.color} striking={striking} className="h-full w-full" />
          </Suspense>
          <div className="from-card absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent" />
          {striking && (
            <p className="absolute inset-x-0 bottom-3 text-center text-sm font-bold tracking-[0.2em] text-white uppercase drop-shadow">
              Thiên kiếp giáng lâm…
            </p>
          )}
        </div>

        <div className="p-6 pt-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-warning size-4" />
              Độ kiếp lên {nextRealm.name}
            </DialogTitle>
            <DialogDescription>
              Bạn đã tích đủ tu vi ở đỉnh cảnh giới. Nuốt đan dược rồi đón thiên kiếp — vượt qua thì
              bước sang cảnh giới mới, thất bại thì hao tổn khí tức.
            </DialogDescription>
          </DialogHeader>

          {owned.length === 0 ? (
            <div className="border-warning/40 bg-warning/10 mt-5 rounded-lg border p-3.5 text-sm">
              <p className="text-warning flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4" /> Chưa có đan dược
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Ghé Đan Đường trong Động Phủ mua Độ Kiếp Đan. Không có đan thì không thể chống nổi
                thiên lôi.
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
                        'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                        active ? 'border-primary bg-primary/12' : 'border-border bg-surface/60 hover:border-primary/50',
                      )}
                    >
                      <img src={pill.image} alt="" className="size-10 shrink-0 object-contain" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-xs font-semibold">
                          {pill.short}
                          {active && <Check className="text-primary size-3" strokeWidth={3} />}
                        </span>
                        <span className="text-muted-foreground tabular block text-[11px]">
                          {Math.round(pill.chance * 100)}% · còn {data.pills[g]} viên
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <dl className="border-border bg-surface/50 mt-4 grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Cơ hội thành công</dt>
                  <dd className="tabular text-success font-bold">{Math.round(chance * 100)}%</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Nếu thất bại, hao tổn</dt>
                  <dd className="tabular text-destructive font-bold">{loss} tu vi</dd>
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
                      <span className="text-success"> (+{Math.min(40, data.failStreak * 10)}%)</span>
                    )}
                  </dd>
                </div>
              </dl>

              <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
                Thất bại không bao giờ đẩy bạn tụt xuống cảnh giới cũ, và mỗi lần vấp lại cộng thêm
                10% cơ hội cho lần sau. Tu vi gốc từ công việc đã làm vẫn được giữ nguyên trong hồ sơ.
              </p>

              <Button size="lg" className="mt-5 w-full gap-2" onClick={start} disabled={!grade || striking}>
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
