import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * The raw logo (public/assets/raw/future_failure_logo.png) ships with a baked-in
 * checkerboard "transparency" background (light grayscale squares, no alpha
 * channel). This script keys that background out into real transparency, trims
 * the result to the artwork, and writes an optimized PNG into public/brand/.
 *
 * We flood-fill the background starting from the image border so that bright
 * metallic highlights *inside* the letters — which are enclosed by the dark
 * letter outlines — are preserved instead of being punched into holes.
 */

const root = process.cwd();
const rawPath = path.join(root, 'public', 'assets', 'raw', 'future_failure_logo.png');
const brandDir = path.join(root, 'public', 'brand');
const outPath = path.join(brandDir, 'logo.png');

const MAX_WIDTH = 1100;
const PAD = 18;

function isCheckerBackground(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Checker squares measure ~241..253 across all channels (near-grayscale).
  return max - min < 24 && min > 205;
}

function isHaloEdge(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Lighter anti-aliased fringe left around the letters after the flood fill.
  return max - min < 44 && min > 188;
}

async function main(): Promise<void> {
  const { data, info } = await sharp(rawPath, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const channels = info.channels;
  const transparent = new Uint8Array(width * height);

  const at = (x: number, y: number): number => (y * width + x) * channels;
  const stack: number[] = [];
  const pushIfBg = (x: number, y: number): void => {
    const p = y * width + x;
    if (transparent[p]) return;
    const i = at(x, y);
    if (isCheckerBackground(data[i], data[i + 1], data[i + 2])) {
      transparent[p] = 1;
      stack.push(x, y);
    }
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }

  while (stack.length > 0) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    if (x > 0) pushIfBg(x - 1, y);
    if (x < width - 1) pushIfBg(x + 1, y);
    if (y > 0) pushIfBg(x, y - 1);
    if (y < height - 1) pushIfBg(x, y + 1);
  }

  // Dilate into the light anti-aliased halo so letter edges stay crisp.
  for (let pass = 0; pass < 2; pass += 1) {
    const edge: number[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x;
        if (transparent[p]) continue;
        const neighbourClear =
          (x > 0 && transparent[p - 1]) ||
          (x < width - 1 && transparent[p + 1]) ||
          (y > 0 && transparent[p - width]) ||
          (y < height - 1 && transparent[p + width]);
        if (!neighbourClear) continue;
        const i = at(x, y);
        if (isHaloEdge(data[i], data[i + 1], data[i + 2])) edge.push(p);
      }
    }
    for (const p of edge) transparent[p] = 1;
  }

  // Apply alpha + compute the opaque bounding box.
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      const i = at(x, y);
      if (transparent[p]) {
        data[i + 3] = 0;
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) throw new Error('Logo keying removed every pixel; thresholds need adjustment.');

  const left = Math.max(0, minX - PAD);
  const top = Math.max(0, minY - PAD);
  const cropWidth = Math.min(width - left, maxX - left + 1 + PAD);
  const cropHeight = Math.min(height - top, maxY - top + 1 + PAD);

  await fs.mkdir(brandDir, { recursive: true });

  const targetWidth = Math.min(MAX_WIDTH, cropWidth);
  await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: targetWidth })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(`[logo] wrote ${path.relative(root, outPath)} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha}).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
