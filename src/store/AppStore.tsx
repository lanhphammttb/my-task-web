import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppContext, HanhDongContext } from './appContext';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { khoiPhucVerified, luuVerified, useServerSync } from './useServerSync';
import type { ServerSync } from './useServerSync';
import { LENH, NHAN_PHU, gioiHanMucTieu, gioiHanNhiemVu } from './lenh';
import type { CommandReply } from '../lib/api';
import type { AppData, FocusSession, Goal, Settings, Status, Task } from '../types';
import { GOAL_COLORS } from '../types';
import { monthlyAnchor, nextOccurrence, parseKey, todayKey } from '../lib/date';
import { STORAGE_KEY, emptyData, loadData, saveData, storageLoadError, clearStorageLoadError, uid } from '../lib/storage';
import { seedData } from '../lib/seed';
import { effectiveXp, expeditionStateOf, missionStateOf, stoneBalance, verifiedFocusMinutes, verifiedTaskCount } from '../lib/economy';
import { cultivationOf, realmLabel } from '../lib/cultivation';
import { ACHIEVEMENTS, isPerfectDay, unlockedIds } from '../lib/achievements';
import { FEED_COST, FEED_GAIN, DUPLICATE_FEED, SUMMON_COST, summonBeast } from '../lib/beasts';
import type { Beast } from '../lib/beasts';
import { ELEMENTS, REFINE_COST, REROLL_COST, condenseCost, condenseRoot, refineRoot, rollRoot } from '../lib/spirit';
import type { Element, SpiritRoot } from '../lib/spirit';
import { CONSOLATION_CHANCE, MARKET_GRADES, PILLS, RECIPES, consolationGrade, refineChance, tribulationChance } from '../lib/pills';
import type { PillGrade } from '../lib/pills';
import { TECHNIQUES, techniqueSwapCost } from '../lib/techniques';
import type { TechniqueId } from '../lib/techniques';
import { HERBS, HERB_ORDER, hasHerbs, plotState } from '../lib/field';
import type { HerbId } from '../lib/field';
import { caveRefineBonus, fieldSlots, nextCave } from '../lib/cave';
import { SITES, rollSiteOutcome } from '../lib/expedition';
import { MISSIONS, dueDateOf, rankOf } from '../lib/sect';
import { chestKey, chestsOfDay, rollLoot } from '../lib/chest';
import type { ChestGrade, Loot } from '../lib/chest';
import type { Mission, MissionId } from '../lib/sect';
import type { SiteId, SiteOutcome } from '../lib/expedition';
import { progressOf, tribulationLoss } from '../lib/economy';
import { ASCENSION_INDEX, REALMS } from '../lib/cultivation';
import { ENCOUNTER_CHANCE, applyEncounterOutcome, encounterById, pickEncounter, rollOutcome } from '../lib/encounters';
import type { Encounter, Outcome } from '../lib/encounters';
import { MIN_REWARD_SESSION_MIN, checkComplete, checkSession, clampEstimate, rewardsSession } from '../lib/validation';
import { appendEntry, auditData, dropEntries, rebuildLedger, taskValue } from '../lib/integrity';
import type { Audit, LedgerEntry } from '../lib/integrity';
import { beastLevel, MAX_BEAST_LEVEL } from '../lib/beasts';
import {
  burstBig, burstRain, burstTier, setSoundEnabled, soundAchievement, soundAscend, soundComplete,
  soundLevelUp, soundPerfectDay,
} from '../lib/celebrate';

/** Khoảnh khắc đáng ăn mừng, hiện thành lớp phủ toàn màn hình. */
export type Celebration =
  | { kind: 'tier-up'; label: string; realmIndex: number; xp: number }
  | { kind: 'realm-up'; realm: string; note: string; realmIndex: number; xp: number }
  | { kind: 'ascension'; xp: number }
  | { kind: 'awaken'; root: SpiritRoot }
  | { kind: 'summon'; beastId: string; duplicate: boolean }
  | { kind: 'tribulation-failed'; loss: number; nextChance: number; realm: string }
  | { kind: 'perfect-day'; count: number }
  | { kind: 'achievement'; id: string; title: string; description: string };

/** Thứ moi được từ một hòm kỳ ngộ, kèm phẩm cấp hòm để UI tô đúng màu. */
export interface ChestResult {
  loot: Loot;
  grade: ChestGrade;
}

/** Kết quả kết toán một sứ mệnh tông môn. */
export interface MissionResult {
  met: boolean;
  mission: Mission;
  /** Cống hiến nhận thêm, 0 nếu trượt */
  contribution: number;
  /** Linh thạch thu về, gồm cả phần cọc trả lại. 0 nếu trượt */
  stones: number;
  /** Lên bậc mới hay không */
  rankedUp: boolean;
}

/** Kết quả một mẻ đan: hỏng vẫn có thể vớt được phẩm thấp hơn một bậc. */
export interface RefineResult {
  success: boolean;
  /** Viên thực nhận, hoặc `null` nếu cháy sạch */
  got: PillGrade | null;
  /** Tỷ lệ đã dùng để bốc - hiện lại cho người dùng đối chiếu */
  chance: number;
}

export interface Ctx {
  data: AppData;
  storageError: string | null;
  retrySave: () => void;
  /** Tình trạng nối với server trọng tài. `status: 'tat'` là đang chạy một mình. */
  sync: ServerSync;
  /** Giờ mở app lần trước, chụp trước khi bị ghi đè. Rỗng nếu là lần đầu chạy. */
  lastVisitAt: string;
  celebration: Celebration | null;
  /**
   * Mọi khoảnh khắc đang chờ. Nhiều mốc cùng tới một lúc (xong việc đầu tiên:
   * đột phá + kỳ ngộ + viên mãn) thì gộp vào MỘT thẻ thay vì ba lớp phủ nối đuôi.
   */
  celebrations: Celebration[];
  /** Đóng `count` khoảnh khắc đầu hàng đợi (mặc định 1). */
  dismissCelebration: (count?: number) => void;
  /** Kỳ ngộ đang chờ người tu quyết định */
  /** Kết quả kiểm tra toàn vẹn dữ liệu, tính lại mỗi khi dữ liệu đổi */
  audit: Audit;
  /** Ký lại sổ ghi theo dữ liệu hiện tại (người dùng chấp nhận trạng thái này) */
  resealLedger: () => void;
  encounter: Encounter | null;
  /**
   * Kết quả kỳ ngộ do SERVER bốc, tới sau khi lệnh `resolveEncounter` được
   * trả lời. Chạy một mình thì `resolveEncounter` trả kết quả ngay và trường
   * này cũng mang đúng kết quả ấy.
   */
  encounterResult: Outcome | null;
  /**
   * Chọn một hướng xử lý. Chạy một mình thì bốc ngay và trả kết quả. Có server
   * làm trọng tài thì trả `'cho'`: lệnh đã gửi, kết quả tới sau qua
   * `encounterResult`.
   */
  resolveEncounter: (optionIndex: number) => Outcome | 'cho' | null;
  dismissEncounter: () => void;
  notify: (message: string, tone?: 'ok' | 'warn') => void;
  addTask: (input: Partial<Task> & { title: string }) => Task;
  /** Trả về false nếu bị chặn (đổi ngày hay mức ưu tiên của việc đã xong). */
  updateTask: (id: string, patch: Partial<Task>) => boolean;
  /** Xoá ngay trên màn hình, kèm nút "Hoàn tác" vài giây - xem `removeTask`. */
  removeTask: (id: string) => void;
  /** Trả về false nếu bị chặn vì không hợp lý (ví dụ việc của ngày mai). */
  setStatus: (id: string, status: Status) => boolean;
  /** Trả về false nếu bị chặn; true nếu đã đổi trạng thái. */
  toggleDone: (id: string) => boolean;
  /** Trả về false nếu bị chặn: việc đã xong thì không dời được. */
  moveTask: (id: string, date: string) => boolean;
  duplicateTask: (id: string) => Task | null;
  toggleSubtask: (taskId: string, subId: string) => void;
  pushOverdueToToday: () => number;
  clearDone: (before?: string) => number;
  addGoal: (input: Partial<Goal> & { title: string }) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  /** Trả về phiên vừa ghi, hoặc `null` nếu bị chặn vì không hợp lý. */
  logSession: (minutes: number, taskId?: string) => FocusSession | null;
  awaken: () => SpiritRoot;
  rerollRoot: () => SpiritRoot | null;
  summon: () => Beast | null;
  feedBeast: (id: string) => boolean;
  setActiveBeast: (id?: string) => void;
  buyPill: (grade: PillGrade, qty?: number) => boolean;
  /** Chọn hoặc đổi công pháp. Lần chọn đầu miễn phí, đổi thì mỗi lần một đắt. */
  pickTechnique: (id: TechniqueId) => boolean;
  /** Gieo hạt vào một ô linh điền. */
  plantSeed: (slot: number, herb: HerbId) => boolean;
  /** Hái ô đã chín. Chưa đủ phút bế quan thì không hái được. */
  harvestPlot: (slot: number) => boolean;
  /** Luyện đan: tốn linh thảo và củi lửa, và có thể hỏng lò. */
  refinePill: (grade: PillGrade) => RefineResult | null;
  /** Tẩy tuỷ: đổi một hệ trong linh căn sang hệ khác, phẩm cấp giữ nguyên. */
  refineRootElement: (from: Element, to: Element) => boolean;
  /** Ngưng luyện: bỏ bớt một hệ để linh căn thuần hơn, đổi lại mất thiên phú. */
  condenseRootElement: (drop: Element) => boolean;
  /** Nâng bậc động phủ: mở thêm ô linh điền và tăng tay nghề luyện đan. */
  upgradeCave: () => boolean;
  /** Lên đường tới một bí cảnh. Mỗi lúc chỉ đi được một nơi. */
  startExpedition: (site: SiteId) => boolean;
  /** Đón đoàn về và bốc kết quả. Chưa đủ nhiệm vụ thì chưa về được. */
  resolveExpedition: () => SiteOutcome | null;
  /** Mở một hòm kỳ ngộ đã có. Trả về thứ moi được, hoặc `null` nếu chưa có hòm. */
  openChest: (ruleId: string) => ChestResult | null;
  /** Nhận một sứ mệnh tông môn, đặt cọc linh thạch. */
  acceptMission: (id: MissionId) => boolean;
  /** Kết toán sứ mệnh: đạt thì lấy cọc và thưởng, chưa đạt thì mất cọc. */
  settleMission: () => MissionResult | null;
  /** Độ kiếp: nuốt đan, bốc xác suất. Trả về true nếu vượt qua. */
  attemptTribulation: (grade: PillGrade) => boolean | null;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: AppData) => void;
  loadSample: () => void;
  resetAll: () => void;
}

