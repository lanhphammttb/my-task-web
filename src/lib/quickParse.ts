import type { Priority } from "../types";

/** Bỏ dấu tiếng Việt để "!khẩn", "!khan", "!KHẨN" đều hiểu như nhau. */
const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const PRIORITY_WORDS: Record<string, Priority> = {
  "1": "urgent",
  khan: "urgent",
  gap: "urgent",
  urgent: "urgent",
  "2": "high",
  cao: "high",
  high: "high",
  "3": "medium",
  tb: "medium",
  vua: "medium",
  trungbinh: "medium",
  "trung-binh": "medium",
  medium: "medium",
  "4": "low",
  thap: "low",
  low: "low",
};

/** Chữ cái/số theo Unicode - thay cho \b, vốn không hiểu chữ có dấu. */
const L = "[\\p{L}\\p{N}]";

/** Ngày tương đối: 0 = hôm nay, 1 = mai, 2 = kia/mốt. */
export type DayOffset = 0 | 1 | 2;

/*
 * Chữ đứng trước "mai"/"kia"/"mốt" cho biết đó KHÔNG phải ngày:
 * "chị Mai", "hoa mai", "ban mai", "cái kia", "bên kia"...
 */
const KHONG_PHAI_NGAY = new Set([
  "chi", "anh", "em", "co", "ba", "ong", "ban", "hoa", "be", "con", "cai",
  "ben", "phia", "cho", "nguoi", "nay", "do", "kia", "ay", "thang",
]);

/**
 * Phân tích cú pháp nhanh: "Viết báo cáo !cao @9:00 15p #công-việc mai".
 *
 *  - Ưu tiên: !khẩn/!gấp, !cao, !trung bình/!tb/!vừa, !thấp (có dấu hay không đều được).
 *  - Giờ: @9:00, @09:30, @9h, @9h30.
 *  - Thời lượng: ~90, 15p, 90 phút, 45m, 1h, 1h30.
 *  - Ngày: "hôm nay", "ngày mai", "ngày kia", "ngày mốt"; "mai"/"kia"/"mốt" đứng
 *    đầu hoặc cuối câu (viết thường, không phải tên riêng như "chị Mai").
 *  - Nhãn: #nhãn.
 */
export function parseQuick(raw: string) {
  let priority: Priority = "medium";
  let priorityHit = false;
  let startTime: string | undefined;
  let estimateMin: number | undefined;
  let dayOffset: DayOffset | undefined;
  const tags: string[] = [];

  let text = raw
    // "!trung bình" là hai chữ - bắt riêng trước.
    .replace(new RegExp(`!trung\\s+b[iìíỉĩị]nh(?!${L})`, "giu"), () => {
      priority = "medium";
      priorityHit = true;
      return "";
    })
    .replace(/!([\p{L}\d-]+)/gu, (m, word: string) => {
      const hit = PRIORITY_WORDS[boDau(word)];
      if (!hit) return m;
      priority = hit;
      priorityHit = true;
      return "";
    })
    .replace(/@(\d{1,2})(?::(\d{2})|[hg](\d{2})?)/giu, (m, h: string, m1?: string, m2?: string) => {
      const gio = Number(h);
      const phut = Number(m1 ?? m2 ?? "0");
      if (gio > 23 || phut > 59) return m;
      startTime = `${String(gio).padStart(2, "0")}:${String(phut).padStart(2, "0")}`;
      return "";
    })
    .replace(/~(\d+)\s*(p|ph|phut|phút|m|min)?(?![\p{L}\d])/giu, (_m, n: string) => {
      estimateMin = Number(n);
      return "";
    })
    // 1h30, 1h30p, 2h, 1g30 - nhưng "lúc 5h", "5h sáng" là GIỜ, không phải thời lượng.
    .replace(new RegExp(`(?<!${L}|lúc\\s)(\\d{1,2})\\s?[hg](?:(\\d{1,2})\\s?(?:p|ph|phút|phut|m)?)?(?!${L}|\\s*(?:sáng|chiều|tối|trưa|đêm))`, "giu"), (m, h: string, mi?: string) => {
      if (estimateMin !== undefined) return m;
      const phut = Number(h) * 60 + Number(mi ?? 0);
      if (!phut || (mi && Number(mi) > 59)) return m;
      estimateMin = phut;
      return "";
    })
    // 15p, 90 phút, 45m, 30min
    .replace(new RegExp(`(?<!${L})(\\d{1,3})\\s?(p|ph|phút|phut|m|min)(?!${L})`, "giu"), (m, n: string) => {
      if (estimateMin !== undefined || !Number(n)) return m;
      estimateMin = Number(n);
      return "";
    })
    .replace(/#([\p{L}\d_-]+)/gu, (_m, tag: string) => {
      tags.push(tag);
      return "";
    })
    .replace(new RegExp(`(?<!${L})(hôm nay|ngày mai|ngày kia|ngày mốt)(?!${L})`, "giu"), (_m, w: string) => {
      const k = boDau(w);
      dayOffset = k === "hom nay" ? 0 : k === "ngay mai" ? 1 : 2;
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();

  // "mai"/"kia"/"mốt" đơn lẻ: chỉ nhận ở đầu hoặc cuối câu, viết thường (hoặc
  // viết hoa ở đầu câu), và không đứng sau "chị", "hoa", "cái"...
  if (dayOffset === undefined) {
    const tu = text.split(" ");
    const thu = (i: number) => {
      const w = tu[i];
      if (!w) return false;
      // So chữ có dấu: "mốt" là ngày kia, "một" là số một.
      const k = w.toLowerCase();
      if (k !== "mai" && k !== "kia" && k !== "mốt") return false;
      if (i > 0 && w !== w.toLowerCase()) return false; // "chị Mai"
      if (i > 0 && KHONG_PHAI_NGAY.has(boDau(tu[i - 1]))) return false;
      if (tu.length === 1) return false; // cả tên việc chỉ là "mai" thì giữ
      dayOffset = k === "mai" ? 1 : 2;
      tu.splice(i, 1);
      return true;
    };
    if (!thu(tu.length - 1)) thu(0);
    text = tu.join(" ").trim();
  }

  return { title: text, priority, priorityHit, startTime, estimateMin, dayOffset, tags };
}
