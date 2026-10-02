import type { AppData, Task } from '../types';
import { PRIORITY_META } from '../types';
import { perfectDays } from './achievements';
import { currentStreak } from './stats';
import { beastById, beastLevel } from './beasts';
import type { OwnedBeast } from './beasts';
import { gradeOf } from './spirit';
import { techniqueMuls } from './techniques';
import { missionState, rankOf } from './sect';
import type { MissionState } from './sect';
import { expeditionState } from './expedition';
import type { ExpeditionState } from './expedition';
import { FAIL_LOSS_RATIO } from './pills';
import { questStones } from './quests';
import { ASCENSION_INDEX, REALM_MIN_DAYS, realmStart } from './cultivation';
import { verifiedTotals } from './integrity';
import { completedDay, xongTruocHan } from './date';
import { STONES_PER_BLOCK, rewardsSession, sessionStones, theoLuatMoi } from './validation';

/**
 * Quy đổi công sức thành tu vi và linh thạch, có tính thiên phú linh căn và
 * linh thú. Mọi con số đều suy ra từ dữ liệu nhiệm vụ nên không thể "ăn gian"
 * bằng cách bấm lung tung, và người dùng luôn đối chiếu được.
 */

const taskXp = (t: Task) => 10 * PRIORITY_META[t.priority].weight;

// So mốc thời gian chứ không so chuỗi - xem `xongTruocHan`.
const beatDeadline = (t: Task) => xongTruocHan(t);

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
  /**
   * Phần thiên phú bị trần cắt bớt (luôn ≥ 0). Công pháp + ngũ hành + linh
   * thú + phẩm linh căn cộng lại không cho quá `TALENT_CAP` so với tu vi gốc -
   * xem `TALENT_CAP`.
   */
  talentCut: number;
  total: number;
}

/**
 * Trần của mọi thiên phú cộng lại: tối đa +40% so với tu vi gốc.
 *
 * Thiên phú là hệ số NHÂN lên công việc và áp ngược cho cả lịch sử - đó là chủ
 * ý, đổi linh thú là thấy ngay con số. Nhưng nhân chồng lên nhau thì phình rất
 * nhanh: mô phỏng một năm, Phượng Hoàng (+100%) cộng linh căn bốn hệ cộng Kim
 * Cang cho tu vi gấp 2,5 lần phần việc thật, tức việc thật chỉ còn chừng một
 * phần ba tu vi. App này tồn tại để việc thật dẫn đường, nên phần "trời cho"
 * không được lấn phần làm ra. Có trần thì vẫn đáng săn linh thú và luyện linh
 * căn - chỉ là tới một mức thì thôi, phần còn lại phải tự làm.
 *
 * Cơ duyên (kỳ ngộ, hòm, thám hiểm) KHÔNG nằm dưới trần này: nó cộng thẳng và
 * đã được giảm ở chính chỗ phát ra.
 */
export const TALENT_CAP = 0.4;

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

/**
 * Đoạn đầu sổ ghi còn nguyên chuỗi băm - chỉ những bản ghi này mới được tính.
 * `verifiedTotals().verified` chính là độ dài đoạn ấy, ở cả web lẫn server.
 */
function verifiedEntries(data: AppData) {
  return data.ledger.slice(0, verifiedTotals(data).verified);
}