/** Phần trạng thái: đổi theo từng thay đổi của hồ sơ */
type TrangThai = Pick<Ctx, 'data' | 'storageError' | 'sync' | 'lastVisitAt' | 'celebration' | 'celebrations' | 'audit' | 'encounter' | 'encounterResult'>;
/** Phần hành động: danh tính ổn định suốt đời provider */
export type HanhDong = Omit<Ctx, keyof TrangThai>;

// Context và hai hook đọc nó nằm ở `appContext.ts`. Giữ lại đường xuất `useApp`
// cũ cho mấy chục chỗ đang nhập từ đây; chỗ mới thì nhập thẳng từ `appContext`
// (kể cả `useAppActions`).
export { useApp } from './appContext';

/**
 * Bọc mọi hành động lại: chạy như cũ, rồi gửi lệnh tương ứng lên server.
 *
 * Thứ tự quan trọng - **tính ở máy trước, gửi sau**. Nhờ vậy màn hình đổi ngay
 * lúc bấm, không chờ mạng, và lệnh chỉ được gửi khi chính web cũng thấy hợp lệ.
 *
 * Ép kiểu ở đây là chỗ duy nhất trong file: bọc kiểu này giữ nguyên chữ ký của
 * từng hàm nhưng TypeScript không theo nổi qua một vòng lặp trên `Record`.
 */
function bocLenh<T extends Record<string, unknown>>(
  hanhDong: T,
  gui: (name: string, args: Record<string, unknown>) => void,
  layPhu: () => Record<string, unknown> | null,
): T {
  const ra: Record<string, unknown> = { ...hanhDong };
  for (const [ten, doi] of Object.entries(LENH)) {
    const goc = hanhDong[ten];
    if (typeof goc !== 'function') continue;
    ra[ten] = (...tham: never[]) => {
      layPhu(); // bỏ phần phụ còn sót của lần gọi trước, nếu có
      const ketQua = (goc as (...a: never[]) => unknown)(...tham);
      const phu = layPhu();
      const args = doi(ketQua, ...tham);
      if (args) gui(ten, phu && NHAN_PHU.has(ten) ? { ...args, ...phu } : args);
      return ketQua;
    };
  }
  return ra as T;
}

/** `bocLenh` giữ nguyên danh tính khi đầu vào không đổi. */
function useBocLenh<T extends Record<string, unknown>>(
  hanhDong: T,
  gui: (name: string, args: Record<string, unknown>) => void,
  layPhu: () => Record<string, unknown> | null,
): T {
  return useMemo(() => bocLenh(hanhDong, gui, layPhu), [hanhDong, gui, layPhu]);
}

/** Cộng dồn sổ ghi theo từng loại - không kiểm băm, chỉ đếm. */
function demSo(ledger: readonly LedgerEntry[]) {
  let taskXp = 0, sessionMinutes = 0, taskCount = 0, sessionCount = 0;
  for (const e of ledger) {
    if (e.kind === 'task') { taskXp += e.value; taskCount++; }
    else { sessionMinutes += e.value; sessionCount++; }
  }
  return { taskXp, sessionMinutes, taskCount, sessionCount, n: ledger.length };
}

/**
 * Nhích tổng đã xác thực theo phần sổ ghi vừa đổi ở máy.
 *
 * Đang đăng nhập thì tu vi lấy từ con số server gửi (`verified`), không từ sổ
 * ở máy. Không nhích theo thì lúc mất mạng tick xong việc mà tu vi, linh thạch
 * đứng im - trông như app hỏng. Đây chỉ là dự đoán: lần đồng bộ sau con số
 * thật của server ghi đè lên.
 */
function vaVerified(truoc: AppData, sau: AppData): AppData {
  const v = truoc.verified;
  if (!v || sau.ledger === truoc.ledger || sau.verified !== v) return sau;
  const a = demSo(truoc.ledger);
  const b = demSo(sau.ledger);
  const nhich = (x: number, d: number) => Math.max(0, x + d);
  return {
    ...sau,
    verified: {
      taskXp: nhich(v.taskXp, b.taskXp - a.taskXp),
      sessionMinutes: nhich(v.sessionMinutes, b.sessionMinutes - a.sessionMinutes),
      taskCount: nhich(v.taskCount, b.taskCount - a.taskCount),
      sessionCount: nhich(v.sessionCount, b.sessionCount - a.sessionCount),
      verified: nhich(v.verified, b.n - a.n),
    },
  };
}

/** Mấy loại khoảnh khắc mà lớp phủ biết vẽ - thứ gì khác từ server thì bỏ qua. */
const KIEU_AN_MUNG = new Set<Celebration['kind']>([
  'tier-up', 'realm-up', 'ascension', 'awaken', 'summon', 'tribulation-failed', 'perfect-day', 'achievement',
]);

/**
 * Lệnh có kết quả ngẫu nhiên mà server kèm câu báo. Đang có trọng tài thì câu
 * báo lấy từ server - câu tự tung ở máy có thể nói ngược với kết quả thật.
 */
const BAO_TU_SERVER = new Set(['refinePill']);

/**
 * Gom các lần ghi xuống đĩa. Mỗi lần ghi là `JSON.stringify` cả hồ sơ, mà hồ
 * sơ lớn lên theo năm tháng; gõ đạo hiệu thôi cũng thành mỗi phím một lần ghi.
 * Trong test thì ghi ngay, vì test đọc localStorage liền sau thao tác.
 */
const TRE_LUU_MAC_DINH = import.meta.env.MODE === 'test' ? 0 : 300;

/**
 * Deadline mới cho lần lặp kế tiếp.
 *
 * Deadline kiểu cũ là giờ địa phương không kèm múi (`2026-09-30T17:00:00`),
 * ghép ngày mới với phần giờ là đúng. Deadline mới lưu dạng UTC có `Z`, mà
 * phần giờ UTC có khi nằm ở ngày khác ngày địa phương - ghép kiểu cũ là lệch
 * một ngày. Với dạng ấy thì dời đúng số ngày giữa hai lần lặp.
 */
function deadlineKeTiep(deadline: string, tuNgay: string, sangNgay: string): string {
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(deadline)) return `${sangNgay}T${deadline.slice(11)}`;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return `${sangNgay}T${deadline.slice(11)}`;
  const cach = Math.round((parseKey(sangNgay).getTime() - parseKey(tuNgay).getTime()) / 86_400_000);
  d.setDate(d.getDate() + cach);
  return d.toISOString();
}

/**
 * Thời gian còn bấm được "Hoàn tác" sau khi xoá một việc.
 *
 * Lệnh xoá chỉ gửi lên server khi hết quãng này (hoặc khi trang sắp đóng):
 * server không có lệnh "khôi phục", mà dựng lại bằng thêm-rồi-tick thì việc đã
 * xong mang ngày hoàn thành mới và mất phút bế quan đã gắn. Hoãn gửi thì hoàn
 * tác chỉ là trả lại bản cũ ở máy - server chưa từng biết có vụ xoá.
 */
const HOAN_TAC_XOA_MS = 6000;

