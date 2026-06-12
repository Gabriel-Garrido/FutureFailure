import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type AssetCategory =
  | 'player'
  | 'tiles'
  | 'props'
  | 'hazards'
  | 'doors'
  | 'pickups'
  | 'destructibles'
  | 'trooper'
  | 'drone'
  | 'mech'
  | 'interactables';

type ManifestEntry = {
  key: string;
  path: string;
  rawPath: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  width: number;
  height: number;
  category: AssetCategory;
  processed: boolean;
  warnings: string[];
};

const root = process.cwd();
const rawDir = path.join(root, 'public', 'assets', 'raw');
const processedDir = path.join(root, 'public', 'assets', 'processed');
const manifestPath = path.join(root, 'src', 'assets', 'assetManifest.ts');

const sheetCategories: AssetCategory[] = [
  'tiles',
  'props',
  'hazards',
  'doors',
  'pickups',
  'destructibles',
  'trooper',
  'drone',
  'mech',
  'interactables',
];

const categoryPriority = new Map<AssetCategory, number>([
  ['player', 0],
  ...sheetCategories.map((category, index) => [category, index + 1] as const),
]);

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function isNear(value: number, target: number, tolerance = 8): boolean {
  return Math.abs(value - target) <= tolerance;
}

function categoryFromName(name: string): AssetCategory | undefined {
  const normalized = slugify(name);
  if (normalized.includes('player') || normalized.includes('hero')) return 'player';
  if (normalized.includes('tile') || normalized.includes('platform')) return 'tiles';
  if (normalized.includes('prop') || normalized.includes('machinery')) return 'props';
  if (normalized.includes('hazard') || normalized.includes('trap') || normalized.includes('reactor')) return 'hazards';
  if (normalized.includes('door') || normalized.includes('portal')) return 'doors';
  if (normalized.includes('pickup') || normalized.includes('keycard') || normalized.includes('health')) return 'pickups';
  if (normalized.includes('destructible') || normalized.includes('crate') || normalized.includes('barrel')) return 'destructibles';
  if (normalized.includes('trooper') || normalized.includes('soldier')) return 'trooper';
  if (normalized.includes('drone')) return 'drone';
  if (normalized.includes('mech')) return 'mech';
  if (normalized.includes('interactable') || normalized.includes('terminal') || normalized.includes('checkpoint')) return 'interactables';
  return undefined;
}

function classify(name: string, width: number, height: number, sheetIndex: number): Omit<ManifestEntry, 'key' | 'path' | 'rawPath' | 'processed' | 'warnings'> {
  const namedCategory = categoryFromName(name);
  if ((isNear(width, 1400) && isNear(height, 1120)) || namedCategory === 'player') {
    return { columns: 5, rows: 4, frameWidth: 280, frameHeight: 280, width: 1400, height: 1120, category: 'player' };
  }

  if (isNear(width, 1254) && isNear(height, 1254)) {
    return {
      columns: 6,
      rows: 6,
      frameWidth: 209,
      frameHeight: 209,
      width: 1254,
      height: 1254,
      category: namedCategory ?? sheetCategories[sheetIndex] ?? 'props',
    };
  }

  return {
    columns: 1,
    rows: 1,
    frameWidth: width,
    frameHeight: height,
    width,
    height,
    category: 'props',
  };
}

async function moveRootPngs(): Promise<void> {
  await fs.mkdir(rawDir, { recursive: true });
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.png')) continue;
    const from = path.join(root, entry.name);
    const to = path.join(rawDir, entry.name);
    await fs.rename(from, to).catch(async () => {
      await fs.copyFile(from, to);
      await fs.unlink(from);
    });
    console.log(`[assets] moved root PNG -> public/assets/raw/${entry.name}`);
  }
}

function cleanPixels(input: Buffer, width: number, height: number, columns: number, rows: number): Buffer {
  const output = Buffer.from(input);
  const frameWidth = Math.floor(width / columns);
  const frameHeight = Math.floor(height / rows);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = output[idx];
      const g = output[idx + 1];
      const b = output[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const nearWhite = r > 235 && g > 235 && b > 235;
      const nearCheckerLight = max > 210 && min > 180 && max - min < 24;
      const nearCheckerDark = max > 145 && min > 115 && max - min < 22;
      const onGridLine = columns > 1 && rows > 1 && (x % frameWidth <= 1 || y % frameHeight <= 1 || frameWidth - (x % frameWidth) <= 2 || frameHeight - (y % frameHeight) <= 2);

      if (nearWhite || nearCheckerLight || nearCheckerDark || onGridLine) {
        output[idx + 3] = 0;
      }
    }
  }

  return output;
}

