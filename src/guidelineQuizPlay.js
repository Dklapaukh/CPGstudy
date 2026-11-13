/*
 * Guideline quiz (feature 9), pure logic: the questions about information that changes the
 * course of treatment, and putting one play of a guideline together. Takes the quizzed
 * guidelines (guidelineQuizRounds.js) and returns a list of steps; randomness comes in as a
 * `random` function so tests can fix it.
 *
 * Course-changing questions (Decision Z15). Only kinds that can be read straight from the layout
 * of the content are made, so no AI is ever needed:
 *   situation  "Which situation is this action for?" (the situation headings of the guideline)
 *   red flag   "Which of these is a red flag in <guideline>?" (bullets under a Red flags heading)
 *   move to    "If <condition> … which guideline?" (an "If" action naming another guideline)
 * Conditions inside a sentence ("Administer adrenaline IM if the patient is not improving") are
 * not split out: telling the condition from the action there needs language understanding.
 *
 * A step is one of:
 *   { kind: 'order', title, real, cards: [{ text, blocks, isDistractor, source }] }
 *   { kind: 'choice', type: 'number' | 'situation' | 'red-flag' | 'move-to', prompt, answer,
 *     choices, and: context, before, after (number: the text either side of the blank) or
 *     line (situation and move-to: the action or condition asked about) }
 * Depends on constants.js, quizDoses.js, quizCards.js, guidelineQuizRounds.js and
 * guidelineQuizNumbers.js.
 */
import { BLOCK } from './constants.js';
import { plainText, withoutChildDoses, blockText, isChildOnly } from './quizDoses.js';
import {
  actionZone,
  normalisedText,
  distractorCandidates,
  pickDistractors,
  shuffled,
} from './guidelineQuizRounds.js';
import { numberPlaces, numberQuestion } from './guidelineQuizNumbers.js';
import { CHILD_ONLY_GUIDELINE_TITLES } from './quizCards.js';

