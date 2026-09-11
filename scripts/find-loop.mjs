/**
 * Tìm đoạn lặp tự nhiên trong một video: quét khung hình rồi chọn cặp
 * (bắt đầu, kết thúc) giống nhau nhất, để cắt xong lặp lại không thấy chỗ nối
 * mà video vẫn LUÔN CHẠY XUÔI.
 *
 *   node scripts/find-loop.mjs <video> [độ dài tối thiểu giây] [khoảng quét]
 *
 * Không đảo chiều (ping-pong): tu luyện là hấp thu một chiều, chạy ngược sẽ
 * thành hít khí vào rồi nhả ra.
 */
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

sharp.cache(false);

const [src, minLenArg, rangeArg] = process.argv.slice(2);
if (!src) {
  console.error('cách dùng: node scripts/find-loop.mjs <video> [giây tối thiểu] [từ-đến]');
  process.exit(1);
}
const MIN_LEN = Number(minLenArg ?? 2.5);
const [FROM, TO] = (rangeArg ?? '0-3').split('-').map(Number);
const FPS = 12;
const SIG = 24; // cạnh ảnh chữ ký để so sánh

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-'));
execFileSync('ffmpeg', [
  '-v', 'error', '-ss', String(FROM), '-to', String(TO), '-i', src,
  '-vf', `fps=${FPS},scale=${SIG}:${SIG}`, '-f', 'image2', `${dir}/%04d.png`,
]);

const files = fs.readdirSync(dir).sort();
const sigs = [];
for (const f of files) {
  const raw = await sharp(`${dir}/${f}`).greyscale().raw().toBuffer();
  sigs.push(Float64Array.from(raw));
}
const dist = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
};

const minGap = Math.round(MIN_LEN * FPS);
let best = null;
for (let i = 0; i < sigs.length - minGap; i++) {
  for (let j = i + minGap; j < sigs.length; j++) {
    const d = dist(sigs[i], sigs[j]);
    if (!best || d < best.d) best = { i, j, d };
  }
}
fs.rmSync(dir, { recursive: true, force: true });

if (!best) {
  console.error(`đoạn quét ${FROM}-${TO}s quá ngắn cho đoạn lặp ${MIN_LEN}s`);
  process.exit(1);
}
const t0 = FROM + best.i / FPS;
const t1 = FROM + best.j / FPS;
// Chênh lệch trung bình giữa các khung liền nhau, để biết số trên có nhỏ thật không
let neighbour = 0;
for (let i = 1; i < sigs.length; i++) neighbour += dist(sigs[i - 1], sigs[i]);
neighbour /= sigs.length - 1;

console.log(`quét ${FROM}-${TO}s ở ${FPS} fps · ${sigs.length} khung`);
console.log(`đoạn lặp tốt nhất: ${t0.toFixed(2)}s → ${t1.toFixed(2)}s  (dài ${(t1 - t0).toFixed(2)}s)`);
console.log(`lệch tại chỗ nối : ${best.d.toFixed(2)}  ·  lệch giữa hai khung liền nhau: ${neighbour.toFixed(2)}`);
console.log(best.d <= neighbour * 1.6
  ? '→ chỗ nối lệch không hơn hai khung liền nhau bao nhiêu: cắt thẳng là liền mạch'
  : '→ chỗ nối còn lệch rõ: nên nới khoảng quét hoặc hạ độ dài tối thiểu');
console.log(`\nffmpeg -y -ss ${t0.toFixed(2)} -to ${t1.toFixed(2)} -i ${src} -an ...`);
