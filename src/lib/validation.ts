import type { Task } from '../types';
import { parseKey, relativeDay, todayKey } from './date';

/**
 * Lớp kiểm tra tính hợp lý. Hai loại:
 *  - `block`: chặn hẳn, vì hành động đó vô nghĩa hoặc phá vỡ tính trung thực
 *    của hồ sơ (ví dụ: hoàn thành nhiệm vụ của ngày mai khi đang ở hôm nay).
 *  - `warn`: vẫn cho làm nhưng nhắc, vì có thể người dùng cố ý.
 */
export interface Violation {
  code: string;
  level: 'block' | 'warn';
  message: string;
  /** Gợi ý cách xử lý, hiện thành nút nếu có */
  fix?: 'move-to-today';
}

/** Số phút dự kiến hợp lệ cho một nhiệm vụ: từ 0 tới 24 giờ. */
export const MAX_ESTIMATE_MIN = 24 * 60;

/** Một phiên bế quan hợp lý: từ 1 phút tới 4 giờ. */
export const MIN_SESSION_MIN = 1;
export const MAX_SESSION_MIN = 4 * 60;

/**
 * Phiên ngắn hơn ngần này vẫn được ghi phút (tu vi tính theo phút nên vẫn có
 * phần của nó), nhưng KHÔNG có linh thạch "mỗi phiên" và không được bốc kỳ ngộ.
 *
 * Hai phần thưởng ấy tính theo SỐ phiên chứ không theo số phút. Không có ngưỡng
 * thì bấm bắt đầu rồi "kết thúc sớm" sau một phút, lặp lại hai mươi lần, là có
 * bốn mươi viên đá và bảy lần gieo kỳ ngộ - trong khi một phiên 25 phút thật
 * chỉ được hai viên và một lần gieo.
 */
export const MIN_REWARD_SESSION_MIN = 5;
export const rewardsSession = (minutes: number) => minutes >= MIN_REWARD_SESSION_MIN;

/**
 * Linh thạch bế quan tính theo KHỐI 25 phút chứ không theo phiên: mỗi 25 phút
 * trọn vẹn trong một phiên được 2 viên (phiên 60 phút = 4 viên, phiên 20 phút
 * = 0). Ngưỡng 5 phút ở trên vẫn giữ - nó còn chặn cả kỳ ngộ.
 *
 * Trả theo phiên thì chẻ một giờ ngồi thành mười hai phiên 5 phút là được 24
 * viên thay vì 2, và người ngồi liền ba tiếng lại thiệt nhất. Theo khối thì
 * chẻ nhỏ chỉ có thiệt: phần lẻ dưới 25 phút của mỗi phiên bị bỏ.
 */
export const STONE_BLOCK_MIN = 25;
export const STONES_PER_BLOCK = 2;

/**
 * Mốc đổi luật linh thạch bế quan (và các luật kinh tế đi cùng đợt cân bằng
 * lại). Phiên BẮT ĐẦU trước mốc giữ luật cũ - 2 viên mỗi phiên từ 5 phút.
 *
 * Vì sao phải có mốc: linh thạch bế quan không cất ở đâu cả mà tính lại từ
 * toàn bộ lịch sử phiên mỗi lần đọc. Áp luật mới lên phiên cũ thì người từng
 * ngồi nhiều phiên 10-20 phút bị TRỪ ngược số đá đã kiếm (và đã tiêu), có khi
 * tụt số dư xuống dưới số đã tiêu. Giữ luật cũ cho quá khứ thì không ai mất
 * một viên nào đã có.
 *
 * Phải triển khai TRƯỚC mốc này: phiên ghi sau mốc mà server còn chạy luật cũ
 * thì vẫn được 2 viên/phiên lúc ấy, rồi bị tính lại theo luật mới sau khi
 * triển khai. Lỡ hẹn thì dời mốc tới ngày triển khai, đừng để lùi về trước.
 */
export const KINH_TE_MOI_TU = '2026-10-10T00:00:00.000Z';
const KINH_TE_MOI_MS = Date.parse(KINH_TE_MOI_TU);

/** Phiên này bắt đầu sau mốc đổi luật chưa. Mốc hỏng thì coi như phiên cũ - không ai bị trừ. */
export const theoLuatMoi = (startedAt: string) => {
  const t = Date.parse(startedAt);
  return !Number.isNaN(t) && t >= KINH_TE_MOI_MS;
};

