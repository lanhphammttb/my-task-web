import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { AppData } from "../types";
import { emptyData } from "../lib/storage";

/**
 * Mở app lại mà không có gì đổi thì không tải lại cả hồ sơ.
 *
 * Hồ sơ lớn lên mãi - vài MB sau ba năm - mà lần mở app nào cũng kéo nguyên
 * chừng ấy về, kể cả khi vừa mở cách đây năm phút trên chính máy này. Đó lại là
 * trường hợp hay gặp nhất.
 *
 * Thứ đáng canh ở đây không phải "có gọi đúng URL không" mà là **có dám tin
 * bản ở máy không**. Tin suông là sai: số hiệu khớp chỉ nói trạng thái TRÊN
 * SERVER y nguyên, không nói bản ở máy này còn nguyên - nó có thể đã lệch vì
 * một lệnh chưa kịp gửi, vì ghi localStorage hỏng giữa chừng, hay vì người dùng
 * tự sửa. Nên hai phép thử dưới đây là một cặp: khớp thì khỏi tải, lệch thì
 * phải tải lại đầy đủ.
 */

const KHOA_VERSION = "my-task/dong-bo-version";

/** Hồ sơ có đúng một nhiệm vụ, để mấy con số đối chiếu khác không. */
function hoSo(): AppData {
  const d = emptyData();
  d.tasks = [
    {
      id: "t1",
      title: "việc thật",
      note: "",
      date: "2026-09-25",
      priority: "medium",
      status: "todo",
      tags: [],
      estimateMin: 0,
      focusMin: 0,
      subtasks: [],
      recurrence: "none",
      createdAt: "2026-09-25T00:00:00.000Z",
    } as AppData["tasks"][number],
  ];
  d.verified = {
    taskXp: 0,
    sessionMinutes: 0,
    taskCount: 0,
    sessionCount: 0,
    verified: 0,
  };
  return d;
}

const dungSo = { tasks: 1, goals: 0, sessions: 0, ledger: 0, taskXp: 0 };
const daKy = { taskXp: 0, sessionMinutes: 0, taskCount: 0, sessionCount: 0, verified: 0 };

const trangThai = vi.fn();

vi.mock("../lib/api", async (goc) => {
  const that = await goc<typeof import("../lib/api")>();
  return {
    ...that,
    apiEnabled: true,
    api: {
      ...that.api,
      toiLaAi: vi.fn(async () => ({ user: { id: "u1", email: "a@b.c" } })),
      trangThai: (v?: number) => trangThai(v),
    },
  };
});

let useServerSync: typeof import("../store/useServerSync").useServerSync;

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  ({ useServerSync } = await import("../store/useServerSync"));
});

afterEach(() => vi.restoreAllMocks());

describe("tải lại lúc mở app", () => {
  it("số hiệu còn đúng và bản ở máy khớp thì không tải hồ sơ về nữa", async () => {
    localStorage.setItem(KHOA_VERSION, "7");
    const oMay = hoSo();
    const apDung = vi.fn();
    trangThai.mockResolvedValue({ version: 7, khongDoi: true, kiemTra: dungSo, verified: daKy });

    renderHook(() => useServerSync(apDung, undefined, () => oMay));

    await waitFor(() => expect(trangThai).toHaveBeenCalled(), { timeout: 5000 });
    // Điều phải giữ: KHÔNG bao giờ xin bản đầy đủ. Đếm số lần gọi thì giòn -
    // effect nối lại chạy đôi ở chế độ nghiêm ngặt của React.
    expect(trangThai).toHaveBeenCalledWith(7);
    expect(trangThai.mock.calls.every(([v]) => v === 7)).toBe(true);

    /*
     * Hồ sơ giữ nguyên, nhưng `verified` phải được gắn lại.
     *
     * Trường ấy không được lưu xuống đĩa và máy cũng không tự tính lại được -
     * sổ ghi ký bằng khoá nằm trên server. Bỏ qua là tu vi trên màn hình tụt
     * về 0 cho tới lệnh kế tiếp, tức là đổi một lỗi nặng lấy chút băng thông.
     */
    await waitFor(() => expect(apDung).toHaveBeenCalled(), { timeout: 5000 });
    const ra = apDung.mock.calls.at(-1)![0](oMay) as AppData;
    expect(ra.verified).toEqual(daKy);
    expect(ra.tasks).toBe(oMay.tasks);
  });

  it("server bảo không đổi nhưng bản ở máy lệch thì vẫn tải lại đầy đủ", async () => {
    localStorage.setItem(KHOA_VERSION, "7");
    // Máy đang giữ hồ sơ RỖNG trong khi server đếm được một nhiệm vụ.
    const oMay = emptyData();
    const daySo = hoSo();
    const apDung = vi.fn();

    trangThai.mockImplementation(async (v?: number) =>
      v === undefined
        ? { version: 7, data: daySo, tomTat: {}, audit: { ok: true, findings: [] } }
        : { version: 7, khongDoi: true, kiemTra: dungSo, verified: daKy },
    );

    renderHook(() => useServerSync(apDung, undefined, () => oMay));

    // Hỏi kèm số hiệu trước, thấy lệch thì xin bản đầy đủ.
    await waitFor(
      () => expect(trangThai.mock.calls.some(([v]) => v === undefined)).toBe(true),
      { timeout: 5000 },
    );
    expect(trangThai).toHaveBeenCalledWith(7);
    await waitFor(() => expect(apDung).toHaveBeenCalled(), { timeout: 5000 });
  });

  it("chưa từng đồng bộ thì xin thẳng bản đầy đủ", async () => {
    const apDung = vi.fn();
    trangThai.mockResolvedValue({
      version: 3,
      data: hoSo(),
      tomTat: {},
      audit: { ok: true, findings: [] },
    });

    renderHook(() => useServerSync(apDung, undefined, () => emptyData()));

    await waitFor(() => expect(trangThai).toHaveBeenCalled(), { timeout: 5000 });
    expect(trangThai).toHaveBeenCalledWith(undefined);
    // Và nhớ lại số hiệu, để lần mở sau khỏi tải nữa.
    await waitFor(() => expect(localStorage.getItem(KHOA_VERSION)).toBe("3"), {
      timeout: 5000,
    });
  });
});
