import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const assetCategories = [
  'player',
  'tiles',
  'props',
  'doors',
  'pickups',
  'destructibles',
  'interactables',
  'ui',
  'enemy',
  'boss',
  'vfx',
  'background',
] as const;

const assetLoadTypes = ['image', 'spritesheet'] as const;
const enemyTypes = [
  'trooper',
  'drone',
  'mech',
  'scout',
  'turret',
  'sentinel',
  'cryo-beast',
  'foundry-brute',
  'reactor-crawler',
  'void-raven',
  'void-wraith',
  'corrupted-soldier',
  'overgrown-crawler',
  'security-crawler',
  'crystal-drone',
] as const;
const bossTypes = [
  'reactor-core',
  'crystal-behemoth',
  'cryo-stalker',
  'voidwing-corruptor',
  'void-oracle',
  'foundry-mech',
  'overgrown-corruption',
  'security-interceptor',
  'void-knight',
  'swarm-crawler',
  'chrono-assassin',
] as const;

type AssetCategory = typeof assetCategories[number];
type AssetLoadType = typeof assetLoadTypes[number];
type AssetEnemyType = typeof enemyTypes[number];
type AssetBossType = typeof bossTypes[number];

type ManifestEntry = {
  key: string;
  path: string;
  rawPath: string;
  loadType: AssetLoadType;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  width: number;
  height: number;
  category: AssetCategory;
  role?: string;
  theme?: string;
  variant?: string;
  enemyType?: AssetEnemyType;
  bossType?: AssetBossType;
  processed: boolean;
  warnings: string[];
};

type Classification = Omit<ManifestEntry, 'key' | 'path' | 'rawPath' | 'processed' | 'warnings'>;

const root = process.cwd();
const rawDir = path.join(root, 'public', 'assets', 'raw');
const processedDir = path.join(root, 'public', 'assets', 'processed');
const manifestPath = path.join(root, 'src', 'assets', 'assetManifest.ts');

const primaryKeyBySlug = new Map<string, string>([
  ['player-hero-future-failure-5x4', 'player'],
  ['tiles-industrial-platforms-6x6', 'tiles'],
  ['props-lab-machinery-6x6', 'props'],
  ['doors-portals-security-6x6', 'doors'],
  ['pickups-health-energy-keycards-6x6', 'pickups'],
  ['destructibles-crates-barrels-6x6', 'destructibles'],
  ['interactables-terminals-panels-6x6', 'interactables'],
  ['ui-future-failure-hud-panels-6x6', 'ui'],
  ['enemy-trooper-soldier-6x6', 'trooper'],
  ['enemy-drone-flying-6x6', 'drone'],
  ['enemy-mech-heavy-6x6', 'mech'],
]);

const primaryKeyPriority = new Map<string, number>([
  'player',
  'tiles',
  'props',
  'doors',
  'pickups',
  'destructibles',
  'interactables',
  'ui',
  'trooper',
  'drone',
  'mech',
].map((key, index) => [key, index]));

const categoryPriority = new Map<AssetCategory, number>(
  assetCategories.map((category, index) => [category, index + 100]),
);

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function isNear(value: number, target: number, tolerance = 8): boolean {
  return Math.abs(value - target) <= tolerance;
}

function stripSheetSuffix(slug: string): string {
  return slug.replace(/-\d+x\d+$/, '');
}

function variantFromSlug(slug: string): string | undefined {
  return stripSheetSuffix(slug).match(/-(set-[a-z])$/)?.[1];
}

function withoutVariant(slug: string): string {
  return stripSheetSuffix(slug).replace(/-set-[a-z]$/, '');
}

function categoryFromName(name: string): AssetCategory | undefined {
  const normalized = slugify(name);
  if (normalized.startsWith('background-')) return 'background';
  if (normalized.includes('player') || normalized.includes('hero')) return 'player';
  if (normalized.startsWith('boss-')) return 'boss';
  if (normalized.startsWith('enemy-')) return 'enemy';
  if (normalized.startsWith('vfx-')) return 'vfx';
  if (normalized.startsWith('tiles-') || normalized.includes('tile') || normalized.includes('platform')) return 'tiles';
  if (normalized.startsWith('props-') || normalized.includes('prop') || normalized.includes('machinery')) return 'props';
  if (normalized.startsWith('doors-') || normalized.includes('door') || normalized.includes('portal')) return 'doors';
  if (normalized.startsWith('pickups-') || normalized.includes('pickup') || normalized.includes('keycard') || normalized.includes('health')) return 'pickups';
  if (normalized.startsWith('destructibles-') || normalized.includes('destructible') || normalized.includes('crate') || normalized.includes('barrel')) return 'destructibles';
  if (normalized.startsWith('ui-') || normalized.includes('hud') || normalized.includes('interface')) return 'ui';
  if (normalized.startsWith('interactables-') || normalized.includes('interactable') || normalized.includes('terminal') || normalized.includes('panel')) return 'interactables';
  return undefined;
}