/** Linh thạch của một phiên bế quan. */
export function sessionStones(minutes: number, startedAt: string): number {
  if (!rewardsSession(minutes)) return 0;
  if (!theoLuatMoi(startedAt)) return STONES_PER_BLOCK;
  return Math.floor(minutes / STONE_BLOCK_MIN) * STONES_PER_BLOCK;
}

/** Đồng hồ máy khách được chạy nhanh hơn máy chủ chừng này mà không bị coi là phiên ở tương lai. */
export const SESSION_FUTURE_TOLERANCE_MS = 2 * 60_000;
/**
 * Phiên gửi muộn được lùi về quá khứ tối đa chừng này. Bằng đúng độ lệch mà
 * máy chủ cho phép với `today` của lệnh: lệnh xếp hàng lúc mất mạng lâu hơn thế
 * thì cũng đã bị chặn vì ngày cũ, người dùng phải tự quyết gửi lại.
 */
export const SESSION_MAX_BACKDATE_MS = 30 * 60 * 60_000;
/** Hai phiên chạm nhau dưới một phút thì bỏ qua - làm tròn phút và trễ mạng, không phải gian lận. */
const SESSION_OVERLAP_TOLERANCE_MS = 60_000;
/** Cửa sổ soát "tổng phút không vượt thời gian thực" */
const SESSION_CLOCK_WINDOW_MS = 24 * 60 * 60_000;

/**
 * Phiên bế quan có khớp với đồng hồ không - chốt của máy chủ.
 *
 * Phiên là thứ người dùng tự khai nên không kiểm được "có ngồi thật không".
 * Kiểm được là nó không phá vỡ thời gian: không kết thúc ở tương lai, không
 * chồng lên phiên khác, và tổng phút trong một ngày không vượt số phút đã
 * thực sự trôi qua. Trước đây máy chủ nhận sáu phiên 240 phút trong một giây -
 * 1440 phút bế quan mà đồng hồ mới nhích một giây.
 *
 * `endMs` là lúc phiên kết thúc. Lệnh xếp hàng lúc mất mạng mang giờ của chính
 * nó nên gửi muộn vẫn không chồng lên nhau; lệnh không mang giờ thì máy chủ
 * lấy "bây giờ".
 */
export function checkSessionTiming(
  minutes: number,
  endMs: number,
  sessions: readonly { startedAt: string; minutes: number }[],
  nowMs: number,
): Violation | null {
  const startMs = endMs - minutes * 60_000;
  if (!Number.isFinite(endMs) || endMs > nowMs + SESSION_FUTURE_TOLERANCE_MS) {
    return { code: 'session-future', level: 'block', message: 'Phiên bế quan kết thúc ở tương lai - kiểm tra lại đồng hồ máy.' };
  }
  if (startMs < nowMs - SESSION_MAX_BACKDATE_MS) {
    return { code: 'session-too-old', level: 'block', message: 'Phiên bế quan này đã quá cũ để ghi nhận.' };
  }
  let earliest = startMs;
  let total = minutes;
  for (const s of sessions) {
    const sStart = Date.parse(s.startedAt);
    if (Number.isNaN(sStart)) continue;
    const sEnd = sStart + s.minutes * 60_000;
    if (Math.min(endMs, sEnd) - Math.max(startMs, sStart) > SESSION_OVERLAP_TOLERANCE_MS) {
      return { code: 'session-overlap', level: 'block', message: 'Phiên bế quan này trùng giờ với một phiên đã ghi.' };
    }
    if (sEnd >= nowMs - SESSION_CLOCK_WINDOW_MS) {
      total += s.minutes;
      earliest = Math.min(earliest, sStart);
    }
  }
  // Không chồng nhau thì gần như chắc chắn đã thoả; soát riêng cho chắc với
  // những phiên cũ có mốc bắt đầu ghi sai (bản web cũ ghi giờ KẾT THÚC).
  if (total * 60_000 > nowMs - earliest + SESSION_FUTURE_TOLERANCE_MS) {
    return { code: 'session-exceeds-clock', level: 'block', message: 'Tổng thời gian bế quan vượt quá thời gian thực đã trôi qua.' };
  }
  return null;
}

export const clampEstimate = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(MAX_ESTIMATE_MIN, Math.round(v))) : 0;

