/*
 * Review list for the practice level (ATP) filter of the Medicines quiz (feature 11,
 * docs/medicines-quiz.md). Usage: node scripts/practice-level-review.js
 * Prints, for each practice level, the medicines it does not study at all, every dose card
 * dropped and every answer line shown greyed with the levels that may give it, so the owner can
 * check the result against the guidelines. Run it again after every PDF update. A wrong case is
 * fixed in content/practice-level-overrides.js, not in code. Changes nothing.
 */
import { guidelineData } from '../content/guidelines.js';
import {
  practiceLevelOverrides,
  practiceLevelLineOverrides,
} from '../content/practice-level-overrides.js';
import { buildQuizCards } from '../src/quizCards.js';
import { blockText } from '../src/quizDoses.js';
import {
  readPracticeLevelTable,
  medicineGrants,
  rsiLevels,
  cardForLevel,
  levelsLabel,
} from '../src/practiceLevels.js';
import { ATP_GUIDELINE_ID, QUIZ_SECTION_NAME } from '../src/constants.js';

const MAX_LINE_LENGTH = 110;

const shortened = (text) =>
  text.length > MAX_LINE_LENGTH ? `${text.slice(0, MAX_LINE_LENGTH - 1)}…` : text;

/** The lines to print for one card with greyed lines: its prompt, then each greyed line. */
function greyedCardLines(card) {
  const lines = [`  ${card.prompt} [${card.source}]`];
  card.otherLevelLines.forEach((levels, index) => {
    if (!levels) return;
    const text = shortened(blockText(card.answerBlocks[index]));
    lines.push(`      (${levelsLabel(levels) || 'no level'}) ${text}`);
  });
  return lines;
}

/** The review of one level, as lines of text. */
function levelReview(level, cards, medicines, access) {
  const mayGive = (medicineId) => access.grantsByMedicine[medicineId][level].length > 0;
  const notGiven = medicines.filter((medicine) => !mayGive(medicine.id));
  const doseCards = cards.filter((card) => card.isDose && mayGive(card.medicineId));
  const seen = doseCards.map((card) => cardForLevel(card, level, access));
  const dropped = doseCards.filter((card, index) => !seen[index]);
  const greyed = seen.filter((card) => card && card.otherLevelLines);
  const whole = doseCards.length - dropped.length - greyed.length;
  return [
    `===== ${level} =====`,
    `Medicines not studied at all (${notGiven.length}): ` +
      (notGiven.map((medicine) => medicine.t).join(', ') || 'none'),
    `Dose cards of the other medicines: ${whole} whole, ${greyed.length} with greyed lines, ` +
      `${dropped.length} dropped.`,
    `Dropped (${dropped.length}):`,
    ...dropped.map((card) => `  ${card.prompt} [${card.source}]`),
    `Greyed lines (${greyed.length} cards):`,
    ...greyed.flatMap(greyedCardLines),
    '',
  ];
}

const guidelines = guidelineData.sections.flatMap((section) => section.items);
const table = readPracticeLevelTable(guidelines.find((g) => g.id === ATP_GUIDELINE_ID));
const cards = buildQuizCards(guidelineData.sections, QUIZ_SECTION_NAME);
const cardMedicineIds = new Set(cards.map((card) => card.medicineId));
const medicines = guidelines.filter((guideline) => cardMedicineIds.has(guideline.id));
const access = {
  grantsByMedicine: medicineGrants(medicines, table, practiceLevelOverrides),
  rsiLevels: rsiLevels(table),
  lineOverrides: practiceLevelLineOverrides,
};
const report = table.levels.flatMap((level) => levelReview(level, cards, medicines, access));
console.log(report.join('\n'));
