/**
 * Dựng bảng ảnh để mắt thường soi nhanh: ảnh có alpha đặt trên nền tối, ảnh
 * đặc thì xem nguyên bản. Dùng sau mỗi lần thả art mới vào.
 *   node scripts/check-art.mjs chibi element      -> /tmp/art-check.jpg
 */
import sharp from 'sharp';
import fs from 'node:fs';
sharp.cache(false);

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error('cách dùng: node scripts/check-art.mjs <thư mục trong public/art>...');
  process.exit(1);
}
const files = dirs.flatMap((d) =>
  fs.readdirSync(`public/art/${d}`).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => `public/art/${d}/${f}`),
);
const S = 300, COLS = Math.min(4, files.length);
const rows = Math.ceil(files.length / COLS);
const tiles = [];
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(files[i])
    .resize(S - 12, S - 12, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  tiles.push({ input: buf, left: (i % COLS) * S + 6, top: Math.floor(i / COLS) * S + 6 });
}
// Ô sáng/tối xen kẽ để phát hiện nền trắng còn sót và viền bạc
const bgTiles = Array.from({ length: COLS * rows }, (_, i) =>
  i % 2
    ? { input: { create: { width: S, height: S, channels: 3, background: '#2b1f14' } }, left: (i % COLS) * S, top: Math.floor(i / COLS) * S }
    : null,
).filter(Boolean);

await sharp({ create: { width: S * COLS, height: S * rows, channels: 3, background: '#17110b' } })
  .composite([...bgTiles, ...tiles])
  .jpeg({ quality: 90 })
  .toFile('/tmp/art-check.jpg');
console.log(`${files.length} ảnh → /tmp/art-check.jpg`);
