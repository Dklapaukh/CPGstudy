/*
 * Which practice levels (ATPs) may give each medicine, read from the table in guideline 1.1
 * "Authority to Practise and Practice Levels". Used by the Medicines quiz so a learner can study
 * only the medicines of their own ATP. Pure functions, tested in tests/practiceLevels.test.js.
 * Depends on quizDoses.js (plainText).
 */
import { plainText } from './quizDoses.js';

// The tick that marks an authorised skill in the 1.1 table.
const TICK = '✔';

// Route words that end a medicine's name in a table row, e.g. "Fentanyl IM, IN, IV and SC".
const ROUTE_WORDS = new Set([
  'in',
  'im',
  'iv',
  'io',
  'sc',
  'po',
  'sl',
  'mdi',
  'nebulised',
  'inhaled',
  'topical',
]);

/** The words of a text, lowercased, without numbers, percentages or brackets. */
function nameWords(text) {
  return plainText(text)
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/[\s,]+/)
    .filter((word) => word && !/^[\d.%]+$/.test(word));
}

/**
 * The medicine name at the start of a table row: the words before the first route word or
 * bracket, e.g. "1% lignocaine IO and SC" → "lignocaine". Rows that start with a route
 * ("IV cannulation") give [].
 */
export function rowMedicineName(rowText) {
  const beforeBracket = plainText(rowText).split('(')[0];
  const words = [];
  for (const word of nameWords(beforeBracket)) {
    if (ROUTE_WORDS.has(word)) break;
    words.push(word);
  }
  return words;
}

/**
 * The 1.1 table as { levels, rows }: levels are the column names after "Skill" (for example
 * ['EMT', 'Paramedic', 'ICP', 'CCP']); each row is { name, levels } with the levels ticked.
 * The PDF splits the table over several 'tbl' blocks; only the first has the header row.
 */
export function readPracticeLevelTable(guideline) {
  const tables = guideline.b.filter((block) => block[0] === 'tbl').map((block) => block[1]);
  if (tables.length === 0) return { levels: [], rows: [] };
  const levels = tables[0][0].slice(1).map((cell) => plainText(cell.t));
  const rows = [];
  for (const row of tables.flat().slice(1)) {
    const ticked = levels.filter((level, index) => (row[index + 1]?.t || '').includes(TICK));
    rows.push({ name: plainText(row[0].t), levels: ticked });
  }
  return { levels, rows };
}

/**
 * The table rows of one medicine: rows whose medicine name words all appear in the
 * medicine's title, e.g. "Magnesium IV" for "Magnesium Sulphate", "Prednisone PO" and
 * "Prednisolone PO" for "Prednisone and Prednisolone".
 */
export function rowsForMedicine(title, rows) {
  const titleWords = new Set(nameWords(title));
  return rows.filter((row) => {
    const words = rowMedicineName(row.name);
    return words.length > 0 && words.every((word) => titleWords.has(word));
  });
}

/**
 * The practice levels of each medicine, by guideline id: the levels ticked in any of its rows
 * (a medicine counts for an ATP if that ATP may give it by any route). `overrides` gives, by
 * guideline id, row names to use instead of matching ([] = not in the table: every level).
 * A medicine with no rows gets every level, so nothing is hidden by a missed match.
 */
export function medicinePracticeLevels(medicines, table, overrides = {}) {
  const levelsById = {};
  for (const medicine of medicines) {
    const override = overrides[medicine.id];
    const rows = override
      ? table.rows.filter((row) => override.includes(row.name))
      : rowsForMedicine(medicine.t, table.rows);
    const ticked = new Set(rows.flatMap((row) => row.levels));
    levelsById[medicine.id] =
      rows.length === 0 ? [...table.levels] : table.levels.filter((level) => ticked.has(level));
  }
  return levelsById;
}
