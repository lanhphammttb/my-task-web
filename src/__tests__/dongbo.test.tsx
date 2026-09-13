import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider, useApp } from "../store/AppStore";
import { KHONG_GUI, LENH } from "../store/lenh";

/**
 * Canh lớp đồng bộ.
 *
 * Chỗ dễ hỏng nhất của cách làm này là **im lặng**: gõ sai tên một hành động
 * trong bảng `LENH` thì không có gì đỏ lên cả - hành động ấy vẫn chạy ở máy,
 * chỉ là không bao giờ được gửi lên server. Người dùng thấy mọi thứ bình
 * thường cho tới hôm mở máy khác và phát hiện thiếu mất một mảng.
 */

function Soi() {
  const ctx = useApp();
  const bang = ctx as unknown as Record<string, unknown>;
  const thieu = Object.keys(LENH).filter(
    (ten) => typeof bang[ten] !== "function",
  );
  const khongMangTen = KHONG_GUI.filter(
    (ten) => typeof bang[ten] !== "function",
  );
  return (
    <div>
      <span data-testid="thieu">{thieu.join(",") || "khong"}</span>
      <span data-testid="khong-gui-la">
        {khongMangTen.join(",") || "khong"}
      </span>
      <span data-testid="trang-thai">{ctx.sync.status}</span>
      <span data-testid="cho">{ctx.sync.pending}</span>
    </div>
  );
}

describe("lớp đồng bộ với server", () => {
  it("mọi tên trong bảng lệnh đều trỏ tới một hành động có thật", () => {
    render(
      <AppProvider>
        <Soi />
      </AppProvider>,
    );
    expect(screen.getByTestId("thieu").textContent).toBe("khong");
  });

  it("danh sách cố tình không gửi cũng phải là hành động có thật", () => {
    render(
      <AppProvider>
        <Soi />
      </AppProvider>,
    );
    expect(screen.getByTestId("khong-gui-la").textContent).toBe("khong");
  });

  it("không cấu hình VITE_API_URL thì chạy một mình, không gọi mạng", () => {
    render(
      <AppProvider>
        <Soi />
      </AppProvider>,
    );
    // Trong test không có VITE_API_URL nên lớp đồng bộ phải nằm im hoàn toàn.
    expect(screen.getByTestId("trang-thai").textContent).toBe("tat");
    expect(screen.getByTestId("cho").textContent).toBe("0");
  });

  it("mỗi hành động chỉ nằm ở một trong hai danh sách", () => {
    for (const ten of KHONG_GUI) {
      expect(LENH[ten], `"${ten}" vừa gửi vừa không gửi`).toBeUndefined();
    }
  });

  it("bảng lệnh phủ hết hành động đổi dữ liệu, trừ những cái đã ghi lý do", () => {
    // Nếu sau này thêm một hành động mới mà quên đưa vào một trong hai danh
    // sách, test này đỏ và bắt phải quyết định: gửi hay không, và vì sao.
    const daBiet = new Set<string>([...Object.keys(LENH), ...KHONG_GUI]);
    const khongDoiDuLieu = new Set([
      "data",
      "sync",
      "lastVisitAt",
      "audit",
      "celebration",
      "dismissCelebration",
      "encounter",
      "dismissEncounter",
      "notify",
    ]);

    let chuaXep: string[] = [];
    function Kiem() {
      const ctx = useApp();
      chuaXep = Object.keys(ctx).filter(
        (k) => !daBiet.has(k) && !khongDoiDuLieu.has(k),
      );
      return null;
    }
    render(
      <AppProvider>
        <Kiem />
      </AppProvider>,
    );
    expect(chuaXep).toEqual([]);
  });
});
