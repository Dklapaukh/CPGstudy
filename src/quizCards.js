/*
 * Builds the medicines quiz flashcards from the guideline content. Pure: takes the guideline
 * sections and returns cards, touching nothing else. Cards are rebuilt on every start, so a
 * content update changes the cards without any separate data file.
 * Depends on constants.js and quizDoses.js.
 *
 * A card is { id, medicineId, key, prompt, answerBlocks, source }:
 *   id           medicineId + '|' + key, unique, stable across content updates where possible
 *   key          short name inside the medicine, used to store the card's schedule
 *   prompt       plain text shown on the front, for example "Amiodarone – Cardiac arrest – Dose"
 *   answerBlocks content blocks shown on the back, in the guideline data format
 *   source       plain text naming the guideline the answer comes from, for example "CPG 14.3"
 *
 * Only adult doses are tested: lines only about a child are removed and the paediatric dose
 * tables are not used.
 */
import { BLOCK } from './constants.js';
import {
  plainText,
  withoutChildDoses,
  namesMedicine,
  guidelineDoseBlocks,
  adultDosesByIndication,
  blockText,
  hasDose,
} from './quizDoses.js';

export { plainText };

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
const DOSE_WORD = 'Dose';
const TOP_LEVEL = 1;
// A dose label is the text before the first colon, if the colon comes this early.
const MAX_DOSE_LABEL_LENGTH = 70;
const MAX_KEY_SLUG_LENGTH = 24;
// Dose bullets that only point elsewhere ("See the 'RSI' guideline") are not cards themselves.
const POINTER_PATTERN = /^(see|refer to)\b/i;
// "See the individual guideline": the doses are spread over the guidelines for each indication.
const INDIVIDUAL_GUIDELINES_PATTERN = /\bsee the individual guidelines?\b/i;
// The guideline a pointer names, in quotes: "see the ‘post intubation’ guideline".
const NAMED_GUIDELINE_PATTERN = /['‘’]\s*([^'‘’]+?)\s*['‘’]\s*guideline/i;

// Guidelines that are never searched for adult doses: the RSI guideline has its own table cards
// and the Paediatrics section holds only child doses.
const RSI_DOSES_NUMBER = '9.3';
const PAEDIATRICS_SECTION_NAME = 'Paediatrics';
const PAEDIATRIC_TABLE_PATTERN = /paediatric/i;
// Guidelines outside the Paediatrics section that are only about children, so every dose in
// them is a child dose even where the line does not say so.
const CHILD_ONLY_GUIDELINE_TITLES = ['Croup', 'Bronchiolitis'];

// How a medicine is named in other guidelines, where its title's first word is not enough
// (for example "Glucose Gel" must not match "10% glucose IV"). Lower case.
const TABLE_NAME_OVERRIDES = {
  'Glucose Gel': ['glucose gel'],
  'Sodium Bicarbonate 8.4%': ['sodium bicarbonate'],
  'Prednisone and Prednisolone': ['prednisone', 'prednisolone'],
  'GTN (Glyceryl Trinitrate) IV': ['gtn iv', 'glyceryl trinitrate iv'],
  'GTN (Glyceryl Trinitrate) Spray': ['gtn spray', 'glyceryl trinitrate spray'],
};

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
  return groups;
}

/** The label of a dose group: the text before an early colon, or '' when there is none. */
function doseLabel(group) {
  const first = group[0];
  if (first[0] !== BLOCK.BULLET) return '';
  const text = plainText(first[1]);
  const colon = text.indexOf(':');
  return colon > 0 && colon <= MAX_DOSE_LABEL_LENGTH ? text.slice(0, colon).trim() : '';
}

/** The text of a group's first line after its label, for example "see the ‘RSI’ guideline." */
function textAfterLabel(group) {
  const text = plainText(group[0][1]);
  const label = doseLabel(group);
  return label ? text.slice(text.indexOf(':') + 1).trim() : text;
}

