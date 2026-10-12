/**
 * A QR code encoder, small enough to read.
 *
 * Byte mode, error correction level M, versions 1–10 — up to 213 bytes, which
 * is a link or a Wi-Fi network several times over. Written out rather than
 * installed: what this site prints is two short strings on a sticker, and a
 * general-purpose library would be most of a megabyte of modes, renderers and
 * options standing behind that.
 *
 * Follows ISO/IEC 18004. The shape of the code — draw the fixed patterns, lay
 * the codewords in a zigzag, pick the mask that scores best — is the standard's
 * own, and the names below are the standard's too.
 */

/** `modules[y][x]`, true where the module is dark. No quiet zone included. */
export type QrMatrix = boolean[][];

const MAX_VERSION = 10;

/** Level M, indexed by version. */
const ECC_CODEWORDS_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const ERROR_CORRECTION_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

/** How many modules of a version carry data or error correction. */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const aligns = Math.floor(version / 7) + 2;
    result -= (25 * aligns - 10) * aligns - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[version] * ERROR_CORRECTION_BLOCKS[version]
  );
}

/* Reed–Solomon over GF(2^8), reduced by x^8 + x^4 + x^3 + x^2 + 1. */

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

/** The payload as codewords: mode, length, bytes, terminator, padding. */
function encodeData(bytes: Uint8Array, version: number): number[] {
  const capacityBits = dataCodewords(version) * 8;
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };

  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);

  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  return codewords;
}

/** Splits the data into blocks, gives each its error correction, and interleaves them. */
function addErrorCorrection(data: number[], version: number): number[] {
  const blockCount = ERROR_CORRECTION_BLOCKS[version];
  const eccLength = ECC_CODEWORDS_PER_BLOCK[version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortLength = Math.floor(rawCodewords / blockCount);

  const divisor = rsDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i += 1) {
    const part = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += part.length;
    const ecc = rsRemainder(part, divisor);
    // Short blocks get a placeholder so every block has the same shape.
    if (i < shortBlocks) part.push(0);
    blocks.push(part.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function alignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Dark–light–dark×3–light–dark with four light modules on one side: a finder look-alike. */
const FINDER_LIKE = [
  [true, false, true, true, true, false, true, false, false, false, false],
  [false, false, false, false, true, false, true, true, true, false, true],
];

/** How hard a pattern is for a scanner to read — lower is better. */
function penalty(modules: QrMatrix): number {
  const size = modules.length;
  let score = 0;

  const lines: boolean[][] = [];
  for (let i = 0; i < size; i += 1) {
    lines.push(modules[i]);
    lines.push(modules.map((row) => row[i]));
  }

  for (const line of lines) {
    // Runs of five or more of one colour.
    for (let i = 0, run = 1; i < size; i += 1, run += 1) {
      if (i + 1 < size && line[i + 1] === line[i]) continue;
      if (run >= 5) score += run - 2;
      run = 0;
    }
    for (let i = 0; i + 11 <= size; i += 1) {
      for (const pattern of FINDER_LIKE) {
        if (pattern.every((dark, k) => line[i + k] === dark)) score += 40;
      }
    }
  }

  // Two-by-two blocks of one colour.
  for (let y = 0; y + 1 < size; y += 1) {
    for (let x = 0; x + 1 < size; x += 1) {
      const colour = modules[y][x];
      if (colour === modules[y][x + 1] && colour === modules[y + 1][x] && colour === modules[y + 1][x + 1]) {
        score += 3;
      }
    }
  }

  // Balance of dark and light.
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;

  return score;
}

/**
 * The QR code for `text`, or null when it is longer than this encoder goes.
 */
export function qrMatrix(text: string): QrMatrix | null {
  const bytes = new TextEncoder().encode(text);

  let version = 1;
  // Four bits of mode, then the length field.
  while (version <= MAX_VERSION && bytes.length + (version < 10 ? 2 : 3) > dataCodewords(version)) {
    version += 1;
  }
  if (version > MAX_VERSION) return null;

  const size = version * 4 + 17;
  const modules: QrMatrix = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const set = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    fixed[y][x] = true;
  };

  // Timing patterns first: the finders are drawn over their ends.
  for (let i = 0; i < size; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Finders, with their light border.
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, ring !== 2 && ring !== 4);
      }
    }
  }

  const aligns = alignmentPositions(version, size);
  aligns.forEach((cx, i) => {
    aligns.forEach((cy, j) => {
      const last = aligns.length - 1;
      // The three corners that already hold a finder.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  /** Error correction level and mask, written twice around the finders. */
  const drawFormat = (mask: number) => {
    // Level M is 0 in the two level bits.
    const data = mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) === 1;

    for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);

  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // The codewords, in two-module columns from the right edge, up then down.
  const codewords = addErrorCorrection(encodeData(bytes, version), version);
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (fixed[y][x] || index >= codewords.length * 8) continue;
        modules[y][x] = ((codewords[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
        index += 1;
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!fixed[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };

  // Masking is its own inverse, so each candidate is tried and taken back off.
  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < MASKS.length; mask += 1) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty(modules);
    if (score < bestScore) {
      best = mask;
      bestScore = score;
    }
    applyMask(mask);
  }
  applyMask(best);
  drawFormat(best);

  return modules;
}

/**
 * The matrix as one SVG path, in a viewBox that already includes the four-module
 * quiet zone a scanner needs around the code.
 */
export function qrSvgPath(modules: QrMatrix): { path: string; viewBox: string } {
  const quiet = 4;
  const size = modules.length;
  let path = '';
  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    });
  });
  const side = size + quiet * 2;
  return { path, viewBox: `0 0 ${side} ${side}` };
}

/**
 * What a phone's camera reads as "join this network". `\`, `;`, `,`, `:` and
 * `"` mean something in the format, so they are escaped in both fields.
 */
export function wifiQrPayload(name: string, password: string): string {
  const escape = (value: string) => value.replace(/([\\;,:"])/g, '\\$1');
  return password
    ? `WIFI:T:WPA;S:${escape(name)};P:${escape(password)};;`
    : `WIFI:T:nopass;S:${escape(name)};;`;
}
