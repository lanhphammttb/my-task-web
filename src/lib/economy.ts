import type { AppData, Task } from '../types';
import { PRIORITY_META } from '../types';
import { perfectDays } from './achievements';
import { currentStreak } from './stats';
import { beastById, beastLevel } from './beasts';
import type { OwnedBeast } from './beasts';
import { gradeOf } from './spirit';
import { techniqueMuls } from './techniques';
import { rankOf } from './sect';
import { FAIL_LOSS_RATIO } from './pills';
import { questStones } from './quests';
import { ASCENSION_INDEX, realmStart } from './cultivation';
import { verifiedTotals } from './integrity';

/**
 * Quy đổi công sức thành tu vi và linh thạch, có tính thiên phú linh căn và
 * linh thú. Mọi con số đều suy ra từ dữ liệu nhiệm vụ nên không thể "ăn gian"
 * bằng cách bấm lung tung, và người dùng luôn đối chiếu được.
 */

const taskXp = (t: Task) => 10 * PRIORITY_META[t.priority].weight;

const beatDeadline = (t: Task) => !!t.deadline && !!t.completedAt && t.completedAt <= t.deadline;

export interface XpBreakdown {
  /** Tu vi gốc từ nhiệm vụ và bế quan, chưa đổi tỷ giá theo công pháp */
  base: number;
  /** Chênh lệch do công pháp - có thể âm, vì công pháp nào cũng có chỗ đánh đổi */
  techniqueBonus: number;
  /** Cộng thêm từ thiên phú ngũ hành */
  elementBonus: number;
  /** Cộng thêm từ linh thú đang mang theo */
  beastBonus: number;
  /** Tu vi từ kỳ ngộ - cơ duyên, không nhân hệ số linh căn */
  encounterXp: number;
  /** Hệ số nhân của phẩm cấp linh căn */
  multiplier: number;
  total: number;
}

export function activeBeast(data: AppData): OwnedBeast | undefined {
  return data.beasts.find((b) => b.id === data.activeBeastId);
}

/** Phần trăm thiên phú của linh thú đang mang, theo từng loại. */
function beastPercent(data: AppData, kind: string): number {
  const owned = activeBeast(data);
  if (!owned) return 0;
  const beast = beastById(owned.id);
  if (!beast || beast.perk !== kind) return 0;
  return beast.perkPerLevel * beastLevel(owned.fed);
}

/**
 * Số nhiệm vụ đã hoàn thành và đã được sổ ghi xác thực. Chuyến thám hiểm đo
 * đường về bằng con số này, nên nó phải là con số đã kẹp.
 */
export function verifiedTaskCount(data: AppData): number {
  return Math.min(
    data.tasks.filter((t) => t.status === 'done').length,
    verifiedTotals(data).taskCount,
  );
}

/**
 * Tổng số phút bế quan đã được sổ ghi xác thực. Linh điền đo cây lớn bằng con
 * số này, nên nó phải là con số đã kẹp - không thì nhồi phiên giả là có thuốc.
 */
export function verifiedFocusMinutes(data: AppData): number {
  return Math.min(
    data.sessions.reduce((s, x) => s + x.minutes, 0),
    verifiedTotals(data).sessionMinutes,
  );
}

export function xpBreakdown(data: AppData): XpBreakdown {
  const done = data.tasks.filter((t) => t.status === 'done');

  // Chống gian lận: tu vi không bao giờ vượt quá phần đã được sổ ghi xác thực.
  // Người dùng bình thường có sổ khớp hoàn toàn nên không bị ảnh hưởng gì.
  const verified = verifiedTotals(data);
  const rawTaskBase = Math.min(done.reduce((sum, t) => sum + taskXp(t), 0), verified.taskXp);
  const focusMinutes = Math.min(
    data.sessions.reduce((s, x) => s + x.minutes, 0),
    verified.sessionMinutes,
  );
  const focusBase = Math.floor(focusMinutes / 5);
  const base = rawTaskBase + focusBase;

  // ---------------------------------------------------------- công pháp
  // Công pháp không cho thêm sức mạnh, nó đổi tỷ giá: Thuỷ Vân ăn bế quan mà
  // nhả nhiệm vụ, Kim Cang thì ngược lại. Cố ý áp lên đúng hai nguồn gốc chứ
  // không áp lên thiên phú, để người dùng nhẩm ra được ngay mình lời chỗ nào.
  const mul = techniqueMuls(data.technique);
  const techniqueBonus = rawTaskBase * (mul.taskMul - 1) + focusBase * (mul.focusMul - 1);

  const urgentBase = done.filter((t) => t.priority === 'urgent').reduce((s, t) => s + taskXp(t), 0);
  const deadlineBase = done.filter(beatDeadline).reduce((s, t) => s + taskXp(t), 0);

  // ---------------------------------------------------- thiên phú ngũ hành
  let elementBonus = 0;
  const elements = data.root?.elements ?? [];
  if (elements.includes('kim')) elementBonus += urgentBase * 0.2;
  if (elements.includes('hoa')) elementBonus += deadlineBase * 0.25;
  if (elements.includes('thuy')) elementBonus += focusBase * 0.25;
  if (elements.includes('moc')) elementBonus += currentStreak(data.tasks) * 3;
  if (elements.includes('tho')) elementBonus += perfectDays(data.tasks).length * 30;

  // ------------------------------------------------------ thiên phú linh thú
  const beastBonus =
    (base * beastPercent(data, 'xpPct')) / 100 +
    (focusBase * beastPercent(data, 'focusPct')) / 100 +
    (urgentBase * beastPercent(data, 'urgentPct')) / 100 +
    (deadlineBase * beastPercent(data, 'deadlinePct')) / 100;

  const multiplier = data.root ? gradeOf(data.root).multiplier : 1;
  // Cơ duyên là quà của trời, cộng thẳng chứ không nhân theo linh căn.
  const total = Math.max(
    0,
    Math.floor((base + techniqueBonus + elementBonus + beastBonus) * multiplier) + data.encounterXp,
  );

  return {
    base,
    techniqueBonus: Math.round(techniqueBonus),
    elementBonus: Math.round(elementBonus),
    beastBonus: Math.round(beastBonus),
    encounterXp: data.encounterXp,
    multiplier,
    total,
  };
}

