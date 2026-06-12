import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type ManifestEntry = {
  key: string;
  path: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  width: number;
  height: number;
  category: string;
};

const root = process.cwd();
const processedDir = path.join(root, 'public', 'assets', 'processed');
const manifestPath = path.join(root, 'src', 'assets', 'assetManifest.ts');

function extractManifest(source: string): ManifestEntry[] {
  const match = source.match(/export const assetManifest = (\[[\s\S]*?\]) as const/);
  if (!match) {
    throw new Error('Could not parse assetManifest.ts');
  }
  return JSON.parse(match[1]) as ManifestEntry[];
}

async function main(): Promise<void> {
  await fs.access(processedDir);
  await fs.access(manifestPath);
  const manifest = extractManifest(await fs.readFile(manifestPath, 'utf8'));

  const failures: string[] = [];
  const player = manifest.find((entry) => entry.category === 'player');
  if (!player || player.frameWidth !== 280 || player.frameHeight !== 280) {
    failures.push('Player sheet must exist with 280x280 frames.');
  }

  for (const entry of manifest) {
    const filePath = path.join(root, 'public', entry.path.replace(/^\//, ''));
    const metadata = await sharp(filePath).metadata();
    if (!metadata.hasAlpha) failures.push(`${entry.key} has no alpha channel.`);
    if ((metadata.width ?? 0) % entry.columns !== 0 || (metadata.height ?? 0) % entry.rows !== 0) {
      failures.push(`${entry.key} dimensions are not divisible by ${entry.columns}x${entry.rows}.`);
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
