/**
 * Chuẩn hoá ảnh mới thả vào public/art về đúng định dạng và kích thước web cần.
 * Chạy lại bao nhiêu lần cũng được: file nào đã đúng chuẩn thì bỏ qua.
 *
 *   node scripts/prepare-art.mjs                 # tất cả nhóm
 *   node scripts/prepare-art.mjs award banner    # chỉ nhóm chỉ định
 *
 * Bản gốc được sao vào art-src/ (ngoài public/ nên không vào bản build) trước
 * khi ghi, để luôn còn đường lùi.
 *
 * Việc tách nền dùng flood fill từ mép ảnh chứ không key theo màu, vì chủ thể
 * hay có vùng trắng thật (áo trắng, kim quang) — key theo màu sẽ đục lỗ vào nó.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

sharp.cache(false); // đọc lại file vừa ghi trong cùng process phải ra dữ liệu mới

const ART = 'public/art';
const SRC = 'art-src';
const INK = '#0d0a08'; // nền app, dùng khi dẹp alpha của ảnh cảnh

/**
 * Quy cách từng nhóm. `cut` = kiểu nền cần tách. `maxKB` = ngưỡng dung lượng:
 * file đúng định dạng và đúng kích thước nhưng vượt ngưỡng vẫn bị nén lại, vì
 * đó là dấu hiệu file đã bị thay bằng bản chưa qua xử lý.
 */
const GROUPS = {
  // Nền toàn màn: giữ khung vuông để máy tính cắt trên-dưới, điện thoại cắt hai bên.
  realm: { kind: 'jpeg', w: 1280, h: 1280, quality: 80, maxKB: 400 },
  // 5:1 theo đúng tỷ lệ ảnh nhận được; ép về 4:1 sẽ cắt mất chủ thể ở hai mép.
  banner: { kind: 'jpeg', w: 1200, h: 240, quality: 82, maxKB: 120 },
  encounter: { kind: 'jpeg', w: 1024, h: 576, quality: 82, maxKB: 200 },
  element: { kind: 'png', w: 512, h: 512, cut: 'white', maxKB: 200 },
  // Huy hiệu có hào quang kem toả ra ngoài vành vàng: ngưỡng 'white' quá gắt,
  // hào quang sẽ thành viền trắng bệt trên nền tối.
  award: { kind: 'png', w: 512, h: 512, cut: 'glow', maxKB: 200 },
  chibi: { kind: 'png', w: 512, h: 512, cut: 'checker', maxKB: 200 },
  avatar: { kind: 'png', w: 256, h: 256, maxKB: 120 }, // nền màu phẳng, giữ nguyên
};

/**
 * Icon dạng rỗng: khoảng trắng nằm KÍN trong lòng chủ thể là nền, phải thông.
 * Ảnh không nằm trong danh sách thì khoảng trắng kín được coi là chi tiết của
 * tranh và giữ lại (ví dụ tâm trắng nóng của bông sen lửa trong hoa.png).
 */
const HOLLOW = new Set(['element/kim.png']);

