/*
 * Pure helpers for the lookup commands (scripts/guideline.js, scripts/scenario.js): they turn
 * one guideline or one scenario into short readable text, so a session can read just the part it
 * needs instead of the large content files. Depends on src/quizDoses.js and src/constants.js.
 */
import { plainText } from '../src/quizDoses.js';
import { BLOCK } from '../src/constants.js';

const INDENT = '  ';
const SNIPPET_RADIUS = 60;

/** Every guideline item in the data, in section order. */
export const allGuidelines = (data) => data.sections.flatMap((section) => section.items);

/** The guideline whose number ("9.4") or id ("cpg-9-4") is the query, or undefined. */
export function findGuideline(data, query) {
  const wanted = String(query).trim().toLowerCase();
  return allGuidelines(data).find((item) => item.n === wanted || item.id === wanted);
}

/** One table row as "| a | b |"; an empty cell is blank. */
const tableRowLine = (row) =>
  `| ${row.map((cell) => (cell ? plainText(cell.t) : '')).join(' | ')} |`;

/** The readable lines of one content block: headings, bullets by level, tables by row. */
export function blockLines(block) {
  const [kind] = block;
  if (kind === BLOCK.HEADING) return ['', `## ${plainText(block[1])}`];
  if (kind === BLOCK.BULLET) return [`${INDENT.repeat(block[2])}- ${plainText(block[1])}`];
  if (kind === BLOCK.PARAGRAPH) return [`${INDENT.repeat(block[2])}${plainText(block[1])}`];
  if (kind === BLOCK.KEY) return [`${plainText(block[1])}: ${plainText(block[2])}`];
  if (kind === BLOCK.TABLE) return block[1].map(tableRowLine);
  if (kind === BLOCK.BOX) return ['[box]', ...block[1].flatMap(blockLines), '[/box]'];
  return [plainText(block[1])];
}

/**
 * The blocks under the first heading whose text contains `headingQuery` (any case), up to the
 * next heading. Empty when no heading matches.
 */
export function headingPart(blocks, headingQuery) {
  const wanted = headingQuery.toLowerCase();
  const isHeading = (block) => block[0] === BLOCK.HEADING;
  const start = blocks.findIndex(
    (block) => isHeading(block) && plainText(block[1]).toLowerCase().includes(wanted),
  );
  if (start < 0) return [];
  const end = blocks.findIndex((block, index) => index > start && isHeading(block));
  return blocks.slice(start, end < 0 ? blocks.length : end);
}

/** The headings of a guideline, in order, for choosing a part to print. */
export const guidelineHeadings = (item) =>
  item.b.filter((block) => block[0] === BLOCK.HEADING).map((block) => plainText(block[1]));

/** The text to print for a guideline: its number, title and id, then each block's lines. */
export const guidelineText = (item, blocks = item.b) =>
  [`${item.n} ${plainText(item.t)} (${item.id})`, ...blocks.flatMap(blockLines)].join('\n');

/** A guideline's whole text as one plain line, for searching. */
const searchableText = (item) => item.b.flatMap(blockLines).join(' ');

/** A short piece of text either side of the first match, so a search result shows context. */
function snippetAround(text, index, length) {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

/** The guidelines whose text contains `phrase` (any case): number, title, matches, a snippet. */
export function searchGuidelines(data, phrase) {
  const wanted = phrase.toLowerCase();
  return allGuidelines(data).flatMap((item) => {
    const text = searchableText(item);
    const lower = text.toLowerCase();
    const matches = lower.split(wanted).length - 1;
    if (!matches) return [];
    const snippet = snippetAround(text, lower.indexOf(wanted), wanted.length);
    return [{ n: item.n, title: plainText(item.t), matches, snippet }];
  });
}

/** One line per scenario for the list: id, complexity, load, reviews and title. */
export function scenarioListLine(scenario, reviewEntry) {
  const reviews = reviewEntry?.reviewers || 0;
  const fields = [scenario.id.padEnd(28), `c${scenario.complexity}`, scenario.load.padEnd(10)];
  return [...fields, `${reviews} review${reviews === 1 ? '' : 's'}`, scenario.title].join('  ');
}

/**
 * One scenario with its guidelines named ("9.4 Title") and its editors' reviews, ready to print
 * as YAML. `nameOf` turns a guideline id into words.
 */
export function scenarioReport(scenario, reviewEntry, nameOf) {
  // The id and title are already in the scenario, so the review part leaves them out.
  const { id, title, ...reviews } = reviewEntry || {};
  return {
    scenario: { ...scenario, guidelines: (scenario.guidelines || []).map(nameOf) },
    editorsReviews: id || title ? reviews : 'none yet',
  };
}
