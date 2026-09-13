import type { AppData, Task } from '../types';
import { PRIORITY_META } from '../types';

/**
 * Sổ ghi (ledger) chống sửa tài nguyên.
 *
 * GIỚI HẠN CẦN BIẾT: app này chạy hoàn toàn trên máy người dùng, mọi thứ kể cả
 * hàm băm dưới đây đều nằm trong bundle JavaScript. Vì vậy KHÔNG có cách nào
 * chống gian lận tuyệt đối - người quyết tâm vẫn có thể đọc code rồi tự dựng
 * một chuỗi hợp lệ. Mục tiêu ở đây là:
 *
 *  1. Sửa tay trong devtools/localStorage sẽ bị phát hiện ngay.
 *  2. Thêm nhiệm vụ "đã xong" mà không qua app sẽ lệch so với sổ ghi.
 *  3. Các con số vô lý (xong việc ở tương lai, xong 100 việc trong một phút,
 *     bế quan lâu hơn thời gian thực) đều bị bắt.
 *
 * Muốn chống gian lận thật thì phải có server ký và lưu sổ ghi.
 */

export type LedgerKind = 'task' | 'session';

export interface LedgerEntry {
  seq: number;
  kind: LedgerKind;
  /** id nhiệm vụ hoặc id phiên bế quan */
  ref: string;
  /** thời điểm ghi nhận, ISO */
  at: string;
  /** tu vi gốc mà bản ghi này đóng góp */
  value: number;
  hash: string;
}

const SALT = 'dao-trinh/ledger/v1';

