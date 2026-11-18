/*
 * Which practice levels (ATPs) may give each medicine, read from the table in guideline 1.1
 * "Authority to Practise and Practice Levels". Used by the Medicines quiz so a learner can study
 * only the medicines of their own ATP, and (feature 11, Decisions Z18 to Z22) only the dose
 * lines that ATP may give: by route, and by the indication limits written in brackets in 1.1.
 * Pure functions, tested in tests/practiceLevels.test.js.
 * Depends on constants.js and quizDoses.js (plainText, blockText).
 */
import { BLOCK } from './constants.js';
import { plainText, blockText } from './quizDoses.js';

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
 * The 1.1 rows of one medicine: the rows named in `overrides` for its guideline id when there
 * is an entry ([] = not in the table), otherwise the rows matched by name.
 */
function medicineRows(medicine, table, overrides) {
  const override = overrides[medicine.id];
  if (override) return table.rows.filter((row) => override.includes(row.name));
  return rowsForMedicine(medicine.t, table.rows);
}

/* ---------- Feature 11: routes and indication limits (plan 8.6) ---------- */

// A grant with this in place of a route list covers every route ("Adrenaline (all routes)").
export const ANY_ROUTE = 'any';
// Route abbreviations count only in capitals, so the word "in" is never the route IN.
const ROUTE_ABBREVIATIONS = new Set(['IM', 'IV', 'IN', 'IO', 'SC', 'PO', 'SL', 'MDI']);
// Route words in any case, and the route each stands for. An infusion is always IV.
const ROUTE_NAMES = {
  nebulised: 'nebulised',
  topical: 'topical',
  inhaled: 'inhaled',
  infusion: 'iv',
  subcutaneous: 'sc',
  intraosseous: 'io',
};
// A bracket is an indication limit only when it ends in "only": "(cardiac arrest only)".
const LIMIT_PATTERN = /\bonly\s*$/i;
const ALL_ROUTES_PATTERN = /\ball routes\b/i;
// A card's indication meets a limit when this share of the limit's words is in it, so "care
// during last days of life" matches the card "Care During the Last Days of Life".
const LIMIT_WORD_SHARE = 0.75;
// The 1.1 row whose levels may use the RSI dose table of CPG 9.3.
const RSI_ROW_PATTERN = /rapid sequence intubation/i;
const PROMPT_SEPARATOR = ' – ';

/** The routes named in a text, lower case and without repeats: "IV/IM" → ['iv', 'im']. */
export function textRoutes(text) {
  const routes = new Set();
  for (const word of plainText(text).split(/[^A-Za-z]+/)) {
    if (ROUTE_ABBREVIATIONS.has(word)) routes.add(word.toLowerCase());
    else if (ROUTE_NAMES[word.toLowerCase()]) routes.add(ROUTE_NAMES[word.toLowerCase()]);
  }
  return [...routes];
}

/**
 * What one 1.1 row grants: { routes, limits }. `routes` is the list of routes after the name,
 * or ANY_ROUTE for "(all routes)" and for a row that names none. `limits` is the indications
 * in an "(… only)" bracket, [] when there is no limit:
 * "Midazolam IV (seizures and care during last days of life only)" →
 * { routes: ['iv'], limits: ['seizures', 'care during last days of life'] }.
 */
export function rowGrant(rowName) {
  const text = plainText(rowName);
  const bracket = (/\(([^)]*)\)/.exec(text) || ['', ''])[1];
  const routes = textRoutes(text.split('(')[0]);
  const allRoutes = ALL_ROUTES_PATTERN.test(bracket) || routes.length === 0;
  const limits = LIMIT_PATTERN.test(bracket)
    ? bracket
        .replace(LIMIT_PATTERN, '')
        .split(/,|\band\b/)
        .map((limit) => limit.trim())
        .filter(Boolean)
    : [];
  return { routes: allRoutes ? ANY_ROUTE : routes, limits };
}

/**
 * The grants of each medicine at each level: { [guideline id]: { [level]: [grant, …] } }, one
 * grant (see rowGrant) per 1.1 row ticked for that level. A medicine with no rows gets one
 * grant of every route at every level, so nothing is hidden by a missed match.
 */
export function medicineGrants(medicines, table, overrides = {}) {
  const everything = [{ routes: ANY_ROUTE, limits: [] }];
  const grantsById = {};
  for (const medicine of medicines) {
    const rows = medicineRows(medicine, table, overrides);
    grantsById[medicine.id] = Object.fromEntries(
      table.levels.map((level) => [
        level,
        rows.length === 0
          ? everything
          : rows.filter((row) => row.levels.includes(level)).map((row) => rowGrant(row.name)),
      ]),
    );
  }
  return grantsById;
}

/** The levels ticked for rapid sequence intubation in 1.1; every level if the row is missing. */
export function rsiLevels(table) {
  const row = table.rows.find((candidate) => RSI_ROW_PATTERN.test(candidate.name));
  return row ? row.levels : [...table.levels];
}

/** The indent of an answer line; tables, keys and boxes sit under the line above them. */
const lineIndent = (block) =>
  block[0] === BLOCK.BULLET || block[0] === BLOCK.PARAGRAPH ? block[2] : Infinity;

/**
 * The routes of a line that names none: those of the line it sits under (lower indent);
 * otherwise those named in the lines indented under it ("For analgesia:" above "IV: …");
 * otherwise those of the line before. `routesSoFar` holds the routes of the earlier lines.
 */
