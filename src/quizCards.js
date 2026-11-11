/*
 * Builds the medicines quiz flashcards from the guideline content. Pure: takes the guideline
 * sections and returns cards, touching nothing else. Cards are rebuilt on every start, so a
 * content update changes the cards without any separate data file.
 * Depends on constants.js.
 *
 * A card is { id, medicineId, key, prompt, answerBlocks, source }:
 *   id           medicineId + '|' + key, unique, stable across content updates where possible
 *   key          short name inside the medicine, used to store the card's schedule
 *   prompt       plain text shown on the front, for example "Adrenaline – Indications"
 *   answerBlocks content blocks shown on the back, in the guideline data format
 *   source       plain text naming the guideline the answer comes from, for example "CPG 14.3"
 */
import { BLOCK } from './constants.js';

// The topics asked for each medicine, in the order they are introduced. `heading` is the
// heading text in the medicine guideline. Dosage is split into one card per dose (see below).
export const QUIZ_TOPICS = [
  { key: 'indications', heading: 'Indications' },
  { key: 'contraindications', heading: 'Contraindications' },
  { key: 'dose', heading: 'Dosage' },
  { key: 'cautions', heading: 'Cautions' },
  { key: 'adverse', heading: 'Common adverse effects' },
  { key: 'onset', heading: 'Usual onset of effect' },
  { key: 'duration', heading: 'Usual duration of effect' },
  { key: 'mechanism', heading: 'Mechanism of action' },
];
const DOSAGE_HEADING = 'Dosage';
const TOP_LEVEL = 1;
// A dose label is the text before the first colon, if the colon comes this early.
const MAX_DOSE_LABEL_LENGTH = 70;
const MAX_KEY_SLUG_LENGTH = 24;
// Dose bullets that only point elsewhere ("See the paediatric drug doses…") are not cards: the
// doses they point to become their own cards from the guidelines below.
const POINTER_PATTERN = /^(see|refer to)\b/i;

// Guidelines whose dose tables are split into extra dosage cards (Decision Z2).
const PAEDIATRIC_DOSES_NUMBER = '7.2';
const RSI_DOSES_NUMBER = '9.3';
const WEIGHT_BAND_PATTERN = /\bkg\b/i;
const DOSE_COLUMN = 1;
const NO_DOSE = '-';

// How a medicine is named in the dose tables, where its title's first word is not enough
// (for example "Glucose Gel" must not match "10% glucose IV"). Lower case.
const TABLE_NAME_OVERRIDES = {
  'Glucose Gel': ['glucose gel'],
  'Sodium Bicarbonate 8.4%': ['sodium bicarbonate'],
  'Prednisone and Prednisolone': ['prednisone', 'prednisolone'],
  'GTN (Glyceryl Trinitrate) IV': ['gtn iv', 'glyceryl trinitrate iv'],
  'GTN (Glyceryl Trinitrate) Spray': ['gtn spray', 'glyceryl trinitrate spray'],
};

/** Plain text of a piece of content markup: tags removed, the two allowed entities decoded. */
export function plainText(markup) {
  return String(markup)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A short lower-case key made of letters, digits and dashes, for storing a card's schedule. */
function slug(text) {
  const words = plainText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return words
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_KEY_SLUG_LENGTH)
    .replace(/-+$/, '');
}

/** The blocks under the heading named `headingText`, up to the next heading. Empty if none. */
export function blocksUnderHeading(blocks, headingText) {
  const start = blocks.findIndex(
    (block) => block[0] === BLOCK.HEADING && plainText(block[1]) === headingText,
  );
  if (start < 0) return [];
  const result = [];
  for (const block of blocks.slice(start + 1)) {
    if (block[0] === BLOCK.HEADING) break;
    result.push(block);
  }
  return result;
}

const isTopLevelBullet = (block) => block[0] === BLOCK.BULLET && block[2] === TOP_LEVEL;

/** Splits a Dosage section into groups, each a top-level bullet plus the blocks under it. */
export function splitDoseGroups(blocks) {
  const groups = [];
  for (const block of blocks) {
    if (isTopLevelBullet(block) || groups.length === 0) groups.push([]);
    groups[groups.length - 1].push(block);
  }
  return groups.filter((group) => {
    const isOnlyAPointer = group.length === 1 && POINTER_PATTERN.test(plainText(group[0][1]));
    return !isOnlyAPointer;
  });
}

