/*
 * Builds content/related.js: for each guideline, the guidelines most closely related to it.
 * Run by hand with `node scripts/build-related.js` after the guideline content or the
 * overrides change. The app only reads the result, so nothing is calculated while it runs.
 * Depends on content/guidelines.js and content/related-overrides.js.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { guidelineData } from '../content/guidelines.js';
import { relatedOverrides } from '../content/related-overrides.js';

const MEDICINES_SECTION_NAME = 'Medicines';
const VERSION_HISTORY_PATTERN = /version history/i;
// Mentions of a medicine count for less, because 46 of the 180 guidelines are medicines and
// they would otherwise fill every list.
const TITLE_MENTION_SCORE = 3;
const MEDICINE_MENTION_SCORE = 1;
const SHARED_MEDICINE_SCORE = 0.5;
const MAX_SHARED_MEDICINE_SCORE = 1.5;
// A title mentioned by many guidelines (such as Vital Signs) says little about any one of them.
const POPULAR_TITLE_MENTION_COUNT = 20;
const POPULAR_TITLE_FACTOR = 0.5;
// Big sections (such as Medicines) say little about how two guidelines relate.
const MAX_SECTION_SIZE_FOR_SCORE = 20;
const SAME_SECTION_SCORE = 1;
const NEXT_TO_SCORE = 1;
const OVERRIDE_ADD_SCORE = 10;
const LINKS_KEPT_PER_GUIDELINE = 10;
// When several signals apply, the reason shown is the first of these that applies.
const REASON_PRIORITY = [
  'chosen',
  'mentions',
  'mentioned-by',
  'shared-medicines',
  'next-to',
  'same-section',
];

/** Lower-case plain text of a guideline body, without the Version history part. */
function searchableText(guideline) {
  const historyStart = guideline.b.findIndex(
    (block) => block[0] === 'p' && VERSION_HISTORY_PATTERN.test(block[1]),
  );
  const blocks = historyStart >= 0 ? guideline.b.slice(0, historyStart) : guideline.b;
  return JSON.stringify(blocks)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** A pattern that finds the title as whole words, ignoring any bracketed part of the title. */
function titlePattern(title) {
  const plainTitle = title
    .replace(/\(.*?\)/g, '')
    .replace(/&amp;/g, '&')
    .trim()
    .toLowerCase();
  const escaped = plainTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`);
}

function chapterAndMinor(number) {
  const [chapter, minor] = String(number).split('.');
  return { chapter, minor: Number(minor) };
}

function areNextToEachOther(first, second) {
  const a = chapterAndMinor(first.n);
  const b = chapterAndMinor(second.n);
  return a.chapter === b.chapter && Math.abs(a.minor - b.minor) === 1;
}

/** Ids of the other guidelines whose title appears in this guideline's text. */
function mentionedIds(guideline, texts, patterns, allGuidelines) {
  return allGuidelines
    .filter((other) => other.id !== guideline.id && patterns[other.id].test(texts[guideline.id]))
    .map((other) => other.id);
}

function addSignal(links, fromId, toId, score, reason) {
  const link = links[fromId][toId] || { score: 0, reasons: new Set() };
  link.score += score;
  link.reasons.add(reason);
  links[fromId][toId] = link;
}

/** Adds the same signal in both directions, because relatedness has no direction. */
function addSignalBothWays(links, firstId, secondId, score, reason) {
  addSignal(links, firstId, secondId, score, reason);
  addSignal(links, secondId, firstId, score, reason);
}

/** Adds the title-mention signals. Returns { guidelineId: ids of the guidelines it mentions }. */
function addMentionSignals(links, guidelines, isMedicine) {
  const texts = {};
  const patterns = {};
  guidelines.forEach((guideline) => {
    texts[guideline.id] = searchableText(guideline);
    patterns[guideline.id] = titlePattern(guideline.t);
  });
  const mentionedByGuideline = {};
  const mentionCount = {};
  guidelines.forEach((guideline) => {
    mentionedByGuideline[guideline.id] = mentionedIds(guideline, texts, patterns, guidelines);
    mentionedByGuideline[guideline.id].forEach((id) => {
      mentionCount[id] = (mentionCount[id] || 0) + 1;
    });
  });
  guidelines.forEach((guideline) => {
    mentionedByGuideline[guideline.id].forEach((mentionedId) => {
      let score = isMedicine[mentionedId] ? MEDICINE_MENTION_SCORE : TITLE_MENTION_SCORE;
      if (mentionCount[mentionedId] > POPULAR_TITLE_MENTION_COUNT) score *= POPULAR_TITLE_FACTOR;
      addSignal(links, guideline.id, mentionedId, score, 'mentions');
      addSignal(links, mentionedId, guideline.id, score, 'mentioned-by');
    });
  });
  return mentionedByGuideline;
}

/** Two non-medicine guidelines that mention the same medicines are related. */
function addSharedMedicineSignals(links, guidelines, isMedicine, mentionedByGuideline) {
  const others = guidelines.filter((guideline) => !isMedicine[guideline.id]);
  others.forEach((first, index) => {
    others.slice(index + 1).forEach((second) => {
      const shared = mentionedByGuideline[first.id].filter(
        (id) => isMedicine[id] && mentionedByGuideline[second.id].includes(id),
      );
      if (!shared.length) return;
      const score = Math.min(shared.length * SHARED_MEDICINE_SCORE, MAX_SHARED_MEDICINE_SCORE);
      addSignalBothWays(links, first.id, second.id, score, 'shared-medicines');
    });
  });
}

function addPlaceSignals(links, sections) {
  sections.forEach((section) => {
    const items = section.items;
    items.forEach((first, index) => {
      items.slice(index + 1).forEach((second) => {
        if (items.length <= MAX_SECTION_SIZE_FOR_SCORE) {
          addSignalBothWays(links, first.id, second.id, SAME_SECTION_SCORE, 'same-section');
        }
        if (areNextToEachOther(first, second)) {
          addSignalBothWays(links, first.id, second.id, NEXT_TO_SCORE, 'next-to');
        }
      });
    });
  });
}

function applyOverrides(links, overrides) {
  overrides.remove.forEach(([firstId, secondId]) => {
    delete links[firstId][secondId];
    delete links[secondId][firstId];
  });
  overrides.add.forEach(([firstId, secondId]) => {
    addSignalBothWays(links, firstId, secondId, OVERRIDE_ADD_SCORE, 'chosen');
  });
}

/**
 * Takes the guideline data and the overrides; returns { guidelineId: [[otherId, score, reason]] }
 * with the best links first (at most LINKS_KEPT_PER_GUIDELINE per guideline).
 */
export function buildRelatedLinks(data, overrides) {
  const guidelines = data.sections.flatMap((section) => section.items);
  const isMedicine = {};
  const links = {};
  data.sections.forEach((section) => {
    section.items.forEach((guideline) => {
      isMedicine[guideline.id] = section.name === MEDICINES_SECTION_NAME;
      links[guideline.id] = {};
    });
  });
  const mentionedByGuideline = addMentionSignals(links, guidelines, isMedicine);
  addSharedMedicineSignals(links, guidelines, isMedicine, mentionedByGuideline);
  addPlaceSignals(links, data.sections);
  applyOverrides(links, overrides);
  return pickBestLinks(links, guidelines);
}

function pickBestLinks(links, guidelines) {
  const order = {};
  guidelines.forEach((guideline, index) => {
    order[guideline.id] = index;
  });
  const result = {};
  guidelines.forEach((guideline) => {
    result[guideline.id] = Object.keys(links[guideline.id])
      .map((otherId) => {
        const { score, reasons } = links[guideline.id][otherId];
        const reason = REASON_PRIORITY.find((code) => reasons.has(code));
        return [otherId, score, reason];
      })
      .sort((a, b) => b[1] - a[1] || order[a[0]] - order[b[0]])
      .slice(0, LINKS_KEPT_PER_GUIDELINE);
  });
  return result;
}

function writeRelatedFile(relatedLinks) {
  const lines = Object.keys(relatedLinks).map(
    (id) => `  ${JSON.stringify(id)}: ${JSON.stringify(relatedLinks[id])},`,
  );
  const text = `/*
 * Related guidelines, built by scripts/build-related.js. Do not edit by hand: change
 * content/related-overrides.js and run the script again.
 * Each guideline id maps to [[relatedId, score, reasonCode], ...], best first.
 */
export const relatedLinks = {
${lines.join('\n')}
};
`;
  writeFileSync(new URL('../content/related.js', import.meta.url), text);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeRelatedFile(buildRelatedLinks(guidelineData, relatedOverrides));
  console.log('content/related.js written');
}
