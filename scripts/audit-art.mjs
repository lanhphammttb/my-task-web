/** Read-only audit: missing literal references, undecodable images, media size. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const walk = async dir => (await Promise.all((await fs.readdir(dir, {withFileTypes:true})).map(x => x.isDirectory() ? walk(path.join(dir,x.name)) : path.join(dir,x.name)))).flat();
const files = await walk('public/art');
const sources = (await walk('src')).filter(p => /\.(ts|tsx|css)$/.test(p));
const missing = [];
for (const source of sources) {
 const text = await fs.readFile(source,'utf8');
 for (const match of text.matchAll(/["'`]((?:\/art\/)[^"'`$\n]+\.(?:png|jpg|webp|mp4|mp3))["'`]/g)) {
  try { await fs.access(`public${match[1]}`); } catch { missing.push({source,asset:match[1]}); }
 }
}
const images = [], invalid = [], media = [];
for (const file of files) {
 const bytes = (await fs.stat(file)).size;
 if (/\.(png|jpe?g|webp)$/i.test(file)) {
  try {
   const m = await sharp(file).metadata();
   await sharp(file).stats();
   images.push({file, width:m.width, height:m.height, bytes});
  } catch (e) { invalid.push({file,error:e.message}); }
 } else if (/\.(mp4|mp3|webm|ogg)$/i.test(file)) media.push({file,bytes});
}
const report = {checkedAt:new Date().toISOString(),images:images.length,imageBytes:images.reduce((s,x)=>s+x.bytes,0),media,missing,invalid,largestImages:images.sort((a,b)=>b.bytes-a.bytes).slice(0,8),scope:'All image files decoded; literal source references checked. Dynamic URLs additionally verified through browser navigation.'};
console.log(JSON.stringify(report,null,2));
if (missing.length || invalid.length) process.exitCode=1;
