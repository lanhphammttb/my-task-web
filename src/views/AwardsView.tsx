import { useMemo } from 'react';
import { Flame, Lock, Medal, Sparkles, Trophy, Zap } from 'lucide-react';
import { formatDuration } from '../lib/date';
import { bestStreak, currentStreak, levelOf, totalXp } from '../lib/stats';
import { achievementStates } from '../lib/achievements';
import type { AchievementState } from '../lib/achievements';
import { TONE_UI } from '../lib/ui';
import { useApp } from '../store/AppStore';
import ProgressRing from '../components/ProgressRing';
import { Meter, Section, StatTile } from '../components/primitives';
import { cn } from '@/lib/utils';

/**
 * Trang thành tích: nơi công sức đã bỏ ra được nhìn thấy. Huy hiệu chưa mở vẫn
 * hiện kèm tiến độ để tạo cảm giác "sắp tới rồi" thay vì bị che kín.
 */
export default function AwardsView() {
  const { data } = useApp();
  const all = useMemo(() => achievementStates(data), [data]);
  const unlocked = all.filter((a) => a.unlocked);
  const locked = all.filter((a) => !a.unlocked).sort((a, b) => b.ratio - a.ratio);

  const xp = totalXp(data.tasks, data.sessions);
  const lv = levelOf(xp);
  const streak = currentStreak(data.tasks);
  const focusTotal = data.sessions.reduce((s, x) => s + x.minutes, 0);
  const nextUp = locked[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Huy hiệu & thành tích</h2>
        <p className="text-muted-foreground text-xs">
          Mỗi việc bạn hoàn thành đều được tính. Đây là bằng chứng.
        </p>
      </div>

      {/* --------------------------------------------------- thẻ cấp độ */}
      <section className="border-primary/25 from-primary/12 to-card rounded-2xl border bg-gradient-to-br p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <ProgressRing
            value={lv.ratio}
            size={126}
            label={`Lv ${lv.level}`}
            caption={`${lv.into}/${lv.need} XP`}
            glowOnFull={false}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="text-warning size-4 shrink-0" />
              Bạn đã mở {unlocked.length}/{all.length} huy hiệu và tích {xp} XP
            </p>
            {nextUp && (
              <div>
                <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
                  <Zap className="text-primary size-3" /> Gần nhất:{' '}
                  <strong className="text-foreground font-semibold">{nextUp.title}</strong>
                  <span className="tabular">
                    ({nextUp.current}/{nextUp.target})
                  </span>
                </p>
                <Meter value={nextUp.ratio} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Chuỗi hiện tại" value={streak} hint="ngày liên tiếp" icon={Flame} />
              <StatTile label="Kỷ lục chuỗi" value={bestStreak(data.tasks)} hint="ngày" icon={Medal} />
              <StatTile
                label="Việc đã xong"
                value={data.tasks.filter((t) => t.status === 'done').length}
                hint="tổng cộng"
                icon={Sparkles}
              />
              <StatTile label="Tập trung" value={formatDuration(focusTotal)} hint="tổng thời gian" icon={Trophy} />
            </div>
          </div>
        </div>
      </section>

      <Section icon={Medal} title={`Đã mở (${unlocked.length})`}>
        {unlocked.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa mở huy hiệu nào. Hoàn thành nhiệm vụ đầu tiên là có ngay chiếc đầu tiên.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((a) => (
              <AwardCard key={a.id} award={a} />
            ))}
          </div>
        )}
      </Section>

      <Section icon={Lock} title={`Chưa mở (${locked.length})`} subtitle="Sắp xếp theo mức độ gần đạt">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locked.map((a) => (
            <AwardCard key={a.id} award={a} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function AwardCard({ award }: { award: AchievementState }) {
  const tone = TONE_UI[award.tone];
  const Icon = award.icon;

  return (
    <article
      className={cn(
        'rounded-xl border p-4 transition-colors',
        award.unlocked ? cn('border-border bg-card ring-1', tone.ring) : 'border-border bg-card/50',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            award.unlocked ? cn(tone.bg, tone.text) : 'bg-muted text-muted-foreground/50',
          )}
        >
          {award.unlocked ? <Icon className="size-5" strokeWidth={2.25} /> : <Lock className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <strong className={cn('block text-sm font-semibold', !award.unlocked && 'text-muted-foreground')}>
            {award.title}
          </strong>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{award.description}</p>
        </div>
      </div>

      {!award.unlocked && (
        <div className="mt-3">
          <Meter value={award.ratio} height={5} />
          <p className="text-muted-foreground tabular mt-1.5 text-right text-[11px]">
            {award.current}/{award.target}
          </p>
        </div>
      )}
    </article>
  );
}