/** The label of a dose group: the text before an early colon, or '' when there is none. */
function doseLabel(group) {
  const first = group[0];
  if (first[0] !== BLOCK.BULLET) return '';
  const text = plainText(first[1]);
  const colon = text.indexOf(':');
  return colon > 0 && colon <= MAX_DOSE_LABEL_LENGTH ? text.slice(0, colon).trim() : '';
}

/** Gives every key in the list a unique version by adding -2, -3… to repeats. */
function uniqueKeys(keys) {
  const seen = {};
  return keys.map((key) => {
    seen[key] = (seen[key] || 0) + 1;
    return seen[key] === 1 ? key : `${key}-${seen[key]}`;
  });
}

/**
 * Joins neighbouring dose groups that have no label: they are usually one dose given in steps
 * (a first dose, then its repeat), which only make sense together.
 */
export function joinUnlabelledGroups(groups) {
  const joined = [];
  groups.forEach((group) => {
    const previous = joined[joined.length - 1];
    if (previous && !doseLabel(previous) && !doseLabel(group)) previous.push(...group);
    else joined.push([...group]);
  });
  return joined;
}

/** The dosage cards of one medicine's own guideline, one per labelled dose. */
function ownDoseCards(medicine) {
  const sectionBlocks = blocksUnderHeading(medicine.b, DOSAGE_HEADING);
  const groups = joinUnlabelledGroups(splitDoseGroups(sectionBlocks));
  const labels = groups.map(doseLabel);
  const keys = uniqueKeys(labels.map((label, i) => `dose-${slug(label) || i + 1}`));
  return groups.map((group, i) => {
    const part = groups.length > 1 ? `, part ${i + 1} of ${groups.length}` : '';
    const detail = labels[i] ? `: ${labels[i]}` : part;
    return {
      key: keys[i],
      prompt: `${medicine.t} – Dosage${detail}`,
      answerBlocks: group,
      source: `CPG ${medicine.n}`,
    };
  });
}

/** The lower-case names a medicine goes by in the dose tables. */
export function tableNames(title) {
  if (TABLE_NAME_OVERRIDES[title]) return TABLE_NAME_OVERRIDES[title];
  return [title.split(/\s+/)[0].toLowerCase()];
}

const escapeForPattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the first cell of a table row names the medicine (as a whole word). */
function rowNamesMedicine(row, names) {
  const firstCell = row[0] ? plainText(row[0].t).toLowerCase() : '';
  return names.some((name) => new RegExp(`\\b${escapeForPattern(name)}\\b`).test(firstCell));
}

/** True when a table row is a coloured header row, such as "Cardiac arrest | Dose | Volume". */
const isHeaderRow = (row) => row.some((cell) => cell && cell.bg);

const rowHasDose = (row) => {
  const doseCell = row[DOSE_COLUMN];
  return Boolean(doseCell) && plainText(doseCell.t) !== NO_DOSE;
};

/**
 * The weight bands of the paediatric dose guideline: [{ band, rows }], where rows are the
 * table rows under that band's heading. A header row is kept as { header: row } so that the
 * matching rows can be shown under the right header.
 */
export function paediatricBands(guideline) {
  const bands = [];
  let current = null;
  for (const block of guideline.b) {
    if (block[0] === BLOCK.HEADING) {
      const heading = plainText(block[1]);
      current = WEIGHT_BAND_PATTERN.test(heading) ? { band: heading, rows: [] } : null;
      if (current) bands.push(current);
    } else if (current && block[0] === BLOCK.TABLE) {
      block[1].forEach((row) => current.rows.push(isHeaderRow(row) ? { header: row } : row));
    }
  }
  return bands;
}

/** The rows of one band that give this medicine a dose, each under its header row. */
function bandRowsFor(rows, names) {
  const result = [];
  let header = null;
  let headerShown = false;
  for (const row of rows) {
    if (row.header) {
      header = row.header;
      headerShown = false;
    } else if (rowNamesMedicine(row, names) && rowHasDose(row)) {
      if (header && !headerShown) result.push(header);
      headerShown = true;
      result.push(row);
    }
  }
  return result;
}

