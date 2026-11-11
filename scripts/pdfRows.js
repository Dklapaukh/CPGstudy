/*
 * Shared by the converter's files (feature 6 stage B): the page layout of the EAS guidelines PDF,
 * and the pure functions that group text spans into rows and turn a row into HTML.
 * A span is a run of text in one font and colour, as made by scripts/pdfPages.js.
 * Used by scripts/pdfContent.js and scripts/pdfTables.js. No dependencies.
 */

// Page layout of every guideline page, in PDF points from the top left corner.
export const BODY_TOP = 75; // the coloured title band ends at 68
export const BODY_BOTTOM = 800; // the footer rule starts at 807
export const WHITE = '#FFFFFF';

// Rows: spans whose tops are this close are one row. Tops, not baselines, so that a superscript
// joins its row while a subscript (its top is lower) becomes a row of its own, as in the content.
const ROW_TOLERANCE = 3;
const DESCENT = 0.365;

// A point counts as inside a shape when it is no further outside its edges than this.
export const EDGE_MARGIN = 0.5;
// Text is tested just inside its first character: this far right of its left edge and this far
// above its baseline. That point is inside the shape drawn behind the text.
const TEXT_PROBE_RIGHT = 1;
export const TEXT_PROBE_UP = 2;

/** True when a font name is one of the bold weights used in the PDF. */
function isBoldFont(fontName) {
  return /Heavy|Black|Bold|Semibold|Medium/.test(fontName);
}

/** Escapes text for the content's HTML strings (only "<" occurs in the guidelines). */
function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** True when a point lies inside a rect. */
export function contains(rect, x, y) {
  return (
    x >= rect.x0 - EDGE_MARGIN &&
    x <= rect.x1 + EDGE_MARGIN &&
    y >= rect.y0 - EDGE_MARGIN &&
    y <= rect.y1 + EDGE_MARGIN
  );
}

/** True when text that starts at x on the given baseline lies inside a rect. */
export function textIsInside(rect, x, baseline) {
  return contains(rect, x + TEXT_PROBE_RIGHT, baseline - TEXT_PROBE_UP);
}

/** Groups the spans of a page body into rows, top to bottom, each sorted left to right. */
export function groupRows(spans) {
  const sorted = [...spans].sort((first, second) => first.top - second.top || first.x - second.x);
  const rows = [];
  for (const span of sorted) {
    const row = rows.at(-1);
    if (row && span.top - row.y <= ROW_TOLERANCE) row.spans.push(span);
    else rows.push({ y: span.top, spans: [span] });
  }
  for (const row of rows) {
    row.spans.sort((first, second) => first.x - second.x);
    row.x = row.spans[0].x;
    row.baseline = row.spans[0].y;
    // Vertical middle of the first span's text box (the font's descent is 0.365 of its size).
    row.middle = (row.spans[0].top + row.baseline + DESCENT * row.spans[0].size) / 2;
  }
  return rows;
}

/**
 * The pieces of text in a row, left to right. Characters are put in x order first, so a
 * superscript that is drawn separately lands inside the word run it belongs to, splitting it
 * (as in "the 5 th intercostal space"). Returns [{ text, bold }].
 */
function rowPieces(row) {
  const characters = row.spans.flatMap((span, spanIndex) =>
    Array.from(span.t).map((character, index) => ({
      character,
      x: span.xs ? span.xs[index] : span.x,
      spanIndex,
    })),
  );
  characters.sort((first, second) => first.x - second.x || first.spanIndex - second.spanIndex);
  const pieces = [];
  let previousSpan = -1;
  for (const { character, spanIndex } of characters) {
    if (spanIndex !== previousSpan) {
      pieces.push({ text: '', bold: isBoldFont(row.spans[spanIndex].font) });
      previousSpan = spanIndex;
    }
    pieces.at(-1).text += character;
  }
  return pieces;
}

/** HTML of one row: bold pieces wrapped in <b>, every piece separated by a space. */
export function rowHtml(row) {
  const pieces = rowPieces(row).map((piece) => {
    const text = escapeText(piece.text).replace(/\s+/g, ' ').trim();
    return piece.bold && text ? `<b>${text}</b>` : text;
  });
  // Bold pieces next to each other in one row become one bold run.
  return pieces
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/<\/b> <b>/g, ' ')
    .trim();
}
