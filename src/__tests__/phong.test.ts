import { describe, expect, it } from "vitest";
import { PROPS, monTiepTheo, dungTrongPhong, denSang } from "../lib/room";
import { emptyData } from "../lib/storage";
import { todayKey } from "../lib/date";
import type { AppData, Task } from "../types";

/**
 * Căn phòng phải luôn chỉ về PHÍA TRƯỚC.
 *
 * Dòng "Sắp có: ..." là lý do duy nhất để cày tiếp mà căn phòng đưa ra, nên nó
 * sai là hỏng đúng thứ nó sinh ra để làm. Bản đầu lấy món cuối cùng trong mảng,
 * mà mảng ấy xếp theo thứ tự VẼ (xa trước, gần sau) - chẳng liên quan gì tới dễ
 * hay khó. Đứng ở bậc 5 với ngọc lô trong phòng mà app vẫn giục "sắp có: Đồng
 * lô - nâng động phủ lên bậc 3", tức là chỉ ngược về sau lưng người chơi.
 */

const oBac = (n: number): AppData => ({ ...emptyData(), caveLevel: n });

describe("đồ trong động phủ", () => {
  it("không bao giờ gợi ý thứ đã ở sau lưng", () => {
    for (const bac of [1, 2, 3, 4, 5]) {
      const d = oBac(bac);
      const mon = monTiepTheo(d);
      if (!mon) continue;
      // Gợi ý phải là món CHƯA có thật.
      expect(mon.co(d)).toBe(false);
      // Và không được là một bậc lò đan: ba bậc ấy là ba dáng của cùng một cái
      // lò, đổi theo bậc động phủ chứ không phải sắm thêm.
      expect(mon.file.startsWith("lo-dan")).toBe(false);
    }
  });

  it("gợi ý món gần tầm với nhất trước", () => {
    const mon = monTiepTheo(oBac(1));
    // Người mới: thứ rẻ nhất là chọn một công pháp, không phải nâng nhà lên bậc 5.
    expect(mon?.file).toBe("gia-sach");
  });

  it("nâng bậc động phủ thì phòng có thêm đồ, không bao giờ ít đi", () => {
    let truoc = 0;
    for (const bac of [1, 2, 3, 4, 5]) {
      const nay = dungTrongPhong(oBac(bac)).length;
      expect(nay).toBeGreaterThanOrEqual(truoc);
      truoc = nay;
    }
  });

  it("mỗi món chỉ đứng một chỗ, không có hai món chồng lên nhau", () => {
    const day5 = dungTrongPhong(oBac(5));
    const cho = day5.map((p) => `${p.x}:${p.day}`);
    expect(new Set(cho).size).toBe(cho.length);
  });

  it("đèn thắp theo TỶ LỆ việc xong, không theo số việc", () => {
    const hom = todayKey();
    const viec = (i: number, xong: boolean): Task => ({
      id: `t${i}`,
      title: `v${i}`,
      date: hom,
      priority: "medium",
      status: xong ? "done" : "todo",
      tags: [],
      note: "",
      estimateMin: 30,
      focusMin: 0,
      subtasks: [],
      recurrence: "none",
      createdAt: new Date().toISOString(),
      ...(xong ? { completedAt: new Date().toISOString() } : {}),
    });

    // Ghi 3 việc xong hết, và ghi 20 việc xong hết: cả hai đều sáng đủ đèn.
    const it: AppData = { ...emptyData(), tasks: [0, 1, 2].map((i) => viec(i, true)) };
    const nhieu: AppData = {
      ...emptyData(),
      tasks: Array.from({ length: 20 }, (_, i) => viec(i, true)),
    };
    expect(denSang(it)).toBe(5);
    expect(denSang(nhieu)).toBe(5);

    // Chưa ghi việc nào thì không sáng ngọn nào - khác với "xong hết".
    expect(denSang(emptyData())).toBe(0);
  });

  it("mọi món đều khai đủ điều kiện mở, trừ thứ luôn có", () => {
    for (const p of PROPS) {
      if (p.co(emptyData())) continue;
      expect(p.dieuKien, `${p.file} thiếu câu điều kiện`).not.toBe("");
    }
  });
});
