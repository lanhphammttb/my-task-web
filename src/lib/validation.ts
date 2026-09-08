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

export const clampEstimate = (v: number) =>
  Number.isFinite(v) ? Math.max(0, Math.min(MAX_ESTIMATE_MIN, Math.round(v))) : 0;

/**
 * Có được đánh dấu hoàn thành nhiệm vụ này không.
 *
 * Việc của ngày mai thì hôm nay chưa thể xong - nếu cho tick thì mọi con số
 * tu vi, chuỗi ngày và thống kê đều thành vô nghĩa. Muốn làm sớm thì dời
 * nhiệm vụ về hôm nay trước.
 */
export function checkComplete(task: Task, now = new Date()): Violation | null {
  const today = todayKey();
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