function inheritedRoutes(index, ownRoutes, indents, routesSoFar) {
  for (let above = index - 1; above >= 0; above--) {
    if (indents[above] < indents[index]) {
      if (routesSoFar[above].length > 0) return routesSoFar[above];
      break;
    }
  }
  const under = new Set();
  for (let below = index + 1; below < indents.length && indents[below] > indents[index]; below++) {
    ownRoutes[below].forEach((route) => under.add(route));
  }
  if (under.size > 0) return [...under];
  return index > 0 ? routesSoFar[index - 1] : [];
}

/**
 * The routes of every line of an answer, in order: the routes the line names, or the ones it
 * inherits (see inheritedRoutes). [] for a line of a card that names no route at all.
 */
export function answerLineRoutes(blocks) {
  const ownRoutes = blocks.map((block) => textRoutes(blockText(block)));
  const indents = blocks.map(lineIndent);
  const routes = [];
  blocks.forEach((block, index) => {
    const own = ownRoutes[index];
    routes.push(own.length > 0 ? own : inheritedRoutes(index, ownRoutes, indents, routes));
  });
  return routes;
}

/**
 * The indication of a dose card: the middle of its prompt ("Adrenaline – Cardiac Arrest –
 * Dose" → "Cardiac Arrest"). A prompt with no middle ("Ketamine – Other dose") gives the first
 * answer line, which says what the dose is for.
 */
export function cardIndication(card) {
  const parts = card.prompt.split(PROMPT_SEPARATOR);
  if (parts.length >= 3) return parts.slice(1, -1).join(' ');
  return card.answerBlocks.length > 0 ? blockText(card.answerBlocks[0]) : '';
}

const lowerWords = (text) => text.toLowerCase().match(/[a-z]+/g) || [];

/** True when most of the limit's words are in the indication (see LIMIT_WORD_SHARE). */
export function meetsLimit(indication, limit) {
  const indicationWords = new Set(lowerWords(indication));
  const limitWords = lowerWords(limit);
  const shared = limitWords.filter((word) => indicationWords.has(word)).length;
  return limitWords.length > 0 && shared >= LIMIT_WORD_SHARE * limitWords.length;
}

/** True when a grant covers a line: its indication limit is met and it has one of the routes. */
function grantCovers(grant, routes, indication) {
  const inLimit =
    grant.limits.length === 0 || grant.limits.some((limit) => meetsLimit(indication, limit));
  const hasRoute =
    routes.length === 0 ||
    grant.routes === ANY_ROUTE ||
    routes.some((route) => grant.routes.includes(route));
  return inLimit && hasRoute;
}

/**
 * The routes of a line that 1.1 knows for this medicine. A route that no row names (Enoxaparin
 * IV: the table lists only "Enoxaparin SC") is dropped, so it can never hide a line.
 */
function knownRoutes(routes, grantsByLevel) {
  const grants = Object.values(grantsByLevel).flat();
  if (grants.some((grant) => grant.routes === ANY_ROUTE)) return routes;
  return routes.filter((route) => grants.some((grant) => grant.routes.includes(route)));
}

/**
 * For each answer line of a dose card, the levels that may give it, e.g. ['ICP', 'CCP'].
 * A line naming two routes counts for a level that has either, so it is never hidden wrongly.
 * `overrides` is the card's hand-made corrections: [{ lineStart, levels }].
 */
function cardLineLevels(card, grantsByLevel, overrides = []) {
  const indication = cardIndication(card);
  return answerLineRoutes(card.answerBlocks).map((lineRoutes, index) => {
    const text = blockText(card.answerBlocks[index]);
    const override = overrides.find((candidate) => text.startsWith(candidate.lineStart));
    if (override) return override.levels;
    const routes = knownRoutes(lineRoutes, grantsByLevel);
    return Object.keys(grantsByLevel).filter((level) =>
      grantsByLevel[level].some((grant) => grantCovers(grant, routes, indication)),
    );
  });
}

/**
 * One card as a level sees it, or null when the level does not study it. `access` is
 * { grantsByMedicine, rsiLevels, lineOverrides }.
 * Topic cards (Indications, Cautions and so on) stay whole for every level that may give the
 * medicine. RSI table cards are all or nothing. A dose card is dropped when the level may give
 * none of its lines; otherwise it keeps every line, with `otherLevelLines` added when some are
 * not the level's: per answer line, null or the levels that may give it (shown greyed,
 * Decision Z18). The card keeps its id and key, so its schedule is untouched.
 */
export function cardForLevel(card, level, access) {
  const grantsByLevel = access.grantsByMedicine[card.medicineId] || {};
  if ((grantsByLevel[level] || []).length === 0) return null;
  if (card.isRsi) return access.rsiLevels.includes(level) ? card : null;
  if (!card.isDose) return card;
  const lineLevels = cardLineLevels(card, grantsByLevel, access.lineOverrides[card.id]);
  if (lineLevels.every((levels) => levels.includes(level))) return card;
  if (!lineLevels.some((levels) => levels.includes(level))) return null;
  const otherLevelLines = lineLevels.map((levels) => (levels.includes(level) ? null : levels));
  return { ...card, otherLevelLines };
}

/** The cards a level studies, in card order (see cardForLevel). */
export function cardsForLevel(cards, level, access) {
  return cards.map((card) => cardForLevel(card, level, access)).filter(Boolean);
}

/** Levels as words for a label: ['ICP', 'CCP'] → "ICP and CCP". */
export function levelsLabel(levels) {
  if (levels.length < 2) return levels.join('');
  return `${levels.slice(0, -1).join(', ')} and ${levels[levels.length - 1]}`;
}
