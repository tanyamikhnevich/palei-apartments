/**
 * Builds the link-preview cards — the picture WhatsApp, Telegram and Facebook
 * show when someone pastes a link.
 *
 *   npx tsx scripts/buildOgCards.ts
 *
 * One card per business, because a florist's link that previews a sunset over
 * Bat Yam tells the reader nothing about flowers. The logos are transparent
 * PNGs of different shapes, so each is laid on the site's own background and
 * centred in the 1200×630 frame every chat app crops to.
 */
import path from 'path';
import sharp from 'sharp';
import { ROOT } from './apartmentSources';

const WIDTH = 1200;
const HEIGHT = 630;
/** The site's `--bg`, so the card and the page it opens agree. */
const BG = { r: 250, g: 247, b: 241, alpha: 1 };
/** Room around the logo — a card is read at thumbnail size. */
const PADDING = 0.78;

const CARDS = [
  { logo: 'palei-apartments-logo.png', out: 'og-apartments.png' },
  { logo: 'palei-flowers-logo.png', out: 'og-flowers.png' },
  { logo: 'palei-cars-logo.png', out: 'og-cars.png' },
];

async function build({ logo, out }: { logo: string; out: string }) {
  const source = path.join(ROOT, 'public', logo);
  const mark = await sharp(source)
    .resize({
      width: Math.round(WIDTH * PADDING),
      height: Math.round(HEIGHT * PADDING),
      fit: 'inside',
      withoutEnlargement: false,
    })
    .toBuffer();

  const target = path.join(ROOT, 'public', out);
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(target);

  console.log(`${out} ← ${logo}`);
}

async function main() {
  for (const card of CARDS) await build(card);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
