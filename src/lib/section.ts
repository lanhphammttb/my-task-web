/**
 * Sự kiện bung một mục đang gập.
 *
 * Bảng phủ cuộn tới mục bằng `getElementById` chứ không qua `location.hash`,
 * nên khi mục đích đang gập thì nó cuộn tới một cái tiêu đề trống. Sự kiện này
 * để bảng bảo mục ấy mở ra trước khi cuộn.
 *
 * Tách khỏi `primitives.tsx` vì tệp đó chỉ nên xuất component - lẫn hằng số vào
 * là Fast Refresh mất tác dụng cho cả tệp.
 */
export const OPEN_SECTION = 'section:open';

/** Bảo mục có id này bung ra, nếu nó đang gập. */
export function requestOpenSection(id: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: id }));
}
