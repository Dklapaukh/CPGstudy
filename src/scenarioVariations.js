/*
 * Variation cards (SC-N, docs/scenario-variations.md): short prompts that tell a mentor one way
 * to change a reviewed scenario for their learner. Pure logic: checks cards, and turns them into
 * the one-card-per-line text an editor types on the editor page and back. Tested in
 * tests/scenarioVariations.test.js. Depends on constants.js.
 *
 * A card is { lever, rung (Complexity only, optional), levels, text }:
 *   lever   a key of SCENARIO_LEVERS: what the change works on
 *   rung    a key of COMPLEXITY_RUNGS: how the two problems relate, for a Complexity card
 *   levels  keys of SCENARIO_LEVELS the card suits, lowest first
 *   text    one or two lines for the mentor
 * As a line: "Uncertainty (Paramedic, ICP): The chest pain is a PE." or, with a rung,
 * "Complexity, overlapping (Paramedic): ...".
 */
import { SCENARIO_LEVERS, COMPLEXITY_RUNGS, SCENARIO_LEVELS } from './constants.js';

// At most this many cards per scenario, each at most this long, so the fold stays short.
export const MAX_VARIATIONS = 6;
export const MAX_VARIATION_TEXT = 240;
// "Lever[, rung] (levels): text"
const LINE_PATTERN = /^([^,(:]+?)\s*(?:,\s*([^(:]+?)\s*)?\(([^)]*)\)\s*:\s*(.+)$/;

/** The key whose name (or key, or short name) is `word`, case ignored; or undefined. */
function keyNamed(table, word) {
  const typed = word.trim().toLowerCase();
  return Object.keys(table).find((key) =>
    [key, table[key].name, table[key].short]
      .filter(Boolean)
      .some((each) => each.toLowerCase() === typed),
  );
}

/** Whether a card is whole: a known lever, a rung only on Complexity, known levels and text. */
export function isVariation(card) {
  if (!card || typeof card !== 'object' || !SCENARIO_LEVERS[card.lever]) return false;
  if (card.rung !== undefined && (card.lever !== 'complexity' || !COMPLEXITY_RUNGS[card.rung])) {
    return false;
  }
  const levels = card.levels;
  return (
    Array.isArray(levels) &&
    levels.length > 0 &&
    levels.every((level) => SCENARIO_LEVELS[level]) &&
    typeof card.text === 'string' &&
    card.text.trim().length > 0 &&
    card.text.length <= MAX_VARIATION_TEXT
  );
}

/** The levels a card suits in short words: "Paramedic, ICP". */
export const variationLevelsText = (card) =>
  card.levels.map((level) => SCENARIO_LEVELS[level].short).join(', ');

/** The card's heading: "Uncertainty" or "Complexity, overlapping". */
export const variationHeading = (card) =>
  card.rung
    ? `${SCENARIO_LEVERS[card.lever].name}, ${COMPLEXITY_RUNGS[card.rung].name.toLowerCase()}`
    : SCENARIO_LEVERS[card.lever].name;

/** The cards as the editor's box text, one line each. */
export const variationsText = (cards) =>
  (cards || [])
    .map((card) => `${variationHeading(card)} (${variationLevelsText(card)}): ${card.text}`)
    .join('\n');

/** One typed line as a card: { value } or { error } saying what is wrong with it. */
function readLine(line) {
  const match = line.match(LINE_PATTERN);
  if (!match) return { error: `Write each card as "Lever (levels): what changes". Not: ${line}` };
  const [, leverWord, rungWord, levelWords, text] = match;
  const lever = keyNamed(SCENARIO_LEVERS, leverWord);
  if (!lever) {
    const names = Object.values(SCENARIO_LEVERS).map((each) => each.name);
    return { error: `The lever is one of ${names.join(', ')}. Not: ${leverWord}` };
  }
  const rung = rungWord ? keyNamed(COMPLEXITY_RUNGS, rungWord) : undefined;
  if (rungWord && (!rung || lever !== 'complexity')) {
    return {
      error: `Only Complexity has a rung: unrelated, complementary, overlapping or contradictory.`,
    };
  }
  const typedKeys = levelWords
    .split(',')
    .filter((word) => word.trim())
    .map((word) => keyNamed(SCENARIO_LEVELS, word));
  const levels = Object.keys(SCENARIO_LEVELS).filter((key) => typedKeys.includes(key));
  if (!typedKeys.length || typedKeys.includes(undefined)) {
    return { error: `Write the levels from: Student, Grad, Supervised, Paramedic, ICP.` };
  }
  const card = { lever, ...(rung ? { rung } : {}), levels, text: text.trim() };
  if (card.text.length > MAX_VARIATION_TEXT) {
    return { error: `Keep each card under ${MAX_VARIATION_TEXT} characters.` };
  }
  return { value: card };
}

/** The editor's box text as cards, one per line: { value } or { error }. Empty is no cards. */
export function readVariations(text) {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length > MAX_VARIATIONS) return { error: `Keep it to ${MAX_VARIATIONS} cards.` };
  const cards = [];
  for (const line of lines) {
    const read = readLine(line);
    if (read.error) return read;
    cards.push(read.value);
  }
  return { value: cards };
}
