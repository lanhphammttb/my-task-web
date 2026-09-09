/**
 * Cắt một ảnh ghép (nhiều banner/icon xếp thành lưới) thành từng file rời.
 *
 *   node scripts/slice-sheet.mjs public/art/banner/banner.png today week month goals focus cave awards stats
 *   node scripts/slice-sheet.mjs public/art/avatar/avatar.png --grid 2x2 avatar-1 avatar-2 avatar-3 avatar-4
 *
 * Mặc định đường cắt được DÒ TỰ ĐỘNG: tìm những hàng/cột đồng màu chạy hết ảnh
 * (rãnh phân cách), sáng hay tối đều nhận.
 *
 * Ảnh nào các ô DÍNH LIỀN không có rãnh — ví dụ mỗi ô một màu nền khác nhau —
 * thì dò không ra, phải chỉ định lưới bằng `--grid <cột>x<hàng>`; khi đó ảnh
 * được chia đều tuyệt đối.
 *
 * Tên file truyền vào theo thứ tự đọc: trái → phải, trên → dưới. Số tên phải
 * khớp số ô, nếu lệch thì script dừng và in ra lưới nó thấy để đối chiếu.
 *
 * Ảnh ghép gốc được chuyển vào art-src/ sau khi cắt. Chạy `npm run art <nhóm>`
 * để chuẩn hoá các file vừa cắt.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

sharp.cache(false);

const argv = process.argv.slice(2);
let forced = null;
const gi = argv.indexOf('--grid');
if (gi !== -1) {
  const m = /^(\d+)x(\d+)$/.exec(argv[gi + 1] ?? '');
  if (!m) {
    console.error('--grid cần dạng <cột>x<hàng>, ví dụ --grid 2x2');
    process.exit(1);
  }
  forced = { cols: Number(m[1]), rows: Number(m[2]) };
  argv.splice(gi, 2);
}
const [sheet, ...names] = argv;
if (!sheet || !names.length) {
  console.error('cách dùng: node scripts/slice-sheet.mjs <ảnh ghép> [--grid CxR] <tên1> <tên2> ...');
  process.exit(1);
}

const dir = path.dirname(sheet);
const { width: w, height: h } = await sharp(sheet).metadata();
const raw = await sharp(sheet).removeAlpha().raw().toBuffer();
const lum = (i) => 0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2];

/** Một hàng/cột là rãnh khi gần như toàn bộ pixel rất sáng, hoặc rất tối. */
function gutters(len, cross, at) {
  const out = [];
  for (let i = 0; i < len; i++) {
    let bright = 0, dark = 0, n = 0;
    for (let j = 0; j < cross; j += 3) {
      const L = lum(at(i, j));
      if (L > 235) bright++;
      else if (L < 22) dark++;
      n++;
    }
    if (bright / n > 0.9 || dark / n > 0.9) out.push(i);
  }
  return out;
}

/** Gộp các chỉ số liền nhau thành đoạn, rồi suy ra các dải nội dung ở giữa. */
function bands(gut, len, minSize) {
  const runs = [];
  for (const v of gut) {
    const last = runs.at(-1);
    if (last && v === last.to + 1) last.to = v;
    else runs.push({ from: v, to: v });
  }
  const out = [];
  let cursor = 0;
  for (const r of runs) {
    if (r.from - cursor >= minSize) out.push({ from: cursor, to: r.from - 1 });
    cursor = r.to + 1;
  }
  if (len - cursor >= minSize) out.push({ from: cursor, to: len - 1 });
  return out;
}

/** Chia đều tuyệt đối, dùng khi các ô dính liền không có rãnh. */
const split = (len, n) =>
  Array.from({ length: n }, (_, i) => ({
    from: Math.round((len * i) / n),
    to: Math.round((len * (i + 1)) / n) - 1,
  }));

let rows, cols;
if (forced) {
  rows = split(h, forced.rows);
  cols = split(w, forced.cols);
} else {
  const rowGut = gutters(h, w, (y, x) => (y * w + x) * 3);
  const colGut = gutters(w, h, (x, y) => (y * w + x) * 3);
  // Ô nhỏ nhất coi là nội dung: 8% cạnh, đủ để bỏ qua vài dòng nhiễu ở mép.
  rows = bands(rowGut, h, Math.round(h * 0.08));
  cols = bands(colGut, w, Math.round(w * 0.08));
}

console.log(
  `ảnh ghép ${w}x${h} → lưới ${cols.length} cột × ${rows.length} hàng = ${cols.length * rows.length} ô` +
  (forced ? ' (chia đều theo --grid)' : ' (dò rãnh tự động)'),
);
rows.forEach((r, i) => console.log(`  hàng ${i + 1}: y ${r.from}–${r.to} (cao ${r.to - r.from + 1})`));
cols.forEach((c, i) => console.log(`  cột  ${i + 1}: x ${c.from}–${c.to} (rộng ${c.to - c.from + 1})`));

if (rows.length * cols.length !== names.length) {
  console.error(`\nLỆCH: ${rows.length * cols.length} ô nhưng nhận ${names.length} tên. Không cắt.`);
  if (!forced) {
    console.error('Nếu các ô dính liền không có rãnh phân cách, chỉ định lưới thủ công:');
    console.error(`  node scripts/slice-sheet.mjs ${sheet} --grid <cột>x<hàng> ${names.join(' ')}`);
  }
  process.exit(1);
}

// Chừa 1 px mỗi phía để chắc chắn không dính rãnh phân cách.
const INSET = 1;
let k = 0;
for (const r of rows) {
  for (const c of cols) {
    const name = names[k++];
    const out = `${dir}/${name}.png`;
    await sharp(sheet)
      .extract({
        left: c.from + INSET,
        top: r.from + INSET,
        width: c.to - c.from + 1 - INSET * 2,
        height: r.to - r.from + 1 - INSET * 2,
      })
      .png({ compressionLevel: 9 })
      .toFile(out);
    const m = await sharp(out).metadata();
    console.log(`${name}.png`.padEnd(20) + `${m.width}x${m.height}  tỷ lệ ${(m.width / m.height).toFixed(2)}:1`);
  }
}

fs.mkdirSync(`art-src/${path.basename(dir)}`, { recursive: true });
const kept = `art-src/${path.basename(dir)}/${path.basename(sheet)}`;
fs.renameSync(sheet, kept);
console.log(`\nđã cắt ${names.length} ảnh · ảnh ghép gốc chuyển vào ${kept}`);
console.log(`bước tiếp: npm run art ${path.basename(dir)}`);
