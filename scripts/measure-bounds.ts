/**
 * Measures the true opaque art bounds of every authored spritesheet frame used
 * by frameBoundsFor, excluding the thin guide lines baked at the sheet's frame
 * edges. Run with `npx tsx scripts/measure-bounds.ts` to AUDIT the hand-written
 * `frameBoundsFor` values in src/data/assetMap.ts: it prints each measured box
 * and flags ones that drift from the current value.
 *
 * Algorithm: a column/row counts as "art" when it has more than MIN_COVER opaque
 * pixels; runs of art columns/rows separated by gaps <= MERGE_GAP are merged
 * (so glows / floating parts stay), then the largest merged span is taken. A
 * far-detached, full-length edge guide line sits past a big gap and is dropped.
 *
 * This is a heuristic: it can over-trim frames with a sparse outer ring (e.g.
 * the portal) or detached specks. ALWAYS confirm a proposed box by viewing the
 * cropped frame before applying it; the runtime crop in spriteFit.ts is what
 * keeps every element's art clean once the bounds are correct.
 */
import sharp from 'sharp';
import { frameBoundsFor } from '../src/data/assetMap';

const F = 209;
const COLS = 6;
const ALPHA = 12;
const MIN_COVER = 6;
const MERGE_GAP = 16;

const sheets: Record<string, string> = {
  tiles: 'public/assets/processed/tiles.png',
  props: 'public/assets/processed/props.png',
  doors: 'public/assets/processed/doors.png',
  destructibles: 'public/assets/processed/destructibles.png',
  interactables: 'public/assets/processed/interactables.png',
};

type Box = { x: number; y: number; width: number; height: number };

function span(counts: number[]): [number, number] {
  const art = counts.map((c) => c > MIN_COVER);
  const runs: Array<[number, number]> = [];
  let start = -1;
  for (let i = 0; i <= art.length; i += 1) {
    if (i < art.length && art[i]) { if (start < 0) start = i; }
    else if (start >= 0) { runs.push([start, i - 1]); start = -1; }
  }
  if (runs.length === 0) return [0, counts.length - 1];
  // Merge runs separated by small gaps, then keep the longest merged span.
  const merged: Array<[number, number]> = [runs[0]];
  for (let i = 1; i < runs.length; i += 1) {
    const last = merged[merged.length - 1];
    if (runs[i][0] - last[1] - 1 <= MERGE_GAP) last[1] = runs[i][1];
    else merged.push(runs[i]);
  }
  return merged.reduce((best, r) => (r[1] - r[0] > best[1] - best[0] ? r : best), merged[0]);
}

async function measure(buf: Buffer, sheetW: number, frame: number): Promise<Box> {
  const ox = (frame % COLS) * F;
  const oy = Math.floor(frame / COLS) * F;
  const colC = new Array(F).fill(0);
  const rowC = new Array(F).fill(0);
  for (let y = 0; y < F; y += 1) {
    for (let x = 0; x < F; x += 1) {
      if (buf[((oy + y) * sheetW + (ox + x)) * 4 + 3] > ALPHA) { colC[x] += 1; rowC[y] += 1; }
    }
  }
  const [x0, x1] = span(colC);
  const [y0, y1] = span(rowC);
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

for (const [category, file] of Object.entries(sheets)) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const current = (frameBoundsFor as Record<string, Record<number, Box>>)[category];
  const lines: string[] = [];
  for (const frame of Object.keys(current).map(Number)) {
    const m = await measure(data, info.width, frame);
    const c = current[frame];
    const diff = Math.abs(m.x - c.x) + Math.abs(m.y - c.y) + Math.abs(m.width - c.width) + Math.abs(m.height - c.height);
    lines.push(`    ${frame}: { x: ${m.x}, y: ${m.y}, width: ${m.width}, height: ${m.height} },${diff > 4 ? `  // was {x:${c.x},y:${c.y},w:${c.width},h:${c.height}}` : ''}`);
  }
  console.log(`  ${category}: {\n${lines.join('\n')}\n  },`);
}
