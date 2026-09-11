import { useState } from 'react';
import { CalendarClock, Flag, HandCoins, ScrollText, Shield } from 'lucide-react';
import {
  MAX_RANK, MISSIONS, MISSION_ORDER, RANKS, missionState, nextRank, rankOf, rankRatio,
  timeLeftLabel,
} from '../lib/sect';
import type { Mission } from '../lib/sect';
import { formatDuration } from '../lib/date';
import { stoneBalance, verifiedFocusMinutes, verifiedTaskCount } from '../lib/economy';
import { useApp } from '../store/AppStore';
import { Meter, MetaChip, Section } from './primitives';
import SectionArt from './SectionArt';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/** Một dòng chỉ tiêu của sứ mệnh: "Nhiệm vụ 12/20". */
function Target({ label, done, need }: { label: string; done: number; need: number }) {
  if (need <= 0) return null;
  const ok = done >= need;
  return (
    <MetaChip className={cn(ok && 'border-success/35 bg-success/12 text-success')}>
      {label} {Math.min(done, need)}/{need}
    </MetaChip>
  );
}

/**
 * Tông môn: bậc đệ tử, cống hiến và sứ mệnh có đặt cọc.
 *
 * Đây là chỗ duy nhất trong app người dùng **hứa trước rồi chịu trách nhiệm**.
 * Mọi cơ chế khác đều là tiêu tài nguyên đổi lấy đồ, không làm cũng chẳng mất
 * gì; nhận sứ mệnh thì cọc bị khoá lại, trễ hạn là mất thật.
 */
