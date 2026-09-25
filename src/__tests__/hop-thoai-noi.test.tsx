import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AppProvider } from "../store/AppStore";
import TribulationDialog from "../components/TribulationDialog";

/**
 * Hộp thoại phải NỔI trên màn, không được rơi về luồng thường.
 *
 * Lỗi thật đã xảy ra: hộp thoại độ kiếp truyền `relative` vào `DialogContent`,
 * mà `cn()` gộp lớp bằng tailwind-merge nên `relative` đè mất `fixed`. Hộp thoại
 * rơi xuống cuối trang - trên màn 844px mép trên của nó nằm ở 963px. Người dùng
 * bấm "Độ kiếp" và chỉ thấy lớp nền mờ, tưởng app treo.
 *
 * Lỗi này câm với mọi phép thử khác: Playwright vẫn bấm được nút ngoài màn hình,
 * và số liệu sau độ kiếp vẫn đúng. Chỉ mắt người mới thấy. Nên chặn ngay ở gốc:
 * không lớp định vị nào được truyền đè lên phần thân hộp thoại.
 */

const DE_VI_TRI = /\b(relative|static|absolute|sticky)\b/;
const THAN = /<(DialogContent|AlertDialogContent|SheetContent)\b[^>]*className="([^"]*)"/g;

/*
 * Đọc mã nguồn qua `import.meta.glob` chứ không qua `node:fs`: tsconfig của app
 * không nạp kiểu Node, nên `node:fs` trong một tệp test làm hỏng cả `tsc -b` -
 * tức là hỏng luôn bản build.
 */
const NGUON = import.meta.glob<string>(["../**/*.tsx", "!../__tests__/**", "!../components/ui/**"], {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("hộp thoại nổi trên màn", () => {
  it("không chỗ nào truyền lớp định vị đè lên thân hộp thoại", () => {
    const vi: string[] = [];
    for (const [tep, ma] of Object.entries(NGUON)) {
      for (const m of ma.matchAll(THAN)) {
        if (DE_VI_TRI.test(m[2])) vi.push(`${tep}: <${m[1]} className="${m[2]}">`);
      }
    }
    expect(vi).toEqual([]);
  });

  it("hộp thoại độ kiếp mở ra là thân nó mang lớp fixed", () => {
    render(
      <AppProvider>
        <TribulationDialog open onOpenChange={() => {}} />
      </AppProvider>,
    );
    const than = document.querySelector('[data-slot="dialog-content"]');
    expect(than).not.toBeNull();
    const lop = than!.className.split(/\s+/);
    expect(lop).toContain("fixed");
    expect(lop).not.toContain("relative");
  });
});