function enemyTypeFromSlug(slug: string): AssetEnemyType | undefined {
  if (slug.includes('sentinel')) return 'sentinel';
  if (slug.includes('corrupted-soldier')) return 'corrupted-soldier';
  if (slug.includes('crystal-drone')) return 'crystal-drone';
  if (slug.includes('trooper') || slug.includes('soldier')) return 'trooper';
  if (slug.includes('drone')) return 'drone';
  if (slug.includes('mech')) return 'mech';
  if (slug.includes('scout') || slug.includes('bot')) return 'scout';
  if (slug.includes('turret')) return 'turret';
  if (slug.includes('cryo-beast')) return 'cryo-beast';
  if (slug.includes('foundry-brute')) return 'foundry-brute';
  if (slug.includes('reactor-crawler')) return 'reactor-crawler';
  if (slug.includes('void-raven')) return 'void-raven';
  if (slug.includes('void-wraith')) return 'void-wraith';
  if (slug.includes('overgrown-crawler')) return 'overgrown-crawler';
  if (slug.includes('security-crawler')) return 'security-crawler';
  return undefined;
}

function bossTypeFromSlug(slug: string): AssetBossType | undefined {
  if (slug.includes('reactor-core')) return 'reactor-core';
  if (slug.includes('crystal-behemoth')) return 'crystal-behemoth';
  if (slug.includes('cryo-stalker')) return 'cryo-stalker';
  if (slug.includes('voidwing-corruptor')) return 'voidwing-corruptor';
  if (slug.includes('void-oracle')) return 'void-oracle';
  if (slug.includes('foundry-mech')) return 'foundry-mech';
  if (slug.includes('overgrown-corruption')) return 'overgrown-corruption';
  if (slug.includes('security-interceptor')) return 'security-interceptor';
  if (slug.includes('void-knight')) return 'void-knight';
  if (slug.includes('swarm-crawler')) return 'swarm-crawler';
  if (slug.includes('chrono-assassin')) return 'chrono-assassin';
  return undefined;
}

function themeFromSlug(category: AssetCategory, slug: string): string | undefined {
  const clean = withoutVariant(slug);
  if (category === 'background') {
    return clean.replace(/^background-/, '').replace(/-\d+$/, '');
  }

  const prefix = `${category}-`;
  let rest = clean.startsWith(prefix) ? clean.slice(prefix.length) : clean;
  if (category === 'enemy') rest = rest.replace(/^(trooper|drone|mech|scout|turrets?)-/, '');
  if (category === 'boss') rest = rest.replace(/^reactor-core-/, 'reactor-');
  if (!rest) return undefined;
  return rest;
}

function roleFromSlug(category: AssetCategory, slug: string): string | undefined {
  const clean = withoutVariant(slug);
  if (category === 'background') return 'level-background';
  if (category === 'player') return 'hero';
  if (category === 'enemy') {
    const type = enemyTypeFromSlug(slug);
    return type ? clean.replace(/^enemy-/, '').replace(new RegExp(`^${type}-?`), '') || type : clean.replace(/^enemy-/, '');
  }
  if (category === 'boss') {
    const type = bossTypeFromSlug(slug);
    return type ? clean.replace(/^boss-/, '') : clean.replace(/^boss-/, '');
  }
  return clean.replace(new RegExp(`^${category}-`), '');
}

