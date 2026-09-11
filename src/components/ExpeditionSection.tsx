import { useState } from 'react';
import { Compass, Footprints, PackageOpen } from 'lucide-react';
import { SITES, SITE_ORDER, expeditionState } from '../lib/expedition';
import type { Risk, Site, SiteOutcome } from '../lib/expedition';
import { HERBS } from '../lib/field';
import { PILLS } from '../lib/pills';
import { stoneBalance, verifiedTaskCount } from '../lib/economy';
import { useApp } from '../store/AppStore';
import ArtImage from './ArtImage';
import { Meter, MetaChip, Section } from './primitives';
import SectionArt from './SectionArt';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const RISK_CLASS: Record<Risk, string> = {
  'an toàn': 'border-success/35 bg-success/12 text-success',
  'rủi ro': 'border-border bg-muted/50 text-muted-foreground',
  'nguy hiểm': 'border-warning/35 bg-warning/12 text-warning',
  'tuyệt địa': 'border-destructive/35 bg-destructive/12 text-destructive',
};

/** Liệt kê thu hoạch của một chuyến thành câu ngắn: "+180 linh thạch · +320 tu vi". */
function spoils(o: SiteOutcome): string[] {
  const out: string[] = [];
  if (o.stones) out.push(`${o.stones > 0 ? '+' : ''}${o.stones} linh thạch`);
  if (o.xp) out.push(`${o.xp > 0 ? '+' : ''}${o.xp} tu vi`);
  for (const [id, n] of Object.entries(o.herbs ?? {})) {
    if (n) out.push(`+${n} ${HERBS[id as keyof typeof HERBS].short}`);
  }
  if (o.pill) out.push(`+1 ${PILLS[o.pill].short}`);
  return out;
}

/**
 * Thám hiểm bí cảnh.
 *
 * Đặt ở Tiên Lộ chứ không phải Động Phủ, và đó là chủ ý: trước đây sáu trong
 * tám nút đổi được trạng thái đều nằm chung một màn Động Phủ, nên cả phần
 * "chơi" bị dồn vào một chỗ. Thám hiểm là chuyện lên đường, nó thuộc về đạo lộ.
 *
 * Chuyến đi không kết thúc theo đồng hồ mà theo **số nhiệm vụ hoàn thành** -
 * cùng nguyên tắc với linh điền: muốn đoàn về sớm thì đi làm.
 */
export default function ExpeditionSection() {
  const { data, startExpedition, resolveExpedition } = useApp();
  const [confirm, setConfirm] = useState<Site | null>(null);
  const [result, setResult] = useState<SiteOutcome | null>(null);

  const balance = stoneBalance(data);
  const state = data.expedition
    ? expeditionState(data.expedition, verifiedTaskCount(data))
    : null;

  const claim = () => {
    const outcome = resolveExpedition();
    if (outcome) setResult(outcome);
  };

  return (
    <Section
      id="awards-expedition"
      icon={Compass}
      title="Thám hiểm"
      subtitle={state ? `Đang ở ${state.site.name}` : 'Chưa lên đường'}
    >
      <SectionArt src="/art/encounter/hang-dong.jpg" caption="Cửa bí cảnh" tone="#5aa9c9">
        Kỳ ngộ là chuyện trời cho, tự đến chứ không tìm được. Thám hiểm là mặt còn lại — mình chọn
        nơi đến và chọn mức liều. Đoàn về sau <strong>số nhiệm vụ</strong> bạn hoàn thành, không
        phải sau mấy tiếng đồng hồ.
      </SectionArt>

      {state ? (
        /* ------------------------------------------------- chuyến đang đi */
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: `${state.site.tone}4d` }}>
          <div className="relative h-28">
            <ArtImage
              src={state.site.image}
              fallback="/art/scene/cave.jpg"
              alt=""
              className="h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] to-transparent" />
          </div>

          <div className="flex flex-col gap-2.5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-title text-sm font-bold" style={{ color: state.site.tone }}>
                {state.site.name}
              </h4>
              <MetaChip className={RISK_CLASS[state.site.risk]}>{state.site.risk}</MetaChip>
            </div>

            <p className="text-muted-foreground text-[11px]">
              {state.ready
                ? 'Đoàn đã về tới cửa động. Mở tay nải ra xem được gì.'
                : `Xong ${state.done}/${state.need} nhiệm vụ · còn ${state.remain} việc nữa đoàn mới về`}
            </p>

            <Meter value={state.ratio} />

            <Button
              size="sm"
              variant={state.ready ? 'default' : 'outline'}
              disabled={!state.ready}
              onClick={claim}
              className="gap-1.5"
            >
              <PackageOpen className="size-3.5" />
              {state.ready ? 'Đón đoàn về' : `${state.done}/${state.need}`}
            </Button>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------- chọn nơi đến */
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SITE_ORDER.map((id) => {
            const site = SITES[id];
            const afford = balance >= site.cost;
            return (
              <div
                key={id}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-3',
                  !afford && 'opacity-55',
                )}
                style={{ borderColor: `${site.tone}33` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-title text-sm font-bold" style={{ color: site.tone }}>
                    {site.name}
                  </h4>
                  <MetaChip className={RISK_CLASS[site.risk]}>{site.risk}</MetaChip>
                </div>

                <p className="text-muted-foreground text-[11px] leading-relaxed">{site.note}</p>

                <div className="flex flex-wrap gap-1.5">
                  <MetaChip>{site.needTasks} nhiệm vụ</MetaChip>
                  <MetaChip className={cn(!afford && 'border-warning/35 text-warning')}>
                    {site.cost} linh thạch
                  </MetaChip>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto gap-1.5"
                  disabled={!afford}
                  onClick={() => setConfirm(site)}
                >
                  <Footprints className="size-3.5" /> Lên đường
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------- xác nhận đi */}
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lên đường tới {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tốn {confirm?.cost} linh thạch. Đoàn về sau khi bạn hoàn thành{' '}
              <strong>{confirm?.needTasks} nhiệm vụ</strong> nữa. Mỗi lúc chỉ đi được một nơi, và
              nơi càng liều thì thu hoạch càng lệch — được thì được đậm, mất cũng mất đau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Thôi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) startExpedition(confirm.id);
                setConfirm(null);
              }}
            >
              Lên đường
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------------------------ kết quả */}
      <AlertDialog open={result !== null} onOpenChange={(open) => !open && setResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{result?.label}</AlertDialogTitle>
            <AlertDialogDescription>{result?.text}</AlertDialogDescription>
          </AlertDialogHeader>

          {result && (
            <div className="flex flex-wrap gap-1.5">
              {spoils(result).length === 0 ? (
                <MetaChip>Không được gì</MetaChip>
              ) : (
                spoils(result).map((s) => (
                  <MetaChip
                    key={s}
                    className={
                      s.startsWith('-')
                        ? 'border-destructive/35 bg-destructive/12 text-destructive'
                        : 'border-success/35 bg-success/12 text-success'
                    }
                  >
                    {s}
                  </MetaChip>
                ))
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setResult(null)}>Xong</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
