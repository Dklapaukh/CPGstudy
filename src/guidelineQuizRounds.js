/*
 * Guideline quiz (feature 9), pure logic: the ordering rounds of each guideline, the distractor
 * cards mixed into a round, and marking a finished round. Takes guideline data and returns
 * plain objects, touching nothing else. No AI: the same content always gives the same rounds.
 * Depends on constants.js and quizDoses.js.
 *
 * The "actions" of a guideline are its top-level bullet points from the start of the guideline
 * to the first heading in STOP_HEADING_PATTERN (Backup, Referral and transport, Red flags and so
 * on). Other headings, and short unindented lines starting "If" or "When" ("If the patient is
 * moderately compromised or is severely compromised"), start a new situation: each situation is
 * its own round (Decision Z12, Option 1). A round is { title, actions: [{ text, blocks }] },
 * where `text` is the plain top-level line and `blocks` are that line and the lines under it.
 */
import { BLOCK } from './constants.js';
import { plainText, namesMedicine } from './quizDoses.js';

// Headings that end the actions at the top of a guideline.
export const STOP_HEADING_PATTERN =
  /^(backup|referral and transport|additional information|red flags|orange flags|worsening advice|more information|version history)\b/i;
// A guideline is quizzed only if it is about treatment: it has one of these headings, or its
// title says it is an action list or checklist. This leaves out guidelines that are only
// information (Documentation, Status Codes, Mental Health Conditions and so on).
const TREATMENT_HEADING_PATTERN = /^(backup|referral and transport|red flags)\b/i;
const ACTION_LIST_TITLE_PATTERN = /\b(action lists?|checklist)\b/i;
// The Medicines section has the medicines quiz instead; the Paediatrics section has no
// treatment guidelines with situations to order.
const SKIPPED_SECTIONS = ['Medicines'];
// Rounds whose title matches this are lists of places, not actions in an order.
const SKIPPED_ROUND_TITLE_PATTERN = /^hospitals\b/i;
// An unindented line that starts a situation, for example "If shock is severe:".
const SITUATION_LINE_PATTERN = /^(if|when)\b/i;
const MAX_SITUATION_LINE_LENGTH = 110;
const TOP_LEVEL = 1;
const UNINDENTED = 0;
// A round needs at least this many actions to be worth ordering (VT's torsades round has 2).
export const MIN_ROUND_ACTIONS = 2;

