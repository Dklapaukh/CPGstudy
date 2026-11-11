// Tests for the PDF to content converter (scripts/pdfContent.js, feature 6 stage B). The real
// acceptance test needs the 17 MB PDF: `node scripts/build-guidelines.js EAS.pdf --check`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAllGuidelines, pageBlocks, pageNumberOf, rowHtml } from '../scripts/pdfContent.js';

const BOOK = 'Avenir-Book';
const HEAVY = 'Avenir-Heavy';
const GREEN = '#00693C';
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const BODY_SIZE = 10.944;

/** A fake span of body text with one x position per character. */
function span(text, x, baseline, options = {}) {
  const size = options.size || BODY_SIZE;
  return {
    t: text,
    xs: Array.from(text).map((_, index) => x + index * 5),
    x,
    y: baseline,
    top: baseline - size,
    size,
    font: options.font || BOOK,
    col: options.col || BLACK,
  };
}

/** A fake filled shape. */
function shape(x0, y0, x1, y1, col, points = 4) {
  return { x0, y0, x1, y1, col, n: points };
}

/** A fake bullet chevron to the left of text whose baseline is given. */
function marker(baseline) {
  return shape(27.3, baseline - 9.6, 38.3, baseline + 1.3, GREEN, 43);
}

/** The header spans every guideline page has. */
function header(number, title) {
  return [
    span(title, 26.5, 58, { font: HEAVY, size: 20, col: WHITE }),
    span(`CPG EAS ${number} St John New Zealand`, 443, 27, { size: 8, col: WHITE }),
    span('Uncontrolled document exported 24.09.2026', 407, 46, { size: 8, col: WHITE }),
  ];
}

test('a row joins bold pieces and separates every piece with a space', () => {
  const row = {
    spans: [
      span('as per ', 26, 100),
      span('CPG EAS 1.1', 60, 100, { font: HEAVY }),
      span(', unless', 120, 100),
    ],
  };
  assert.equal(rowHtml(row), 'as per <b>CPG EAS 1.1</b> , unless');
});

test('a superscript lands inside the word run it belongs to', () => {
  const main = span('over the 5 intercostal', 26, 140);
  main.xs = Array.from(main.t).map((_, index) => 26 + index * 5 + (index >= 10 ? 10 : 0));
  const superscript = span('th', 77, 136, { size: 8.2 });
  superscript.top = main.top - 1.4;
  assert.equal(rowHtml({ spans: [main, superscript] }), 'over the 5 th intercostal');
});

test('headings, bullets, continuation lines and indented paragraphs are recognised', () => {
  const page = {
    spans: [
      span('Intro paragraph that wraps', 25.9, 106.9),
      span('onto a second line.', 25.9, 121.9),
      span('Mild asthma', 25.9, 163, { font: HEAVY, col: WHITE }),
      span('First bullet', 53.3, 197.2),
      span('wrapped bullet text.', 53.3, 212.2),
      span('Indented note', 53.3, 260),
    ],
    rects: [shape(15, 146.6, 580, 172.6, '#FCB525'), marker(197.2)],
  };
  assert.deepEqual(pageBlocks(page), [
    ['p', 'Intro paragraph that wraps onto a second line.', 0],
    ['h', '<b>Mild asthma</b>', '#FCB525'],
    ['b', 'First bullet wrapped bullet text.', 1, GREEN],
    ['p', 'Indented note', 1],
  ]);
});

test('a two-line band is a box, and a key letter starts a key block', () => {
  const page = {
    spans: [
      span('A heading too long', 25.9, 483, { font: HEAVY, col: WHITE }),
      span('for one line', 25.9, 497, { font: HEAVY, col: WHITE }),
      span('I', 59.8, 540, { font: HEAVY, col: WHITE }),
      span('Identify yourself.', 86.9, 540, { font: HEAVY }),
    ],
    rects: [shape(15, 467, 580, 506, GREEN), shape(53.3, 524, 76.6, 546.5, GREEN, 35)],
  };
  assert.deepEqual(pageBlocks(page), [
    ['box', [['p', '<b>A heading too long</b> <b>for one line</b>', 0]], GREEN],
    ['k', 'I', '<b>Identify yourself.</b>', GREEN],
  ]);
});

test('a table drawn with grey rules becomes a tbl block with cell colours', () => {
  const rule = '#B2B2B2';
  const columns = [26, 300, 568];
  const lines = [400, 422, 449, 476];
  const rects = [shape(26, 400, 568, 422, GREEN)];
  lines.forEach((y) => rects.push(shape(26, y, 568, y + 0.7, rule)));
  columns.forEach((x) => rects.push(shape(x, 400, x + 0.7, 476, rule)));
  const page = {
    spans: [
      span('Skill EMT', 28.7, 415, { font: HEAVY, col: WHITE }),
      span('Aspirin PO', 32, 439),
      span('Yes', 310, 439),
      span('Ibuprofen PO', 32, 466),
    ],
    rects,
  };
  page.spans[0].xs = [28.7, 34, 38, 41, 44, 310, 316, 322, 328]; // one span across two cells
  const [table] = pageBlocks(page);
  assert.equal(table[0], 'tbl');
  assert.deepEqual(table[1][0], [
    { t: '<b>Skill</b>', bg: GREEN, w: true },
    { t: '<b>EMT</b>', bg: GREEN, w: true },
  ]);
  assert.deepEqual(table[1][2][1], { t: '', bg: null, w: false });
});

test('pages are grouped by the guideline number in their header', () => {
  const page = (number, title, text) => ({
    spans: [...header(number, title), span(text, 25.9, 106.9)],
    rects: [shape(0, 0, 595, 68, GREEN)],
  });
  const pages = [
    { spans: [], rects: [] },
    page('1.1', 'First', 'One.'),
    page('1.1', 'First', 'Two.'),
    page('2.1', 'Second', 'Three.'),
  ];
  assert.equal(pageNumberOf(pages[1]), '1.1');
  assert.equal(pageNumberOf(pages[0]), null);
  assert.deepEqual(buildAllGuidelines(pages), [
    {
      n: '1.1',
      t: 'First',
      hc: GREEN,
      b: [
        ['p', 'One.', 0],
        ['p', 'Two.', 0],
      ],
    },
    { n: '2.1', t: 'Second', hc: GREEN, b: [['p', 'Three.', 0]] },
  ]);
});
