import { LANGS, translations as landingTranslations, type Lang } from '../src/landing/i18n';
import { gameTranslations } from '../src/game/i18n';

const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

// Collect every leaf path of a value. Array entries are flattened with their
// index so that a differing array length surfaces as a missing/extra path.
function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafPaths(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function emptyLeaves(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => emptyLeaves(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      emptyLeaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  if (typeof value !== 'string' || value.trim().length === 0) return [prefix];
  return [];
}

const langs = LANGS.map((entry) => entry.code);
const referenceLang: Lang = 'es';

function validateSet(name: string, set: Record<Lang, unknown>): number {
  const referencePaths = [...leafPaths(set[referenceLang])].sort();
  for (const lang of langs) {
    const langPaths = [...leafPaths(set[lang])].sort();
    const missing = referencePaths.filter((path) => !langPaths.includes(path));
    const extra = langPaths.filter((path) => !referencePaths.includes(path));
    assert(missing.length === 0, `${name}/${lang} is missing keys: ${missing.join(', ')}`);
    assert(extra.length === 0, `${name}/${lang} has unexpected keys: ${extra.join(', ')}`);
    const blanks = emptyLeaves(set[lang]);
    assert(blanks.length === 0, `${name}/${lang} has blank translations: ${blanks.join(', ')}`);
  }
  return referencePaths.length;
}

const gameKeys = validateSet('game', gameTranslations);
const landingKeys = validateSet('landing', landingTranslations);

if (failures.length > 0) {
  for (const failure of failures) console.error(`[i18n:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[i18n:test] ${langs.length} languages validated (${gameKeys} game keys, ${landingKeys} landing keys).`);
}
