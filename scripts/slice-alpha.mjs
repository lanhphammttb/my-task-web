/**
 * Cắt ảnh ghép có NỀN TRONG SUỐT thành từng file rời, dựa vào vùng đặc của
 * kênh alpha chứ không dựa vào rãnh phân cách màu.
 *
 *   node scripts/slice-alpha.mjs <ảnh ghép> [--dry] <tên1> <tên2> ...
 *
 * Khác `slice-sheet.mjs` ở ba chỗ, đều là những chỗ lưới đều làm không được:
 *
 * 1. Dò HÀNG trước, rồi dò CỘT TRONG TỪNG HÀNG. Nhờ vậy hàng cuối chỉ có 2 ô
 *    đặt lệch giữa vẫn cắt đúng, và các ô chạm nhau ở hàng này không làm hỏng
 *    hàng khác.
 * 2. Bỏ dải nhãn chữ ở đáy ô. Mấy sheet này có nung tên file dưới mỗi hình;
 *    không bỏ thì chữ lọt thẳng vào ảnh dùng thật.
 * 3. `--dry` chỉ in lưới dò được, không ghi file — để đối chiếu trước khi cắt.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

sharp.cache(false);

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
// Ngưỡng alpha coi là "có nội dung". Nâng lên khi hào quang mờ của các ô bắc
// cầu sang nhau làm chúng bị dò thành một khối.
let ink = 14;
const ii = argv.indexOf('--ink');
if (ii !== -1) { ink = Number(argv[ii + 1]); argv.splice(ii, 2); }
const [sheet, ...names] = argv.filter((a) => a !== '--dry');
if (!sheet) {
  console.error('cách dùng: node scripts/slice-alpha.mjs <ảnh ghép> [--dry] <tên1> ...');
  process.exit(1);
}

const dir = path.dirname(sheet);
const { width: W, height: H } = await sharp(sheet).metadata();
const raw = await sharp(sheet).ensureAlpha().raw().toBuffer();
const alphaAt = (x, y) => raw[(y * W + x) * 4 + 3];

/** Các đoạn liên tiếp thoả `pred`, bỏ đoạn ngắn hơn `min`. */
function bands(count, pred, min) {
  const out = [];
  let start = null;
  for (let i = 0; i < count; i++) {
    if (pred(i)) {
      if (start === null) start = i;
    } else if (start !== null) {
      if (i - start >= min) out.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null && count - start >= min) out.push([start, count - 1]);
  return out;
}

const INK = ink;
const rowHas = (y, x0 = 0, x1 = W - 1) => {
  for (let x = x0; x <= x1; x++) if (alphaAt(x, y) > INK) return true;
  return false;
};
const colHas = (x, y0, y1) => {
  for (let y = y0; y <= y1; y++) if (alphaAt(x, y) > INK) return true;
  return false;
};

const rows = bands(H, (y) => rowHas(y), Math.round(H * 0.04));
const cells = [];
for (const [y0, y1] of rows) {
  const cols = bands(W, (x) => colHas(x, y0, y1), Math.round(W * 0.04));
  for (const [x0, x1] of cols) {
    // Trong ô: tìm các dải nội dung theo chiều dọc. Dải cuối mà vừa thấp vừa
    // hẹp hơn dải trước thì đó là nhãn chữ, bỏ đi.
    const sub = bands(y1 - y0 + 1, (i) => rowHas(y0 + i, x0, x1), 3);
    let bottom = y1;
    if (sub.length > 1) {
      const [ls, le] = sub[sub.length - 1];
      const [ps, pe] = sub[sub.length - 2];
      const labelH = le - ls + 1;
      const prevH = pe - ps + 1;
      const widthOf = (a, b) => {
        const c = bands(x1 - x0 + 1, (i) => colHas(x0 + i, y0 + a, y0 + b), 1);
        return c.length ? c[c.length - 1][1] - c[0][0] + 1 : 0;
      };
      if (labelH < prevH * 0.5 && widthOf(ls, le) < widthOf(ps, pe) * 0.85) {
        bottom = y0 + ps + prevH - 1;
      }
    }
    cells.push({ x0, y0, x1, y1: bottom });
  }
}

console.log(`${sheet}  ${W}x${H} → dò được ${cells.length} ô`);
rows.forEach(([a, b], i) => {
  const n = cells.filter((c) => c.y0 >= a && c.y0 <= b).length;
  console.log(`  hàng ${i + 1}: y ${a}-${b} · ${n} ô`);
});

if (names.length && cells.length !== names.length) {
  console.error(`\nLỆCH: ${cells.length} ô nhưng nhận ${names.length} tên. Không cắt.`);
  process.exit(1);
}
if (dry || !names.length) {
  console.log('\n(chế độ --dry, chưa ghi file)');
  process.exit(0);
}

const PAD = 4;
for (let i = 0; i < cells.length; i++) {
  const c = cells[i];
  const left = Math.max(0, c.x0 - PAD);
  const top = Math.max(0, c.y0 - PAD);
  const out = `${dir}/${names[i]}.png`;
  await sharp(sheet)
    .extract({
      left,
      top,
      width: Math.min(W - left, c.x1 - c.x0 + 1 + PAD * 2),
      height: Math.min(H - top, c.y1 - c.y0 + 1 + PAD * 2),
    })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${names[i]}.png`.padEnd(22) + `${m.width}x${m.height}`);
}
fs.mkdirSync(`art-src/${path.basename(dir)}`, { recursive: true });
const kept = `art-src/${path.basename(dir)}/${path.basename(sheet)}`;
fs.renameSync(sheet, kept);
console.log(`\nđã cắt ${names.length} ảnh · ảnh ghép gốc chuyển vào ${kept}`);
