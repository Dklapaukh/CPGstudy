/*
 * Medicine test: every topic of one medicine as multiple-choice questions, built from its quiz
 * cards (quizCards.js). Pure: takes cards and returns questions, touching nothing else.
 * The question style follows what is tested, so no screen is a wall of text:
 *   Indications, Contraindications, Cautions, Common adverse effects: tick all that apply,
 *     a few of the medicine's own points among points of other medicines for the same topic.
 *   Doses, onset and duration: one line with its number blanked, one right value and three
 *     wrong ones (other values with the same unit, ten times or a tenth, or a wrong unit; see
 *     guidelineQuizNumbers.js, Decision Z14).
 *   Mechanism of action: the first sentence, against other medicines' first sentences.
 * Depends on quizDoses.js, guidelineQuizRounds.js, guidelineQuizNumbers.js and
 * guidelineQuizPlay.js.
 */
import { blockText, namesMedicine } from './quizDoses.js';
import { normalisedText, shuffled } from './guidelineQuizRounds.js';
import { valuesInText, valuePools, numberQuestion } from './guidelineQuizNumbers.js';
import { isSameFlag } from './guidelineQuizPlay.js';

export const TEST_KIND = { TICK: 'tick', CHOICE: 'choice' };
// How each non-dose topic (a card key) is asked, and the words above its question.
const TOPIC_QUESTIONS = {
  indications: { kind: TEST_KIND.TICK, prompt: 'Indications: tick all that apply' },
  contraindications: { kind: TEST_KIND.TICK, prompt: 'Contraindications: tick all that apply' },
  cautions: { kind: TEST_KIND.TICK, prompt: 'Cautions: tick all that apply' },
  adverse: { kind: TEST_KIND.TICK, prompt: 'Common adverse effects: tick all that apply' },
  onset: { kind: 'number', prompt: 'Usual onset of effect: which is right?' },
  duration: { kind: 'number', prompt: 'Usual duration of effect: which is right?' },
  mechanism: { kind: 'sentence', prompt: 'Mechanism of action: which is right?' },
};
// A tick question shows this many points, of which 1 to MAX_TICK_RIGHT are the medicine's own.
const TICK_OPTIONS = 5;
const MAX_TICK_RIGHT = 3;
const CHOICE_OPTIONS = 4;
// Longer points or sentences are left out: the test is read on a phone.
const MAX_OPTION_LENGTH = 140;
const TOP_LEVEL = 1;
const SENTENCE_END = /(?<=\.)\s+/;
// Units that make a value a dose; the blank goes on a dose before any time or rate.
const DOSE_UNITS = ['mg', 'mcg', 'microgram', 'micrograms', 'g', 'ml', 'units', 'mmol', 'mg/kg'];

const isTextBlock = (block) => block[0] === 'b' || block[0] === 'p';
const isTopLevel = (block) => isTextBlock(block) && block[2] <= TOP_LEVEL;
const answerLines = (card) => card.answerBlocks.filter(isTextBlock).map(blockText);

/** Up to `count` texts from `candidates`, each unlike every text in `avoid` and each other. */
function distinctTexts(candidates, avoid, count) {
  const chosen = [];
  for (const text of candidates) {
    if (chosen.length === count) break;
    const clash = (other) =>
      normalisedText(other) === normalisedText(text) || isSameFlag(text, other);
    if (avoid.some(clash) || chosen.some(clash)) continue;
    chosen.push(text);
  }
  return chosen;
}

/** The top-level points of a topic card short enough to be an option. */
const shortPoints = (card) =>
  card.answerBlocks
    .filter(isTopLevel)
    .map(blockText)
    .filter((line) => line.length <= MAX_OPTION_LENGTH);

/**
 * "Tick all that apply": some of the card's points and other medicines' points for the topic.
 * Returns { kind, prompt, options, rightIndexes } or null when it cannot be asked.
 */
function tickQuestion(card, prompt, context, random) {
  const own = shuffled(shortPoints(card), random);
  if (own.length === 0) return null;
  const rightCount = 1 + Math.floor(random() * Math.min(MAX_TICK_RIGHT, own.length));
  const right = own.slice(0, rightCount);
  const others = context.sameTopic(card).flatMap(shortPoints);
  const usable = others.filter((line) => !namesMedicine(line, context.medicineNames));
  const wrong = distinctTexts(
    shuffled(usable, random),
    answerLines(card),
    TICK_OPTIONS - right.length,
  );
  if (wrong.length < TICK_OPTIONS - right.length) return null;
  const options = shuffled([...right, ...wrong], random);
  const rightIndexes = options.flatMap((option, index) => (right.includes(option) ? [index] : []));
  return { kind: TEST_KIND.TICK, prompt, options, rightIndexes };
}