// Decision Z13: two distractors per round.
export const DISTRACTORS_PER_ROUND = 2;
// How many of each question kind one play asks, so a play stays a few minutes long.
export const NUMBER_QUESTIONS_PER_PLAY = 3;
export const SITUATION_QUESTIONS_PER_PLAY = 2;
export const RED_FLAG_QUESTIONS_PER_PLAY = 2;
export const MOVE_TO_QUESTIONS_PER_PLAY = 2;
const CHOICE_COUNT = 4;
const RED_FLAG_HEADING_PATTERN = /^red flags\b/i;
// Two red flags count as the same flag when this share of the words of the shorter one is in
// the other, so a near copy from another guideline is never offered as a wrong answer.
const SAME_FLAG_WORD_SHARE = 0.6;
// "If the patient has suspected bacterial sepsis, move to the 'bacterial sepsis' guideline."
const MOVE_TO_PATTERN =
  /^(if\b.+?),?\s+(?:move to|treat as per|treat using|use|see|follow) the\s*['‘’]\s*([^'‘’]+?)\s*['‘’]\s*guideline/i;
// Sections whose doses are only for children, never asked as numbers (as in the medicines quiz).
const CHILD_ONLY_SECTION = 'Paediatrics';
const SENTENCE_END = /(?<=\.)\s+/;
// A line for an age range that ends below this is about a child even without the word "child":
// "10 mg for a patient aged 1-11 years", "aged less than five years" is caught by "child" lines.
const ADULT_AGE = 15;
const AGE_RANGE_PATTERN = /\baged\s+(?:\d+\s*-\s*(\d+)|less than\s+(\d+))\s+years?\b/i;

/** True when a line is for an age range that ends below ADULT_AGE. */
export function isForChildAges(line) {
  const match = AGE_RANGE_PATTERN.exec(line);
  if (!match) return false;
  return Number(match[1] || match[2]) < ADULT_AGE;
}

/* ---------- Ordering rounds ---------- */

/**
 * The text shown on a card: the line without sentences only about a child ("See the paediatric
 * drug dose tables for a child."), or the whole line if every sentence is about a child.
 */
export function cardText(text) {
  const sentences = plainText(text).split(SENTENCE_END);
  const adult = sentences.filter((sentence) => !isChildOnly([BLOCK.BULLET, sentence, 1]));
  return adult.length > 0 ? adult.join(' ') : plainText(text);
}

/**
 * The ordering step of one round: { kind, title, real, cards }. `real` is the round's actions
 * in guideline order and `cards` are those plus the distractors, shuffled.
 */
function orderStep(round, quizzed, context, random) {
  const candidates = distractorCandidates(
    round,
    quizzed,
    context.quizzed,
    context.medicineNames,
    context.relatedIds(quizzed.id),
  );
  const distractors = pickDistractors(candidates, DISTRACTORS_PER_ROUND, random);
  const real = round.actions.map((action) => ({
    text: cardText(action.text),
    blocks: withoutChildDoses(action.blocks),
    isDistractor: false,
    source: `CPG ${quizzed.number}`,
  }));
  const fake = distractors.map((distractor) => ({
    text: cardText(distractor.text),
    blocks: [],
    isDistractor: true,
    source: distractor.source,
  }));
  return { kind: 'order', title: round.title, real, cards: shuffled([...real, ...fake], random) };
}

/* ---------- Number questions ---------- */

/**
 * The plain lines of the actions, child-only lines and sentences removed, as [{ line, context }].
 * `context` is the action's top line when the number is in a line under it, because "Administer
 * ____ IM for an adult." says nothing about which medicine without it.
 */
function adultActionLines(quizzed) {
  return quizzed.rounds.flatMap((round) =>
    round.actions.flatMap((action) => {
      const top = cardText(action.text);
      return withoutChildDoses(action.blocks)
        .filter((block) => block[0] === BLOCK.BULLET || block[0] === BLOCK.PARAGRAPH)
        .map((block, i) => ({ line: blockText(block), context: i === 0 ? '' : top }))
        .filter(({ line }) => !isForChildAges(line));
    }),
  );
}

const asksNumbers = (quizzed) =>
  quizzed.section !== CHILD_ONLY_SECTION && !CHILD_ONLY_GUIDELINE_TITLES.includes(quizzed.title);

/** Up to NUMBER_QUESTIONS_PER_PLAY number questions, each from a different line. */
function numberSteps(quizzed, pools, random) {
  if (!asksNumbers(quizzed)) return [];
  const places = adultActionLines(quizzed).flatMap(({ line, context }) =>
    numberPlaces([line]).map((place) => ({ ...place, context })),
  );
  const steps = [];
  const usedLines = new Set();
  for (const place of shuffled(places, random)) {
    if (steps.length === NUMBER_QUESTIONS_PER_PLAY) break;
    if (usedLines.has(place.line)) continue;
    const question = numberQuestion(place.line, place.valueIndex, pools, random);
    if (!question) continue;
    usedLines.add(place.line);
    steps.push({
      kind: 'choice',
      type: 'number',
      prompt: 'Which number is right?',
      context: place.context,
      ...question,
    });
  }
  return steps;
}

/* ---------- Situation questions ---------- */

/**
 * "Which situation is this action for?": an action found in only one titled situation, with
 * the titles as choices. Needs two titled situations or more. At most CHOICE_COUNT titles.
 */
export function situationSteps(quizzed, random) {
  const titled = quizzed.rounds.filter((round) => round.title);
  if (titled.length < 2) return [];
  const titles = titled.map((round) => round.title);
  const counts = {};
  titled.forEach((round) =>
    round.actions.forEach((action) => {
      const key = normalisedText(action.text);
      counts[key] = (counts[key] || 0) + 1;
    }),
  );
  const places = titled.flatMap((round) =>
    round.actions
      .filter((action) => counts[normalisedText(action.text)] === 1)
      .map((action) => ({ action, title: round.title })),
  );
  return shuffled(places, random)
    .slice(0, SITUATION_QUESTIONS_PER_PLAY)
    .map(({ action, title }) => {
      const others = shuffled(
        titles.filter((other) => other !== title),
        random,
      ).slice(0, CHOICE_COUNT - 1);
      return {
        kind: 'choice',
        type: 'situation',
        prompt: 'Which situation is this action for?',
        line: action.text,
        answer: title,
        choices: shuffled([title, ...others], random),
      };
    });
}

/* ---------- Red flag questions ---------- */

/** The red flags of a guideline: the top-level bullets under its Red flags heading(s). */
export function redFlags(guideline) {
  const flags = [];
  let underRedFlags = false;
  for (const block of guideline.b) {
    if (block[0] === BLOCK.HEADING)
      underRedFlags = RED_FLAG_HEADING_PATTERN.test(plainText(block[1]));
    else if (underRedFlags && block[0] === BLOCK.BULLET && block[2] === 1) {
      flags.push(plainText(block[1]));
    }
  }
  return flags;
}

const wordsOf = (text) => new Set(normalisedText(text).split(' ').filter(Boolean));

/** True when two flags say nearly the same thing (see SAME_FLAG_WORD_SHARE). */
export function isSameFlag(flag, other) {
  const words = wordsOf(flag);
  const otherWords = wordsOf(other);
  const shared = [...words].filter((word) => otherWords.has(word)).length;
  return shared >= SAME_FLAG_WORD_SHARE * Math.min(words.size, otherWords.size);
}

/** "Which of these is a red flag in <guideline>?": one of its flags and three from others. */
function redFlagSteps(quizzed, context, random) {
  const own = redFlags(quizzed.guideline);
  if (own.length === 0) return [];
  const othersFlags = context.redFlagLists
    .filter((list) => list.id !== quizzed.id)
    .flatMap((list) => list.flags)
    .filter((flag) => !own.some((ownFlag) => isSameFlag(ownFlag, flag)));
  const unique = [...new Set(othersFlags)];
  if (unique.length < CHOICE_COUNT - 1) return [];
  return shuffled(own, random)
    .slice(0, RED_FLAG_QUESTIONS_PER_PLAY)
    .map((flag) => {
      const wrong = shuffled(unique, random).slice(0, CHOICE_COUNT - 1);
      return {
        kind: 'choice',
        type: 'red-flag',
        prompt: `Which of these is a red flag in ${quizzed.title}?`,
        answer: flag,
        choices: shuffled([flag, ...wrong], random),
      };
    });
}

/* ---------- Move-to questions ---------- */

/** The guideline a quoted name points to (title contains the name), or null. */
function guidelineNamed(name, allGuidelines) {
  const wanted = name.toLowerCase();
  return allGuidelines.find((guideline) => guideline.t.toLowerCase().includes(wanted)) || null;
}

/**
 * The "If … move to the '…' guideline" actions of a guideline: [{ condition, target }], where
 * target is the guideline named.
 */
export function moveToActions(quizzed, allGuidelines) {
  return actionZone(quizzed.guideline.b)
    .filter((block) => block[0] === BLOCK.BULLET)
    .map((block) => MOVE_TO_PATTERN.exec(plainText(block[1])))
    .filter(Boolean)
    .map((match) => ({ condition: match[1], target: guidelineNamed(match[2], allGuidelines) }))
    .filter((found) => found.target && found.target.id !== quizzed.id);
}

/** "If <condition>, which guideline do you move to?", with three other guidelines as choices. */
function moveToSteps(quizzed, context, random) {
  return shuffled(moveToActions(quizzed, context.allGuidelines), random)
    .slice(0, MOVE_TO_QUESTIONS_PER_PLAY)
    .map(({ condition, target }) => {
      // Wrong answers are related treatment guidelines, so they are believable places to go.
      const nearby = context
        .relatedIds(quizzed.id)
        .map((id) => context.quizzed.find((other) => other.id === id))
        .filter((other) => other && other.id !== target.id)
        .map((other) => other.guideline);
      const wrong = shuffled(nearby, random)
        .slice(0, CHOICE_COUNT - 1)
        .map((guideline) => guideline.t);
      return {
        kind: 'choice',
        type: 'move-to',
        prompt: 'Which guideline do you move to?',
        line: `${condition} …`,
        answer: target.t,
        choices: shuffled([target.t, ...wrong], random),
      };
    })
    .filter((step) => step.choices.length === CHOICE_COUNT);
}

/* ---------- One play ---------- */

/**
 * One play of a guideline: each round in order, then the number questions, then the
 * course-changing questions. `context` is { quizzed, allGuidelines, medicineNames, pools,
 * redFlagLists, relatedIds(id) }.
 */
export function buildPlay(quizzed, context, random) {
  return [
    ...quizzed.rounds.map((round) => orderStep(round, quizzed, context, random)),
    ...numberSteps(quizzed, context.pools, random),
    ...situationSteps(quizzed, random),
    ...redFlagSteps(quizzed, context, random),
    ...moveToSteps(quizzed, context, random),
  ];
}

/** The marks a play can give: one per card of every round, one per question. */
export const playTotal = (steps) =>
  steps.reduce((sum, step) => sum + (step.kind === 'order' ? step.cards.length : 1), 0);
