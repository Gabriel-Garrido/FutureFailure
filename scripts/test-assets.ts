import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type ManifestEntry = {
  key: string;
  path: string;
  rawPath: string;
  loadType: 'image' | 'spritesheet';
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  width: number;
  height: number;
  category: string;
  role?: string;
  theme?: string;
  variant?: string;
  enemyType?: string;
  bossType?: string;
};

const root = process.cwd();
const rawDir = path.join(root, 'public', 'assets', 'raw');
const processedDir = path.join(root, 'public', 'assets', 'processed');
const manifestPath = path.join(root, 'src', 'assets', 'assetManifest.ts');

function extractManifest(source: string): ManifestEntry[] {
  const match = source.match(/export const assetManifest = (\[[\s\S]*?\]) as const/);
  if (!match) {
    throw new Error('Could not parse assetManifest.ts');
  }
  return JSON.parse(match[1]) as ManifestEntry[];
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated];
}

async function main(): Promise<void> {
  await fs.access(rawDir);
  await fs.access(processedDir);
  await fs.access(manifestPath);
  const manifest = extractManifest(await fs.readFile(manifestPath, 'utf8'));

  const failures: string[] = [];
  const rawFiles = await fs.readdir(rawDir);
  const genericRawNames = rawFiles.filter((file) => /^(Background|Sprite|Enemy|Boss) \(\d+\)\.png$/i.test(file));
  for (const file of genericRawNames) failures.push(`Raw asset still has a generic name: ${file}.`);

  for (const key of duplicates(manifest.map((entry) => entry.key))) failures.push(`Duplicated manifest key: ${key}.`);
  for (const assetPath of duplicates(manifest.map((entry) => entry.path))) failures.push(`Duplicated processed asset path: ${assetPath}.`);

  const player = manifest.find((entry) => entry.category === 'player');
  if (!player || player.loadType !== 'spritesheet' || player.frameWidth !== 280 || player.frameHeight !== 280) {
    failures.push('Player sheet must exist as a spritesheet with 280x280 frames.');
  }

  for (const enemyType of ['trooper', 'drone', 'mech']) {
    const enemy = manifest.find((entry) => entry.key === enemyType && entry.category === 'enemy' && entry.enemyType === enemyType);
    if (!enemy) failures.push(`Canonical enemy asset is missing or misclassified: ${enemyType}.`);
  }

  if (!manifest.some((entry) => entry.category === 'boss' && entry.bossType === 'reactor-core')) {
    failures.push('At least one reactor-core boss asset must be prepared.');
  }
  for (const entry of manifest) {
    if (/^(enemy|boss)-\d+$/i.test(entry.key)) failures.push(`${entry.key} still uses a generic enemy/boss manifest key.`);
  }

  const backgrounds = manifest.filter((entry) => entry.category === 'background');
  if (backgrounds.length === 0) failures.push('At least one background asset must be available.');
  for (const background of backgrounds) {
    if (background.loadType !== 'image') failures.push(`${background.key} background must load as image.`);
    if (background.columns !== 1 || background.rows !== 1) failures.push(`${background.key} background must not be sliced as a spritesheet.`);
  }

  for (const entry of manifest) {
    const filePath = path.join(root, 'public', entry.path.replace(/^\//, ''));
    const metadata = await sharp(filePath).metadata();
    const actualWidth = metadata.width ?? 0;
    const actualHeight = metadata.height ?? 0;
    if (actualWidth !== entry.width || actualHeight !== entry.height) {
      failures.push(`${entry.key} manifest dimensions ${entry.width}x${entry.height} do not match processed PNG ${actualWidth}x${actualHeight}.`);
    }
    if (entry.loadType === 'spritesheet' && !metadata.hasAlpha) failures.push(`${entry.key} spritesheet has no alpha channel.`);
    if (actualWidth % entry.columns !== 0 || actualHeight % entry.rows !== 0) {
      failures.push(`${entry.key} dimensions are not divisible by ${entry.columns}x${entry.rows}.`);
    }
    if (entry.loadType === 'image' && (entry.columns !== 1 || entry.rows !== 1 || entry.frameWidth !== entry.width || entry.frameHeight !== entry.height)) {
      failures.push(`${entry.key} image entries must use a single full-image frame.`);
    }
    if (entry.columns === 6 && entry.rows === 6 && (entry.frameWidth !== 209 || entry.frameHeight !== 209)) {
      failures.push(`${entry.key} 6x6 sheet must use 209x209 frames.`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[assets:test] ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[assets:test] ${manifest.length} processed PNG files passed validation.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