const CUT = {
  white: { lumMin: 244, satMax: 0.05, unmix: true },
  // Nới cả độ sáng và độ bão hoà để ăn nốt hào quang kem, nhưng vẫn dừng lại
  // trước vành vàng (vành có độ bão hoà ~0,35, cao hơn hẳn ngưỡng).
  glow: { lumMin: 232, satMax: 0.16, unmix: true },
  checker: { lumMin: 226, satMax: 0.07, unmix: false },
};

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Tách nền: BFS từ mọi pixel viền, chỉ xoá vùng nền LIỀN MẠCH với viền. */
function cutout(raw, w, h, { lumMin, satMax, unmix }) {
  const isBg = (p) => {
    const i = p * 4;
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return lum(r, g, b) >= lumMin && (mx === 0 ? 0 : (mx - mn) / mx) <= satMax;
  };

  const n = w * h;
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  const push = (x, y) => {
    const p = y * w + x;
    if (bg[p] || !isBg(p)) return;
    bg[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w, y = (p - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // Trong vùng nền: alpha giảm dần theo độ sáng để mép chủ thể không răng cưa.
  const T = lumMin - 22;
  for (let p = 0; p < n; p++) {
    if (!bg[p]) continue;
    const i = p * 4;
    const L = lum(raw[i], raw[i + 1], raw[i + 2]);
    const a = Math.max(0, Math.min(255, Math.round(((255 - L) / (255 - T)) * 255)));
    raw[i + 3] = a;
    // Gỡ phần nền trắng đã trộn vào pixel bán trong suốt, tránh viền bạc.
    if (unmix && a > 0 && a < 255) {
      const f = a / 255;
      for (let c = 0; c < 3; c++) {
        raw[i + c] = Math.max(0, Math.min(255, Math.round((raw[i + c] - 255 * (1 - f)) / f)));
      }
    }
  }
}

/** Thông những vùng trắng phẳng nằm kín trong chủ thể (icon dạng rỗng). */
function clearEnclosed(raw, w, h, minRatio = 0.004) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const minArea = Math.round(n * minRatio);
  let removed = 0;
  const flat = (p) => {
    const i = p * 4;
    if (raw[i + 3] < 250) return false;
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return lum(r, g, b) >= 248 && (mx === 0 ? 0 : (mx - mn) / mx) <= 0.035;
  };
  for (let s = 0; s < n; s++) {
    if (seen[s] || !flat(s)) continue;
    const comp = [s], q = [s];
    seen[s] = 1;
    while (q.length) {
      const cur = q.pop();
      const x = cur % w, y = (cur - x) / w;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (seen[np] || !flat(np)) continue;
        seen[np] = 1;
        q.push(np);
        comp.push(np);
      }
    }
    if (comp.length >= minArea) {
      for (const p of comp) raw[p * 4 + 3] = 0;
      removed += comp.length;
    }
  }
  return removed;
}

const only = process.argv.slice(2);
const groups = only.length ? only : Object.keys(GROUPS);
let touched = 0;

for (const dir of groups) {
  const spec = GROUPS[dir];
  if (!spec) { console.error(`bỏ qua nhóm lạ: ${dir}`); continue; }
  const abs = `${ART}/${dir}`;
  if (!fs.existsSync(abs)) continue;

  for (const f of fs.readdirSync(abs).filter((f) => !f.startsWith('.') && f !== 'README.md')) {
    const p = `${abs}/${f}`;
    const meta = await sharp(p).metadata();
    const ext = spec.kind === 'jpeg' ? '.jpg' : '.png';
    const target = `${abs}/${f.replace(/\.[^.]*$/, '')}${ext}`;
    const kbNow = Math.round(fs.statSync(p).size / 1024);
    const done =
      meta.format === spec.kind &&
      meta.width === spec.w &&
      meta.height === spec.h &&
      p === target &&
      (!spec.maxKB || kbNow <= spec.maxKB);
    if (done) continue;

    fs.mkdirSync(`${SRC}/${dir}`, { recursive: true });
    const backup = `${SRC}/${dir}/${f}`;
    if (!fs.existsSync(backup)) fs.copyFileSync(p, backup);

    let note = '';
    let pipe;
    if (spec.cut) {
      const { width: w, height: h } = meta;
      const raw = await sharp(p).ensureAlpha().raw().toBuffer();
      cutout(raw, w, h, CUT[spec.cut]);
      if (HOLLOW.has(`${dir}/${f}`)) {
        const n = clearEnclosed(raw, w, h);
        if (n) note = `thông lòng ${n} px`;
      }
      // Cắt lề trong suốt rồi đặt vào khung, giữ nguyên tỷ lệ chủ thể.
      const trimmed = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
        .png().trim({ threshold: 2 }).toBuffer();
      pipe = sharp(trimmed).resize(spec.w, spec.h, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    } else if (spec.kind === 'jpeg') {
      pipe = sharp(p).flatten({ background: INK }).resize(spec.w, spec.h, { fit: 'cover', position: 'centre' });
    } else {
      pipe = sharp(p).resize(spec.w, spec.h, { fit: 'cover', position: 'centre' });
    }

    const out = `${target}.out`;
    await (spec.kind === 'jpeg'
      ? pipe.jpeg({ quality: spec.quality, mozjpeg: true })
      : pipe.png({ compressionLevel: 9, effort: 10 })
    ).toFile(out);
    if (p !== target) fs.unlinkSync(p);
    fs.renameSync(out, target);

    const kb = Math.round(fs.statSync(target).size / 1024);
    console.log(
      `${path.relative(ART, target).padEnd(28)} ${meta.width}x${meta.height} ${meta.format}` +
      ` → ${spec.w}x${spec.h} ${spec.kind}  ${String(kb).padStart(4)}KB` + (note ? `  ${note}` : ''),
    );
    touched++;
  }
}

console.log(touched ? `\nđã xử lý ${touched} ảnh · bản gốc ở ${SRC}/` : 'không có ảnh nào cần xử lý');
