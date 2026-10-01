import { lazy } from "react";
import type { ComponentType } from "react";

/**
 * Nạp trễ mà không trắng màn hình sau mỗi lần deploy.
 *
 * Mỗi lần deploy, tên các chunk (`assets/TodayView-xxxx.js`) đổi theo mã băm,
 * còn bản cũ thì biến mất khỏi máy chủ. Trang đang mở từ trước vẫn giữ HTML
 * cũ, nên lúc bấm mở một bảng nó đi xin đúng cái tệp không còn nữa → 404 →
 * `lazy()` ném lỗi → không có gì đỡ thì React gỡ sạch cả cây, màn hình trắng.
 *
 * Cách chữa đúng là TẢI LẠI TRANG để lấy HTML mới (trỏ tới chunk mới). Nhưng
 * chỉ một lần: nếu tải lại rồi mà vẫn hỏng (mất mạng thật, máy chủ lỗi thật)
 * thì tải tiếp chỉ thành vòng lặp - lúc ấy để ErrorBoundary hiện nút "Tải lại"
 * cho người dùng tự quyết.
 */

const KHOA_TAI_LAI = "dao-trinh/tai-lai-chunk";
/** Trong khoảng này mà lại hỏng tiếp thì coi như tải lại không chữa được. */
const KHOANG_CHAN = 30_000;

/**
 * Tải lại trang đúng một lần cho mỗi đợt lỗi. Trả `true` nếu đã tải lại.
 *
 * Dùng mốc thời gian chứ không dùng cờ vĩnh viễn: cờ vĩnh viễn thì lần deploy
 * SAU trong cùng phiên sẽ không còn được tự chữa nữa.
 */
export function taiLaiMotLan(): boolean {
  try {
    const truoc = Number(sessionStorage.getItem(KHOA_TAI_LAI) || 0);
    if (Date.now() - truoc < KHOANG_CHAN) return false;
    sessionStorage.setItem(KHOA_TAI_LAI, String(Date.now()));
  } catch {
    // Không ghi được sessionStorage thì không có gì chặn vòng lặp - thà không
    // tự tải lại còn hơn.
    return false;
  }
  window.location.reload();
  return true;
}

/** Lỗi này có phải do không tải được một chunk JS/CSS không. */
export function laLoiNapChunk(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Unable to preload CSS|Loading chunk .* failed|Failed to fetch/i.test(
    msg,
  );
}

const cho = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  nap: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await nap();
    } catch (err) {
      // Mạng chập chờn một nhịp thì thử lại là đủ, khỏi phải tải cả trang.
      try {
        await cho(500);
        return await nap();
      } catch {
        // Tải lại trang thì cứ treo ở Suspense cho tới khi trang mới lên.
        if (laLoiNapChunk(err) && taiLaiMotLan()) return new Promise<never>(() => {});
        throw err;
      }
    }
  });
}