/**
 * Có được đánh dấu hoàn thành nhiệm vụ này không.
 *
 * Việc của ngày mai thì hôm nay chưa thể xong - nếu cho tick thì mọi con số
 * tu vi, chuỗi ngày và thống kê đều thành vô nghĩa. Muốn làm sớm thì dời
 * nhiệm vụ về hôm nay trước.
 *
 * `today` là ngày theo lịch CỦA NGƯỜI DÙNG, không phải của máy chủ. Trước đây
 * hàm này nhận tham số `now` rồi bỏ quên, cứ gọi thẳng `todayKey()` - chạy ở
 * trình duyệt thì vô hại vì hai cái là một, nhưng khi có máy chủ thì thành sai:
 * lúc 6 giờ sáng ở Việt Nam, máy chủ theo giờ UTC vẫn đang ở hôm qua, nên việc
 * của hôm nay bị từ chối là "việc của ngày mai".
 */
export function checkComplete(
  task: Task,
  today = todayKey(),
  now = new Date(),
): Violation | null {
  if (task.date > today) {
    return {
      code: 'future-task',
      level: 'block',
      message: `Nhiệm vụ này thuộc ${relativeDay(task.date).toLowerCase()}, hôm nay chưa thể hoàn thành. Dời về hôm nay nếu bạn muốn làm sớm.`,
      fix: 'move-to-today',
    };
  }

  const openSubtasks = task.subtasks.filter((s) => !s.done).length;
  if (openSubtasks > 0) {
    return {
      code: 'open-subtasks',
      level: 'warn',
      message: `Còn ${openSubtasks} bước nhỏ chưa xong. Vẫn ghi nhận hoàn thành nhé.`,
    };
  }

  // Deadline đã qua thì vẫn cho xong, chỉ ghi nhận là trễ.
  if (task.deadline && new Date(task.deadline) < now) {
    return {
      code: 'late-complete',
      level: 'warn',
      message: 'Hoàn thành sau hạn chót - vẫn tính tu vi nhưng không được thưởng "xong trước hạn".',
    };
  }

  return null;
}

export interface TaskDraftLike {
  title: string;
  date: string;
  startTime?: string;
  deadline?: string;
  estimateMin: number;
}

/** Kiểm tra một bản nháp nhiệm vụ trước khi lưu. */
export function checkTaskDraft(draft: TaskDraftLike): Violation[] {
  const out: Violation[] = [];

  if (!draft.title.trim()) {
    out.push({ code: 'empty-title', level: 'block', message: 'Nhiệm vụ cần có tên.' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    out.push({ code: 'bad-date', level: 'block', message: 'Ngày thực hiện không hợp lệ.' });
  }

  if (draft.estimateMin > MAX_ESTIMATE_MIN) {
    out.push({
      code: 'estimate-too-big',
      level: 'block',
      message: `Thời lượng dự kiến tối đa ${MAX_ESTIMATE_MIN / 60} giờ. Việc lớn hơn thì nên chia nhỏ.`,
    });
  }

  if (draft.estimateMin < 0) {
    out.push({ code: 'estimate-negative', level: 'block', message: 'Thời lượng không thể âm.' });
  }

  if (draft.deadline) {
    const deadline = new Date(draft.deadline);
    if (Number.isNaN(deadline.getTime())) {
      out.push({ code: 'bad-deadline', level: 'block', message: 'Hạn chót không hợp lệ.' });
    } else {
      const dayStart = parseKey(draft.date);
      if (deadline < dayStart) {
        out.push({
          code: 'deadline-before-date',
          level: 'block',
          message: 'Hạn chót không thể sớm hơn ngày thực hiện.',
        });
      }
      if (draft.startTime) {
        const start = new Date(`${draft.date}T${draft.startTime}:00`);
        if (!Number.isNaN(start.getTime()) && start > deadline) {
          out.push({
            code: 'start-after-deadline',
            level: 'warn',
            message: 'Giờ bắt đầu muộn hơn hạn chót - kiểm tra lại kẻo trễ.',
          });
        }
      }
    }
  }

  return out;
}

/**
 * Phiên bế quan có hợp lý không. Chặn cả hai đầu: quá ngắn thì không phải tu
 * luyện, quá dài thì gần như chắc chắn là do sửa dữ liệu hoặc để máy chạy quên.
 */
export function checkSession(minutes: number): Violation | null {
  if (!Number.isFinite(minutes) || minutes < MIN_SESSION_MIN) {
    return {
      code: 'session-too-short',
      level: 'block',
      message: `Phiên bế quan phải từ ${MIN_SESSION_MIN} phút trở lên.`,
    };
  }
  if (minutes > MAX_SESSION_MIN) {
    return {
      code: 'session-too-long',
      level: 'block',
      message: `Một phiên bế quan không thể dài hơn ${MAX_SESSION_MIN / 60} giờ.`,
    };
  }
  return null;
}

export const blocking = (list: Violation[]) => list.filter((v) => v.level === 'block');
