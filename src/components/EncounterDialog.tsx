import { useState } from 'react';
import { Gem, ScrollText, Sparkles, TriangleAlert } from 'lucide-react';
import type { Outcome } from '../lib/encounters';
import { PILLS } from '../lib/pills';
import { useApp } from '../store/AppStore';
import { Button } from '@/components/ui/button';
import ArtImage from './ArtImage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Hộp thoại kỳ ngộ: hiện tình huống, cho chọn hướng xử lý rồi lộ kết quả.
 * Người tu buộc phải quyết định - không có nút "bỏ qua" ở mọi kỳ ngộ.
 */
const RISK_STYLE = {
  'an toàn': 'border-success/40 bg-success/10 text-success',
  'rủi ro': 'border-warning/40 bg-warning/10 text-warning',
  'nguy hiểm': 'border-destructive/40 bg-destructive/10 text-destructive',
} as const;

export default function EncounterDialog() {
  const { encounter, resolveEncounter, dismissEncounter } = useApp();
  const [result, setResult] = useState<Outcome | null>(null);

  const close = () => {
    setResult(null);
    dismissEncounter();
  };

  const choose = (i: number) => {
    const outcome = resolveEncounter(i);
    if (outcome) setResult(outcome);
  };

  return (
    <Dialog open={!!encounter} onOpenChange={(v) => !v && close()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px]">
        <div className="relative h-40">
          {/* Mỗi kỳ ngộ có thể có tranh riêng trong public/art/encounter/ */}
          <ArtImage
            src={`/art/encounter/${encounter?.id ?? 'hang-dong'}.jpg`}
            fallback="/art/page/bicanh.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="from-card absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
          <span className="bg-warning/20 text-warning absolute top-3 left-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.16em] uppercase backdrop-blur">
            <ScrollText className="size-3" /> Kỳ ngộ
          </span>
        </div>

        <div className="p-6 pt-2">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{encounter?.title}</DialogTitle>
            <DialogDescription className="leading-relaxed">{encounter?.description}</DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="mt-5">
              <div
                className={cn(
                  'rounded-lg border p-4 text-sm leading-relaxed',
                  result.tone === 'good' && 'border-success/40 bg-success/10',
                  result.tone === 'bad' && 'border-destructive/40 bg-destructive/10',
                  result.tone === 'neutral' && 'border-border bg-surface/60',
                )}
              >
                <p className="flex items-start gap-2">
                  {result.tone === 'good' ? (
                    <Sparkles className="text-success mt-0.5 size-4 shrink-0" />
                  ) : result.tone === 'bad' ? (
                    <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                  ) : (
                    <ScrollText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  )}
                  {result.msg}
                </p>

                {result.kind === 'pill' && result.pill && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <img src={PILLS[result.pill].image} alt="" className="size-12 object-contain" />
                    <span className="text-xs font-semibold">{PILLS[result.pill].name}</span>
                  </div>
                )}
                {result.kind === 'stones' && (
                  <p className="tabular mt-2 flex items-center gap-1.5 text-xs font-bold">
                    <Gem className="text-gold size-3.5" />
                    {result.amount! > 0 ? `+${result.amount}` : result.amount} linh thạch
                  </p>
                )}
                {result.kind === 'encounterXp' && (
                  <p className="tabular mt-2 text-xs font-bold">
                    {result.amount! > 0 ? `+${result.amount}` : result.amount} tu vi
                  </p>
                )}
              </div>

              <Button className="mt-5 w-full" onClick={close}>
                Về động phủ
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {encounter?.options.map((o, i) => (
                <button
                  key={o.text}
                  onClick={() => choose(i)}
                  className="border-border bg-surface/60 hover:border-primary/60 hover:bg-surface flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium">{o.text}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold',
                      RISK_STYLE[o.risk],
                    )}
                  >
                    {o.risk}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