async function processOne(fileName: string, sheetIndex: number): Promise<ManifestEntry> {
  const rawPath = path.join(rawDir, fileName);
  const image = sharp(rawPath, { failOn: 'none' }).ensureAlpha();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const warnings: string[] = [];
  const classification = classify(fileName, width, height, sheetIndex);
  const key = classification.category;
  const outName = `${key}.png`;
  const outPath = path.join(processedDir, outName);

  if (width !== classification.width || height !== classification.height) {
    warnings.push(`Resizing ${fileName} from ${width}x${height} to ${classification.width}x${classification.height}.`);
  }

  if (classification.width % classification.columns !== 0 || classification.height % classification.rows !== 0) {
    warnings.push(`Dimensions for ${fileName} are not divisible by ${classification.columns}x${classification.rows}; using raw fallback.`);
  }

  try {
    const raw = await sharp(rawPath, { failOn: 'none' })
      .resize(classification.width, classification.height, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const cleaned = cleanPixels(raw, classification.width, classification.height, classification.columns, classification.rows);
    await sharp(cleaned, {
      raw: { width: classification.width, height: classification.height, channels: 4 },
    })
      .png({ compressionLevel: 9, palette: false })
      .toFile(outPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not safely process ${fileName}: ${message}. Raw fallback remains available.`);
    await fs.copyFile(rawPath, outPath);
  }

  for (const warning of warnings) {
    console.warn(`[assets] warning: ${warning}`);
  }

  return {
    key,
    path: `/assets/processed/${outName}`,
    rawPath: `/assets/raw/${fileName}`,
    columns: classification.columns,
    rows: classification.rows,
    frameWidth: classification.frameWidth,
    frameHeight: classification.frameHeight,
    width: classification.width,
    height: classification.height,
    category: classification.category,
    processed: warnings.length === 0,
    warnings,
  };
}

async function writeManifest(entries: ManifestEntry[]): Promise<void> {
  const body = `export type AssetCategory = ${[...new Set(entries.map((entry) => `'${entry.category}'`))].join(' | ') || "'props'"};\n\n`
    + `export type AssetManifestEntry = {\n`
    + `  key: string;\n  path: string;\n  rawPath: string;\n  columns: number;\n  rows: number;\n  frameWidth: number;\n  frameHeight: number;\n  width: number;\n  height: number;\n  category: AssetCategory;\n  processed: boolean;\n  warnings: string[];\n};\n\n`
    + `export const assetManifest = ${JSON.stringify(entries, null, 2)} as const satisfies readonly AssetManifestEntry[];\n`;

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, body, 'utf8');
}

async function main(): Promise<void> {
  await fs.mkdir(processedDir, { recursive: true });
  await moveRootPngs();
  for (const file of await fs.readdir(processedDir).catch(() => [])) {
    if (file.toLowerCase().endsWith('.png')) {
      await fs.unlink(path.join(processedDir, file));
    }
  }

  const files = (await fs.readdir(rawDir))
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const categoryA = categoryFromName(a) ?? 'props';
      const categoryB = categoryFromName(b) ?? 'props';
      return (categoryPriority.get(categoryA) ?? 99) - (categoryPriority.get(categoryB) ?? 99) || a.localeCompare(b, undefined, { numeric: true });
    });

  let sheetIndex = 0;
  const entries: ManifestEntry[] = [];
  for (const file of files) {
    const metadata = await sharp(path.join(rawDir, file), { failOn: 'none' }).metadata();
    const classification = classify(file, metadata.width ?? 0, metadata.height ?? 0, sheetIndex);
    const index = classification.category === 'player' ? sheetIndex : sheetIndex++;
    entries.push(await processOne(file, index));
  }

  entries.sort((a, b) => (a.category === 'player' ? -1 : b.category === 'player' ? 1 : a.key.localeCompare(b.key)));
  await writeManifest(entries);
  console.log(`[assets] wrote ${path.relative(root, manifestPath)} with ${entries.length} entries.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