/** One dosage card per weight band of the paediatric dose guideline that doses this medicine. */
function paediatricDoseCards(medicine, paediatricGuideline) {
  if (!paediatricGuideline) return [];
  const names = tableNames(medicine.t);
  const cards = [];
  for (const { band, rows } of paediatricBands(paediatricGuideline)) {
    const matched = bandRowsFor(rows, names);
    if (!matched.some((row) => !isHeaderRow(row))) continue;
    cards.push({
      key: `paed-${slug(band)}`,
      prompt: `${medicine.t} – Paediatric dose: ${band}`,
      answerBlocks: [[BLOCK.TABLE, matched]],
      source: `CPG ${paediatricGuideline.n}`,
    });
  }
  return cards;
}

/**
 * The RSI dose tables: [{ title, weightsBlock, rows }]. The title is the heading above the
 * table; the weights line is the paragraph just above it, when there is one.
 */
export function rsiTables(guideline) {
  const tables = [];
  let title = '';
  guideline.b.forEach((block, i) => {
    if (block[0] === BLOCK.HEADING) title = plainText(block[1]);
    if (block[0] !== BLOCK.TABLE) return;
    const previous = guideline.b[i - 1];
    const weightsBlock = previous && previous[0] === BLOCK.PARAGRAPH ? previous : null;
    tables.push({ title, weightsBlock, rows: block[1] });
  });
  return tables;
}

/** One dosage card per row of the RSI dose tables that names this medicine. */
function rsiDoseCards(medicine, rsiGuideline) {
  if (!rsiGuideline) return [];
  const names = tableNames(medicine.t);
  const cards = [];
  rsiTables(rsiGuideline).forEach((table, tableIndex) => {
    table.rows.forEach((row) => {
      if (!rowNamesMedicine(row, names)) return;
      const rowName = plainText(row[0].t);
      const weights = table.weightsBlock ? [table.weightsBlock] : [];
      cards.push({
        key: `rsi-${tableIndex + 1}-${slug(rowName)}`,
        prompt: `${medicine.t} – RSI dose (${table.title}): ${rowName}`,
        answerBlocks: [...weights, [BLOCK.TABLE, [row]]],
        source: `CPG ${rsiGuideline.n}`,
      });
    });
  });
  return cards;
}

/** The card for one non-dosage topic, or null when the guideline has nothing under it. */
function topicCard(medicine, topic) {
  const answerBlocks = blocksUnderHeading(medicine.b, topic.heading);
  if (answerBlocks.length === 0) return null;
  return {
    key: topic.key,
    prompt: `${medicine.t} – ${topic.heading}`,
    answerBlocks,
    source: `CPG ${medicine.n}`,
  };
}

/** Every card of one medicine, in topic order, with ids filled in. */
function medicineCards(medicine, doseGuidelines) {
  const cards = [];
  for (const topic of QUIZ_TOPICS) {
    if (topic.heading === DOSAGE_HEADING) {
      cards.push(...ownDoseCards(medicine));
      cards.push(...paediatricDoseCards(medicine, doseGuidelines.paediatric));
      cards.push(...rsiDoseCards(medicine, doseGuidelines.rsi));
    } else {
      const card = topicCard(medicine, topic);
      if (card) cards.push(card);
    }
  }
  const keys = uniqueKeys(cards.map((card) => card.key));
  return cards.map((card, i) => ({
    ...card,
    key: keys[i],
    id: `${medicine.id}|${keys[i]}`,
    medicineId: medicine.id,
  }));
}

/**
 * All quiz cards, in the order new cards are introduced (guideline order, then topic order).
 * `sections` is the guideline data's sections; `sectionName` is the medicines section. A
 * guideline in that section counts as a medicine only if it has an Indications heading (the
 * introduction guideline does not).
 */
export function buildQuizCards(sections, sectionName) {
  const allGuidelines = sections.flatMap((section) => section.items);
  const byNumber = (number) => allGuidelines.find((guideline) => guideline.n === number);
  const doseGuidelines = {
    paediatric: byNumber(PAEDIATRIC_DOSES_NUMBER),
    rsi: byNumber(RSI_DOSES_NUMBER),
  };
  const section = sections.find((candidate) => candidate.name === sectionName);
  if (!section) return [];
  const medicines = section.items.filter(
    (item) => blocksUnderHeading(item.b, QUIZ_TOPICS[0].heading).length > 0,
  );
  return medicines.flatMap((medicine) => medicineCards(medicine, doseGuidelines));
}
