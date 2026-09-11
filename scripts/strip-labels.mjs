/**
 * Xoá dải nhãn tên file nung sẵn trong ảnh ghép.
 *
 *   node scripts/strip-labels.mjs <ảnh ghép> [--dry]
 *
 * Nhãn là một viên thuốc bo tròn màu xám lam phẳng, chữ trắng bên trong. Tìm
 * theo MÀU rồi lọc theo DÁNG (rộng, thấp, nằm ở phần dưới ô) nên thân con vật
 * màu xám cũng không bị nhầm. Xoá xong ghi đè sheet, cắt lại là sạch.
 */
import sharp from 'sharp';
import fs from 'node:fs';

sharp.cache(false);

const [src, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
if (!src) { console.error('cách dùng: node scripts/strip-labels.mjs <ảnh ghép> [--dry]'); process.exit(1); }

const { width: W, height: H } = await sharp(src).metadata();
const raw = await sharp(src).ensureAlpha().raw().toBuffer();
const N = W * H;

// Màu viên nhãn đo được trên sheet: xám lam phẳng, bão hoà rất thấp.
const isPill = (p) => {
  const i = p * 4;
  if (raw[i + 3] < 150) return false;
  const r = raw[i], g = raw[i + 1], b = raw[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return Math.abs(r - 120) < 30 && Math.abs(g - 122) < 30 && Math.abs(b - 136) < 30
    && (mx === 0 ? 0 : (mx - mn) / mx) < 0.22;
};

const seen = new Uint8Array(N);
const boxes = [];
for (let s = 0; s < N; s++) {
  if (seen[s] || !isPill(s)) continue;
  let x0 = W, x1 = 0, y0 = H, y1 = 0, area = 0;
  const q = [s]; seen[s] = 1;
  while (q.length) {
    const cur = q.pop();
    const x = cur % W, y = (cur - x) / W;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    area++;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const np = ny * W + nx;
      if (!seen[np] && isPill(np)) { seen[np] = 1; q.push(np); }
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  // Dáng viên nhãn: rộng hơn cao nhiều, không quá to, và đặc (không rỗng ruột).
  if (bw > 70 && bh >= 14 && bh <= 46 && bw / bh > 2.5 && area > bw * bh * 0.5) {
    boxes.push({ x0, y0, x1, y1 });
  }
}

console.log(`${src}: tìm được ${boxes.length} nhãn`);
boxes.forEach((b, i) => console.log(`  ${i + 1}. x ${b.x0}-${b.x1}  y ${b.y0}-${b.y1}  (${b.x1-b.x0+1}x${b.y1-b.y0+1})`));
if (dry) { console.log('\n(--dry, chưa ghi)'); process.exit(0); }

// Nới ra 3 px để nuốt luôn chữ trắng và viền răng cưa quanh viên nhãn.
const PAD = 3;
for (const b of boxes) {
  for (let y = Math.max(0, b.y0 - PAD); y <= Math.min(H - 1, b.y1 + PAD); y++)
    for (let x = Math.max(0, b.x0 - PAD); x <= Math.min(W - 1, b.x1 + PAD); x++)
      raw[(y * W + x) * 4 + 3] = 0;
}
await sharp(raw, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 }).toFile(`${src}.out`);
fs.renameSync(`${src}.out`, src);
console.log(`\nđã xoá ${boxes.length} nhãn khỏi ${src}`);