const mocThoiGian = (iso: string): number => {
  const t = Date.parse(iso);
  // Mốc hỏng thì coi như "từ cuối trời": không bản ghi nào lọt, an toàn hơn là
  // coi như "từ thuở nào" rồi tính luôn cả sổ.
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

/** Mốc xong lần đầu; không có mốc nào thì coi như "từ thuở nào" - không lọt vào đếm "từ lúc nhận". */
const lanDauXong = (t: Task): number => {
  const ms = Date.parse(t.firstDoneAt ?? t.completedAt ?? '');
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
};

/**
 * Số nhiệm vụ KHÁC NHAU được ghi sổ từ một mốc trở đi, và hiện vẫn đang xong.
 *
 * Mỗi việc chỉ được đếm một lần dù tick đi tick lại, và việc xong TRƯỚC mốc
 * thì không đếm. Một mình con số này thì lại hở theo chiều khác: bỏ tick một
 * việc cũ rồi tick lại SAU mốc là nó có bản ghi mới, và được đếm như việc mới
 * làm. Nên `missionStateOf` / `expeditionStateOf` lấy số NHỎ hơn giữa con số
 * này và hiệu "số việc xong bây giờ trừ số lúc nhận" - hiệu ấy không nhích khi
 * bỏ tick rồi tick lại, còn con số này không nhích khi việc được đếm hai lần.
 */
export function verifiedTasksSince(data: AppData, since: string): number {
  const from = mocThoiGian(since);
  /*
   * Chỉ việc xong LẦN ĐẦU từ mốc trở đi (`firstDoneAt`). Bản ghi sổ thì đổi
   * mỗi lần tick lại, nên chỉ nhìn sổ là bỏ tick tám việc cũ, nhận sứ mệnh rồi
   * tick lại được tính như tám việc mới làm. `firstDoneAt` thì không lệnh nào
   * gỡ được. Hồ sơ cũ chưa có trường ấy thì lấy `completedAt` - vẫn là mốc
   * thật của lần xong đang giữ.
   */
  const done = new Set(
    data.tasks
      .filter((t) => t.status === 'done' && lanDauXong(t) >= from)
      .map((t) => t.id),
  );
  const seen = new Set<string>();
  for (const e of verifiedEntries(data)) {
    if (e.kind === 'task' && done.has(e.ref) && Date.parse(e.at) >= from) seen.add(e.ref);
  }
  return seen.size;
}

/** Tổng phút bế quan đã ghi sổ từ một mốc trở đi. Cùng lý do với `verifiedTasksSince`. */
export function verifiedFocusSince(data: AppData, since: string): number {
  const from = mocThoiGian(since);
  const live = new Set(data.sessions.map((s) => s.id));
  const seen = new Set<string>();
  let total = 0;
  for (const e of verifiedEntries(data)) {
    if (e.kind !== 'session' || !live.has(e.ref) || seen.has(e.ref) || Date.parse(e.at) < from) continue;
    seen.add(e.ref);
    total += e.value;
  }
  return total;
}

/**
 * Tiến độ sứ mệnh đang gánh.
 *
 * Lấy số nhỏ hơn giữa hai cách đo (xem `verifiedTasksSince`), nên bỏ tick rồi
 * tick lại việc cũ - trước hay sau lúc nhận - không cho thêm tiến độ so với
 * làm thật. Kẽ từng còn lại - bỏ tick việc cũ TRƯỚC khi nhận để hạ mốc rồi
 * tick lại - giờ bị chặn bằng `firstDoneAt`: việc đã từng xong trước lúc nhận
 * thì tick lại bao nhiêu lần cũng không phải việc mới. Còn lại chỉ là thêm một
 * việc bịa rồi tick, mà việc do người dùng tự khai thì vốn không kiểm được.
 *
 * Giữ nguyên `missionState` và mốc `startTasks` trong hồ sơ để hồ sơ cũ vẫn
 * đọc được. Nên gọi hàm này thay cho `missionState(m, verifiedTaskCount(data), ...)`.
 */
export function missionStateOf(data: AppData, now: Date = new Date()): MissionState | null {
  const m = data.mission;
  if (!m) return null;
  const tasks = Math.min(
    verifiedTasksSince(data, m.acceptedAt),
    Math.max(0, verifiedTaskCount(data) - m.startTasks),
  );
  const focus = Math.min(
    verifiedFocusSince(data, m.acceptedAt),
    Math.max(0, verifiedFocusMinutes(data) - m.startFocus),
  );
  const s = missionState({ ...m, startTasks: 0, startFocus: 0 }, tasks, focus, now);
  return s && { ...s, active: m };
}

/** Tiến độ chuyến thám hiểm đang đi, cùng lối đo với `missionStateOf`. */
export function expeditionStateOf(data: AppData): ExpeditionState | null {
  const e = data.expedition;
  if (!e) return null;
  const tasks = Math.min(
    verifiedTasksSince(data, e.startedAt),
    Math.max(0, verifiedTaskCount(data) - e.startedAtTasks),
  );
  const s = expeditionState({ ...e, startedAtTasks: 0 }, tasks);
  return s && { ...s, expedition: e };
}

export function xpBreakdown(data: AppData, today?: string): XpBreakdown {
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
  if (elements.includes('moc')) elementBonus += currentStreak(data.tasks, today) * 3;
  if (elements.includes('tho')) elementBonus += perfectDays(data.tasks).length * 30;

  // ------------------------------------------------------ thiên phú linh thú
  const beastBonus =
    (base * beastPercent(data, 'xpPct')) / 100 +
    (focusBase * beastPercent(data, 'focusPct')) / 100 +
    (urgentBase * beastPercent(data, 'urgentPct')) / 100 +
    (deadlineBase * beastPercent(data, 'deadlinePct')) / 100;

  const multiplier = data.root ? gradeOf(data.root).multiplier : 1;
  const talented = (base + techniqueBonus + elementBonus + beastBonus) * multiplier;
  // Trần thiên phú - xem `TALENT_CAP`. Công pháp có thể làm phần này ÂM (Thuỷ
  // Vân cho người toàn làm việc vụn), khi ấy trần không đụng tới.
  const talentCut = Math.max(0, talented - base * (1 + TALENT_CAP));
  // Cơ duyên là quà của trời, cộng thẳng chứ không nhân theo linh căn.
  const total = Math.max(0, Math.floor(talented - talentCut) + data.encounterXp);

  return {
    base,
    techniqueBonus: Math.round(techniqueBonus),
    elementBonus: Math.round(elementBonus),
    beastBonus: Math.round(beastBonus),
    encounterXp: data.encounterXp,
    multiplier,
    talentCut: Math.round(talentCut),
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
  /** Số ngày đã tu luyện thật (có việc xong hoặc phiên bế quan từ 5 phút) */
  activeDays: number;
  /** Số ngày tu luyện cần có để độ kiếp sang cảnh giới kế - xem `REALM_MIN_DAYS` */
  daysNeeded: number;
  /** Đã đủ ngày tu luyện cho lần độ kiếp kế chưa */
  daysReady: boolean;
}

/**
 * Số NGÀY khác nhau đã có công việc thật: xong ít nhất một việc (theo ngày
 * xong) hoặc ngồi một phiên bế quan được thưởng. Dùng làm "căn cơ" cho độ kiếp
 * - xem `REALM_MIN_DAYS`.
 */
export function activeDays(data: Pick<AppData, 'tasks' | 'sessions'>): number {
  const days = new Set<string>();
  for (const t of data.tasks) if (t.status === 'done') days.add(completedDay(t));
  for (const s of data.sessions) if (rewardsSession(s.minutes)) days.add(s.date);
  return days.size;
}

/**
 * Tu vi thực dụng. Có hai thứ can thiệp vào con số gốc:
 *  - tổn thất do độ kiếp thất bại (trừ đi)
 *  - trần cảnh giới: chưa độ kiếp thì không tràn sang cảnh giới kế
 * Nhờ vậy tu vi gốc luôn phản ánh đúng công việc đã làm, còn thăng tiến thì
 * vẫn phải trả giá như trong truyện.
 */
export function progressOf(data: AppData, today?: string): Progress {
  const raw = xpBreakdown(data, today).total;
  const penalty = Math.max(0, data.tuViPenalty);
  const net = Math.max(0, raw - penalty);
  const gateRealm = Math.max(0, Math.min(ASCENSION_INDEX, data.gateRealm));
  const cap = gateRealm >= ASCENSION_INDEX ? Number.POSITIVE_INFINITY : realmStart(gateRealm + 1) - 1;
  /*
   * Sàn: không bao giờ hiện dưới đầu cảnh giới đã mở.
   *
   * Thất bại độ kiếp chỉ trừ trong phạm vi cảnh giới nên tự nó không xuyên
   * sàn. Nhưng thiên phú áp ngược cho cả lịch sử, nên lần hạ hệ số linh thú và
   * đặt trần thiên phú (`TALENT_CAP`) làm tu vi gốc của hồ sơ cũ nhỏ đi - có
   * người sẽ rơi xuống dưới cảnh giới mình đã độ kiếp đàng hoàng. Cảnh giới đã
   * vượt thiên kiếp thì không ai lấy lại được; chỉ phần tích thêm trong cảnh
   * giới là phải làm lại.
   */
  const xp = Math.max(Math.min(net, cap), Math.min(realmStart(gateRealm), cap));
  const days = activeDays(data);
  const daysNeeded = REALM_MIN_DAYS[Math.min(ASCENSION_INDEX, gateRealm + 1)] ?? 0;

  return {
    raw,
    penalty,
    net,
    gateRealm,
    cap,
    xp,
    readyForTribulation: net > cap,
    held: Math.max(0, net - xp),
    activeDays: days,
    daysNeeded,
    daysReady: days >= daysNeeded,
  };
}

/** Tu vi thực nhận sau mọi thiên phú - đây là con số dùng để xét cảnh giới. */
export const effectiveXp = (data: AppData, today?: string) => progressOf(data, today).xp;

/**
 * Tu vi sẽ mất nếu độ kiếp thất bại: `FAIL_LOSS_RATIO` (15%) phần đã tích
 * trong cảnh giới này, nhân thêm hệ số của công pháp. Hậu Thổ đỡ đòn giỏi,
 * Phá Chấp thì mất rất đau - đó chính là cái giá của tu vi tăng thêm mà nó cho.
 *
 * Chỉ tính tới TRẦN (`p.xp`), không tính phần đang bị giữ ngoài trần: trước
 * đây ai để dồn lâu một chút mới độ kiếp là mất một nửa cả phần dồn ấy, tức bị
 * phạt nặng hơn chỉ vì đã làm nhiều việc hơn. Tổn thất vẫn trừ vào một con số
 * chung (`tuViPenalty`), nên nếu đang có phần bị giữ thì phần ấy đỡ trước - vị
 * trí trong cảnh giới chỉ tụt khi phần giữ không đủ đỡ.
 */
export function tribulationLoss(data: AppData, today?: string): number {
  const p = progressOf(data, today);
  const floor = realmStart(p.gateRealm);
  const lossMul = techniqueMuls(data.technique).lossMul;
  return Math.floor(Math.max(0, p.xp - floor) * FAIL_LOSS_RATIO * lossMul);
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
 * Linh thạch từ bế quan, theo hai luật - xem `sessionStones` và `KINH_TE_MOI_TU`.
 *
 *  - Phiên bắt đầu trước mốc: luật cũ, kẹp y như cũ (2 viên mỗi phiên từ 5
 *    phút, số phiên không vượt số phiên trong sổ) - để không hồ sơ nào bị trừ
 *    ngược số đá đã có.
 *  - Phiên từ mốc trở đi: 2 viên mỗi 25 phút trọn, và chỉ phiên có bản ghi
 *    trong đoạn sổ đã xác thực mới được tính, số phút lấy theo sổ.
 */
function sessionStoneTotal(data: AppData, verifiedSessionCount: number): number {
  // Số dư linh thạch được hỏi rất nhiều lần cho cùng một hồ sơ (mỗi lần chiêu
  // thú, mua đan... đều soát số dư), mà phiên thì chỉ đổi khi ghi phiên mới.
  // Hồ sơ luôn được dựng mảng mới khi đổi nên nhớ theo đúng mảng là đủ; vẫn
  // soát độ dài và sổ ghi cho chắc.
  const nho = daTinhDaPhien.get(data.sessions);
  if (nho && nho.len === data.sessions.length && nho.ledger === data.ledger && nho.count === verifiedSessionCount) {
    return nho.value;
  }
  const value = tinhDaPhien(data, verifiedSessionCount);
  daTinhDaPhien.set(data.sessions, { len: data.sessions.length, ledger: data.ledger, count: verifiedSessionCount, value });
  return value;
}

const daTinhDaPhien = new WeakMap<
  readonly AppData['sessions'][number][],
  { len: number; ledger: AppData['ledger']; count: number; value: number }
>();

function tinhDaPhien(data: AppData, verifiedSessionCount: number): number {
  const oldCount = data.sessions.filter((s) => rewardsSession(s.minutes) && !theoLuatMoi(s.startedAt)).length;
  const oldPart = Math.min(oldCount, verifiedSessionCount) * STONES_PER_BLOCK;
  const fresh = data.sessions.filter((s) => theoLuatMoi(s.startedAt));
  if (fresh.length === 0) return oldPart;
  const inLedger = new Map<string, number>();
  for (const e of verifiedEntries(data)) if (e.kind === 'session') inLedger.set(e.ref, e.value);
  let newPart = 0;
  for (const s of fresh) {
    const minutes = inLedger.get(s.id);
    if (minutes !== undefined) newPart += sessionStones(Math.min(s.minutes, minutes), s.startedAt);
  }
  return oldPart + newPart;
}

/**
 * Linh thạch: 1 viên mỗi nhiệm vụ, 2 mỗi 25 phút bế quan, 5 mỗi ngày viên mãn,
 * cộng phần thưởng nhật khoá tông môn.
 */
export function stoneBreakdown(data: AppData): StoneBreakdown {
  // Linh thạch cũng phải theo sổ ghi, kẻo nhồi nhiệm vụ giả vẫn kiếm được đá.
  const verified = verifiedTotals(data);
  const fromTasks = Math.min(data.tasks.filter((t) => t.status === 'done').length, verified.taskCount);
  const fromSessions = sessionStoneTotal(data, verified.sessionCount);
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