/** True when a dose group only sends the reader to another guideline. */
export function isPointerGroup(group) {
  if (group.length !== 1) return false;
  const text = textAfterLabel(group);
  return POINTER_PATTERN.test(text) || INDIVIDUAL_GUIDELINES_PATTERN.test(text);
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

/** The adult dose groups of a medicine's own Dosage section, split into doses and pointers. */
function ownDoseGroups(medicine) {
  const sectionBlocks = withoutChildDoses(blocksUnderHeading(medicine.b, DOSAGE_HEADING));
  const groups = splitDoseGroups(sectionBlocks);
  const joined = joinUnlabelledGroups(groups.filter((group) => !isPointerGroup(group)));
  // A group with no number and unit is general advice ("use a dose at the lower end of the
  // range if a caution is present"), not a dose to learn.
  const givesDose = (group) => group.some((block) => hasDose(blockText(block)));
  return { doses: joined.filter(givesDose), pointers: groups.filter(isPointerGroup) };
}

/**
 * The dosage cards of one medicine's own guideline, one per labelled dose. Unlabelled doses are
 * "Dose" when no dose has a label, otherwise "Other dose" (numbered when there are several).
 */
function ownDoseCards(medicine, doseGroups) {
  const labels = doseGroups.map(doseLabel);
  const keys = uniqueKeys(labels.map((label, i) => `dose-${slug(label) || i + 1}`));
  const unlabelledCount = labels.filter((label) => !label).length;
  const hasLabels = unlabelledCount < labels.length;
  let unlabelledSeen = 0;
  return doseGroups.map((group, i) => {
    let detail = labels[i] ? `${labels[i]} – ${DOSE_WORD}` : DOSE_WORD;
    if (!labels[i] && hasLabels) detail = `Other ${DOSE_WORD.toLowerCase()}`;
    if (!labels[i]) unlabelledSeen++;
    if (!labels[i] && unlabelledCount > 1) detail += `, ${unlabelledSeen} of ${unlabelledCount}`;
    return {
      key: keys[i],
      prompt: `${medicine.t} – ${detail}`,
      answerBlocks: group,
      source: `CPG ${medicine.n}`,
    };
  });
}

/** The lower-case names a medicine goes by in other guidelines and tables. */
export function tableNames(title) {
  if (TABLE_NAME_OVERRIDES[title]) return TABLE_NAME_OVERRIDES[title];
  return [title.split(/\s+/)[0].toLowerCase()];
}

/** The guideline a pointer names in quotes ("see the ‘post intubation’ guideline"), or null. */
function namedGuideline(pointer, guidelines) {
  const match = NAMED_GUIDELINE_PATTERN.exec(plainText(pointer[0][1]));
  if (!match) return null;
  const wanted = [match[1].toLowerCase()];
  return guidelines.find((guideline) => namesMedicine(guideline.t, wanted)) || null;
}

/**
 * Cards for labelled pointers to one named guideline, such as Fentanyl's "IV for sedation post
 * intubation: see the ‘post intubation’ guideline". The RSI guideline is skipped (its table
 * cards cover it), as is any pointer whose guideline gives no adult dose for this medicine.
 */
function namedGuidelineCards(medicine, pointers, guidelines, medicineNames) {
  const cards = [];
  for (const pointer of pointers) {
    const label = doseLabel(pointer);
    const target = namedGuideline(pointer, guidelines);
    if (!label || !target || target.n === RSI_DOSES_NUMBER) continue;
    const answerBlocks = guidelineDoseBlocks(target, medicineNames);
    if (answerBlocks.length === 0) continue;
    cards.push({
      key: `dose-${slug(label)}`,
      prompt: `${medicine.t} – ${label} – ${DOSE_WORD}`,
      answerBlocks,
      source: `CPG ${target.n}`,
    });
  }
  return cards;
}

/**
 * One card per indication from the other guidelines (Decisions Z8 to Z10), for a medicine
 * whose own Dosage section is missing or says "See the individual guideline".
 */
function indicationDoseCards(medicine, guidelines, medicineNames) {
  return adultDosesByIndication(guidelines, medicineNames).map((entry) => ({
    key: `dose-cpg-${entry.guidelines[0].n.replace(/\./g, '-')}`,
    prompt: `${medicine.t} – ${entry.guidelines.map((guideline) => guideline.t).join(', ')} – ${DOSE_WORD}`,
    answerBlocks: entry.answerBlocks,
    source: `CPG ${entry.guidelines.map((guideline) => guideline.n).join(', ')}`,
  }));
}

/**
 * The RSI dose tables for adults: [{ title, weightsBlock, rows }]. The title is the heading
 * above the table; the weights line is the paragraph just above it, when there is one.
 * The paediatric table is left out (paediatric doses are not tested).
 */
export function rsiTables(guideline) {
  const tables = [];
  let title = '';
  guideline.b.forEach((block, i) => {
    if (block[0] === BLOCK.HEADING) title = plainText(block[1]);
    if (block[0] !== BLOCK.TABLE || PAEDIATRIC_TABLE_PATTERN.test(title)) return;
    const previous = guideline.b[i - 1];
    const weightsBlock = previous && previous[0] === BLOCK.PARAGRAPH ? previous : null;
    tables.push({ title, weightsBlock, rows: block[1] });
  });
  return tables;
}

/** True when the first cell of a table row names the medicine (as a whole word). */
const rowNamesMedicine = (row, names) =>
  Boolean(row[0]) && namesMedicine(plainText(row[0].t), names);

/** One dosage card per row of the adult RSI dose table that names this medicine. */
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
        prompt: `${medicine.t} – RSI (${table.title}): ${rowName} – ${DOSE_WORD}`,
        answerBlocks: [...weights, [BLOCK.TABLE, [row]]],
        source: `CPG ${rsiGuideline.n}`,
      });
    });
  });
  return cards;
}

