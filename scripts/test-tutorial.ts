import fs from 'node:fs/promises';
import path from 'node:path';
import { gameText } from '../src/data/gameText';
import { levelOne } from '../src/data/levelOne';
import { tutorialActions, tutorialPresentationConfig } from '../src/data/tutorialConfig';
import { EVENTS } from '../src/game/constants';

const root = process.cwd();
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function assertShortText(text: string, maxWords: number, label: string): void {
  assert(wordCount(text) <= maxWords, `${label} is too long: "${text}"`);
}

const inlineControls = /\b(Flechas|Arriba|X|Z|C|V|A|B|RT|Stick)\b/i;
const actionIds = new Set(Object.keys(tutorialActions));
const mechanicActions = new Set(Object.values(tutorialActions).map((action) => action.mechanic));

for (const prompt of levelOne.tutorialPrompts) {
  assert(Boolean(prompt.actionId), `${prompt.id} must declare actionId.`);
  if (prompt.actionId) assert(actionIds.has(prompt.actionId), `${prompt.id} uses unknown actionId ${prompt.actionId}.`);
  assertShortText(prompt.text, tutorialPresentationConfig.maxPromptWords, prompt.id);
  assert(!inlineControls.test(prompt.text), `${prompt.id} should not duplicate control names inside text; use actionId.`);
  assert(prompt.once === true, `${prompt.id} should be one-shot to avoid tutorial spam.`);
  assert(prompt.priority !== undefined, `${prompt.id} should define priority.`);
}

for (const text of Object.values(gameText.objectives)) {
  assertShortText(text, tutorialPresentationConfig.objectiveMaxWords, `objective "${text}"`);
}
for (const text of Object.values(gameText.guidance)) {
  assertShortText(text, tutorialPresentationConfig.objectiveMaxWords, `guidance "${text}"`);
}
for (const text of Object.values(gameText.prompts)) {
  assertShortText(text, tutorialPresentationConfig.maxPromptWords, `context prompt "${text}"`);
}
for (const text of Object.values(gameText.terminals)) {
  assertShortText(text, 8, `terminal "${text}"`);
}

for (const mechanic of ['move', 'jump', 'dash', 'wallJump', 'melee', 'energy', 'hazardTiming', 'keycard', 'arena', 'exit']) {
  assert(mechanicActions.has(mechanic as never), `Tutorial actions must cover mechanic ${mechanic}.`);
}

assert(Boolean(EVENTS.tutorialChanged), 'Missing tutorialChanged event.');

const hudSource = await fs.readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
assert(hudSource.includes('EVENTS.tutorialChanged'), 'HUD must listen to tutorialChanged.');
assert(hudSource.includes('tutorialActions'), 'HUD must render tutorial action keys from tutorialConfig.');

const sceneSource = await fs.readFile(path.join(root, 'src/scenes/LevelOneScene.ts'), 'utf8');
assert(sceneSource.includes('emitTutorialPrompt'), 'LevelOneScene must emit semantic tutorial prompts.');
assert(sceneSource.includes('EVENTS.tutorialChanged'), 'LevelOneScene must use tutorialChanged event.');

const builderSource = await fs.readFile(path.join(root, 'src/systems/LevelBuilder.ts'), 'utf8');
assert(builderSource.includes('renderTutorialCue'), 'LevelBuilder must render world tutorial cues.');

if (failures.length > 0) {
  for (const failure of failures) console.error(`[tutorial:test] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[tutorial:test] ${levelOne.tutorialPrompts.length} concise tutorial prompts passed validation.`);
}
