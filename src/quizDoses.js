/*
 * Text helpers and adult-dose finding for the medicines quiz (feature 8). Pure: takes guideline
 * data and returns blocks, touching nothing else.
 * Paediatric doses are never tested, so every line that is only about a child is removed.
 * A medicine whose own Dosage section sends the reader to other guidelines ("See the individual
 * guideline") gets its adult doses from those guidelines instead, one card per indication.
 * Depends on constants.js.
 */
import { BLOCK } from './constants.js';

const TOP_LEVEL = 1;
// A line is only about a child when it names a child and not an adult.
const CHILD_PATTERN = /\b(child|children|paediatric)\b/i;
const ADULT_PATTERN = /\badults?\b/i;
// A dose is a number followed by a unit, for example "0.5 mg", "1 g", "10 ml", "5 units".
const DOSE_PATTERN = /\d\s*(mg|mcg|micrograms?|g|ml|units?)\b/gi;

/** Plain text of a piece of content markup: tags removed, the two allowed entities decoded. */
export function plainText(markup) {
  return String(markup)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** All plain text of one block, including table cells, key rows and boxed blocks. */
export function blockText(block) {
  const [kind] = block;
  if (kind === BLOCK.TABLE) {
    const cells = block[1].flatMap((row) => row.map((cell) => (cell ? cell.t : '')));
    return plainText(cells.join(' '));
  }
  if (kind === BLOCK.BOX) return block[1].map(blockText).join(' ');
  if (kind === BLOCK.KEY) return plainText(`${block[1]} ${block[2]}`);
  return plainText(block[1]);
}

const HEADING_LEVEL = -1;

/**
 * The indent level of a block: bullets and paragraphs carry one; a heading is above every
 * level; tables, keys and boxes count as deeper than any bullet, so they stay with the bullet
 * above them.
 */
const levelOf = (block) => {
  if (block[0] === BLOCK.HEADING) return HEADING_LEVEL;
  const isLevelled = block[0] === BLOCK.BULLET || block[0] === BLOCK.PARAGRAPH;
  return isLevelled ? block[2] : Infinity;
};

const isChildOnlyText = (text) => CHILD_PATTERN.test(text) && !ADULT_PATTERN.test(text);

/** True when a block is only about a child (so its dose must not be tested). */
export const isChildOnly = (block) => isChildOnlyText(blockText(block));

const SENTENCE_END = /(?<=\.)\s+/;

/**
 * A bullet or paragraph without its child-only sentences, so "8 mg IV once for an adult. See
 * the paediatric drug dose tables for a child." keeps only the adult dose.
 */
function withoutChildSentences(block) {
  const isText = block[0] === BLOCK.BULLET || block[0] === BLOCK.PARAGRAPH;
  if (!isText) return block;
  const sentences = String(block[1]).split(SENTENCE_END);
  const kept = sentences.filter((sentence) => !isChildOnlyText(plainText(sentence)));
  if (kept.length === sentences.length) return block;
  return [block[0], kept.join(' '), ...block.slice(2)];
}

/**
 * The blocks without the child-only ones. A removed line takes the lines indented under it with
 * it, because they belong to it (for example "For a child aged 5-14 years:" and its steps).
 * In the lines kept, child-only sentences are removed.
 */
export function withoutChildDoses(blocks) {
  const kept = [];
  let removedLevel = null;
  for (const block of blocks) {
    const level = levelOf(block);
    if (removedLevel !== null && level > removedLevel) continue;
    removedLevel = null;
    if (isChildOnly(block)) removedLevel = level;
    else kept.push(withoutChildSentences(block));
  }
  return kept;
}

const escapeForPattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const namePattern = (name) => new RegExp(`\\b${escapeForPattern(name)}\\b`, 'g');

/** True when the text names the medicine by any of its lower-case names, as a whole word. */
export function namesMedicine(text, names) {
  const lower = text.toLowerCase();
  return names.some((name) => namePattern(name).test(lower));
}

/** True when the text gives any dose (a number with a unit). */
export const hasDose = (text) => text.match(DOSE_PATTERN) !== null;

/** Every place a name appears in the text: [{ start, end, isThisMedicine }]. */
function namePlaces(lowerText, medicine) {
  const places = [];
  const add = (names, isThisMedicine) =>
    names.forEach((name) => {
      for (const match of lowerText.matchAll(namePattern(name))) {
        places.push({ start: match.index, end: match.index + name.length, isThisMedicine });
      }
    });
  add(medicine.names, true);
  add(medicine.otherNames, false);
  return places;
}

/** Characters between a dose and a name, whichever comes first. */
const gapBetween = (dose, place) =>
  place.start >= dose.end ? place.start - dose.end : dose.start - place.end;

/**
 * True when a line gives a dose of this medicine. A dose belongs to the nearest medicine named
 * in the line, so in "Prior to administering midazolam … 150-200 mcg of fentanyl or 15-20 mg
 * of morphine" neither dose is midazolam's. A dose in a line that names no medicine counts.
 * `medicine` is { names, otherNames }, both lower case.
 */
export function dosesMedicine(text, medicine) {
  const lower = text.toLowerCase();
  const places = namePlaces(lower, medicine);
  return [...lower.matchAll(DOSE_PATTERN)].some((match) => {
    if (places.length === 0) return true;
    const dose = { start: match.index, end: match.index + match[0].length };
    const nearest = places.reduce((best, place) =>
      gapBetween(dose, place) < gapBetween(dose, best) ? place : best,
    );
    return nearest.isThisMedicine;
  });
}

/**
 * Splits a guideline into instruction groups: a top-level bullet plus everything indented under
 * it. Headings and unindented paragraphs end a group and belong to none.
 */
export function instructionGroups(blocks) {
  const groups = [];
  let current = null;
  for (const block of blocks) {
    const endsGroup =
      block[0] === BLOCK.HEADING || (block[0] === BLOCK.PARAGRAPH && block[2] === 0);
    if (endsGroup) current = null;
    else if (block[0] === BLOCK.BULLET && block[2] === TOP_LEVEL) {
      current = [block];
      groups.push(current);
    } else if (current) current.push(block);
  }
  return groups;
}

/**
 * The adult-dose blocks of one instruction group for this medicine, or [] when there are none.
 * When the top bullet names the medicine the whole group is its instruction; otherwise only the
 * indented lines that dose the medicine are kept, under the top bullet for context.
 */
function groupDoseBlocks(group, medicine) {
  const givesDose = (block) => dosesMedicine(blockText(block), medicine);
  if (namesMedicine(blockText(group[0]), medicine.names)) {
    return group.some(givesDose) ? group : [];
  }
  const doseLines = group
    .slice(1)
    .filter((block) => namesMedicine(blockText(block), medicine.names) && givesDose(block));
  return doseLines.length > 0 ? [group[0], ...doseLines] : [];
}

/**
 * All adult-dose blocks for this medicine in one guideline, in guideline order. Child parts
 * are removed first, so an unindented "For a child aged 5-14 years:" takes its steps with it.
 */
export function guidelineDoseBlocks(guideline, medicine) {
  const adultBlocks = withoutChildDoses(guideline.b);
  return instructionGroups(adultBlocks).flatMap((group) => groupDoseBlocks(group, medicine));
}

/** The blocks with their colours removed, so the same text in two sections compares equal. */
const withoutColours = (blocks) =>
  JSON.stringify(blocks.map((block) => (block[0] === BLOCK.BULLET ? block.slice(0, 3) : block)));

/**
 * The adult doses of a medicine across the given guidelines, as [{ guidelines, answerBlocks }].
 * `medicine` is { names, otherNames } (see dosesMedicine).
 * Guidelines that give exactly the same instructions share one entry (Decision Z10), so an
 * adrenaline infusion repeated in ten guidelines is one card that names all ten.
 */
export function adultDosesByIndication(guidelines, medicine) {
  const entries = [];
  const entryByText = {};
  for (const guideline of guidelines) {
    const answerBlocks = guidelineDoseBlocks(guideline, medicine);
    if (answerBlocks.length === 0) continue;
    const text = withoutColours(answerBlocks);
    if (entryByText[text]) entryByText[text].guidelines.push(guideline);
    else {
      entryByText[text] = { guidelines: [guideline], answerBlocks };
      entries.push(entryByText[text]);
    }
  }
  return entries;
}
