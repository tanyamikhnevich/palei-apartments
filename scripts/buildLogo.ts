/**
 * Turns the supplied logo photo (navy line art on a flat grey field) into a
 * transparent PNG plus a favicon, so it sits on the site's warm background
 * instead of carrying a grey square around.
 *
 *   npx tsx scripts/buildLogo.ts <source-image>
 */
import path from 'path';
import sharp from 'sharp';
import { ROOT } from './apartmentSources';

const OUT_LOGO = path.join(ROOT, 'public', 'palei-logo.png');
const OUT_MARK = path.join(ROOT, 'public', 'palei-mark.png');
const OUT_ICON = path.join(ROOT, 'src', 'app', 'icon.png');

/** Fraction of the radius kept when dropping the surrounding ring. */
const RING_INNER = 0.86;
const ICON_BG = { r: 250, g: 247, b: 241, alpha: 1 }; // --bg

async function main() {
  const src = process.argv[2];
  if (!src) throw new Error('usage: tsx scripts/buildLogo.ts <source-image>');

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.channels;
  const at = (x: number, y: number) => (y * info.width + x) * px;

  // The field colour is whatever fills the corner; the ink is the darkest pixel.
  const bg = [data[0], data[1], data[2]];
  let ink = [0, 0, 0];
  let darkest = Infinity;
  for (let i = 0; i < data.length; i += px) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    if (lum < darkest) {
      darkest = lum;
      ink = [data[i], data[i + 1], data[i + 2]];
    }
  }

  const spread = Math.hypot(bg[0] - ink[0], bg[1] - ink[1], bg[2] - ink[2]);
  const out = Buffer.alloc(info.width * info.height * 4);

  // Alpha is how far a pixel travelled from the field towards the ink, which
  // keeps the anti-aliased edges smooth instead of jagged.
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = at(x, y);
      const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
      const alpha = Math.max(0, Math.min(1, dist / spread));
      const o = (y * info.width + x) * 4;
      out[o] = ink[0];
      out[o + 1] = ink[1];
      out[o + 2] = ink[2];
      out[o + 3] = Math.round(alpha * 255);
    }
  }

  const keyed = sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).trim({ threshold: 1 });

  // The round badge is unreadable at header size, so the wordmark inside it is
  // published separately: erase everything beyond the ring's inner edge, then
  // trim back to the lettering.
  const circle = await keyed.clone().raw().toBuffer({ resolveWithObject: true });
  const cw = circle.info.width;
  const ch = circle.info.height;
  const cx = cw / 2;
  const cy = ch / 2;
  const limit = (Math.min(cw, ch) / 2) * RING_INNER;
  const inner = Buffer.from(circle.data);

  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      if (Math.hypot(x - cx, y - cy) > limit) {
        inner[(y * cw + x) * 4 + 3] = 0;
      }
    }
  }

  await sharp(inner, { raw: { width: cw, height: ch, channels: 4 } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toFile(OUT_LOGO);

  await keyed
    .clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_MARK);

  // The favicon needs an opaque field, or navy art vanishes on a dark tab bar.
  await keyed
    .clone()
    .resize(448, 448, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: ICON_BG })
    .flatten({ background: ICON_BG })
    .png({ compressionLevel: 9 })
    .toFile(OUT_ICON);

  console.log(`field rgb(${bg}) · ink rgb(${ink})`);
  for (const file of [OUT_LOGO, OUT_MARK, OUT_ICON]) {
    const meta = await sharp(file).metadata();
    console.log(`${path.relative(ROOT, file)}: ${meta.width}x${meta.height}, alpha ${meta.hasAlpha}`);
  }
}

void main();