function classify(name: string, width: number, height: number): Classification {
  const slug = slugify(name);
  const namedCategory = categoryFromName(name);
  const variant = variantFromSlug(slug);
  const category = namedCategory ?? 'props';

  if (category === 'background') {
    return {
      loadType: 'image',
      columns: 1,
      rows: 1,
      frameWidth: width,
      frameHeight: height,
      width,
      height,
      category,
      role: roleFromSlug(category, slug),
      theme: themeFromSlug(category, slug),
      variant,
    };
  }

  if ((isNear(width, 1400) && isNear(height, 1120)) || category === 'player') {
    return {
      loadType: 'spritesheet',
      columns: 5,
      rows: 4,
      frameWidth: 280,
      frameHeight: 280,
      width: 1400,
      height: 1120,
      category: 'player',
      role: roleFromSlug('player', slug),
      theme: themeFromSlug('player', slug),
      variant,
    };
  }

  if (isNear(width, 1254) && isNear(height, 1254) || /-\d+x\d+$/.test(slug)) {
    return {
      loadType: 'spritesheet',
      columns: 6,
      rows: 6,
      frameWidth: 209,
      frameHeight: 209,
      width: 1254,
      height: 1254,
      category,
      role: roleFromSlug(category, slug),
      theme: themeFromSlug(category, slug),
      variant,
      enemyType: category === 'enemy' ? enemyTypeFromSlug(slug) : undefined,
      bossType: category === 'boss' ? bossTypeFromSlug(slug) : undefined,
    };
  }

  return {
    loadType: 'image',
    columns: 1,
    rows: 1,
    frameWidth: width,
    frameHeight: height,
    width,
    height,
    category,
    role: roleFromSlug(category, slug),
    theme: themeFromSlug(category, slug),
    variant,
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

function keyFor(fileName: string): string {
  const slug = slugify(fileName);
  return primaryKeyBySlug.get(slug) ?? slug;
}

function withoutUndefined<T extends Record<string, unknown>>(entry: T): T {
  for (const key of Object.keys(entry)) {
    if (entry[key] === undefined) delete entry[key];
  }
  return entry;
}

async function processSpritesheet(rawPath: string, outPath: string, classification: Classification, warnings: string[]): Promise<void> {
  if (classification.width % classification.columns !== 0 || classification.height % classification.rows !== 0) {
    warnings.push(`Dimensions are not divisible by ${classification.columns}x${classification.rows}; using raw fallback.`);
  }

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
}

async function processImage(rawPath: string, outPath: string): Promise<void> {
  await sharp(rawPath, { failOn: 'none' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath);
}

async function processOne(fileName: string, usedKeys: Set<string>): Promise<ManifestEntry> {
  const rawPath = path.join(rawDir, fileName);
  const metadata = await sharp(rawPath, { failOn: 'none' }).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  const warnings: string[] = [];
  const classification = classify(fileName, sourceWidth, sourceHeight);
  let key = keyFor(fileName);
  if (usedKeys.has(key)) {
    const baseKey = key;
    let suffix = 2;
    while (usedKeys.has(`${baseKey}-${suffix}`)) suffix += 1;
    key = `${baseKey}-${suffix}`;
    warnings.push(`Adjusted duplicate key ${baseKey} to ${key}.`);
  }
  usedKeys.add(key);

  const outName = `${key}.png`;
  const outPath = path.join(processedDir, outName);

  if (classification.loadType === 'spritesheet' && (sourceWidth !== classification.width || sourceHeight !== classification.height)) {
    warnings.push(`Resizing ${fileName} from ${sourceWidth}x${sourceHeight} to ${classification.width}x${classification.height}.`);
  }

  try {
    if (classification.loadType === 'image') await processImage(rawPath, outPath);
    else await processSpritesheet(rawPath, outPath, classification, warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not safely process ${fileName}: ${message}. Raw fallback remains available.`);
    await fs.copyFile(rawPath, outPath);
  }

  for (const warning of warnings) {
    console.warn(`[assets] warning: ${fileName}: ${warning}`);
  }

  return withoutUndefined({
    key,
    path: `/assets/processed/${outName}`,
    rawPath: `/assets/raw/${fileName}`,
    ...classification,
    processed: warnings.length === 0,
    warnings,
  }) as ManifestEntry;
}

function sortEntries(a: ManifestEntry, b: ManifestEntry): number {
  const keyPriorityA = primaryKeyPriority.get(a.key);
  const keyPriorityB = primaryKeyPriority.get(b.key);
  if (keyPriorityA !== undefined || keyPriorityB !== undefined) {
    return (keyPriorityA ?? 99) - (keyPriorityB ?? 99) || a.key.localeCompare(b.key, undefined, { numeric: true });
  }
  return (categoryPriority.get(a.category) ?? 999) - (categoryPriority.get(b.category) ?? 999)
    || a.key.localeCompare(b.key, undefined, { numeric: true });
}

function union(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(' | ');
}

async function writeManifest(entries: ManifestEntry[]): Promise<void> {
  const body = `export type AssetCategory = ${union(assetCategories)};\n`
    + `export type AssetLoadType = ${union(assetLoadTypes)};\n`
    + `export type AssetEnemyType = ${union(enemyTypes)};\n`
    + `export type AssetBossType = ${union(bossTypes)};\n\n`
    + `export type AssetManifestEntry = {\n`
    + `  key: string;\n  path: string;\n  rawPath: string;\n  loadType: AssetLoadType;\n  columns: number;\n  rows: number;\n  frameWidth: number;\n  frameHeight: number;\n  width: number;\n  height: number;\n  category: AssetCategory;\n  role?: string;\n  theme?: string;\n  variant?: string;\n  enemyType?: AssetEnemyType;\n  bossType?: AssetBossType;\n  processed: boolean;\n  warnings: string[];\n};\n\n`
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

  const usedKeys = new Set<string>();
  const entries: ManifestEntry[] = [];
  for (const file of files) {
    entries.push(await processOne(file, usedKeys));
  }

  entries.sort(sortEntries);
  await writeManifest(entries);
  console.log(`[assets] wrote ${path.relative(root, manifestPath)} with ${entries.length} entries.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
