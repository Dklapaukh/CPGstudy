/*
 * "Pick the guideline" quiz: two related guidelines side by side, and short pieces of text
 * that are in only one of them. The learner puts each piece in the box of the guideline it
 * comes from. Pure: takes guideline data and returns rounds, touching nothing else.
 * Headings are never shown (they would give the answer away), and neither is a line that names
 * either guideline, nor a version history entry. A short section is shown whole; a long one gives a single paragraph.
 * Depends on constants.js, quizDoses.js and guidelineQuizRounds.js.
 */
import { BLOCK } from './constants.js';
import { blockText } from './quizDoses.js';
import { normalisedText, shuffled } from './guidelineQuizRounds.js';

export const SORT_SIDE = { LEFT: 'left', RIGHT: 'right' };
// Pieces per guideline in a round; a pair needs at least the minimum on each side.
export const SORT_ITEMS_PER_SIDE = 4;
const MIN_ITEMS_PER_SIDE = 3;
// A line shorter than this says too little to place ("Oxygen"); a longer one is too much to read.
const MIN_LINE_LENGTH = 20;
const MAX_LINE_LENGTH = 220;
// A section is shown whole when it is at most this many lines and characters in all.
const MAX_WHOLE_SECTION_LINES = 3;
const MAX_WHOLE_SECTION_LENGTH = 220;
// Only top-level lines are taken out of a long section, so a lone sub-point is never shown.
const TOP_LEVEL = 1;
// A title this short ("CPR") is not searched for in lines: it would match inside other words.
const MIN_TITLE_LENGTH = 4;
// A version history entry ("11 September 2023 1.0.4 Update: …") says nothing to learn.
const VERSION_LINE_PATTERN = /^\d{1,2} [A-Z][a-z]+ \d{4}\b/;

const isTextBlock = (block) => block[0] === BLOCK.PARAGRAPH || block[0] === BLOCK.BULLET;

/**
 * The text blocks of a guideline grouped by the heading above them: [[block, …], …]. Blocks
 * before the first heading are a group of their own. Tables, keys and boxes are left out.
 */
export function headingGroups(guideline) {
  const groups = [[]];
  for (const block of guideline.b) {
    if (block[0] === BLOCK.HEADING) groups.push([]);
    else if (isTextBlock(block)) groups[groups.length - 1].push(block);
  }
  return groups.filter((group) => group.length > 0);
}

/** Every text of a guideline, normalised, for finding lines the other guideline also has. */
const normalisedTexts = (guideline) =>
  new Set(guideline.b.filter(isTextBlock).map((block) => normalisedText(blockText(block))));

/** True when a line names one of the titles, which would give the answer away. */
function namesTitle(line, titles) {
  const lower = line.toLowerCase();
  return titles.some((title) => title.length >= MIN_TITLE_LENGTH && lower.includes(title));
}

/**
 * The pieces of `guideline` that can be placed against `other`: [[line, …], …], one piece per
 * heading section. A piece holds only lines the other guideline does not have and that name
 * neither guideline. `random` picks the paragraph of a long section.
 */
export function sortPieces(guideline, other, random) {
  const otherTexts = normalisedTexts(other);
  const titles = [guideline.t, other.t].map((title) => title.toLowerCase());
  const usable = (block) => {
    const line = blockText(block);
    return (
      line.length >= MIN_LINE_LENGTH &&
      !VERSION_LINE_PATTERN.test(line) &&
      !otherTexts.has(normalisedText(line)) &&
      !namesTitle(line, titles)
    );
  };
  return headingGroups(guideline).flatMap((group) => {
    const blocks = group.filter(usable);
    const lines = blocks.map(blockText);
    const length = lines.join(' ').length;
    if (lines.length && lines.length <= MAX_WHOLE_SECTION_LINES) {
      if (length <= MAX_WHOLE_SECTION_LENGTH) return [lines];
    }
    const paragraphs = blocks
      .filter((block) => block[2] <= TOP_LEVEL)
      .map(blockText)
      .filter((line) => line.length <= MAX_LINE_LENGTH);
    if (paragraphs.length === 0) return [];
    return [[paragraphs[Math.floor(random() * paragraphs.length)]]];
  });
}

/**
 * The pairs of guidelines to play: each guideline with its best related guideline (the first of
 * its stored links), each pair once, as [idA, idB] with the smaller id first.
 */
export function relatedPairs(guidelines, relatedLinks) {
  const known = new Set(guidelines.map((guideline) => guideline.id));
  const pairs = new Map();
  for (const guideline of guidelines) {
    const best = (relatedLinks[guideline.id] || []).find((link) => known.has(link[0]));
    if (!best) continue;
    const pair = [guideline.id, best[0]].sort();
    pairs.set(pair.join('|'), pair);
  }
  return [...pairs.values()];
}

/**
 * One round for a pair, or null when either guideline has too few pieces. Returns
 * { leftId, rightId, items: [{ lines, side }] }, the sides at random and the items shuffled.
 */
export function buildSortRound(first, second, random) {
  const [left, right] = random() < 0.5 ? [first, second] : [second, first];
  const leftPieces = shuffled(sortPieces(left, right, random), random);
  const rightPieces = shuffled(sortPieces(right, left, random), random);
  if (Math.min(leftPieces.length, rightPieces.length) < MIN_ITEMS_PER_SIDE) return null;
  const take = (pieces, side) =>
    pieces.slice(0, SORT_ITEMS_PER_SIDE).map((lines) => ({ lines, side }));
  const items = [...take(leftPieces, SORT_SIDE.LEFT), ...take(rightPieces, SORT_SIDE.RIGHT)];
  return { leftId: left.id, rightId: right.id, items: shuffled(items, random) };
}

/**
 * A round for a pair picked at random from relatedPairs(), trying other pairs when one has too
 * few pieces. Null only when no pair can be played.
 */
export function randomSortRound(guidelines, relatedLinks, random) {
  const byId = new Map(guidelines.map((guideline) => [guideline.id, guideline]));
  for (const [firstId, secondId] of shuffled(relatedPairs(guidelines, relatedLinks), random)) {
    const round = buildSortRound(byId.get(firstId), byId.get(secondId), random);
    if (round) return round;
  }
  return null;
}

/** The number of items put on their right side; `placed` is the side chosen per item. */
export const sortScore = (items, placed) =>
  items.filter((item, index) => placed[index] === item.side).length;