/** Băm 32-bit kiểu FNV-1a. */
function fnv(input: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Ghép hai biến thể FNV thành chuỗi hex 16 ký tự để giảm trùng băm. */
function digest(input: string): string {
  const a = fnv(input);
  const b = fnv(input, 0x9e3779b9);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

function hashOf(entry: Omit<LedgerEntry, 'hash'>, prevHash: string): string {
  return digest(`${SALT}|${entry.seq}|${entry.kind}|${entry.ref}|${entry.at}|${entry.value}|${prevHash}`);
}

export const taskValue = (t: Task) => 10 * PRIORITY_META[t.priority].weight;

/** Thêm một bản ghi vào cuối sổ, móc vào băm của bản ghi trước. */
export function appendEntry(
  ledger: LedgerEntry[],
  kind: LedgerKind,
  ref: string,
  value: number,
  at = new Date().toISOString(),
): LedgerEntry[] {
  const prev = ledger[ledger.length - 1];
  const base = { seq: (prev?.seq ?? 0) + 1, kind, ref, at, value };
  return [...ledger, { ...base, hash: hashOf(base, prev?.hash ?? SALT) }];
}

/** Bỏ các bản ghi của một nhiệm vụ (khi bỏ đánh dấu hoàn thành hoặc xoá). */
export function dropEntries(ledger: LedgerEntry[], kind: LedgerKind, ref: string): LedgerEntry[] {
  const kept = ledger.filter((e) => !(e.kind === kind && e.ref === ref));
  // Đánh số và móc băm lại để chuỗi vẫn liền mạch.
  return kept.reduce<LedgerEntry[]>(
    (acc, e) => appendEntry(acc, e.kind, e.ref, e.value, e.at),
    [],
  );
}

/** Dựng lại sổ ghi từ dữ liệu hiện có - dùng khi nâng cấp hoặc nạp dữ liệu mẫu. */
export function rebuildLedger(data: Pick<AppData, 'tasks' | 'sessions'>): LedgerEntry[] {
  const events: { kind: LedgerKind; ref: string; value: number; at: string }[] = [
    ...data.tasks
      .filter((t) => t.status === 'done')
      .map((t) => ({
        kind: 'task' as const,
        ref: t.id,
        value: taskValue(t),
        at: t.completedAt ?? `${t.date}T12:00:00.000Z`,
      })),
    ...data.sessions.map((s) => ({
      kind: 'session' as const,
      ref: s.id,
      value: s.minutes,
      at: s.startedAt,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return events.reduce<LedgerEntry[]>(
    (acc, e) => appendEntry(acc, e.kind, e.ref, e.value, e.at),
    [],
  );
}

export interface Finding {
  code: string;
  severity: 'error' | 'warn';
  message: string;
}

export interface Audit {
  ok: boolean;
  findings: Finding[];
  /** Số bản ghi đã kiểm và thấy liền mạch */
  verified: number;
}

/** Ngưỡng coi là bất thường. */
const MAX_COMPLETIONS_PER_MINUTE = 20;
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

/** Kiểm tra toàn vẹn sổ ghi và tính hợp lý của dữ liệu. */
export function auditData(data: AppData, now = new Date()): Audit {
  const findings: Finding[] = [];

  /*
   * Sổ do máy chủ ký thì bỏ qua ba mục đầu.
   *
   * Máy chủ băm bằng khoá mà trình duyệt không có, nên kiểm ở đây chắc chắn
   * hỏng - và báo "sổ lệch" với người dùng đang chẳng làm gì sai. Chính máy chủ
   * đã tự kiểm sổ của nó rồi; kết quả ấy hiện ở mục Tài khoản.
   *
   * Mấy mục sau vẫn kiểm được vì chúng soi dữ liệu chứ không soi băm.
   */
  const doServerKy = !!data.verified;

  // 1. Chuỗi băm có liền mạch không
  let verified = data.verified?.verified ?? 0;
  let prevHash = SALT;
  if (!doServerKy) {
    for (let i = 0; i < data.ledger.length; i++) {
      const e = data.ledger[i];
      const expected = hashOf({ seq: e.seq, kind: e.kind, ref: e.ref, at: e.at, value: e.value }, prevHash);
      if (e.seq !== i + 1 || e.hash !== expected) {
        findings.push({
          code: 'chain-broken',
          severity: 'error',
          message: `Sổ ghi bị sửa ở bản ghi số ${i + 1}. Các số liệu sau đó không còn đáng tin.`,
        });
        break;
      }
      prevHash = e.hash;
      verified++;
    }
  }

  // 2. Có nhiệm vụ/phiên nào không nằm trong sổ ghi
  const taskRefs = new Set(data.ledger.filter((e) => e.kind === 'task').map((e) => e.ref));
  const sessionRefs = new Set(data.ledger.filter((e) => e.kind === 'session').map((e) => e.ref));
  const ghostTasks = data.tasks.filter((t) => t.status === 'done' && !taskRefs.has(t.id)).length;
  const ghostSessions = data.sessions.filter((s) => !sessionRefs.has(s.id)).length;
  if (ghostTasks > 0) {
    findings.push({
      code: 'unledgered-tasks',
      severity: 'error',
      message: `${ghostTasks} nhiệm vụ được đánh dấu hoàn thành nhưng không có trong sổ ghi.`,
    });
  }
  if (ghostSessions > 0) {
    findings.push({
      code: 'unledgered-sessions',
      severity: 'error',
      message: `${ghostSessions} phiên bế quan không có trong sổ ghi.`,
    });
  }

  // 3. Hoàn thành ở tương lai
  const nowIso = now.toISOString();
  const future = data.tasks.filter((t) => t.completedAt && t.completedAt > nowIso).length;
  if (future > 0) {
    findings.push({
      code: 'future-completion',
      severity: 'error',
      message: `${future} nhiệm vụ có thời điểm hoàn thành ở tương lai.`,
    });
  }

  // 4. Xong quá nhiều việc trong một phút
  const byMinute = new Map<string, number>();
  for (const t of data.tasks) {
    if (!t.completedAt) continue;
    const key = t.completedAt.slice(0, 16);
    byMinute.set(key, (byMinute.get(key) ?? 0) + 1);
  }
  const burst = [...byMinute.values()].filter((n) => n > MAX_COMPLETIONS_PER_MINUTE).length;
  if (burst > 0) {
    findings.push({
      code: 'burst',
      severity: 'warn',
      message: `Có ${burst} phút hoàn thành hơn ${MAX_COMPLETIONS_PER_MINUTE} nhiệm vụ - bất thường.`,
    });
  }

  // 5. Phiên bế quan dài hơn thời gian thực đã trôi qua
  const impossible = data.sessions.filter((s) => {
    const started = new Date(s.startedAt).getTime();
    if (Number.isNaN(started)) return true;
    return s.minutes * 60_000 > now.getTime() - started + CLOCK_TOLERANCE_MS;
  }).length;
  if (impossible > 0) {
    findings.push({
      code: 'session-impossible',
      severity: 'error',
      message: `${impossible} phiên bế quan dài hơn thời gian thực đã trôi qua.`,
    });
  }

  // 6. Đồng hồ bị đẩy lùi
  if (data.lastSeenAt && new Date(data.lastSeenAt).getTime() - now.getTime() > CLOCK_TOLERANCE_MS) {
    findings.push({
      code: 'clock-rollback',
      severity: 'warn',
      message: 'Đồng hồ máy đang chạy lùi so với lần mở app trước.',
    });
  }

  // 7. Tổng tu vi trong sổ phải khớp với tổng suy ra từ nhiệm vụ
  const ledgerTaskXp = data.ledger
    .filter((e) => e.kind === 'task')
    .reduce((sum, e) => sum + e.value, 0);
  const dataTaskXp = data.tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + taskValue(t), 0);
  if (!doServerKy && verified === data.ledger.length && ledgerTaskXp !== dataTaskXp) {
    findings.push({
      code: 'xp-mismatch',
      severity: 'error',
      message: `Tu vi trong sổ ghi (${ledgerTaskXp}) lệch so với nhiệm vụ thực tế (${dataTaskXp}).`,
    });
  }

  return { ok: findings.every((f) => f.severity !== 'error'), findings, verified };
}


/**
 * Tổng tu vi và số phút bế quan đã được xác thực bằng chuỗi băm.
 *
 * Đây là chỗ chống gian lận thật sự có tác dụng: tu vi cuối cùng bị kẹp không
 * vượt quá con số này. Thêm nhiệm vụ "đã xong" trực tiếp vào localStorage sẽ
 * không có bản ghi tương ứng, nên không làm tăng tu vi.
 */
export function verifiedTotals(data: Pick<AppData, 'ledger'> & Partial<Pick<AppData, 'verified'>>): {
  taskXp: number;
  sessionMinutes: number;
  /** Số nhiệm vụ đã xác thực - dùng để kẹp cả linh thạch */
  taskCount: number;
  sessionCount: number;
  verified: number;
} {
  // Server đã ký và đã kiểm sổ bằng khoá của nó thì khỏi kiểm lại: hàm băm ở
  // đây không có khoá ấy nên kiểm bao nhiêu cũng ra số không.
  if (data.verified) return data.verified;

  let prevHash = SALT;
  let taskXp = 0;
  let sessionMinutes = 0;
  let taskCount = 0;
  let sessionCount = 0;
  let verified = 0;

  for (let i = 0; i < data.ledger.length; i++) {
    const e = data.ledger[i];
    const expected = hashOf({ seq: e.seq, kind: e.kind, ref: e.ref, at: e.at, value: e.value }, prevHash);
    // Gặp bản ghi sai là dừng - phần sau không còn đáng tin.
    if (e.seq !== i + 1 || e.hash !== expected) break;
    if (e.kind === 'task') {
      taskXp += e.value;
      taskCount++;
    } else {
      sessionMinutes += e.value;
      sessionCount++;
    }
    prevHash = e.hash;
    verified++;
  }

  return { taskXp, sessionMinutes, taskCount, sessionCount, verified };
}
