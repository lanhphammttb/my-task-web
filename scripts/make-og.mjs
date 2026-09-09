/**
 * Dựng public/og.jpg — ảnh hiện ra khi chia sẻ link web.
 *
 *   node scripts/make-og.mjs
 *
 * Ảnh nền lấy từ art-src/og-bg.png (yêu cầu: chính giữa để trống, KHÔNG có chữ).
 * Chữ được ghép bằng code chứ không nung sẵn vào tranh, để sau này đổi tên hay
 * đổi khẩu hiệu chỉ cần sửa file này rồi chạy lại.
 */
import sharp from 'sharp';
import fs from 'node:fs';

sharp.cache(false);

const SRC = 'art-src/og-bg.png';
const OUT = 'public/og.jpg';
const W = 1200, H = 630;

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TITLE = 'ĐẠO TRÌNH';
const LINE1 = 'Kế hoạch theo ngày · tuần · tháng';
const LINE2 = 'Mỗi việc hoàn thành là một phần tu vi — từ Luyện Khí tới Phi Thăng';

if (!fs.existsSync(SRC)) {
  console.error(`thiếu ảnh nền: ${SRC}`);
  process.exit(1);
}

// Nền: cắt về đúng 1200×630, hạ sáng để chữ kem nổi lên.
const bg = await sharp(SRC)
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.82 })
  .toBuffer();

// Màn tối dốc từ trái sang, chừa nửa phải cho bậc thang và cổng trời.
const scrim = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#0d0a08" stop-opacity="0.92"/>
      <stop offset="52%"  stop-color="#0d0a08" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#0d0a08" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
</svg>`);

const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <g font-family="Georgia, 'Times New Roman', serif">
    <text x="76" y="292" fill="#f4d03f" font-size="82" font-weight="bold"
          letter-spacing="10">${esc(TITLE)}</text>
    <text x="80" y="352" fill="#ece2cd" font-size="30"
          font-family="Avenir Next, Helvetica Neue, sans-serif">${esc(LINE1)}</text>
    <text x="80" y="404" fill="#c4a661" font-size="23"
          font-family="Avenir Next, Helvetica Neue, sans-serif">${esc(LINE2)}</text>
  </g>
  <rect x="80" y="318" width="132" height="3" fill="#c4a661" opacity="0.85"/>
</svg>`);

// Ấn triện 道 đặt phía trên tên, dùng luôn favicon để nhận diện thống nhất.
const seal = await sharp('public/favicon.png').resize(96, 96).toBuffer();

await sharp(bg)
  .composite([
    { input: scrim, top: 0, left: 0 },
    { input: seal, top: 104, left: 78 },
    { input: text, top: 0, left: 0 },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(OUT);

const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`${OUT}  ${W}x${H}  ${kb} KB`);
