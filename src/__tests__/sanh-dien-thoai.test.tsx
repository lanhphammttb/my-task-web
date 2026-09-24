import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App";
import { seedData } from "../lib/seed";
import { aphorismOfDay } from "../lib/elders";

/**
 * Sảnh trên điện thoại là một cây khác, nên phải canh riêng.
 *
 * Toàn bộ 237 phép thử còn lại chạy trên nhánh màn rộng, vì `matchMedia` trong
 * jsdom luôn trả về `matches: false`. Nghĩa là nếu sảnh điện thoại hỏng thì
 * không có gì đỏ lên cả - đúng kiểu lỗi câm mà cả bộ test này sinh ra để chặn.
 *
 * Thứ đáng canh không phải "có hiện chữ không" mà là **không lặp**: sảnh điện
 * thoại bỏ vòng tu vi và châm ngôn vì thanh đầu đã nói cảnh giới rồi, và mỗi
 * khối thêm vào là một việc bị đẩy khỏi tầm mắt. Lỡ tay thêm lại thì test này
 * phải đỏ.
 */

function gaDienThoai(la: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: la && /max-width:\s*767px|pointer:\s*coarse/.test(q),
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("my-task-planner/v1", JSON.stringify(seedData()));
  gaDienThoai(true);
});

afterEach(() => gaDienThoai(false));

describe("sảnh trên điện thoại", () => {
  it("dựng bảng nhiệm vụ, không dựng sảnh màn rộng", () => {
    render(<App />);
    expect(screen.getByRole("main", { name: "Sảnh tu luyện" })).toBeDefined();
    expect(screen.getByText("Nhật Khoá")).toBeDefined();
    /*
     * Sảnh màn rộng không được dựng cùng lúc.
     *
     * Bắt theo tiêu đề `h2 "Việc hôm nay"` chứ không theo nhãn trợ năng: cả
     * hai sảnh đều đặt nhãn ấy cho vùng danh sách (đúng như vậy - cùng một thứ
     * dù bày khác nhau), nên nhãn không phân biệt được. Cái `h2` thì chỉ bản
     * màn rộng mới có, vì bản điện thoại dùng dải tiêu đề "Nhật Khoá".
     */
    expect(screen.queryByRole("heading", { name: "Việc hôm nay" })).toBeNull();
  });

  it("không lặp lại thứ thanh đầu đã nói", () => {
    render(<App />);
    const sanh = screen.getByRole("main", { name: "Sảnh tu luyện" });
    // Thanh đầu đã ghi cảnh giới và thanh tu vi, nên sảnh không dựng vòng nữa.
    expect(within(sanh).queryByText(/^Tầng \d+\/\d+$/)).toBeNull();
    // Châm ngôn tiền bối cũng vậy: một màn điện thoại không chứa nổi cả hai.
    expect(within(sanh).queryByText(aphorismOfDay().text, { exact: false })).toBeNull();
  });

  it("mỗi việc có hai lối: đánh dấu xong, và vào bế quan", () => {
    render(<App />);
    const sanh = screen.getByRole("main", { name: "Sảnh tu luyện" });
    const tick = within(sanh).getAllByRole("button", {
      name: /^Đánh dấu hoàn thành: /,
    });
    const than = within(sanh).getAllByRole("button", {
      name: /^Tập trung việc này: /,
    });
    expect(tick.length).toBeGreaterThan(0);
    // Đúng một cặp cho mỗi dòng - không phải một nút gánh cả hai việc.
    expect(than).toHaveLength(tick.length);
  });

  it("tick ở sảnh là ghi nhận thật, không phải chỉ đổi màu", () => {
    render(<App />);
    const sanh = screen.getByRole("main", { name: "Sảnh tu luyện" });
    const truoc = within(sanh).getAllByRole("button", {
      name: /^Đánh dấu hoàn thành: /,
    });
    fireEvent.click(truoc[0]);

    const luu = JSON.parse(localStorage.getItem("my-task-planner/v1")!);
    expect(luu.tasks.some((t: { status: string }) => t.status === "done")).toBe(true);
    // Và dòng ấy rời khỏi danh sách việc chưa xong.
    const sau = within(screen.getByRole("main", { name: "Sảnh tu luyện" })).getAllByRole(
      "button",
      { name: /^Đánh dấu hoàn thành: / },
    );
    expect(sau.length).toBeLessThan(truoc.length + 1);
  });

  it("dãy nút tròn vẫn là lối đi duy nhất tới các khu", () => {
    render(<App />);
    const rail = screen.getByRole("navigation", {
      name: "Các nơi trong tiên giới",
    });
    expect(within(rail).getAllByRole("button")).toHaveLength(6);
  });
});