/** A choice question: { kind, prompt, before, after, options, answer } (before/after optional). */
const choiceQuestion = (prompt, made) => ({
  kind: TEST_KIND.CHOICE,
  prompt,
  before: made.before,
  after: made.after,
  options: made.choices,
  answer: made.answer,
});

/** The place of the value to blank in a line: its first dose, otherwise its first value. */
function blankIndex(line) {
  const values = valuesInText(line);
  const dose = values.findIndex((value) => DOSE_UNITS.includes(value.unit));
  return dose >= 0 ? dose : 0;
}

/** One line of the card (not one only other practice levels may give) with a number blanked. */
function numberChoice(card, prompt, pools, random) {
  const levelled = card.otherLevelLines || [];
  const lines = card.answerBlocks
    .map((block, index) => (isTextBlock(block) && !levelled[index] ? blockText(block) : ''))
    .filter((line) => line && valuesInText(line).length > 0);
  for (const line of shuffled(lines, random)) {
    const made = numberQuestion(line, blankIndex(line), pools, random);
    if (made) return choiceQuestion(prompt, made);
  }
  return null;
}

const escapeForPattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A sentence with the medicine's own names ("Adrenaline is …") put as "It", so it is no clue. */
function withoutNames(sentence, names) {
  const replaced = names.reduce(
    (text, name) => text.replace(new RegExp(`\\b${escapeForPattern(name)}\\b`, 'gi'), 'it'),
    sentence,
  );
  return replaced.charAt(0).toUpperCase() + replaced.slice(1);
}

/**
 * The first sentence of a card's answer without its medicine's names, the short form of a
 * mechanism of action. `namesById` gives each medicine's lower-case names.
 */
const firstSentence = (card, namesById) =>
  withoutNames(
    (answerLines(card)[0] || '').split(SENTENCE_END)[0],
    namesById[card.medicineId] || [],
  );

/** "Which is right?" between the card's first sentence and other medicines' first sentences. */
function sentenceChoice(card, prompt, context, random) {
  const answer = firstSentence(card, context.namesById);
  const tooLong = !answer || answer.length > MAX_OPTION_LENGTH;
  if (tooLong || namesMedicine(answer, context.medicineNames)) return null;
  const others = context
    .sameTopic(card)
    .map((other) => firstSentence(other, context.namesById))
    .filter((line) => line && line.length <= MAX_OPTION_LENGTH)
    .filter((line) => !namesMedicine(line, context.medicineNames));
  const wrong = distinctTexts(shuffled(others, random), [answer], CHOICE_OPTIONS - 1);
  if (wrong.length < CHOICE_OPTIONS - 1) return null;
  return choiceQuestion(prompt, { answer, choices: shuffled([answer, ...wrong], random) });
}

/** The words above a dose question: the card's question without the medicine name. */
const dosePrompt = (card, medicineName) =>
  `${card.prompt.replace(`${medicineName} – `, '')}: which is right?`;

/** One card as a test question, or null when it cannot be asked. */
function cardQuestion(card, context, random) {
  if (card.isDose) {
    return numberChoice(card, dosePrompt(card, context.medicineName), context.dosePools, random);
  }
  const topic = TOPIC_QUESTIONS[card.key];
  if (!topic) return null;
  if (topic.kind === TEST_KIND.TICK) return tickQuestion(card, topic.prompt, context, random);
  if (topic.kind === 'number') return numberChoice(card, topic.prompt, context.timePools, random);
  return sentenceChoice(card, topic.prompt, context, random);
}

/**
 * The test of one medicine: one question per card that can be asked, in card order.
 * `testCards` are the medicine's cards (at the chosen practice level); `allCards` are every
 * medicine's cards, the source of wrong answers; `namesById` gives every medicine's lower-case
 * names (tableNames) by medicine id, so no wrong answer names a medicine.
 */
export function buildMedicineTest({ testCards, allCards, medicineName, namesById }, random) {
  const lines = (cards) => cards.flatMap(answerLines);
  const medicineId = testCards.length ? testCards[0].medicineId : '';
  const context = {
    medicineName,
    namesById,
    medicineNames: Object.values(namesById).flat(),
    sameTopic: (card) =>
      allCards.filter((other) => other.key === card.key && other.medicineId !== medicineId),
    dosePools: valuePools(lines(allCards.filter((card) => card.isDose))),
    timePools: valuePools(
      lines(allCards.filter((card) => card.key === 'onset' || card.key === 'duration')),
    ),
  };
  return testCards
    .map((card) => {
      const question = cardQuestion(card, context, random);
      return question && { ...question, source: card.source };
    })
    .filter(Boolean);
}

/** True when an answer is right: the exact set of right points ticked, or the right choice. */
export function isRightAnswer(question, answer) {
  if (question.kind === TEST_KIND.CHOICE) return question.options[answer] === question.answer;
  const ticked = [...answer].sort((a, b) => a - b);
  return ticked.join(',') === question.rightIndexes.join(',');
}
