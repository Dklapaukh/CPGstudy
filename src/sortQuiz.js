/*
 * "Pick the guideline" quiz: two or three related guidelines, and short pieces of text that are
 * in only one of them. The learner puts each piece in the box of the guideline it comes from.
 * Pure: takes guideline data and returns rounds, touching nothing else.
 * The first guideline is the one being studied; the others come from its related guidelines
 * (the five listed at the bottom of its page), never a medicine (PG-F).
 * Headings are never shown (they would give the answer away), and neither is a line that names
 * any of the guidelines, nor a version history entry. A short section is shown whole; a long one
 * gives a single paragraph.
 * Depends on constants.js, quizDoses.js and guidelineQuizRounds.js.
 */
import { BLOCK, QUIZ_SECTION_NAME } from './constants.js';
import { blockText, isTextBlock } from './quizDoses.js';
import { normalisedText, shuffled } from './guidelineQuizRounds.js';

// How many guidelines a round can compare.
export const SORT_GROUP_SIZES = [2, 3];
// Pieces per guideline in a round, by group size, so three guidelines are not too long to play.
export const SORT_ITEMS_PER_SIDE = { 2: 4, 3: 3 };
// A guideline needs at least this many pieces to be in a round.
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

// Built once per guideline: the same guideline is compared with many others.
const groupsCache = new WeakMap();
const textsCache = new WeakMap();
const candidatesCache = new WeakMap();

/**
 * The text blocks of a guideline grouped by the heading above them: [[block, …], …]. Blocks
 * before the first heading are a group of their own. Tables, keys and boxes are left out.
 */
export function headingGroups(guideline) {
  if (groupsCache.has(guideline)) return groupsCache.get(guideline);
  const groups = [[]];
  for (const block of guideline.b) {
    if (block[0] === BLOCK.HEADING) groups.push([]);
    else if (isTextBlock(block)) groups[groups.length - 1].push(block);
  }
  const filled = groups.filter((group) => group.length > 0);
  groupsCache.set(guideline, filled);
  return filled;
}

/** Every text of a guideline, normalised, for finding lines another guideline also has. */
function normalisedTexts(guideline) {
  if (!textsCache.has(guideline)) {
    const texts = guideline.b.filter(isTextBlock).map((block) => normalisedText(blockText(block)));
    textsCache.set(guideline, texts);
  }
  return textsCache.get(guideline);
}

/**
 * The lines of each heading section that could ever be pieces (long enough, not a version
 * entry), each as { text, normalised, lower, level }. Built once per guideline.
 */
function candidateGroups(guideline) {
  if (!candidatesCache.has(guideline)) {
    const groups = headingGroups(guideline).map((group) =>
      group
        .map((block) => ({ text: blockText(block), level: block[2] }))
        .filter(({ text }) => text.length >= MIN_LINE_LENGTH && !VERSION_LINE_PATTERN.test(text))
        .map((line) => ({
          ...line,
          normalised: normalisedText(line.text),
          lower: line.text.toLowerCase(),
        })),
    );
    candidatesCache.set(guideline, groups);
  }
  return candidatesCache.get(guideline);
}

/** True when a line (lower case) names one of the titles, which would give the answer away. */
function namesTitle(lower, titles) {
  return titles.some((title) => title.length >= MIN_TITLE_LENGTH && lower.includes(title));
}

/**
 * The pieces of `guideline` that can be placed against `others` (a list of guidelines):
 * [[line, …], …], one piece per heading section. A piece holds only lines none of the others
 * has and that name none of the guidelines. `random` picks the paragraph of a long section.
 */
export function sortPieces(guideline, others, random) {
  const otherTexts = new Set(others.flatMap(normalisedTexts));
  const titles = [guideline, ...others].map((each) => each.t.toLowerCase());
  const usable = (line) => !otherTexts.has(line.normalised) && !namesTitle(line.lower, titles);
  return candidateGroups(guideline).flatMap((group) => {
    const lines = group.filter(usable);
    const texts = lines.map((line) => line.text);
    if (texts.length && texts.length <= MAX_WHOLE_SECTION_LINES) {
      if (texts.join(' ').length <= MAX_WHOLE_SECTION_LENGTH) return [texts];
    }
    const paragraphs = lines
      .filter((line) => line.level <= TOP_LEVEL && line.text.length <= MAX_LINE_LENGTH)
      .map((line) => line.text);
    if (paragraphs.length === 0) return [];
    return [[paragraphs[Math.floor(random() * paragraphs.length)]]];
  });
}

/** True for a guideline of the Medicines section, which is never compared (PG-F). */
export const isMedicine = (guideline) => guideline.sec === QUIZ_SECTION_NAME;

/**
 * The guidelines a round for `guideline` can compare it with: its related guidelines
 * (`relatedIds`, the five shown on its page, best first) that exist and are not medicines.
 */
export const sortPartners = (relatedIds, byId) =>
  relatedIds.map((id) => byId.get(id)).filter((partner) => partner && !isMedicine(partner));

/** Every way to choose `count - 1` of the partners: [[partner, …], …]. */
function partnerSets(partners, count) {
  if (count === 2) return partners.map((partner) => [partner]);
  return partners.flatMap((first, index) =>
    partners.slice(index + 1).map((second) => [first, second]),
  );
}

/** The others in a group: everyone but the guideline at `index`. */
const othersOf = (group, index) => group.filter((_, other) => other !== index);

/** True when every guideline of the group has enough pieces against the others. */
const canSortGroup = (group) =>
  group.every(
    (guideline, index) =>
      sortPieces(guideline, othersOf(group, index), () => 0).length >= MIN_ITEMS_PER_SIDE,
  );

/**
 * One round for a group of guidelines (the first one first), or null when any has too few
 * pieces. Returns { ids, items: [{ lines, side }] }, side being the guideline's place in `ids`
 * and the items shuffled.
 */
export function buildSortRound(group, random) {
  const perSide = SORT_ITEMS_PER_SIDE[group.length];
  const pieces = group.map((guideline, index) =>
    shuffled(sortPieces(guideline, othersOf(group, index), random), random),
  );
  if (pieces.some((list) => list.length < MIN_ITEMS_PER_SIDE)) return null;
  const items = pieces.flatMap((list, side) =>
    list.slice(0, perSide).map((lines) => ({ lines, side })),
  );
  return { ids: group.map((guideline) => guideline.id), items: shuffled(items, random) };
}

/**
 * A round of `count` guidelines starting with `guideline`, the others picked at random from
 * `partners`, trying other picks when one has too few pieces. Null when none can be played.
 */
export function randomSortRound(guideline, partners, count, random) {
  for (const others of shuffled(partnerSets(partners, count), random)) {
    const round = buildSortRound([guideline, ...others], random);
    if (round) return round;
  }
  return null;
}

/**
 * The guidelines a round of `count` can start with: not medicines, and with at least one
 * playable choice of partners. `partnersOf(guideline)` gives its partners (sortPartners).
 */
export const sortableGuidelines = (guidelines, partnersOf, count) =>
  guidelines.filter(
    (guideline) =>
      !isMedicine(guideline) &&
      partnerSets(partnersOf(guideline), count).some((others) =>
        canSortGroup([guideline, ...others]),
      ),
  );

/** The number of items put on their right side; `placed` is the side chosen per item. */
export const sortScore = (items, placed) =>
  items.filter((item, index) => placed[index] === item.side).length;
