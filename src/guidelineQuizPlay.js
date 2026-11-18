/*
 * Guideline quiz (feature 9), pure logic: every question a guideline can ask (each with a stable
 * id, so editors can change it), and putting one play of a guideline together from them. Takes
 * the quizzed guidelines (guidelineQuizRounds.js) and returns a list of steps; randomness comes
 * in as a `random` function so tests can fix it.
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
 * Depends on constants.js, quizDoses.js, quizCards.js, updates.js, questionEdits.js,
 * guidelineQuizRounds.js and guidelineQuizNumbers.js.
 */
import { BLOCK, QUIZ_SECTION_NAME } from './constants.js';
import { plainText, withoutChildDoses, blockText, isChildOnly } from './quizDoses.js';
import {
  quizGuidelines,
  actionZone,
  normalisedText,
  distractorCandidates,
  pickDistractors,
  shuffled,
} from './guidelineQuizRounds.js';
import { numberPlaces, numberQuestion, valuePools } from './guidelineQuizNumbers.js';
import { CHILD_ONLY_GUIDELINE_TITLES, tableNames } from './quizCards.js';
import { fingerprintText } from './updates.js';
import { withEdit, textToBlocks, hasChosenWrong } from './questionEdits.js';

// Decision Z13: two distractors per round.
export const DISTRACTORS_PER_ROUND = 2;
// How many of each question kind one play asks, so a play stays a few minutes long.
const NUMBER_QUESTIONS_PER_PLAY = 3;
const SITUATION_QUESTIONS_PER_PLAY = 2;
const RED_FLAG_QUESTIONS_PER_PLAY = 2;
const MOVE_TO_QUESTIONS_PER_PLAY = 2;
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

/* ---------- Questions ---------- */

/*
 * Every question a guideline can ask is built first, each with a stable id, so an editor can
 * change it (questionEdits.js). A play then picks some and adds wrong answers. The fields an
 * editor can change are named in EDIT_FIELDS; `pool` holds the wrong answers chosen from at
 * random when an editor has not chosen them (`wrong`).
 */

// Digits are left out of an id, so a changed dose keeps its question (and its edit, for review).
const idText = (text) => normalisedText(text).replace(/\d+/g, '#');
// A stable question id: guideline, kind and a fingerprint that ignores the numbers in it.
const questionId = (quizzed, kind, text) =>
  `${quizzed.id}|${kind}|${fingerprintText(idText(text))}`;

/** Gives repeated ids a -2, -3… ending, in order, so every id is unique. */
function withUniqueIds(questions) {
  const seen = {};
  return questions.map((question) => {
    seen[question.id] = (seen[question.id] || 0) + 1;
    const count = seen[question.id];
    return count === 1 ? question : { ...question, id: `${question.id}-${count}` };
  });
}

/**
 * The text shown on a card: the line without sentences only about a child ("See the paediatric
 * drug dose tables for a child."), or the whole line if every sentence is about a child.
 */
export function cardText(text) {
  const sentences = plainText(text).split(SENTENCE_END);
  const adult = sentences.filter((sentence) => !isChildOnly([BLOCK.BULLET, sentence, 1]));
  return adult.length > 0 ? adult.join(' ') : plainText(text);
}

/** One ordering question per round: { title, steps, actions, pool }. */
function orderQuestions(quizzed, context) {
  return quizzed.rounds.map((round, index) => ({
    id: questionId(quizzed, 'order', `${round.title || 'round'} ${index}`),
    kind: 'order',
    title: round.title,
    steps: round.actions.map((action) => cardText(action.text)),
    actions: round.actions,
    pool: distractorCandidates(
      round,
      quizzed,
      context.quizzed,
      context.medicineNames,
      context.relatedIds(quizzed.id),
    ),
  }));
}

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

// Child-only guidelines get no number questions: their doses depend on weight.
const asksNumbers = (quizzed) =>
  quizzed.section !== CHILD_ONLY_SECTION && !CHILD_ONLY_GUIDELINE_TITLES.includes(quizzed.title);
// A number question offers a wrong unit or not at random; it is listed if either can be made.
const NO_WRONG_UNIT = () => 0.99;
const WRONG_UNIT = () => 0;

/** One number question per number in an action line: { line, valueIndex, context, answer, … }. */
function numberQuestions(quizzed, context) {
  if (!asksNumbers(quizzed)) return [];
  return adultActionLines(quizzed).flatMap(({ line, context: lineContext }) =>
    numberPlaces([line]).flatMap(({ valueIndex }) => {
      const question =
        numberQuestion(line, valueIndex, context.pools, NO_WRONG_UNIT) ||
        numberQuestion(line, valueIndex, context.pools, WRONG_UNIT);
      if (!question) return [];
      return [
        {
          id: questionId(quizzed, 'number', `${line} ${valueIndex}`),
          kind: 'number',
          line,
          valueIndex,
          context: lineContext,
          before: question.before,
          after: question.after,
          answer: question.answer,
        },
      ];
    }),
  );
}