/** Lower-case words of a text, for comparing two actions regardless of spacing and markup. */
export const normalisedText = (text) =>
  plainText(text)
    .toLowerCase()
    .replace(/[‘’'`]/g, "'")
    .replace(/[^a-z0-9.%'/ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const headingText = (block) => plainText(block[1]);

/** True when a block is an unindented short "If …" or "When …" line that names a situation. */
function isSituationLine(block) {
  if (block[0] !== BLOCK.PARAGRAPH || block[2] !== UNINDENTED) return false;
  const text = plainText(block[1]);
  return text.length <= MAX_SITUATION_LINE_LENGTH && SITUATION_LINE_PATTERN.test(text);
}

/** The blocks at the top of a guideline, before the first stop heading. */
export function actionZone(blocks) {
  const stop = blocks.findIndex(
    (block) => block[0] === BLOCK.HEADING && STOP_HEADING_PATTERN.test(headingText(block)),
  );
  return stop < 0 ? blocks : blocks.slice(0, stop);
}

/** True when the guideline is about treatment (see TREATMENT_HEADING_PATTERN). */
export function isTreatmentGuideline(guideline) {
  if (ACTION_LIST_TITLE_PATTERN.test(guideline.t)) return true;
  return guideline.b.some(
    (block) => block[0] === BLOCK.HEADING && TREATMENT_HEADING_PATTERN.test(headingText(block)),
  );
}

/**
 * Splits the top of a guideline into situations: [{ title, actions }]. The first situation has
 * the title '' (the actions before any situation heading). Lines indented under a top-level
 * bullet belong to its action; anything else (paragraphs, boxes) is not an action.
 */
export function situations(blocks) {
  const found = [{ title: '', actions: [] }];
  let current = found[0];
  let currentAction = null;
  for (const block of actionZone(blocks)) {
    if (block[0] === BLOCK.HEADING || isSituationLine(block)) {
      const title = block[0] === BLOCK.HEADING ? headingText(block) : plainText(block[1]);
      current = { title: title.replace(/:$/, ''), actions: [] };
      found.push(current);
      currentAction = null;
    } else if (block[0] === BLOCK.BULLET && block[2] === TOP_LEVEL) {
      currentAction = { text: plainText(block[1]), blocks: [block] };
      current.actions.push(currentAction);
    } else if (currentAction && block[2] !== UNINDENTED) {
      currentAction.blocks.push(block);
    } else {
      currentAction = null;
    }
  }
  return found;
}

/** The rounds of one guideline: its situations with enough actions, in guideline order. */
export function guidelineRounds(guideline) {
  if (!isTreatmentGuideline(guideline)) return [];
  return situations(guideline.b).filter(
    (round) =>
      round.actions.length >= MIN_ROUND_ACTIONS && !SKIPPED_ROUND_TITLE_PATTERN.test(round.title),
  );
}

/**
 * Every quizzed guideline: [{ id, number, title, section, guideline, rounds }], in list order.
 * `sections` is the guideline data's sections.
 */
export function quizGuidelines(sections) {
  const quizzed = [];
  for (const section of sections) {
    if (SKIPPED_SECTIONS.includes(section.name)) continue;
    for (const guideline of section.items) {
      const rounds = guidelineRounds(guideline);
      if (rounds.length === 0) continue;
      quizzed.push({
        id: guideline.id,
        number: guideline.n,
        title: guideline.t,
        section: section.name,
        guideline,
        rounds,
      });
    }
  }
  return quizzed;
}

/** Every action text of a quizzed guideline, normalised, for leaving out look-alike distractors. */
const ownActionTexts = (quizzed) =>
  new Set(quizzed.rounds.flatMap((round) => round.actions.map((a) => normalisedText(a.text))));

/**
 * The distractor candidates for one round, best first (Decision Z13, Option 1): actions of other
 * guidelines that name a medicine the round names, then actions of the related guidelines (in
 * related order). An action worded the same as any action of this guideline is never used, and
 * each wording appears once. Returns [{ text, source, sameMedicine }], where source is
 * "CPG 3.14" and sameMedicine says which of the two groups it came from.
 * `medicineNames` is every medicine name in lower case; `relatedIds` is the related guideline ids.
 */
export function distractorCandidates(round, quizzed, allQuizzed, medicineNames, relatedIds) {
  const roundText = round.actions.map((action) => action.text).join(' ');
  const roundMedicines = medicineNames.filter((name) => namesMedicine(roundText, [name]));
  const excluded = ownActionTexts(quizzed);
  const candidates = [];
  const add = (other, action, sameMedicine) => {
    const key = normalisedText(action.text);
    if (excluded.has(key)) return;
    excluded.add(key);
    candidates.push({ text: action.text, source: `CPG ${other.number}`, sameMedicine });
  };
  const others = allQuizzed.filter((other) => other.id !== quizzed.id);
  const actionsOf = (other) => other.rounds.flatMap((r) => r.actions);
  if (roundMedicines.length > 0) {
    for (const other of others) {
      for (const action of actionsOf(other)) {
        if (namesMedicine(action.text, roundMedicines)) add(other, action, true);
      }
    }
  }
  for (const relatedId of relatedIds) {
    const other = others.find((candidate) => candidate.id === relatedId);
    if (other) actionsOf(other).forEach((action) => add(other, action, false));
  }
  return candidates;
}

/**
 * Picks `count` distractors: shuffled same-medicine candidates first, then related ones, so
 * each play differs. `random` returns a number from 0 up to 1 (Math.random in the app).
 */
export function pickDistractors(candidates, count, random) {
  const sameMedicine = shuffled(
    candidates.filter((candidate) => candidate.sameMedicine),
    random,
  );
  const related = shuffled(
    candidates.filter((candidate) => !candidate.sameMedicine),
    random,
  );
  return [...sameMedicine, ...related].slice(0, count);
}

/** A shuffled copy of a list (Fisher-Yates). */
export function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Positions in `placed` that are part of the longest run in the right relative order (longest
 * common subsequence with `expected`). Comparing by text, so two actions worded the same can
 * swap places. Marking this way means one card placed too early costs one mark, not every card
 * after it. Returns a Set of indexes into `placed`.
 */
export function inOrderPositions(placed, expected) {
  const rows = placed.length;
  const columns = expected.length;
  const lengths = Array.from({ length: rows + 1 }, () => new Array(columns + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      lengths[i][j] =
        placed[i] === expected[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const positions = new Set();
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (placed[i] === expected[j]) {
      positions.add(i);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) i++;
    else j++;
  }
  return positions;
}

/**
 * Marks a round. `cards` are [{ text, isDistractor }] in the shuffled order shown; `expected` is
 * the action texts in the guideline's order; `placedIndexes` is the order the student chose
 * (indexes into cards) and `discardedIndexes` the cards put in "Not in this guideline".
 * One mark per real card placed in the right relative order and one per distractor discarded.
 * Returns { score, total, correctIndexes: Set of card indexes marked right }.
 */
export function markRound(cards, expected, placedIndexes, discardedIndexes) {
  const placedRealIndexes = placedIndexes.filter((index) => !cards[index].isDistractor);
  const inOrder = inOrderPositions(
    placedRealIndexes.map((index) => cards[index].text),
    expected,
  );
  const correctIndexes = new Set(placedRealIndexes.filter((_, i) => inOrder.has(i)));
  discardedIndexes
    .filter((index) => cards[index].isDistractor)
    .forEach((index) => {
      correctIndexes.add(index);
    });
  return { score: correctIndexes.size, total: cards.length, correctIndexes };
}