/** Every dosage card of one medicine: its own doses, then doses from other guidelines. */
function doseCards(medicine, context) {
  const { doses, pointers } = ownDoseGroups(medicine);
  const sendsToEachGuideline = pointers.some((pointer) =>
    INDIVIDUAL_GUIDELINES_PATTERN.test(plainText(pointer[0][1])),
  );
  // This medicine's names and every other medicine's, to tell whose dose a line gives.
  const ownNames = tableNames(medicine.t);
  const medicineNames = {
    names: ownNames,
    otherNames: context.allNames.filter((name) => !ownNames.includes(name)),
  };
  const cards = ownDoseCards(medicine, doses);
  if (doses.length === 0 || sendsToEachGuideline) {
    cards.push(...indicationDoseCards(medicine, context.searchable, medicineNames));
  }
  cards.push(...namedGuidelineCards(medicine, pointers, context.named, medicineNames));
  cards.push(...rsiDoseCards(medicine, context.rsi));
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
function medicineCards(medicine, context) {
  const cards = [];
  for (const topic of QUIZ_TOPICS) {
    if (topic.heading === DOSAGE_HEADING) cards.push(...doseCards(medicine, context));
    else {
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
 * All quiz cards, in the order they are introduced (guideline order, then topic order).
 * `sections` is the guideline data's sections; `sectionName` is the medicines section. A
 * guideline in that section counts as a medicine only if it has an Indications heading (the
 * introduction guideline does not).
 */
export function buildQuizCards(sections, sectionName) {
  const section = sections.find((candidate) => candidate.name === sectionName);
  if (!section) return [];
  const searchableSections = sections.filter(
    (candidate) => candidate.name !== sectionName && candidate.name !== PAEDIATRICS_SECTION_NAME,
  );
  const searchableGuidelines = searchableSections
    .flatMap((candidate) => candidate.items)
    .filter((guideline) => !CHILD_ONLY_GUIDELINE_TITLES.includes(guideline.t));
  const context = {
    searchable: searchableGuidelines.filter((guideline) => guideline.n !== RSI_DOSES_NUMBER),
    rsi: searchableGuidelines.find((guideline) => guideline.n === RSI_DOSES_NUMBER),
    named: searchableGuidelines,
  };
  const medicines = section.items.filter(
    (item) => blocksUnderHeading(item.b, QUIZ_TOPICS[0].heading).length > 0,
  );
  context.allNames = medicines.flatMap((medicine) => tableNames(medicine.t));
  return medicines.flatMap((medicine) => medicineCards(medicine, context));
}