export default function SectSection() {
  const { data, acceptMission, settleMission } = useApp();
  const [confirm, setConfirm] = useState<Mission | null>(null);
  const [giveUp, setGiveUp] = useState(false);

  const balance = stoneBalance(data);
  const rank = rankOf(data.contribution);
  const next = nextRank(data.contribution);
  const state = data.mission
    ? missionState(data.mission, verifiedTaskCount(data), verifiedFocusMinutes(data))
    : null;

  return (
    <Section
      id="awards-sect"
      icon={Shield}
      title="Tông môn"
      subtitle={`${rank.name} · ${data.contribution} cống hiến`}
    >
      <SectionArt src="/art/page/sect.jpg" caption="Sơn môn" tone="#7fb7a8">
        Cống hiến đổi lấy danh phận, danh phận mở ra sứ mệnh nặng hơn. Đây là chỗ duy nhất bạn{' '}
        <strong>hứa trước rồi phải chịu trách nhiệm</strong> — nhận việc là cọc bị khoá lại thật.
      </SectionArt>

      {/* ---------------------------------------------------------- bậc */}
      <div className="rounded-xl border p-3" style={{ borderColor: `${rank.tone}4d` }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-title text-sm font-bold" style={{ color: rank.tone }}>
            {rank.name}
          </h4>
          <MetaChip>
            bậc {rank.level}/{MAX_RANK}
          </MetaChip>
        </div>

        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">{rank.note}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {rank.stonePct > 0 && (
            <MetaChip className="border-success/35 bg-success/12 text-success">
              +{rank.stonePct}% linh thạch
            </MetaChip>
          )}
          {next && (
            <MetaChip>
              còn {next.need - data.contribution} cống hiến lên {next.name}
            </MetaChip>
          )}
        </div>

        <Meter value={rankRatio(data.contribution)} className="mt-2" />
      </div>

      {state ? (
        /* --------------------------------------------- sứ mệnh đang gánh */
        <div
          className={cn(
            'mt-3 rounded-xl border p-3',
            state.met
              ? 'border-success/45'
              : state.expired
                ? 'border-destructive/45'
                : 'border-warning/45',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-title text-sm font-bold">{state.mission.name}</h4>
            <MetaChip
              className={cn(
                state.expired
                  ? 'border-destructive/35 bg-destructive/12 text-destructive'
                  : 'border-warning/35 bg-warning/12 text-warning',
              )}
            >
              <CalendarClock className="size-3" /> {timeLeftLabel(state.msLeft)}
            </MetaChip>
          </div>

          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            {state.mission.note}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Target label="Nhiệm vụ" done={state.doneTasks} need={state.mission.tasks} />
            <Target label="Bế quan (phút)" done={state.doneFocus} need={state.mission.focus} />
            <MetaChip>cọc {state.active.stake}</MetaChip>
          </div>

          <Meter value={state.ratio} className="mt-2" />

          <Button
            size="sm"
            variant={state.met ? 'default' : 'outline'}
            className="mt-2.5 w-full gap-1.5"
            onClick={() => (state.met ? settleMission() : setGiveUp(true))}
          >
            <HandCoins className="size-3.5" />
            {state.met
              ? `Phục mệnh · nhận ${state.active.stake + state.mission.reward} linh thạch`
              : state.expired
                ? 'Kết toán · mất cọc'
                : 'Bỏ cuộc · mất cọc'}
          </Button>
        </div>
      ) : (
        /* ------------------------------------------------- bảng sứ mệnh */
        <div className="mt-3 grid gap-2.5">
          {MISSION_ORDER.map((id) => {
            const m = MISSIONS[id];
            const locked = rank.level < m.minRank;
            const afford = balance >= m.stake;
            return (
              <div
                key={id}
                className={cn('rounded-xl border p-3', (locked || !afford) && 'opacity-55')}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-title text-sm font-bold">{m.name}</h4>
                  {locked ? (
                    <MetaChip>cần bậc {RANKS[m.minRank - 1].name}</MetaChip>
                  ) : (
                    <MetaChip className="border-success/35 bg-success/12 text-success">
                      +{m.contribution} cống hiến
                    </MetaChip>
                  )}
                </div>

                <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">{m.note}</p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.tasks > 0 && <MetaChip>{m.tasks} nhiệm vụ</MetaChip>}
                  {m.focus > 0 && <MetaChip>{formatDuration(m.focus)} bế quan</MetaChip>}
                  <MetaChip>trong {m.days} ngày</MetaChip>
                  <MetaChip className={cn(!afford && 'border-warning/35 text-warning')}>
                    cọc {m.stake}
                  </MetaChip>
                  <MetaChip>thưởng {m.reward}</MetaChip>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2.5 w-full gap-1.5"
                  disabled={locked || !afford}
                  onClick={() => setConfirm(m)}
                >
                  <Flag className="size-3.5" /> Nhận sứ mệnh
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed">
        <ScrollText className="mt-0.5 size-3 shrink-0" />
        <span>
          Sứ mệnh là chỗ duy nhất có <strong>hạn chót thật</strong>. Hạn chót ở đây để đẩy bạn bắt
          tay vào làm — khác hẳn kiểu bắt ngồi chờ cho đủ giờ.
        </span>
      </p>

      {/* ------------------------------------------------ xác nhận nhận việc */}
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nhận {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Đặt cọc <strong>{confirm?.stake} linh thạch</strong>. Trong {confirm?.days} ngày phải
              {confirm && confirm.tasks > 0 ? ` xong ${confirm.tasks} nhiệm vụ` : ''}
              {confirm && confirm.tasks > 0 && confirm.focus > 0 ? ' và' : ''}
              {confirm && confirm.focus > 0 ? ` bế quan ${formatDuration(confirm.focus)}` : ''}. Đạt
              thì lấy lại cọc, cộng {confirm?.reward} linh thạch và {confirm?.contribution} cống
              hiến. <strong>Trễ hạn là mất cọc.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Thôi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) acceptMission(confirm.id);
                setConfirm(null);
              }}
            >
              Nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ----------------------------------------------------- xác nhận bỏ */}
      <AlertDialog open={giveUp} onOpenChange={setGiveUp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {state?.expired ? 'Kết toán sứ mệnh đã quá hạn?' : 'Bỏ cuộc giữa chừng?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {state?.expired
                ? `Hạn đã qua mà chỉ tiêu chưa đạt. Kết toán thì mất ${state?.active.stake} linh thạch tiền cọc, và bảng sứ mệnh mở lại.`
                : `Vẫn còn hạn để làm nốt. Bỏ bây giờ là mất luôn ${state?.active.stake} linh thạch tiền cọc.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Làm tiếp</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                settleMission();
                setGiveUp(false);
              }}
            >
              {state?.expired ? 'Kết toán' : 'Bỏ cuộc'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