export function AppProvider({ children, treLuuMs = TRE_LUU_MAC_DINH }: { children: ReactNode; treLuuMs?: number }) {
  /**
   * Dựng trạng thái khởi động một lần.
   *
   * Phải gộp chung với việc chụp `lastVisitAt`: `lastSeenAt` bị ghi đè bằng giờ
   * hiện tại ngay tại đây, nên sau đó không còn cách nào biết lần trước người
   * dùng mở app lúc nào - mà đó chính là thứ để dựng bản tóm tắt "trong lúc bạn
   * vắng mặt".
   */
  const [boot] = useState(() => {
    const loaded = loadData();
    // Empty is a valid personal profile. Sample data is an explicit Settings action.
    const base = loaded;
    // Chưa có sổ ghi (bản cũ hoặc dữ liệu mẫu) thì coi trạng thái hiện tại là
    // mốc đáng tin và ký lại từ đó.
    const ledger = base.ledger.length === 0 ? rebuildLedger(base) : base.ledger;
    return {
      // Đang đăng nhập thì gắn lại tổng đã xác thực lần trước của đúng tài
      // khoản ấy - thiếu nó là mở lại trang lúc mất mạng thấy tu vi về 0.
      data: khoiPhucVerified({ ...base, ledger, lastSeenAt: new Date().toISOString() }),
      lastVisitAt: loaded.lastSeenAt,
    };
  });
  const [data, setData] = useState<AppData>(boot.data);
  /*
   * Bản đang giữ, đọc được từ ngoài nhịp vẽ lại.
   *
   * Mọi hành động đọc hồ sơ qua đây thay vì đóng gói `data` của lần vẽ trước:
   * nhờ vậy danh tính của chúng không đổi theo từng thay đổi, và component nào
   * chỉ cần hành động (`useAppActions`) thì không phải vẽ lại mỗi lần tick.
   * Cập nhật ngay sau khi vẽ xong, trước mọi sự kiện kế tiếp.
   */
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  /** Kỳ ngộ đang mở, đọc được từ hành động mà không làm hành động đổi danh tính */
  const encounterRef = useRef<Encounter | null>(null);
  useLayoutEffect(() => {
    encounterRef.current = encounter;
  }, [encounter]);
  /** Chặn giải cùng một kỳ ngộ hai lần (nhấn nhanh hai nút) */
  const resolvedRef = useRef<string | null>(null);
  const [encounterResult, setEncounterResult] = useState<Outcome | null>(null);

  const [storageError, setStorageError] = useState<string | null>(storageLoadError);
  const retrySave = useCallback(() => setStorageError(saveData(dataRef.current)), []);

  /*
   * Ghi xuống đĩa theo lượt gom.
   *
   * Thay đổi đầu tiên hẹn một lần ghi sau `treLuuMs`; mọi thay đổi trong lúc
   * chờ đi chung lần ấy. Trang sắp đóng (`pagehide`, chuyển tab, tắt app) thì
   * ghi ngay phần đang chờ - trình duyệt không đợi hẹn giờ trước khi giết tab.
   */
  const luuRef = useRef<{ hen?: number; cho: AppData | null }>({ cho: null });
  /** Bản vừa nạp từ tab khác: đã nằm sẵn trên đĩa, đừng ghi ngược lại */
  const boQuaLuu = useRef<AppData | null>(null);
  /** Tài khoản đang giữ hồ sơ - để lưu tổng đã xác thực kèm đúng chủ */
  const chuRef = useRef<ServerSync['chu']>(null);
  const luuNgay = useCallback(() => {
    const l = luuRef.current;
    if (l.hen !== undefined) window.clearTimeout(l.hen);
    l.hen = undefined;
    const d = l.cho;
    if (!d) return;
    l.cho = null;
    setStorageError(saveData(d));
    if (chuRef.current && d.verified) luuVerified(chuRef.current.id, d.verified);
  }, []);
  useEffect(() => {
    if (data === boQuaLuu.current) return;
    luuRef.current.cho = data;
    if (treLuuMs <= 0) luuNgay();
    else if (luuRef.current.hen === undefined) luuRef.current.hen = window.setTimeout(luuNgay, treLuuMs);
  }, [data, luuNgay, treLuuMs]);
  useEffect(() => {
    const khiAn = () => { if (document.visibilityState === 'hidden') luuNgay(); };
    window.addEventListener('pagehide', luuNgay);
    window.addEventListener('beforeunload', luuNgay);
    document.addEventListener('visibilitychange', khiAn);
    return () => {
      window.removeEventListener('pagehide', luuNgay);
      window.removeEventListener('beforeunload', luuNgay);
      document.removeEventListener('visibilitychange', khiAn);
      luuNgay();
    };
  }, [luuNgay]);

  /*
   * Nối với server trọng tài.
   *
   * `apDung` nhận trạng thái server trả về và thay thẳng bản ở máy. Đây là chỗ
   * "server phán quyết" thành hiện thực: bản tính ở máy chỉ sống tới lúc server
   * trả lời, sau đó con số của server là con số đúng.
   */
  /*
   * Bản đang giữ, đọc được từ ngoài nhịp vẽ lại.
   *
   * Đồng bộ cần nó để đối chiếu khi server báo "không có gì đổi". Phải là ref
   * chứ không phải `data` truyền thẳng: `taiLai` chạy trong một callback được
   * ghi nhớ, đọc `data` ở đó là đọc bản của lần dựng hình đã cũ.
   */


  /*
   * Hiệu ứng ăn mừng, dựng từ lời server.
   *
   * Máy và server tung xúc xắc riêng, nên với lệnh có kết quả NGẪU NHIÊN hai
   * bên bất đồng chừng một nửa số lần. Trạng thái tự chữa được - bản vá của
   * server ghi đè lên bản dự đoán - nhưng hiệu ứng thì không: nó đã bung ra
   * rồi. Kết quả là màn hình reo "độ kiếp thành công" xong số liệu lại báo
   * thất bại.
   *
   * Mốc tu vi (lên tầng, lên cảnh giới, huy hiệu) cũng vậy: đang đăng nhập thì
   * tu vi là con số của server, máy tự so trước/sau sẽ không thấy gì nhích.
   *
   * Nên khi có server thì máy KHÔNG tự bung nữa: server gửi kèm danh sách
   * khoảnh khắc (`celebrations`) sau mỗi lệnh, và chỉ danh sách ấy được vẽ.
   * Server tính từ trạng thái thật nên con số trong đó cũng là con số thật -
   * không phải đọc lại một bản `dataRef` có khi đã cũ.
   */
  const nhanAnMung = useCallback((danhSach: unknown[]) => {
    const hop = danhSach.filter(
      (c): c is Celebration =>
        !!c && typeof c === 'object' && KIEU_AN_MUNG.has((c as { kind?: Celebration['kind'] }).kind as Celebration['kind']),
    );
    if (hop.length) setQueue((q) => [...q, ...hop]);
  }, []);

  const nhanKetQua = useCallback((ten: string, ketQua: unknown, traLoi: CommandReply) => {
    // Kết quả kỳ ngộ do server bốc: hiện đúng kết quả ấy trong hộp thoại.
    if (ten === 'resolveEncounter') {
      const o = (ketQua as { outcome?: Outcome } | null)?.outcome;
      if (!o || typeof o !== 'object' || typeof o.msg !== 'string' || typeof o.kind !== 'string') return;
      // Hộp thoại đã đóng (hoặc lệnh nằm chờ lúc mất mạng rồi mới gửi được)
      // thì báo bằng một dòng thông báo, kẻo kết quả rơi vào hư không.
      if (encounterRef.current) setEncounterResult(o);
      else if (o.tone === 'bad') toast.warning(o.msg);
      else toast.success(o.msg);
      return;
    }
    if (BAO_TU_SERVER.has(ten) && traLoi.note) {
      if (traLoi.tone === 'warn') toast.warning(traLoi.note);
      else toast.success(traLoi.note);
    }
  }, []);

  const sync = useServerSync(
    useCallback((doi: (truoc: AppData) => AppData) => setData((truoc) => doi(truoc)), []),
    useCallback((message: string, tone?: 'ok' | 'warn') => {
      if (tone === 'warn') toast.warning(message);
      else toast.success(message);
    }, []),
    useCallback(() => dataRef.current, []),
    nhanKetQua,
    nhanAnMung,
  );

  /*
   * Server có đang làm trọng tài không, đọc được ngoài nhịp vẽ lại.
   *
   * `attemptTribulation` là một callback được ghi nhớ; đọc thẳng `sync` trong
   * đó là đọc bản của lần dựng hình đã cũ, mà thêm `sync` vào deps thì callback
   * mới lại mỗi lần trạng thái đồng bộ nhúc nhích.
   */
  const syncRef = useRef(sync.laTrongTai);
  /** Cả lớp đồng bộ, cho những chỗ cần gửi lệnh ngoài bảng `LENH` */
  const dongBoRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync.laTrongTai;
    dongBoRef.current = sync;
    chuRef.current = sync.chu;
  }, [sync]);

  /*
   * Tab khác vừa ghi hồ sơ.
   *
   * Chạy một mình thì nạp lại bản ấy - không thì hai tab ghi đè lên nhau, tab
   * nào ghi sau thắng và công của tab kia mất trắng. Đang đăng nhập thì server
   * mới là bản chuẩn: chỉ hỏi server có gì mới, không tin bản của tab kia.
   */
  useEffect(() => {
    const nghe = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      if (dongBoRef.current.chu) { void dongBoRef.current.kiemTraMoi(); return; }
      // Tab này còn thay đổi chưa ghi thì lần ghi sắp tới của nó sẽ thắng.
      if (luuRef.current.hen !== undefined) return;
      // Bản trên đĩa đang hỏng từ lúc mở trang thì để người dùng tự xử.
      if (storageLoadError()) return;
      const next = loadData();
      if (storageLoadError()) { clearStorageLoadError(); return; }
      boQuaLuu.current = next;
      setData(next);
    };
    window.addEventListener('storage', nghe);
    return () => window.removeEventListener('storage', nghe);
  }, []);

  /** Phần phụ lệnh vừa sinh ra (id của lần lặp kế tiếp) - `bocLenh` đọc rồi xoá */
  const phuRef = useRef<Record<string, unknown> | null>(null);
  const layPhu = useCallback(() => {
    const p = phuRef.current;
    phuRef.current = null;
    return p;
  }, []);
  /** Bản hành động đã bọc lệnh, để gọi từ những chỗ nằm ngoài nhịp vẽ (toast) */
  const hanhDongRef = useRef<Ctx | null>(null);

  useEffect(() => {
    // Tailwind bật chế độ tối qua class `dark` trên thẻ <html>.
    document.documentElement.classList.toggle('dark', data.settings.theme === 'dark');
    document.documentElement.style.colorScheme = data.settings.theme;
  }, [data.settings.theme]);

  useEffect(() => setSoundEnabled(data.settings.soundEnabled), [data.settings.soundEnabled]);

  const notify = useCallback((message: string, tone: 'ok' | 'warn' = 'ok') => {
    if (tone === 'warn') toast.warning(message);
    else toast.success(message);
  }, []);

  const patch = useCallback((fn: (d: AppData) => AppData) => setData((prev) => vaVerified(prev, fn(prev))), []);

  /** Đang có trọng tài thì hành động chỉ-ở-máy phải từ chối, kẻo máy và server lệch nhau âm thầm. */
  const chanKhiCoServer = useCallback((viec: string) => {
    if (!dongBoRef.current.chu) return false;
    toast.warning(`Đang đăng nhập: máy chủ giữ hồ sơ nên không ${viec} ở máy được. Đăng xuất trước nếu muốn làm việc này.`);
    return true;
  }, []);

  /**
   * So sánh trạng thái trước/sau khi tick xong một nhiệm vụ để tìm mốc đáng
   * ăn mừng. Lên cấp được ưu tiên cao nhất, rồi huy hiệu mới, rồi ngày trọn vẹn.
   */
  const detectMilestones = useCallback((before: AppData, after: AppData, dayKey: string) => {
    const found: Celebration[] = [];

    const cBefore = cultivationOf(effectiveXp(before));
    const xpAfter = effectiveXp(after);
    const cAfter = cultivationOf(xpAfter);

    if (cAfter.ascended && !cBefore.ascended) {
      found.push({ kind: 'ascension', xp: xpAfter });
    } else if (cAfter.realmIndex > cBefore.realmIndex) {
      found.push({
        kind: 'realm-up',
        realm: cAfter.realm.name,
        note: cAfter.realm.note,
        realmIndex: cAfter.realmIndex,
        xp: xpAfter,
      });
    } else if (cAfter.tier > cBefore.tier) {
      found.push({ kind: 'tier-up', label: realmLabel(cAfter), realmIndex: cAfter.realmIndex, xp: xpAfter });
    }

    const had = unlockedIds(before);
    for (const id of unlockedIds(after)) {
      if (had.has(id)) continue;
      const meta = ACHIEVEMENTS.find((a) => a.id === id);
      if (meta) found.push({ kind: 'achievement', id, title: meta.title, description: meta.description });
    }

    if (!isPerfectDay(before.tasks, dayKey) && isPerfectDay(after.tasks, dayKey)) {
      found.push({ kind: 'perfect-day', count: after.tasks.filter((t) => t.date === dayKey).length });
    }

    if (found.length) setQueue((q) => [...q, ...found]);
  }, []);

  const addTask = useCallback<Ctx['addTask']>(
    (input) => {
      const task: Task = gioiHanNhiemVu({
        id: uid(),
        title: input.title.trim(),
        note: input.note ?? '',
        date: input.date ?? todayKey(),
        startTime: input.startTime,
        deadline: input.deadline,
        priority: input.priority ?? 'medium',
        status: input.status ?? 'todo',
        tags: input.tags ?? [],
        goalId: input.goalId,
        estimateMin: clampEstimate(input.estimateMin ?? 30),
        focusMin: 0,
        subtasks: input.subtasks ?? [],
        recurrence: input.recurrence ?? 'none',
        createdAt: new Date().toISOString(),
      });
      patch((d) => ({ ...d, tasks: [...d.tasks, task] }));
      return task;
    },
    [patch],
  );

  /*
   * Việc đã xong là một bản ghi về điều đã làm: ngày và mức ưu tiên của nó bị
   * khoá lại ở lúc hoàn thành.
   *
   *  - Ngày: dời năm việc đã xong sang hôm nay từng mở được hòm "xong năm việc"
   *    mỗi ngày mà không làm thêm gì.
   *  - Mức ưu tiên: tick một việc "thấp" rồi nâng lên "khẩn" từng ký lại sổ với
   *    giá trị mới - 10 tu vi thành 40.
   *
   * Muốn sửa thật thì bỏ tick trước: việc quay về "chưa xong", sửa gì cũng
   * được, tick lại thì tính theo giá trị lúc tick lại. Server chặn y hệt.
   */
  const khoaViecXong = useCallback((t: Task | undefined, p: Partial<Task>): string | null => {
    if (!t || t.status !== 'done') return null;
    if (p.date !== undefined && p.date !== t.date) return 'Việc đã xong thì không dời ngày được. Bỏ đánh dấu hoàn thành trước nếu muốn dời.';
    if (p.priority !== undefined && p.priority !== t.priority) return 'Việc đã xong thì mức ưu tiên được khoá theo lúc hoàn thành. Bỏ đánh dấu trước nếu muốn đổi.';
    return null;
  }, []);

  const updateTask = useCallback<Ctx['updateTask']>(
    (id, p) => {
      const chan = khoaViecXong(dataRef.current.tasks.find((t) => t.id === id), p);
      if (chan) {
        toast.warning(chan);
        return false;
      }
      // Hai trường này không bao giờ sửa qua đường này: mốc xong lần đầu là
      // bất biến, còn ngày neo thì đi theo ngày của việc.
      const { firstDoneAt: _bo, recurDay: _bo2, ...con } = p;
      patch((d) => {
        const vua = gioiHanNhiemVu(con);
        const tasks = d.tasks.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...vua };
          // Đổi ngày tức là người dùng tự đặt lại lịch: ngày neo hằng tháng đi theo ngày mới.
          if (vua.date !== undefined && vua.date !== t.date) delete next.recurDay;
          return next;
        });
        return { ...d, tasks };
      });
      return true;
    },
    [patch, khoaViecXong],
  );

  /*
   * Xoá có hoàn tác.
   *
   * Xoá ở máy ngay (thẻ biến mất liền), nhưng lệnh gửi server thì hoãn tới khi
   * hết giờ hoàn tác - xem `HOAN_TAC_XOA_MS`. Bấm "Hoàn tác" thì trả nhiệm vụ
   * cùng bản ghi sổ của nó về chỗ cũ và huỷ lệnh chưa gửi.
   *
   * Trang sắp đóng mà còn lệnh xoá đang hoãn thì gửi luôn (xếp vào hàng đợi
   * trên đĩa), kẻo mở lại thấy việc vừa xoá sống dậy.
   */
  const xoaChoRef = useRef(new Map<string, number>());
  const guiXoa = useCallback((id: string) => {
    const hen = xoaChoRef.current.get(id);
    if (hen === undefined) return;
    window.clearTimeout(hen);
    xoaChoRef.current.delete(id);
    dongBoRef.current.gui('removeTask', { id });
    // Trong lúc chờ, bản của server (vẫn còn việc này) có thể đã áp lên màn
    // hình. Xoá lại ở máy cho khớp với lệnh vừa gửi.
    setData((d) =>
      d.tasks.some((t) => t.id === id)
        ? vaVerified(d, { ...d, tasks: d.tasks.filter((t) => t.id !== id), ledger: dropEntries(d.ledger, 'task', id) })
        : d,
    );
  }, []);
  useEffect(() => {
    const cho = xoaChoRef.current;
    const guiHet = () => { for (const id of [...cho.keys()]) guiXoa(id); };
    window.addEventListener('pagehide', guiHet);
    return () => {
      window.removeEventListener('pagehide', guiHet);
      guiHet();
    };
  }, [guiXoa]);

  const removeTask = useCallback<Ctx['removeTask']>(
    (id) => {
      const d0 = dataRef.current;
      const task = d0.tasks.find((t) => t.id === id);
      if (!task) return;
      const ghi = d0.ledger.filter((e) => e.kind === 'task' && e.ref === id);
      patch((d) => ({
        ...d,
        tasks: d.tasks.filter((t) => t.id !== id),
        ledger: dropEntries(d.ledger, 'task', id),
      }));
      // Chỉ hoãn khi có server để gửi; chạy một mình thì chẳng có gì để hoãn.
      if (dongBoRef.current.chu) {
        const cu = xoaChoRef.current.get(id);
        if (cu !== undefined) window.clearTimeout(cu);
        xoaChoRef.current.set(id, window.setTimeout(() => guiXoa(id), HOAN_TAC_XOA_MS));
      }
      const hoanTac = () => {
        const hen = xoaChoRef.current.get(id);
        if (hen !== undefined) {
          window.clearTimeout(hen);
          xoaChoRef.current.delete(id);
        } else if (dongBoRef.current.chu) {
          // Lệnh xoá đã đi rồi (hết giờ, hoặc trang vừa ẩn) - không hoàn tác được nữa.
          toast.warning('Đã quá giờ hoàn tác: lệnh xoá đã gửi lên máy chủ.');
          return;
        }
        patch((d) => {
          if (d.tasks.some((t) => t.id === id)) return d;
          // Trả bản ghi sổ về với đúng giá trị và mốc cũ, nối vào cuối chuỗi.
          let ledger = d.ledger;
          for (const e of ghi) ledger = appendEntry(ledger, 'task', id, e.value, e.at);
          return { ...d, tasks: [...d.tasks, task], ledger };
        });
      };
      toast.info(`Đã xoá: ${task.title}`, {
        duration: HOAN_TAC_XOA_MS,
        action: { label: 'Hoàn tác', onClick: hoanTac },
      });
    },
    [patch, guiXoa],
  );

  const setStatus = useCallback<Ctx['setStatus']>(
    (id, status) => {
      const data = dataRef.current;
      const existing = data.tasks.find(t => t.id === id);
      if (!existing || existing.status === status) return false;
      // Hoàn thành thì phải hợp lý: không thể xong việc của ngày mai hôm nay.
      if (status === 'done') {
        const target = data.tasks.find((t) => t.id === id);
        if (target) {
          const violation = checkComplete(target);   // ở web, ngày của máy chính là ngày của người dùng
          if (violation?.level === 'block') {
            if (violation.fix === 'move-to-today') {
              toast.warning(violation.message, {
                action: {
                  label: 'Dời về hôm nay',
                  // Đi qua bản đã bọc lệnh: dời ở máy mà không gửi `moveTask`
                  // thì lần đồng bộ sau server kéo việc về lại ngày cũ.
                  onClick: () => hanhDongRef.current?.moveTask(id, todayKey()),
                },
                duration: 7000,
              });
            } else {
              toast.warning(violation.message);
            }
            return false;
          }
          if (violation?.level === 'warn') toast.info(violation.message);
        }
      }

      /*
       * Id cho lần lặp kế tiếp sinh NGOÀI hàm vá: React có thể chạy hàm vá hai
       * lần (StrictMode), sinh bên trong là mỗi lần một id. Và id này phải gửi
       * lên cùng lệnh (`nextId`), để server tạo đúng việc ấy chứ không tạo một
       * việc khác id - thẻ trên màn hình mới không bị thay dưới tay người dùng.
       */
      const nextId = existing.recurrence !== 'none' && status === 'done' ? uid() : undefined;
      const nextSubtaskIds = nextId ? existing.subtasks.map(() => uid()) : [];
      if (nextId) phuRef.current = { nextId, nextSubtaskIds };

      patch((d) => {
        const target = d.tasks.find((t) => t.id === id);
        if (!target || target.status === status) return d;
        const before = d;
        const luc = new Date().toISOString();
        const homNay = todayKey();
        const updated: Task = {
          ...target,
          status,
          completedAt: status === 'done' ? luc : undefined,
          completedOn: status === 'done' ? homNay : undefined,
          // Đặt đúng một lần, bỏ tick không gỡ - xem `Task.firstDoneAt`. Việc
          // từ hồ sơ cũ chưa có trường này thì lấy mốc xong đang giữ trước khi
          // bỏ tick xoá mất nó, kẻo bỏ tick rồi tick lại thành "việc mới".
          firstDoneAt: target.firstDoneAt ?? target.completedAt ?? (status === 'done' ? luc : undefined),
        };
        if (updated.firstDoneAt === undefined) delete updated.firstDoneAt;
        let tasks = d.tasks.map((t) => (t.id === id ? updated : t));

        // Nhiệm vụ lặp lại: hoàn thành xong thì tự sinh lần kế tiếp - lần CHƯA
        // tới, không phải lần ngay sau ngày cũ (xem `nextOccurrence`).
        if (status === 'done' && target.recurrence !== 'none') {
          const neo = target.recurrence === 'monthly' ? monthlyAnchor(target) : undefined;
          const next = nextOccurrence(target.date, target.recurrence, homNay, neo);
          const exists = next && d.tasks.some((t) => t.date === next && t.title === target.title && t.recurrence === target.recurrence);
          if (next && !exists) {
            tasks = [
              ...tasks,
              {
                ...target,
                id: nextId ?? uid(),
                date: next,
                status: 'todo',
                completedAt: undefined,
                completedOn: undefined,
                firstDoneAt: undefined,
                recurDay: neo,
                focusMin: 0,
                deadline: target.deadline ? deadlineKeTiep(target.deadline, target.date, next) : undefined,
                subtasks: target.subtasks.map((s, i) => ({ ...s, id: nextSubtaskIds[i] ?? uid(), done: false })),
                createdAt: new Date().toISOString(),
              },
            ];
          }
        }
        // Mọi thay đổi nguồn tu vi đều phải đi qua sổ ghi.
        const ledger =
          status === 'done'
            ? appendEntry(d.ledger, 'task', target.id, taskValue(target))
            : dropEntries(d.ledger, 'task', target.id);

        const next = { ...d, tasks, ledger };
        // Có trọng tài thì mốc ăn mừng do server gửi về - xem `nhanAnMung`.
        if (status === 'done' && !syncRef.current) detectMilestones(before, next, target.date);
        return next;
      });
      return true;
    },
    [patch, detectMilestones],
  );

  const toggleDone = useCallback<Ctx['toggleDone']>(
    (id) => {
      const data = dataRef.current;
      const t = data.tasks.find((x) => x.id === id);
      if (!t) return false;
      const applied = setStatus(id, t.status === 'done' ? 'todo' : 'done');
      // Chỉ chúc mừng khi thật sự đã đổi trạng thái, không chúc mừng lúc bị chặn.
      if (applied && t.status !== 'done') {
        notify(`Hoàn thành: ${t.title} · +${taskValue(t)} tu vi`);
      }
      return applied;
    },
    [setStatus, notify],
  );

  const moveTask = useCallback<Ctx['moveTask']>((id, date) => updateTask(id, { date }), [updateTask]);

  const duplicateTask = useCallback<Ctx['duplicateTask']>(
    (id) => {
      const data = dataRef.current;
      const t = data.tasks.find(x => x.id === id);
      if (!t) return null;
      const copy: Task = { ...t, id: uid(), title: `${t.title} (bản sao)`,
        status: 'todo', completedAt: undefined, completedOn: undefined, firstDoneAt: undefined, focusMin: 0,
        subtasks: t.subtasks.map(s => ({ ...s, id: uid(), done: false })),
        createdAt: new Date().toISOString() };
      patch(d => ({ ...d, tasks: [...d.tasks, copy] }));
      return copy;
    }, [patch],
  );

  const toggleSubtask = useCallback<Ctx['toggleSubtask']>(
    (taskId, subId) =>
      patch((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }
            : t,
        ),
      })),
    [patch],
  );

  const pushOverdueToToday = useCallback<Ctx['pushOverdueToToday']>(() => {
    const data = dataRef.current;
    const today = todayKey();
    const moved = data.tasks.filter((t) => t.status !== 'done' && t.date < today);
    if (moved.length) {
      patch((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.status !== 'done' && t.date < today
            ? // Việc hằng tháng giữ ngày neo cũ, như server: dời việc 31/01 sang
              // hôm nay không biến nó thành việc "mùng 5 hằng tháng".
              { ...t, date: today, ...(t.recurrence === 'monthly' ? { recurDay: monthlyAnchor(t) } : {}) }
            : t,
        ),
      }));
      notify(`Đã dời ${moved.length} nhiệm vụ quá hạn sang hôm nay`, 'warn');
    }
    return moved.length;
  }, [patch, notify]);

  const clearDone = useCallback<Ctx['clearDone']>(
    (before) => {
      const data = dataRef.current;
      const cutoff = before ?? todayKey();
      const victims = data.tasks.filter((t) => t.status === 'done' && t.date < cutoff);
      if (victims.length) {
        patch((d) => {
          const tasks = d.tasks.filter((t) => !(t.status === 'done' && t.date < cutoff));
          return { ...d, tasks, ledger: rebuildLedger({ tasks, sessions: d.sessions }) };
        });
        notify(`Đã dọn ${victims.length} nhiệm vụ đã xong`);
      }
      return victims.length;
    },
    [patch, notify],
  );

  const addGoal = useCallback<Ctx['addGoal']>(
    (input) => {
      const goal: Goal = gioiHanMucTieu({
        id: uid(),
        title: input.title.trim(),
        description: input.description ?? '',
        color: input.color ?? GOAL_COLORS[0],
        targetDate: input.targetDate,
        archived: false,
        createdAt: new Date().toISOString(),
      });
      patch((d) => ({ ...d, goals: [...d.goals, goal] }));
      return goal;
    },
    [patch],
  );

  const updateGoal = useCallback<Ctx['updateGoal']>(
    (id, p) => patch((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...gioiHanMucTieu(p) } : g)) })),
    [patch],
  );

  const removeGoal = useCallback<Ctx['removeGoal']>(
    (id) =>
      patch((d) => ({
        ...d,
        goals: d.goals.filter((g) => g.id !== id),
        tasks: d.tasks.map((t) => (t.goalId === id ? { ...t, goalId: undefined } : t)),
      })),
    [patch],
  );

  const logSession = useCallback<Ctx['logSession']>(
    (minutes, taskId) => {
      const bad = checkSession(minutes);
      if (bad) {
        notify(bad.message, 'warn');
        return null;
      }
      /*
       * Phiên được ghi lúc nó KẾT THÚC, nên lúc bắt đầu là "bây giờ trừ đi số
       * phút". Trước đây ghi `startedAt = bây giờ`, tức là mọi phiên đều bắt
       * đầu ở tương lai so với lúc xong - bộ kiểm toàn vẹn thấy phiên "dài hơn
       * thời gian đã trôi qua" và hiện chip "Sổ lệch" suốt hai chục phút sau
       * mỗi phiên. Server đã sửa y như vậy từ trước.
       */
      const endedAt = new Date();
      const session: FocusSession = {
        id: uid(),
        taskId,
        minutes,
        date: todayKey(),
        startedAt: new Date(endedAt.getTime() - minutes * 60_000).toISOString(),
      };
      patch((d) => ({
        ...d,
        sessions: [...d.sessions, session],
        tasks: taskId ? d.tasks.map((t) => (t.id === taskId ? { ...t, focusMin: t.focusMin + minutes } : t)) : d.tasks,
        ledger: appendEntry(d.ledger, 'session', session.id, minutes, endedAt.toISOString()),
      }));
      // Nói rõ luật phiên ngắn ngay lúc nó áp vào, kẻo người dùng tưởng mất đá.
      notify(
        rewardsSession(minutes)
          ? `Đã ghi nhận ${minutes} phút tập trung`
          : `Đã ghi nhận ${minutes} phút tập trung. Phiên dưới ${MIN_REWARD_SESSION_MIN} phút không có linh thạch phiên và không gặp kỳ ngộ.`,
      );
      /*
       * Xuất định là lúc dễ gặp biến cố nhất - đúng mô-típ tu tiên.
       *
       * Có server làm trọng tài thì KHÔNG bốc ở máy: server bốc lúc ghi phiên
       * rồi cất vào `pendingEncounter`, hộp thoại mở theo trường ấy. Bốc ở máy
       * thì phần thưởng chỉ sống tới lần đồng bộ sau - bản của server không hề
       * có nó. Phiên quá ngắn thì không gieo kỳ ngộ, ở cả hai phía.
       */
      if (!syncRef.current && rewardsSession(minutes) && Math.random() < ENCOUNTER_CHANCE) {
        setEncounterResult(null);
        setEncounter(pickEncounter());
      }
      return session;
    },
    [patch, notify],
  );

  /*
   * Kỳ ngộ do server bốc: mở hộp thoại khi hồ sơ mang một kỳ ngộ MỚI (khác
   * phiên với cái đã mở). Đóng hộp thoại mà chưa chọn thì kỳ ngộ vẫn nằm trên
   * server, mở lại trang là thấy lại - không mất, cũng không bốc lại được.
   */
  const choKyNgo = data.pendingEncounter;
  const [daMoKyNgo, setDaMoKyNgo] = useState<string | null>(null);
  // Chỉnh state ngay trong lúc vẽ (không qua effect) - React vẽ lại ngay, khỏi
  // một nhịp hộp thoại chậm chân.
  if (choKyNgo && sync.laTrongTai && daMoKyNgo !== choKyNgo.sessionId) {
    setDaMoKyNgo(choKyNgo.sessionId);
    const e = encounterById(choKyNgo.id);
    if (e) {
      setEncounterResult(null);
      setEncounter(e);
    }
  }

  /** Chọn một hướng xử lý kỳ ngộ, bốc kết quả rồi áp dụng ngay. */
  const resolveEncounter = useCallback<Ctx['resolveEncounter']>(
    (optionIndex) => {
      const encounter = encounterRef.current;
      if (!encounter || resolvedRef.current === encounter.id) return null;
      const option = encounter.options[optionIndex];
      if (!option) return null;

      /*
       * Có trọng tài: gửi lựa chọn lên, server bốc và cộng thưởng. Kết quả về
       * qua `nhanKetQua` → `encounterResult`. Gỡ kỳ ngộ khỏi bản ở máy luôn để
       * lần vá sau khỏi mở lại chính nó.
       */
      if (syncRef.current) {
        const cho = dataRef.current.pendingEncounter;
        if (!cho || cho.id !== encounter.id) return null;
        resolvedRef.current = encounter.id;
        dongBoRef.current.gui('resolveEncounter', { choice: optionIndex });
        patch((d) => {
          if (!d.pendingEncounter) return d;
          const { pendingEncounter: _bo, ...con } = d;
          return con;
        });
        return 'cho';
      }

      resolvedRef.current = encounter.id;
      const outcome = rollOutcome(option);
      patch((d) => applyEncounterOutcome(d, outcome));
      setEncounterResult(outcome);
      return outcome;
    },
    [patch],
  );

  const dismissEncounter = useCallback(() => {
    resolvedRef.current = null;
    setEncounter(null);
    setEncounterResult(null);
  }, []);

  /** Khai quang linh căn - chỉ làm được một lần, sau đó phải dùng Tẩy Tuỷ Đan. */
  const awaken = useCallback<Ctx['awaken']>(() => {
    const root = rollRoot();
    patch((d) => (d.root ? d : { ...d, root }));
    if (!syncRef.current) setQueue((q) => [...q, { kind: 'awaken', root }]);
    return root;
  }, [patch]);

  const rerollRoot = useCallback<Ctx['rerollRoot']>(() => {
    const data = dataRef.current;
    if (stoneBalance(data) < REROLL_COST) {
      notify(`Không đủ linh thạch (cần ${REROLL_COST})`, 'warn');
      return null;
    }
    const root = rollRoot();
    patch((d) => ({ ...d, root, stonesSpent: d.stonesSpent + REROLL_COST }));
    if (!syncRef.current) setQueue((q) => [...q, { kind: 'awaken', root }]);
    return root;
  }, [patch, notify]);

  const summon = useCallback<Ctx['summon']>(() => {
    const data = dataRef.current;
    if (stoneBalance(data) < SUMMON_COST) {
      notify(`Không đủ linh thạch (cần ${SUMMON_COST})`, 'warn');
      return null;
    }
    const beast = summonBeast();
    const duplicate = data.beasts.some((b) => b.id === beast.id);
    patch((d) => ({
      ...d,
      stonesSpent: d.stonesSpent + SUMMON_COST,
      // Trùng thú thì hồn thú nhập vào con cũ thay vì nằm chết trong túi.
      beasts: duplicate
        ? d.beasts.map((b) => (b.id === beast.id ? { ...b, fed: b.fed + DUPLICATE_FEED } : b))
        : [...d.beasts, { id: beast.id, fed: 0, obtainedAt: new Date().toISOString() }],
      activeBeastId: d.activeBeastId ?? beast.id,
    }));
    if (!syncRef.current) setQueue((q) => [...q, { kind: 'summon', beastId: beast.id, duplicate }]);
    return beast;
  }, [patch, notify]);

  const feedBeast = useCallback<Ctx['feedBeast']>(
    (id) => {
      const data = dataRef.current;
      const owned = data.beasts.find((b) => b.id === id);
      if (!owned) return false;
      // Đã tối đa cấp thì không cho cho ăn nữa, kẻo tiêu linh thạch vô ích.
      if (beastLevel(owned.fed) >= MAX_BEAST_LEVEL) {
        notify('Linh thú đã đạt cấp tối đa', 'warn');
        return false;
      }
      if (stoneBalance(data) < FEED_COST) {
        notify(`Không đủ linh thạch (cần ${FEED_COST})`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + FEED_COST,
        beasts: d.beasts.map((b) => (b.id === id ? { ...b, fed: b.fed + FEED_GAIN } : b)),
      }));
      return true;
    },
    [patch, notify],
  );

  const setActiveBeast = useCallback<Ctx['setActiveBeast']>(
    (id) => patch((d) => ({ ...d, activeBeastId: id })),
    [patch],
  );

  const buyPill = useCallback<Ctx['buyPill']>(
    (grade, qty = 1) => {
      const data = dataRef.current;
      // Chợ chỉ bán những phẩm trong `MARKET_GRADES` - đúng như Đan Đường nói.
      // Phẩm cao hơn phải tự luyện; server chặn y hệt.
      if (!MARKET_GRADES.includes(grade)) {
        notify(`${PILLS[grade].name} không bán ngoài chợ, phải tự luyện`, 'warn');
        return false;
      }
      const cost = PILLS[grade].cost * qty;
      if (stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch (cần ${cost})`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + cost,
        pills: { ...d.pills, [grade]: d.pills[grade] + qty },
      }));
      notify(`Đã mua ${qty} viên ${PILLS[grade].name}`);
      return true;
    },
    [patch, notify],
  );

  // --------------------------------------------------------------- công pháp

  const pickTechnique = useCallback<Ctx['pickTechnique']>(
    (id) => {
      const data = dataRef.current;
      if (data.technique === id) return false;
      // Lần chọn đầu miễn phí. Không ai đáng bị phạt vì chưa biết mình hợp lối
      // nào; nhưng đổi tới đổi lui thì phải trả giá, kẻo công pháp thành cái
      // nút bật tắt theo tâm trạng chứ không còn là một cam kết.
      const cost = data.technique ? techniqueSwapCost(data.techniqueSwaps) : 0;
      if (cost > 0 && stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch để đổi công pháp (cần ${cost})`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        technique: id,
        techniqueSwaps: d.technique ? d.techniqueSwaps + 1 : d.techniqueSwaps,
        stonesSpent: d.stonesSpent + cost,
      }));
      notify(
        cost > 0
          ? `Đã chuyển sang ${TECHNIQUES[id].name} (-${cost} linh thạch)`
          : `Bắt đầu tu ${TECHNIQUES[id].name}`,
      );
      return true;
    },
    [patch, notify],
  );

  // --------------------------------------------------------------- linh điền

  const plantSeed = useCallback<Ctx['plantSeed']>(
    (slot, herb) => {
      const data = dataRef.current;
      if (slot < 0 || slot >= fieldSlots(data.caveLevel)) return false;
      if (data.field.some((pl) => pl.slot === slot)) {
        notify('Ô đất này đang có cây', 'warn');
        return false;
      }
      const cost = HERBS[herb].seedCost;
      if (stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch mua hạt (cần ${cost})`, 'warn');
        return false;
      }
      // Ghi lại mốc phút bế quan ngay lúc gieo - cây lớn tới đâu là lấy tổng
      // phút hiện tại trừ đi con số này, nên không có bộ đếm nào để chỉnh.
      const plantedAtFocus = verifiedFocusMinutes(data);
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + cost,
        field: [...d.field, { slot, herb, plantedAtFocus, plantedAt: new Date().toISOString() }],
      }));
      notify(
        `Đã gieo ${HERBS[herb].name}. Cần ${HERBS[herb].needFocus} phút bế quan nữa mới hái được.`,
      );
      return true;
    },
    [patch, notify],
  );

  const harvestPlot = useCallback<Ctx['harvestPlot']>(
    (slot) => {
      const data = dataRef.current;
      const plot = data.field.find((pl) => pl.slot === slot);
      if (!plot) return false;
      const state = plotState(plot, verifiedFocusMinutes(data));
      if (!state) {
        // Loại linh thảo không còn tồn tại - dọn ô đất đi, nếu không người
        // dùng kẹt vĩnh viễn với một ô không hái được mà cũng không gieo lại được.
        // Có trọng tài thì để server dọn (nó có đúng nhánh này): dọn ở máy mà
        // không báo lên là hai bên lệch nhau.
        if (syncRef.current) dongBoRef.current.gui('harvestPlot', { slot });
        else patch((d) => ({ ...d, field: d.field.filter((pl) => pl.slot !== slot) }));
        notify('Ô đất mang loại linh thảo không còn tồn tại, đã dọn đi', 'warn');
        return false;
      }
      if (!state.ready) {
        notify(`Còn ${state.remain} phút bế quan nữa cây mới chín`, 'warn');
        return false;
      }
      patch((d) => ({
        ...d,
        field: d.field.filter((pl) => pl.slot !== slot),
        herbs: { ...d.herbs, [plot.herb]: (d.herbs[plot.herb] ?? 0) + state.herb.yield },
      }));
      notify(`Hái được ${state.herb.yield} nhánh ${state.herb.name}`);
      return true;
    },
    [patch, notify],
  );

  // --------------------------------------------------------------- luyện đan

  const refinePill = useCallback<Ctx['refinePill']>(
    (grade) => {
      const data = dataRef.current;
      const recipe = RECIPES[grade];
      if (!hasHerbs(data.herbs, recipe.herbs)) {
        notify('Không đủ linh thảo cho đơn thuốc này', 'warn');
        return null;
      }
      if (stoneBalance(data) < recipe.stones) {
        notify(`Không đủ linh thạch mua củi lửa (cần ${recipe.stones})`, 'warn');
        return null;
      }

      const fireRoot = !!data.root?.elements.includes('hoa');
      const chance = refineChance(grade, caveRefineBonus(data.caveLevel), fireRoot);
      const success = Math.random() < chance;
      // Cháy lò vẫn còn vớt vát được phẩm thấp hơn một bậc - trồng cả chục
      // tiếng bế quan mà mất trắng cả mẻ thì cay quá.
      const salvage = success
        ? null
        : Math.random() < CONSOLATION_CHANCE
          ? consolationGrade(grade)
          : null;
      const got = success ? grade : salvage;

      patch((d) => {
        const herbs = { ...d.herbs };
        for (const id of HERB_ORDER) herbs[id] = Math.max(0, herbs[id] - (recipe.herbs[id] ?? 0));
        return {
          ...d,
          stonesSpent: d.stonesSpent + recipe.stones,
          herbs,
          pills: got ? { ...d.pills, [got]: d.pills[got] + 1 } : d.pills,
        };
      });

      // Có trọng tài thì câu báo đợi server - xúc xắc ở máy chỉ là dự đoán.
      if (syncRef.current) { /* xem `nhanKetQua` */ }
      else if (success) notify(`Đan thành! Thu được một viên ${PILLS[grade].name}`);
      else if (got) notify(`Lò cháy quá tay, chỉ vớt được một viên ${PILLS[got].name}`, 'warn');
      else notify('Hỏng lò, cả mẻ thành tro', 'warn');

      return { success, got, chance };
    },
    [patch, notify],
  );

  // ----------------------------------------------------------------- tẩy tuỷ

  const refineRootElement = useCallback<Ctx['refineRootElement']>(
    (from, to) => {
      const data = dataRef.current;
      if (!data.root) return false;
      const next = refineRoot(data.root, from, to);
      if (!next) {
        notify('Không đổi được: hệ này không có trong linh căn, hoặc hệ kia đã có rồi', 'warn');
        return false;
      }
      if (stoneBalance(data) < REFINE_COST) {
        notify(`Không đủ linh thạch (cần ${REFINE_COST})`, 'warn');
        return false;
      }
      patch((d) => ({ ...d, root: next, stonesSpent: d.stonesSpent + REFINE_COST }));
      notify(`Đã tẩy hệ ${ELEMENTS[from].label} thành ${ELEMENTS[to].label}`);
      return true;
    },
    [patch, notify],
  );

  const condenseRootElement = useCallback<Ctx['condenseRootElement']>(
    (drop) => {
      const data = dataRef.current;
      if (!data.root) return false;
      const next = condenseRoot(data.root, drop);
      if (!next) {
        notify('Không bỏ được hệ này', 'warn');
        return false;
      }
      const cost = condenseCost(data.root.elements.length);
      if (stoneBalance(data) < cost) {
        notify(`Không đủ linh thạch (cần ${cost})`, 'warn');
        return false;
      }
      patch((d) => ({ ...d, root: next, stonesSpent: d.stonesSpent + cost }));
      // Linh căn đổi phẩm cấp là chuyện lớn, cho hiện lớp ăn mừng như khai quang.
      if (!syncRef.current) setQueue((q) => [...q, { kind: 'awaken', root: next }]);
      return true;
    },
    [patch, notify],
  );

  // ---------------------------------------------------------------- động phủ

  const upgradeCave = useCallback<Ctx['upgradeCave']>(() => {
    const data = dataRef.current;
    const next = nextCave(data.caveLevel);
    if (!next) {
      notify('Động phủ đã ở bậc cao nhất', 'warn');
      return false;
    }
    if (stoneBalance(data) < next.cost) {
      notify(`Không đủ linh thạch (cần ${next.cost})`, 'warn');
      return false;
    }
    patch((d) => ({ ...d, caveLevel: d.caveLevel + 1, stonesSpent: d.stonesSpent + next.cost }));
    notify(`Động phủ đã mở rộng thành ${next.name}`);
    return true;
  }, [patch, notify]);

  // ------------------------------------------------------------ hòm kỳ ngộ

  const openChest = useCallback<Ctx['openChest']>(
    (ruleId) => {
      const data = dataRef.current;
      const key = todayKey();
      // Việc tính theo ngày XONG, không theo ngày lên lịch - xem `doneOnDay`.
      const chest = chestsOfDay(data, key).find((c) => c.rule.id === ruleId);

      // Chưa đạt mốc thì chưa có hòm; đã mở rồi thì thôi. Cả hai đều suy ra từ
      // số liệu công việc nên không thể bấm vòng lại để lấy thêm.
      if (!chest || !chest.earned || chest.opened) return null;

      const loot = rollLoot(chest.rule.grade);
      patch((d) => {
        const herbs = { ...d.herbs };
        for (const [id, n] of Object.entries(loot.herbs ?? {})) {
          const k = id as keyof typeof herbs;
          herbs[k] = Math.max(0, (herbs[k] ?? 0) + (n ?? 0));
        }
        return {
          ...d,
          chestsOpened: [...d.chestsOpened, chestKey(key, ruleId)],
          herbs,
          // Đi vào đúng hai kênh đã có cho cơ duyên, nên hồ sơ công việc thật
          // vẫn không bị đụng tới lần nào.
          stonesBonus: d.stonesBonus + (loot.stones ?? 0),
          encounterXp: d.encounterXp + (loot.xp ?? 0),
          pills: loot.pill ? { ...d.pills, [loot.pill]: d.pills[loot.pill] + 1 } : d.pills,
        };
      });

      return { loot, grade: chest.rule.grade };
    },
    [patch],
  );

  // ---------------------------------------------------------------- tông môn

  const acceptMission = useCallback<Ctx['acceptMission']>(
    (id) => {
      const data = dataRef.current;
      if (data.mission) {
        notify('Đang gánh một sứ mệnh chưa xong', 'warn');
        return false;
      }
      const mission = MISSIONS[id];
      const rank = rankOf(data.contribution);
      if (rank.level < mission.minRank) {
        notify(`Chưa đủ bậc để nhận sứ mệnh này`, 'warn');
        return false;
      }
      if (stoneBalance(data) < mission.stake) {
        notify(`Không đủ linh thạch đặt cọc (cần ${mission.stake})`, 'warn');
        return false;
      }

      patch((d) => ({
        ...d,
        // Cọc đi vào mục đã tiêu: nó bị khoá lại thật, xong việc mới trả về.
        stonesSpent: d.stonesSpent + mission.stake,
        mission: {
          id,
          startTasks: verifiedTaskCount(d),
          startFocus: verifiedFocusMinutes(d),
          acceptedAt: new Date().toISOString(),
          dueAt: dueDateOf(mission),
          stake: mission.stake,
        },
      }));
      notify(`Đã nhận ${mission.name}. Cọc ${mission.stake} linh thạch, hạn ${mission.days} ngày.`);
      return true;
    },
    [patch, notify],
  );

  const settleMission = useCallback<Ctx['settleMission']>(() => {
    const data = dataRef.current;
    if (!data.mission) return null;
    // Cùng lối đo với server (`missionStateOf`): lấy số nhỏ hơn giữa việc xong
    // SAU lúc nhận và hiệu hai con đếm, để máy không báo "đạt" khi server bảo chưa.
    const state = missionStateOf(data);
    if (!state) {
      // Sứ mệnh không còn tồn tại trong bảng - gỡ ra và trả lại cọc. Người
      // dùng không có lỗi gì ở đây, không được phạt họ vì ta đổi bảng.
      const refund = data.mission.stake;
      // Có trọng tài thì server hoàn cọc - hoàn ở máy nữa là hoàn hai lần.
      if (syncRef.current) dongBoRef.current.gui('settleMission', {});
      else patch((d) => ({ ...d, mission: undefined, stonesBonus: d.stonesBonus + refund }));
      notify('Sứ mệnh này không còn nữa, đã hoàn lại tiền cọc', 'warn');
      return null;
    }
    const { mission, met } = state;
    const stake = data.mission.stake;
    const before = rankOf(data.contribution).level;
    const after = rankOf(data.contribution + (met ? mission.contribution : 0)).level;

    patch((d) => ({
      ...d,
      mission: undefined,
      contribution: d.contribution + (met ? mission.contribution : 0),
      // Đạt thì trả lại cọc và cộng thưởng; trượt thì cọc ở nguyên bên đã tiêu.
      stonesBonus: d.stonesBonus + (met ? stake + mission.reward : 0),
    }));

    if (met) notify(`Hoàn thành ${mission.name}: +${mission.contribution} cống hiến`);
    else notify(`Trượt ${mission.name}, mất ${stake} linh thạch tiền cọc`, 'warn');

    return {
      met,
      mission,
      contribution: met ? mission.contribution : 0,
      stones: met ? stake + mission.reward : 0,
      rankedUp: after > before,
    };
  }, [patch, notify]);

  // --------------------------------------------------------------- thám hiểm

  const startExpedition = useCallback<Ctx['startExpedition']>(
    (siteId) => {
      const data = dataRef.current;
      if (data.expedition) {
        notify('Đang có một chuyến chưa về', 'warn');
        return false;
      }
      const site = SITES[siteId];
      if (stoneBalance(data) < site.cost) {
        notify(`Không đủ linh thạch lên đường (cần ${site.cost})`, 'warn');
        return false;
      }
      // Mốc đo đường về là số nhiệm vụ đã xác thực ngay lúc này. Đoàn về sau
      // đúng `needTasks` việc nữa - đo bằng việc đã xong chứ không bằng đồng hồ.
      const startedAtTasks = verifiedTaskCount(data);
      patch((d) => ({
        ...d,
        stonesSpent: d.stonesSpent + site.cost,
        expedition: { site: siteId, startedAtTasks, startedAt: new Date().toISOString() },
      }));
      notify(`Đã lên đường tới ${site.name}. Xong ${site.needTasks} nhiệm vụ nữa là đoàn về.`);
      return true;
    },
    [patch, notify],
  );

  const resolveExpedition = useCallback<Ctx['resolveExpedition']>(() => {
    const data = dataRef.current;
    if (!data.expedition) return null;
    const state = expeditionStateOf(data);
    if (!state) {
      // Bí cảnh không còn tồn tại - kết thúc chuyến đi và hoàn phí lên đường.
      const refund = SITES[data.expedition.site]?.cost ?? 0;
      if (syncRef.current) dongBoRef.current.gui('resolveExpedition', {});
      else patch((d) => ({ ...d, expedition: undefined, stonesBonus: d.stonesBonus + refund }));
      notify('Bí cảnh này không còn nữa, đã kết thúc chuyến đi', 'warn');
      return null;
    }
    if (!state.ready) {
      notify(`Còn ${state.remain} nhiệm vụ nữa đoàn mới về`, 'warn');
      return null;
    }

    const outcome = rollSiteOutcome(state.site);
    patch((d) => {
      const herbs = { ...d.herbs };
      for (const [id, n] of Object.entries(outcome.herbs ?? {})) {
        const key = id as keyof typeof herbs;
        herbs[key] = Math.max(0, (herbs[key] ?? 0) + (n ?? 0));
      }
      return {
        ...d,
        expedition: undefined,
        herbs,
        // Thu hoạch đi vào đúng hai kênh đã có sẵn cho cơ duyên, nên hồ sơ công
        // việc thật vẫn không bị đụng tới lần nào.
        stonesBonus: d.stonesBonus + (outcome.stones ?? 0),
        encounterXp: d.encounterXp + (outcome.xp ?? 0),
        pills: outcome.pill ? { ...d.pills, [outcome.pill]: d.pills[outcome.pill] + 1 } : d.pills,
      };
    });
    return outcome;
  }, [patch, notify]);

  /**
   * Độ kiếp. Thành công thì mở cửa cảnh giới kế; thất bại thì hao tổn một nửa
   * tu vi đã tích trong cảnh giới này nhưng KHÔNG bao giờ tụt xuống cảnh giới
   * cũ, và lần sau được cộng thêm cơ hội.
   */
  const attemptTribulation = useCallback<Ctx['attemptTribulation']>(
    (grade) => {
      const data = dataRef.current;
      const p = progressOf(data);
      if (!p.readyForTribulation) {
        notify('Chưa đủ tu vi để độ kiếp', 'warn');
        return null;
      }
      if (data.pills[grade] < 1) {
        notify(`Không có ${PILLS[grade].name}`, 'warn');
        return null;
      }

      const chance = tribulationChance(grade, data.failStreak);
      const success = Math.random() < chance;
      const nextRealmIndex = Math.min(ASCENSION_INDEX, p.gateRealm + 1);
      const nextRealm = REALMS[nextRealmIndex];
      const loss = success ? 0 : tribulationLoss(data);

      patch((d) => ({
        ...d,
        pills: { ...d.pills, [grade]: d.pills[grade] - 1 },
        gateRealm: success ? nextRealmIndex : d.gateRealm,
        tuViPenalty: success ? d.tuViPenalty : d.tuViPenalty + loss,
        failStreak: success ? 0 : d.failStreak + 1,
      }));

      /*
       * Có server thì hiệu ứng chờ server phán, ở đây không bung gì cả.
       *
       * Con `success` vừa tung ở trên vẫn dùng để vá lạc quan cho số liệu nhảy
       * ngay, và bản vá của server sẽ ghi đè lên nếu nó tung ra kết quả khác.
       * Nhưng hiệu ứng thì không rút lại được, nên nó phải đợi.
       */
      if (!syncRef.current) {
        if (success) {
          setQueue((q) => [
            ...q,
            nextRealmIndex >= ASCENSION_INDEX
              ? { kind: 'ascension', xp: p.net }
              : {
                  kind: 'realm-up',
                  realm: nextRealm.name,
                  note: nextRealm.note,
                  realmIndex: nextRealmIndex,
                  xp: p.net,
                },
          ]);
        } else {
          setQueue((q) => [
            ...q,
            {
              kind: 'tribulation-failed',
              loss,
              nextChance: tribulationChance(grade, data.failStreak + 1),
              realm: nextRealm.name,
            },
          ]);
        }
      }
      return success;
    },
    [patch, notify],
  );

  const updateSettings = useCallback<Ctx['updateSettings']>(
    (p) => patch((d) => {
      const settings = { ...d.settings, ...p };
      for (const [key, min, max] of [
        ['focusLength', 1, 240], ['breakLength', 1, 240],
        ['dailyTarget', 1, 30], ['dailyFocusTarget', 1, 1440],
      ] as const) {
        const value = settings[key];
        settings[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : d.settings[key];
      }
      return { ...d, settings };
    }),
    [patch],
  );

  const replaceAll = useCallback<Ctx['replaceAll']>(
    (next) => {
      if (chanKhiCoServer('thay cả hồ sơ bằng tệp')) return;
      clearStorageLoadError();
      setData({
        ...next,
        ledger: rebuildLedger(next),
        lastSeenAt: new Date().toISOString(),
      });
    },
    [chanKhiCoServer],
  );
  const loadSample = useCallback(() => {
    if (chanKhiCoServer('nạp dữ liệu mẫu')) return;
    const sample = seedData();
    setData({ ...sample, ledger: rebuildLedger(sample), lastSeenAt: new Date().toISOString() });
    notify('Đã nạp dữ liệu mẫu');
  }, [chanKhiCoServer, notify]);
  const resetAll = useCallback(() => {
    if (chanKhiCoServer('xoá sạch dữ liệu')) return;
    clearStorageLoadError();
    setData((d) => ({
      version: 1, tasks: [], goals: [], sessions: [], settings: d.settings,
      root: d.root, beasts: d.beasts, activeBeastId: d.activeBeastId, stonesSpent: 0,
      pills: d.pills, tuViPenalty: 0, gateRealm: 0, failStreak: 0,
      encounterXp: 0, stonesBonus: 0, ledger: [], lastSeenAt: new Date().toISOString(),
      technique: d.technique, techniqueSwaps: d.techniqueSwaps, caveLevel: d.caveLevel,
      herbs: d.herbs,
      // Linh điền và chuyến thám hiểm đều phải dọn: cả hai đo bằng lịch sử làm
      // việc, mà lịch sử ấy vừa bị xoá sạch nên mọi mốc đã ghi thành vô nghĩa.
      field: [],
      expedition: undefined,
      // Cống hiến là danh phận đã gây dựng nên giữ lại; còn sứ mệnh đang gánh
      // thì đo bằng lịch sử vừa bị xoá sạch nên phải bỏ.
      contribution: d.contribution,
      mission: undefined,
      // Hòm căn cứ vào công việc trong ngày, mà công việc vừa bị xoá sạch.
      chestsOpened: [],
    }));
    notify('Đã xoá toàn bộ dữ liệu', 'warn');
  }, [chanKhiCoServer, notify]);

  /*
   * Đang có tài khoản giữ hồ sơ thì sổ ký bằng khoá của server - kiểm bằng hàm
   * băm của web chắc chắn "đứt chuỗi" dù chẳng ai sửa gì. Server tự kiểm sổ
   * của nó rồi; ở đây chỉ soi phần dữ liệu (việc tương lai, phiên quá dài...).
   */
  const coChu = !!sync.chu;
  /*
   * Kiểm sổ là băm lại cả chuỗi - O(n) theo bề dày lịch sử. Chỉ tính lại khi
   * đúng những phần nó đọc đổi (sổ, nhiệm vụ, phiên, tổng đã xác thực), không
   * phải mỗi lần đổi cài đặt hay gõ một chữ trong đạo hiệu.
   */
  const { tasks, sessions, ledger, verified, lastSeenAt } = data;
  const audit = useMemo(() => {
    const soi = { ...emptyData(), tasks, sessions, ledger, verified, lastSeenAt };
    return auditData(coChu && !verified ? { ...soi, verified: { taskXp: 0, sessionMinutes: 0, taskCount: 0, sessionCount: 0, verified: 0 } } : soi);
  }, [tasks, sessions, ledger, verified, lastSeenAt, coChu]);

  /** Người dùng chấp nhận trạng thái hiện tại: ký lại sổ từ đầu. */
  const resealLedger = useCallback(() => {
    if (chanKhiCoServer('ký lại sổ ghi')) return;
    patch((d) => ({ ...d, ledger: rebuildLedger(d), lastSeenAt: new Date().toISOString() }));
    notify('Đã ký lại sổ ghi theo dữ liệu hiện tại');
  }, [chanKhiCoServer, patch, notify]);

  const celebration = queue[0] ?? null;

  const dismissCelebration = useCallback((count = 1) => setQueue((q) => q.slice(Math.max(1, count))), []);

  // Mỗi khoảnh khắc mới xuất hiện thì bắn hiệu ứng tương ứng đúng một lần.
  useEffect(() => {
    if (!celebration) return;
    switch (celebration.kind) {
      case 'tier-up':
        burstTier();
        soundLevelUp();
        break;
      case 'realm-up':
        burstBig();
        soundLevelUp();
        break;
      case 'ascension':
        burstBig();
        burstRain(2600);
        soundAscend();
        break;
      case 'perfect-day':
        burstRain();
        soundPerfectDay();
        break;
      case 'achievement':
        burstBig();
        soundAchievement();
        break;
      case 'awaken':
        burstBig();
        soundLevelUp();
        break;
      case 'summon':
        burstTier();
        soundAchievement();
        break;
      case 'tribulation-failed':
        // Thất bại thì không confetti, chỉ một tiếng trầm.
        soundComplete();
        break;
    }
  }, [celebration]);

  /*
   * Hai phần tách riêng. Hành động không đổi danh tính (chúng đọc hồ sơ qua
   * `dataRef`), nên `useAppActions` không bao giờ làm component vẽ lại; còn
   * `useApp` gộp cả hai như trước cho những chỗ cần đọc hồ sơ.
   */
  const hanhDongTho = useMemo<HanhDong>(
    () => ({
      retrySave, resealLedger, dismissCelebration, resolveEncounter, dismissEncounter, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill, attemptTribulation,
      pickTechnique, plantSeed, harvestPlot, refinePill, refineRootElement, condenseRootElement, upgradeCave,
      startExpedition, resolveExpedition, acceptMission, settleMission, openChest,
      updateSettings, replaceAll, loadSample, resetAll,
    }),
    [retrySave, resealLedger, dismissCelebration, resolveEncounter, dismissEncounter, notify, addTask, updateTask, removeTask, setStatus, toggleDone, moveTask,
      duplicateTask, toggleSubtask, pushOverdueToToday, clearDone, addGoal, updateGoal, removeGoal,
      logSession, awaken, rerollRoot, summon, feedBeast, setActiveBeast, buyPill, attemptTribulation,
      pickTechnique, plantSeed, harvestPlot, refinePill, refineRootElement, condenseRootElement, upgradeCave,
      startExpedition, resolveExpedition, acceptMission, settleMission, openChest,
      updateSettings, replaceAll, loadSample, resetAll],
  );
  const hanhDong = useBocLenh(hanhDongTho, sync.gui, layPhu);
  const lastVisitAt = boot.lastVisitAt;
  const value = useMemo<Ctx>(
    () => ({ data, storageError, sync, lastVisitAt, celebration, celebrations: queue, audit, encounter, encounterResult, ...hanhDong }),
    [data, storageError, sync, lastVisitAt, celebration, queue, audit, encounter, encounterResult, hanhDong],
  );
  useEffect(() => {
    hanhDongRef.current = value;
  }, [value]);

  return (
    <HanhDongContext.Provider value={hanhDong}>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </HanhDongContext.Provider>
  );
}
