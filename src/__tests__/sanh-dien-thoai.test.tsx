import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App";
import { seedData } from "../lib/seed";
import { aphorismOfDay } from "../lib/elders";
import { todayKey } from "../lib/date";

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

  it("không lặp vòng tu vi nhưng vẫn giữ cao nhân trong thế giới", () => {
    render(<App />);
    const sanh = screen.getByRole("main", { name: "Sảnh tu luyện" });
    // Thanh đầu đã ghi cảnh giới và thanh tu vi, nên sảnh không dựng vòng nữa.
    expect(within(sanh).queryByText(/^Tầng \d+\/\d+$/)).toBeNull();
    const teaching = within(sanh).getByLabelText("Lời tiền bối");
    expect(within(teaching).getByText(aphorismOfDay().text, { exact: false })).toBeDefined();
    expect(within(teaching).getByRole("img", { name: /Chân dung/ })).toBeDefined();
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

  it("đổi khu bằng thanh đáy và giữ lối về Sơn Môn", async () => {
    render(<App />);
    expect(screen.queryByRole("navigation", { name: "Các nơi trong tiên giới" })).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Thanh điều hướng chính" });
    expect(within(nav).getAllByRole("button")).toHaveLength(8);
    fireEvent.click(within(nav).getByRole("button", { name: "Hành Sự" }));
    expect(await screen.findByRole("dialog", { name: "Hành Sự Đường" })).toBeDefined();
    expect(within(nav).getByRole("button", { name: "Hành Sự" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(within(nav).getByRole("button", { name: "Sơn Môn" }));
    expect(screen.getByRole("main", { name: "Sảnh tu luyện" }).hasAttribute("inert")).toBe(false);
  });

  it("giữ một hàng mục lục và đưa bồ đoàn về đúng màn Bế Quan chung", async () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Thanh điều hướng chính" });
    fireEvent.click(within(nav).getByRole("button", { name: "Động Phủ" }));

    const cave = await screen.findByRole("dialog", { name: "Động Phủ" });
    await within(cave).findByRole("tablist", { name: "Các mục trong Động Phủ" });
    expect(within(cave).queryByRole("tab", { name: "Tĩnh thất" })).toBeNull();
    expect(within(cave).queryByRole("group", { name: "Thao tác trong động phủ" })).toBeNull();
    fireEvent.click(within(cave).getByRole("tab", { name: "Đan đường" }));
    expect(within(cave).getByRole("tab", { name: "Đan đường" }).getAttribute("aria-selected")).toBe("true");
    expect(within(cave).getByRole("heading", { name: "Đan đường" })).toBeDefined();

    fireEvent.click(within(cave).getByRole("button", { name: "Bồ đoàn — mở Bế Quan" }));

    expect(await screen.findByRole("dialog", { name: "Bế Quan" })).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "Động Phủ" })).toBeNull();
    expect(await screen.findByRole("heading", { name: "Bế quan tu luyện" })).toBeDefined();
  });

  it("hiện mọi khu trực tiếp và chỉ có một nút Cài đặt", async () => {
    render(<App />);
    expect(screen.getAllByRole("button", { name: "Cài đặt" })).toHaveLength(1);
    const nav = screen.getByRole("navigation", { name: "Thanh điều hướng chính" });
    expect(within(nav).queryByRole("button", { name: "Thêm" })).toBeNull();
    for (const name of ["Tiên Lộ", "Đại Nguyện", "Tu Hành Lục"]) {
      expect(within(nav).getByRole("button", { name })).toBeDefined();
    }
    fireEvent.click(within(nav).getByRole("button", { name: "Đại Nguyện" }));
    expect(await screen.findByRole("dialog", { name: "Đại Nguyện" })).toBeDefined();
  });

  it("báo phần thưởng đang chờ và dẫn thẳng tới nơi xử lý", async () => {
    const data = seedData();
    data.tasks[0] = {
      ...data.tasks[0],
      date: todayKey(),
      status: "done",
      completedAt: new Date().toISOString(),
      completedOn: todayKey(),
    };
    localStorage.setItem("my-task-planner/v1", JSON.stringify(data));
    render(<App />);
    const signal = screen.getByRole("button", { name: /hòm kỳ ngộ đang chờ mở/i });
    fireEvent.click(signal);
    expect(await screen.findByRole("dialog", { name: "Hành Sự Đường" })).toBeDefined();
  });
});
