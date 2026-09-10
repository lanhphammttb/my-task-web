/**
 * Biến một đoạn video thành vòng lặp liền mạch bằng cách CHỒNG MỜ đuôi vào đầu.
 *
 *   node scripts/loop-video.mjs <vào> <ra> <bắt đầu> <kết thúc> [chồng mờ]
 *   node scripts/loop-video.mjs art-src/media/x.mp4 public/art/media/y.mp4 0 3 0.7
 *
 * Vì sao không cắt thẳng: footage nào tăng dần đơn điệu (linh khí tụ mỗi lúc
 * một dày) thì không có hai khung nào giống nhau, cắt thẳng sẽ thấy giật.
 * Vì sao không đảo chiều (ping-pong): tu luyện là hấp thu MỘT CHIỀU, chạy ngược
 * biến nó thành hít khí vào rồi nhả ra.
 *
 * Cách ghép, với đoạn dài D và độ chồng mờ X:
 *   [0 .. X)      = chồng mờ giữa đuôi (D-X .. D) và đầu (0 .. X)
 *   [X .. D-X)    = phát nguyên
 * Khung cuối của bản ra khớp khung đầu, nên lặp lại không thấy chỗ nối.
 * Độ dài bản ra = D - X.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [src, out, fromArg, toArg, xArg] = process.argv.slice(2);
if (!src || !out || fromArg === undefined || toArg === undefined) {
  console.error('cách dùng: node scripts/loop-video.mjs <vào> <ra> <bắt đầu> <kết thúc> [chồng mờ]');
  process.exit(1);
}
const FROM = Number(fromArg);
const TO = Number(toArg);
const X = Number(xArg ?? 0.7);
const D = TO - FROM;
if (D <= X * 2) {
  console.error(`đoạn dài ${D}s quá ngắn cho độ chồng mờ ${X}s (cần > ${X * 2}s)`);
  process.exit(1);
}

const filter = [
  `[0:v]trim=start=${FROM}:end=${TO},setpts=PTS-STARTPTS,split=3[a][b][c]`,
  `[a]trim=start=${D - X}:end=${D},setpts=PTS-STARTPTS[tail]`,
  `[b]trim=start=0:end=${X},setpts=PTS-STARTPTS[head]`,
  `[tail][head]blend=all_expr='A*(1-T/${X})+B*(T/${X})'[xf]`,
  `[c]trim=start=${X}:end=${D - X},setpts=PTS-STARTPTS[mid]`,
  `[xf][mid]concat=n=2:v=1[out]`,
].join(';');

execFileSync('ffmpeg', [
  '-y', '-v', 'error', '-i', src,
  '-filter_complex', filter, '-map', '[out]', '-an',
  '-c:v', 'libx264', '-crf', '27', '-preset', 'slow',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out,
], { stdio: 'inherit' });

const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`${out}  dài ${(D - X).toFixed(2)}s  ${kb} KB  (chồng mờ ${X}s, luôn chạy xuôi)`);
