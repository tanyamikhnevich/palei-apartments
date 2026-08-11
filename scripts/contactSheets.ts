/**
 * Review helper: one numbered contact sheet per apartment, built from the
 * processed photos, so every frame that will go live can be checked at a glance.
 *
 *   npx tsx scripts/contactSheets.ts <outDir>
 *
 * The number on each tile is its position in import/processed/<slug>/, which is
 * also the position used by `skip` in apartmentSources.ts.
 */
import { readdir, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { APARTMENT_SOURCES, PROCESSED_DIR } from './apartmentSources';

const COLS = 5;
const CELL_W = 260;
const CELL_H = 190;

const label = (n: number) =>
  Buffer.from(
    `<svg width="${CELL_W}" height="${CELL_H}">
       <rect x="0" y="0" width="34" height="26" fill="rgba(0,0,0,0.72)"/>
       <text x="17" y="19" font-family="Helvetica" font-size="16" font-weight="bold"
             fill="#fff" text-anchor="middle">${n}</text>
     </svg>`
  );

async function main() {
  const outDir = process.argv[2];
  if (!outDir) throw new Error('usage: tsx scripts/contactSheets.ts <outDir>');
  await mkdir(outDir, { recursive: true });

  for (const apt of APARTMENT_SOURCES) {
    const dir = path.join(PROCESSED_DIR, apt.slug);
    let files: string[];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith('.webp')).sort();
    } catch {
      continue;
    }
    if (!files.length) continue;

    const rows = Math.ceil(files.length / COLS);
    const tiles = (
      await Promise.all(
        files.map(async (file, i) => {
          const cell = await sharp(path.join(dir, file))
            .resize(CELL_W, CELL_H, { fit: 'cover' })
            .composite([{ input: label(i + 1), top: 0, left: 0 }])
            .toBuffer();
          return {
            input: cell,
            left: (i % COLS) * CELL_W,
            top: Math.floor(i / COLS) * CELL_H,
          };
        })
      )
    ).flat();

    const out = path.join(outDir, `${apt.slug}.jpg`);
    await sharp({
      create: {
        width: COLS * CELL_W,
        height: rows * CELL_H,
        channels: 3,
        background: { r: 18, g: 18, b: 18 },
      },
    })
      .composite(tiles)
      .jpeg({ quality: 70 })
      .toFile(out);

    console.log(`${apt.slug}: ${files.length} photos -> ${path.basename(out)}`);
  }
}

void main();