/** "Which situation is this action for?": each action found in only one titled situation. */
function situationQuestions(quizzed) {
  const titled = quizzed.rounds.filter((round) => round.title);
  if (titled.length < 2) return [];
  const counts = {};
  titled.forEach((round) =>
    round.actions.forEach((action) => {
      const key = normalisedText(action.text);
      counts[key] = (counts[key] || 0) + 1;
    }),
  );
  return titled.flatMap((round) =>
    round.actions
      .filter((action) => counts[normalisedText(action.text)] === 1)
      .map((action) => ({
        id: questionId(quizzed, 'situation', action.text),
        kind: 'situation',
        line: action.text,
        answer: round.title,
        pool: titled.map((other) => other.title).filter((title) => title !== round.title),
      })),
  );
}

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

/** "Which of these is a red flag in <guideline>?": one per flag, other guidelines' as the pool. */
function redFlagQuestions(quizzed, context) {
  const own = redFlags(quizzed.guideline);
  if (own.length === 0) return [];
  const othersFlags = context.redFlagLists
    .filter((list) => list.id !== quizzed.id)
    .flatMap((list) => list.flags)
    .filter((flag) => !own.some((ownFlag) => isSameFlag(ownFlag, flag)));
  const pool = [...new Set(othersFlags)];
  return own.map((flag) => ({
    id: questionId(quizzed, 'red-flag', flag),
    kind: 'red-flag',
    answer: flag,
    pool,
  }));
}

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

/** "If <condition>, which guideline do you move to?": related guidelines are the pool. */
function moveToQuestions(quizzed, context) {
  return moveToActions(quizzed, context.allGuidelines).map(({ condition, target }) => ({
    id: questionId(quizzed, 'move-to', condition),
    kind: 'move-to',
    line: condition,
    answer: target.t,
    // Related treatment guidelines, so the wrong answers are believable places to go.
    pool: context
      .relatedIds(quizzed.id)
      .map((id) => context.quizzed.find((other) => other.id === id))
      .filter((other) => other && other.id !== target.id)
      .map((other) => other.title),
  }));
}

/** Every question of a guideline, in play order: rounds, numbers, then the other kinds. */
export function guidelineQuestions(quizzed, context) {
  return withUniqueIds([
    ...orderQuestions(quizzed, context),
    ...numberQuestions(quizzed, context),
    ...situationQuestions(quizzed),
    ...redFlagQuestions(quizzed, context),
    ...moveToQuestions(quizzed, context),
  ]);
}

/* ---------- Steps of a play ---------- */

// The real cards of a round, from its actions, or from an editor's steps when they were changed.
function realCards(question, source) {
  const unchanged =
    question.steps.length === question.actions.length &&
    question.steps.every((text, i) => text === cardText(question.actions[i].text));
  if (!unchanged) {
    return question.steps.map((text) => ({
      text,
      blocks: textToBlocks(text),
      isDistractor: false,
      source,
    }));
  }
  return question.actions.map((action) => ({
    text: cardText(action.text),
    blocks: withoutChildDoses(action.blocks),
    isDistractor: false,
    source,
  }));
}

/**
 * The ordering step of one round: { kind, title, real, cards }. `real` is the round's actions
 * in guideline order and `cards` are those plus the distractors, shuffled.
 */
function orderStep(question, quizzed, random) {
  const real = realCards(question, `CPG ${quizzed.number}`);
  const distractors = hasChosenWrong(question)
    ? question.wrong.map((text) => ({ text, source: '' }))
    : pickDistractors(question.pool, DISTRACTORS_PER_ROUND, random);
  const fake = distractors.map((distractor) => ({
    text: cardText(distractor.text),
    blocks: [],
    isDistractor: true,
    source: distractor.source,
  }));
  return {
    kind: 'order',
    title: question.title,
    real,
    cards: shuffled([...real, ...fake], random),
  };
}

/** The four choices of a question: its answer and three wrong ones, shuffled. */
function choicesOf(question, random) {
  const wrong = hasChosenWrong(question) ? question.wrong : shuffled(question.pool, random);
  const others = [...new Set(wrong)].filter((choice) => choice !== question.answer);
  return shuffled([question.answer, ...others.slice(0, CHOICE_COUNT - 1)], random);
}

/** A number question as a choice step, or null when its line no longer gives a question. */
function numberStep(question, pools, random) {
  const made = numberQuestion(question.line, question.valueIndex, pools, random);
  if (!made) return null;
  const isEdited = hasChosenWrong(question) || question.answer !== made.answer;
  return {
    kind: 'choice',
    type: 'number',
    prompt: 'Which number is right?',
    context: question.context,
    before: made.before,
    after: made.after,
    answer: question.answer,
    choices: isEdited ? choicesOf({ ...question, pool: made.choices }, random) : made.choices,
  };
}

