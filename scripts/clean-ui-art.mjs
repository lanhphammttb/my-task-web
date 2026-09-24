/**
 * Clean transparent UI illustrations without redrawing them.
 *
 * - uses the cleaned master files in art-src;
 * - snaps nearly-clear/solid alpha to 0/255, removing compression haze;
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
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let alpha = raw[i + 3];

      // Remove nearly invisible residue and restore fully solid subject pixels.
      if (alpha <= 5) alpha = 0;
      else if (alpha >= 248) alpha = 255;

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

    const { data, info } = await sharp(backup)
      .resize(512, 512, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    cleanAlpha(data, info.width, info.height);

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

console.log(`Đã xuất ${changed} ảnh UI từ bản tách nền sạch trong ${BACKUP}/.`);