export interface Progress {
  /** Tu vi gộp mọi thiên phú, chưa trừ tổn thất */
  raw: number;
  /** Tổn thất cộng dồn do độ kiếp thất bại */
  penalty: number;
  /** raw - penalty */
  net: number;
  /** Cảnh giới cao nhất đã được phép bước vào */
  gateRealm: number;
  /** Trần tu vi do chưa độ kiếp; Infinity nếu đã tới đích */
  cap: number;
  /** Con số dùng để xét cảnh giới - đã kẹp bởi trần */
  xp: number;
  /** Đã đủ tu vi nhưng đang bị chặn, phải độ kiếp mới đi tiếp */
  readyForTribulation: boolean;
  /** Tu vi đang bị giữ lại ngoài trần */
  held: number;
}

/**
 * Tu vi thực dụng. Có hai thứ can thiệp vào con số gốc:
 *  - tổn thất do độ kiếp thất bại (trừ đi)
 *  - trần cảnh giới: chưa độ kiếp thì không tràn sang cảnh giới kế
 * Nhờ vậy tu vi gốc luôn phản ánh đúng công việc đã làm, còn thăng tiến thì
 * vẫn phải trả giá như trong truyện.
 */
export function progressOf(data: AppData): Progress {
  const raw = xpBreakdown(data).total;
  const penalty = Math.max(0, data.tuViPenalty);
  const net = Math.max(0, raw - penalty);
  const gateRealm = Math.max(0, Math.min(ASCENSION_INDEX, data.gateRealm));
  const cap = gateRealm >= ASCENSION_INDEX ? Number.POSITIVE_INFINITY : realmStart(gateRealm + 1) - 1;
  const xp = Math.min(net, cap);

  return {
    raw,
    penalty,
    net,
    gateRealm,
    cap,
    xp,
    readyForTribulation: net > cap,
    held: Math.max(0, net - xp),
  };
}

/** Tu vi thực nhận sau mọi thiên phú - đây là con số dùng để xét cảnh giới. */
export const effectiveXp = (data: AppData) => progressOf(data).xp;

/**
 * Tu vi sẽ mất nếu độ kiếp thất bại: một nửa phần đã tích trong cảnh giới này,
 * nhân thêm hệ số của công pháp. Hậu Thổ đỡ đòn giỏi, Phá Chấp thì mất rất đau
 * - đó chính là cái giá của tu vi tăng thêm mà nó cho.
 */
export function tribulationLoss(data: AppData): number {
  const p = progressOf(data);
  const floor = realmStart(p.gateRealm);
  const lossMul = techniqueMuls(data.technique).lossMul;
  return Math.floor(Math.max(0, p.net - floor) * FAIL_LOSS_RATIO * lossMul);
}

export interface StoneBreakdown {
  fromTasks: number;
  fromSessions: number;
  fromPerfectDays: number;
  fromQuests: number;
  /** Linh thạch thưởng từ kỳ ngộ */
  fromEncounters: number;
  beastPercent: number;
  /** Phần trăm cộng thêm nhờ bậc trong tông môn */
  rankPercent: number;
  earned: number;
  spent: number;
  balance: number;
}

/**
 * Linh thạch: 1 viên mỗi nhiệm vụ, 2 mỗi phiên bế quan, 5 mỗi ngày viên mãn,
 * cộng phần thưởng nhật khoá tông môn.
 */
export function stoneBreakdown(data: AppData): StoneBreakdown {
  // Linh thạch cũng phải theo sổ ghi, kẻo nhồi nhiệm vụ giả vẫn kiếm được đá.
  const verified = verifiedTotals(data);
  const fromTasks = Math.min(data.tasks.filter((t) => t.status === 'done').length, verified.taskCount);
  const fromSessions = Math.min(data.sessions.length, verified.sessionCount) * 2;
  const fromPerfectDays = perfectDays(data.tasks).length * 5;
  const fromQuests = questStones(data);
  const pct = beastPercent(data, 'stonePct');
  // Thiên phú linh thú chỉ nhân phần kiếm được từ công việc; thưởng kỳ ngộ
  // là quà rời nên cộng thẳng vào sau. Công pháp cũng chỉ đụng vào phần kiếm
  // được - Hậu Thổ tích của giỏi, Phá Chấp thì đổi hết của lấy tu vi.
  const stoneMul = techniqueMuls(data.technique).stoneMul;
  // Bậc trong tông môn cũng chỉ ăn vào phần kiếm được từ công việc, giống thiên
  // phú linh thú - phần thưởng rời không nhân theo.
  const rankPct = rankOf(data.contribution).stonePct;
  const earned =
    Math.floor(
      (fromTasks + fromSessions + fromPerfectDays + fromQuests) *
        (1 + pct / 100) *
        (1 + rankPct / 100) *
        stoneMul,
    ) + data.stonesBonus;
  const spent = data.stonesSpent;
  return {
    fromTasks,
    fromSessions,
    fromPerfectDays,
    fromQuests,
    fromEncounters: data.stonesBonus,
    beastPercent: pct,
    rankPercent: rankPct,
    earned,
    spent,
    balance: Math.max(0, earned - spent),
  };
}

export const stoneBalance = (data: AppData) => stoneBreakdown(data).balance;
