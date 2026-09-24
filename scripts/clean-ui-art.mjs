/**
 * Clean transparent UI illustrations without redrawing them.
 *
 * - preserves the current files in art-src before the first write;
 * - snaps nearly-clear/solid alpha to 0/255, removing compression haze;
 * - removes the rectangular edge haze from the high-grade pill;
 * - applies a very mild output sharpen for small UI rendering.
 *
 * Every pass starts from the preserved originals, so reruns are deterministic.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const ROOT = 'public/art';
const BACKUP = 'art-src';
const GROUPS = ['empty', 'pill', 'section'];

function cleanAlpha(raw, width, height, relative) {
  const specialPill = relative === 'pill/thuong.png';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let alpha = raw[i + 3];

      // Remove nearly invisible residue and restore fully solid subject pixels.
      if (alpha <= 5) alpha = 0;
      else if (alpha >= 248) alpha = 255;

      if (specialPill && alpha > 0) {
        // The source glow was painted on a square layer. Fade only the outer
        // ellipse so the orb, lotus base and luminous rings stay untouched.
        const dx = (x + 0.5 - width / 2) / (width / 2);
        const dy = (y + 0.5 - height / 2) / (height / 2);
        const radius = Math.sqrt(dx * dx + dy * dy);
        const start = 0.76;
        const end = 0.99;
        if (radius >= end) alpha = 0;
        else if (radius > start) {
          const t = (radius - start) / (end - start);
          const smooth = t * t * (3 - 2 * t);
          alpha = Math.round(alpha * (1 - smooth));
        }
      }

      raw[i + 3] = alpha;
      if (alpha === 0) {
        // Transparent RGB must also be empty; otherwise resampling can pull a
        // brown/white matte back into the visible edge.
        raw[i] = 0;
        raw[i + 1] = 0;
        raw[i + 2] = 0;
      }
    }
  }
}

let changed = 0;
for (const group of GROUPS) {
  const directory = path.join(ROOT, group);
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.png'));
  fs.mkdirSync(path.join(BACKUP, group), { recursive: true });

  for (const file of files) {
    const input = path.join(directory, file);
    const backup = path.join(BACKUP, group, file);
    if (!fs.existsSync(backup)) fs.copyFileSync(input, backup);

    const relative = `${group}/${file}`;
    const { data, info } = await sharp(backup)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    cleanAlpha(data, info.width, info.height, relative);

    const temporary = `${input}.cleaning.png`;
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .sharpen({ sigma: 0.6 })
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 100 })
      .toFile(temporary);
    fs.renameSync(temporary, input);
    changed += 1;
  }
}

console.log(`Đã làm sạch ${changed} ảnh UI; bản trước sửa nằm trong ${BACKUP}/.`);
