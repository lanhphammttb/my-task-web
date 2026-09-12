import type { Priority } from "../types";

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
  medium: "medium",
  "4": "low",
  thap: "low",
  low: "low",
};

/** Phân tích cú pháp nhanh: "Viết báo cáo !cao @09:00 ~90 #công-việc" */
export function parseQuick(raw: string) {
  let priority: Priority = "medium";
  let startTime: string | undefined;
  let estimateMin: number | undefined;
  const tags: string[] = [];

  const title = raw
    .replace(/!([\p{L}\d]+)/gu, (m, word: string) => {
      const hit = PRIORITY_WORDS[word.toLowerCase()];
      if (!hit) return m;
      priority = hit;
      return "";
    })
    .replace(/@(\d{1,2}):(\d{2})/g, (_m, h: string, mi: string) => {
      startTime = `${h.padStart(2, "0")}:${mi}`;
      return "";
    })
    .replace(/~(\d+)\s*(p|ph|phut|phút|m|min)?\b/gi, (_m, n: string) => {
      estimateMin = Number(n);
      return "";
    })
    .replace(/#([\p{L}\d_-]+)/gu, (_m, tag: string) => {
      tags.push(tag);
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();

  return { title, priority, startTime, estimateMin, tags };
}