/** Up to NUMBER_QUESTIONS_PER_PLAY number questions, each from a different line. */
function numberSteps(questions, pools, random) {
  const steps = [];
  const usedLines = new Set();
  for (const question of shuffled(questions, random)) {
    if (steps.length === NUMBER_QUESTIONS_PER_PLAY) break;
    if (usedLines.has(question.line)) continue;
    const step = numberStep(question, pools, random);
    if (!step) continue;
    usedLines.add(question.line);
    steps.push(step);
  }
  return steps;
}

// The question shown for each of the other kinds, and the text above the choices.
const PROMPTS = {
  situation: () => 'Which situation is this action for?',
  'red-flag': (quizzed) => `Which of these is a red flag in ${quizzed.title}?`,
  'move-to': () => 'Which guideline do you move to?',
};
const LINES = { situation: (line) => line, 'move-to': (line) => `${line} …` };
const PER_PLAY = {
  situation: SITUATION_QUESTIONS_PER_PLAY,
  'red-flag': RED_FLAG_QUESTIONS_PER_PLAY,
  'move-to': MOVE_TO_QUESTIONS_PER_PLAY,
};
// A red flag or move-to question needs a full set of choices; a situation question is asked
// with however many other situations the guideline has.
const NEEDS_FULL_CHOICES = ['red-flag', 'move-to'];

/** A question of the other kinds as a choice step, or null when it has too few choices. */
function choiceStep(kind, question, quizzed, random) {
  const step = {
    kind: 'choice',
    type: kind,
    prompt: PROMPTS[kind](quizzed),
    ...(LINES[kind] ? { line: LINES[kind](question.line) } : {}),
    answer: question.answer,
    choices: choicesOf(question, random),
  };
  const enough = NEEDS_FULL_CHOICES.includes(kind) ? CHOICE_COUNT : 2;
  return step.choices.length >= enough ? step : null;
}

/** Up to PER_PLAY questions of one kind, as choice steps. */
function choiceSteps(kind, questions, quizzed, random) {
  return shuffled(questions, random)
    .map((question) => choiceStep(kind, question, quizzed, random))
    .filter(Boolean)
    .slice(0, PER_PLAY[kind]);
}

/**
 * One question as the step a play would show, or null when it could not be asked. Lets the
 * editor page show a question exactly as learners see it.
 */
export function questionStep(question, quizzed, context, random) {
  if (question.kind === 'order') return orderStep(question, quizzed, random);
  if (question.kind === 'number') return numberStep(question, context.pools, random);
  return choiceStep(question.kind, question, quizzed, random);
}

/* ---------- One play ---------- */

/**
 * One play of a guideline: each round in order, then the number questions, then the
 * course-changing questions. `context` is from playContext(); `edits` are editors' changes by
 * question id (questionEdits.js).
 */
export function buildPlay(quizzed, context, random, edits = {}) {
  const questions = guidelineQuestions(quizzed, context)
    .map((question) => withEdit(question, edits[question.id]))
    .filter(Boolean);
  const ofKind = (kind) => questions.filter((question) => question.kind === kind);
  return [
    ...ofKind('order').map((question) => orderStep(question, quizzed, random)),
    ...numberSteps(ofKind('number'), context.pools, random),
    ...Object.keys(PROMPTS).flatMap((kind) => choiceSteps(kind, ofKind(kind), quizzed, random)),
  ];
}

/** The marks a play can give: one per card of every round, one per question. */
export const playTotal = (steps) =>
  steps.reduce((sum, step) => sum + (step.kind === 'order' ? step.cards.length : 1), 0);

/** The medicine names (lower case) of every medicine guideline, for same-medicine distractors. */
function medicineNames(sections) {
  const medicines = sections.find((section) => section.name === QUIZ_SECTION_NAME);
  if (!medicines) return [];
  return medicines.items
    .filter((guideline) =>
      guideline.b.some((block) => block[0] === BLOCK.HEADING && /Indications/.test(block[1])),
    )
    .flatMap((guideline) => tableNames(guideline.t));
}

/**
 * What every play needs from the whole content (see buildPlay). Build it once and keep it.
 * `quizzed` is quizGuidelines(sections), passed in when the caller has already built it.
 */
export function playContext(sections, relatedLinks, quizzed = quizGuidelines(sections)) {
  const allGuidelines = sections.flatMap((section) => section.items);
  return {
    quizzed,
    allGuidelines,
    medicineNames: medicineNames(sections),
    pools: valuePools(allGuidelines.flatMap((guideline) => guideline.b.map(blockText))),
    redFlagLists: allGuidelines
      .map((guideline) => ({ id: guideline.id, flags: redFlags(guideline) }))
      .filter((list) => list.flags.length > 0),
    relatedIds: (id) => (relatedLinks[id] || []).map((link) => link[0]),
  };
}
