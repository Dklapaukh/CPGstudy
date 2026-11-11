/*
 * Checks that guideline content holds only what the app expects (review item R13).
 * The app puts guideline text on the page as markup without escaping it, which is safe only
 * while the content holds nothing but the few things listed here. This check runs before
 * scripts/build-guidelines.js writes rebuilt content, and in `npm run check` on the published
 * content (tests/contentCheck.test.js), so unexpected markup can never be published.
 * Pure functions, no dependencies. The block kinds match BLOCK in src/constants.js.
 *
 * What is allowed:
 *   text      the tags <b>, </b> and <br>, the entities &lt; and &amp;, and no other "<" or "&"
 *   colour    "#" and six hex digits, because colours are written into style attributes
 *   id        lower-case letters, digits and "-"; number: digits, a dot, digits
 *   blocks    ['h', text, colour]            heading
 *             ['p', text, level]             paragraph
 *             ['b', text, level, colour]     bullet
 *             ['k', label, text, colour]     key (a letter in a coloured square, then text)
 *             ['box', [blocks], colour]      coloured box of p, b and k blocks
 *             ['tbl', rows]                  table; a row is a list of cells, each null or
 *                                            { t: text, bg: colour or null, w: true or false }
 */

const ALLOWED_MARKUP = /<b>|<\/b>|<br>|&lt;|&amp;/g;
const COLOUR = /^#[0-9A-Fa-f]{6}$/;
const GUIDELINE_ID = /^[a-z0-9-]+$/;
const GUIDELINE_NUMBER = /^\d+\.\d+$/;
const MAX_INDENT_LEVEL = 3;
const BLOCKS_INSIDE_A_BOX = ['p', 'b', 'k'];

const isText = (value) =>
  typeof value === 'string' && !/[<&]/.test(value.replace(ALLOWED_MARKUP, ''));
const isColour = (value) => typeof value === 'string' && COLOUR.test(value);
const isLevel = (value) => Number.isInteger(value) && value >= 0 && value <= MAX_INDENT_LEVEL;
const isCell = (cell) =>
  cell === null ||
  (isText(cell.t) && (cell.bg === null || isColour(cell.bg)) && typeof cell.w === 'boolean');
const isTableRows = (rows) =>
  Array.isArray(rows) && rows.every((row) => Array.isArray(row) && row.every(isCell));

/** True when a block inside a box is one of the kinds a box may hold, and is itself valid. */
function isBoxContent(blocks) {
  return (
    Array.isArray(blocks) &&
    blocks.every((block) => BLOCKS_INSIDE_A_BOX.includes(block[0]) && isValidBlock(block))
  );
}

// For each block kind: the number of items in the block and a check for each item after the kind.
const BLOCK_RULES = {
  h: [isText, isColour],
  p: [isText, isLevel],
  b: [isText, isLevel, isColour],
  k: [isText, isText, isColour],
  box: [isBoxContent, isColour],
  tbl: [isTableRows],
};

/** True when a content block has a known kind and every item of it passes that kind's checks. */
export function isValidBlock(block) {
  if (!Array.isArray(block) || !Object.hasOwn(BLOCK_RULES, block[0])) return false;
  const rules = BLOCK_RULES[block[0]];
  return block.length === rules.length + 1 && rules.every((rule, index) => rule(block[index + 1]));
}

/** The problems of one guideline item, as a list of short descriptions (empty when valid). */
function guidelineProblems(item) {
  const problems = [];
  if (typeof item.id !== 'string' || !GUIDELINE_ID.test(item.id)) problems.push('id');
  if (typeof item.n !== 'string' || !GUIDELINE_NUMBER.test(item.n)) problems.push('number');
  if (typeof item.t !== 'string' || !item.t) problems.push('title');
  if (item.hc !== null && !isColour(item.hc)) problems.push('header colour');
  if (!Array.isArray(item.b)) return [...problems, 'body'];
  item.b.forEach((block, index) => {
    if (!isValidBlock(block)) problems.push(`block ${index + 1}`);
  });
  return problems;
}

/**
 * Checks guideline data ({ sections: [{ name, items }] }). Returns a list of problems such as
 * "14.53: block 7, block 9"; an empty list means the content is safe to publish.
 */
export function contentProblems(guidelineData) {
  const problems = [];
  const seenIds = new Set();
  guidelineData.sections.forEach((section) => {
    if (typeof section.name !== 'string' || !section.name) problems.push('A section has no name');
    section.items.forEach((item) => {
      const found = guidelineProblems(item);
      if (seenIds.has(item.id)) found.push('id used twice');
      seenIds.add(item.id);
      if (found.length) problems.push(`${item.n || item.id}: ${found.join(', ')}`);
    });
  });
  return problems;
}
