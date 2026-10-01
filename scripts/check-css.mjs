/*
 * Soát CSS SAU KHI BUILD - `npm run check:css` (chạy luôn ở cuối `npm run build`).
 *
 * Vì sao phải soát bản build chứ không soát mã nguồn: Tailwind v4 chạy CSS qua
 * lightningcss lúc build, và bộ tối ưu này viết lại vài chỗ theo cách mã nguồn
 * không cho thấy. Hai lần đã dính:
 *
 *  1. `backdrop-filter: X; -webkit-backdrop-filter: X` (viết tay cả hai) → nó
 *     chỉ giữ dòng `-webkit-`. Safari vẫn mờ, Chrome/Firefox mất lớp kính.
 *  2. `translate: 0 0; transform: none` → nó gộp rồi bỏ mất `translate`. Tấm
 *     trượt soạn việc trên điện thoại lệch nửa màn hình.
 *
 * Mã nguồn nhìn vẫn đúng, dev server (không tối ưu) cũng đúng - chỉ bản thật
 * mới hỏng. Nên kiểm ngay trên dist/assets/*.css.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const THU_MUC = path.resolve(import.meta.dirname, '..', 'dist', 'assets');
if (!existsSync(THU_MUC)) {
  console.error('check-css: chưa có dist/assets - chạy `npx vite build` trước.');
  process.exit(1);
}

const tep = readdirSync(THU_MUC).filter((t) => t.endsWith('.css'));
if (tep.length === 0) {
  console.error('check-css: không thấy tệp CSS nào trong dist/assets.');
  process.exit(1);
}
const css = tep.map((t) => readFileSync(path.join(THU_MUC, t), 'utf8')).join('\n');

/** Mọi khối `selector{khai báo}` không lồng (đủ cho CSS đã minify). */
const khoi = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  khoi.push({ chon: m[1].trim(), than: m[2] });
}

const loi = [];
const coChuan = (than, prop) => new RegExp(`(^|[;{\\s])${prop}:`).test(than);

// 1. Rule nào có -webkit-backdrop-filter thì phải còn backdrop-filter chuẩn.
for (const { chon, than } of khoi) {
  if (/-webkit-backdrop-filter:/.test(than) && !coChuan(than, 'backdrop-filter')) {
    loi.push(`"${chon.slice(0, 80)}" chỉ còn -webkit-backdrop-filter (mất backdrop-filter chuẩn).`);
  }
}

// 2. Kính mờ của bảng phải có backdrop-filter chuẩn.
const glass = khoi.filter((k) => /(^|,)\.glass-panel$/.test(k.chon));
if (glass.length === 0) loi.push('Không tìm thấy rule .glass-panel.');
else if (!glass.some((k) => coChuan(k.than, 'backdrop-filter'))) {
  loi.push('.glass-panel mất backdrop-filter chuẩn.');
}

// 3. Tấm trượt soạn việc trên điện thoại phải đưa biến translate về 0.
const sheet = khoi.filter((k) => k.chon.includes('.task-editor-mobile') && k.chon.includes('dialog-content'));
if (sheet.length === 0) loi.push('Không tìm thấy rule [data-slot=dialog-content].task-editor-mobile.');
else {
  const than = sheet.map((k) => k.than).join(';');
  if (!/--tw-translate-x:0(px)?(;|$)/.test(than)) loi.push('.task-editor-mobile không còn --tw-translate-x:0.');
  if (!/--tw-translate-y:0(px)?(;|$)/.test(than)) loi.push('.task-editor-mobile không còn --tw-translate-y:0.');
}

// 4. Có `translate:` mà lại đi kèm `transform:none` trong cùng rule là dấu hiệu
//    sắp bị lightningcss nuốt - cảnh báo để người sửa dùng biến --tw-translate-*.
for (const { chon, than } of khoi) {
  if (coChuan(than, 'translate') && /transform:none/.test(than) && !/var\(--tw-translate/.test(than)) {
    loi.push(`"${chon.slice(0, 80)}" có cả translate và transform:none - dễ bị gộp mất translate.`);
  }
}

if (loi.length) {
  console.error(`check-css: ${loi.length} lỗi trong CSS đã build:\n  - ${loi.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-css: ổn (${tep.length} tệp CSS, ${khoi.length} rule).`);
