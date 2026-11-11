/*
 * Reads the EAS guidelines PDF into page models for scripts/pdfContent.js (feature 6 stage B).
 * A page model is { spans, rects }:
 *   spans: runs of characters in one font, size and colour, as MuPDF lays out each line, with
 *          { t (text), xs (x of each character), x, y (baseline), top, size, font, col }.
 *   rects: every filled or outlined shape as its bounding box { x0, y0, x1, y1, col, n }, where
 *          n is the number of path points and stroke is 1 for an outline.
 * Positions are PDF points from the top left corner, rounded to 0.001 so results are repeatable.
 * Depends on the `mupdf` package (a development dependency, used only by the build scripts).
 */
import * as mupdf from 'mupdf';

const POSITION_DECIMALS = 1000;
const CHARACTER_DECIMALS = 10;
// MuPDF names embedded font subsets "ABCDEF+FontName"; the prefix is dropped.
const SUBSET_PREFIX = /^[A-Z]{6}\+/;

/** Rounds a position so that tiny floating point differences never change a result. */
function round(value) {
  return Math.round(value * POSITION_DECIMALS) / POSITION_DECIMALS;
}

/** A colour given as 0 to 1 components, as an upper-case hex string such as "#00693C". */
function hexColour(components) {
  const hex = components.map((part) =>
    Math.round(part * 255)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${hex.join('').toUpperCase()}`;
}

/** The text spans of a page, line by line (see the file header for their fields). */
function pageSpans(page) {
  const spans = [];
  let span = null;
  page.toStructuredText('preserve-whitespace').walk({
    beginLine() {
      span = null; // a span never runs across two lines
    },
    onChar(character, origin, font, size, quad, colour) {
      const fontName = font.getName().replace(SUBSET_PREFIX, '');
      const colourHex = hexColour(colour);
      const sameStyle =
        span &&
        span.font === fontName &&
        span.col === colourHex &&
        Math.abs(span.size - size) <= 0.1;
      if (!sameStyle) {
        span = {
          font: fontName,
          size: round(size),
          col: colourHex,
          x: round(origin[0]),
          y: round(origin[1]),
          top: round(quad[1]),
          t: '',
          xs: [],
        };
        spans.push(span);
      }
      span.t += character;
      span.xs.push(Math.round(origin[0] * CHARACTER_DECIMALS) / CHARACTER_DECIMALS);
    },
  });
  return spans;
}

/** Bounding box of a path after its transform, as { x0, y0, x1, y1, n }. */
function pathBox(path, matrix) {
  const points = [];
  path.walk({
    moveTo: (x, y) => points.push([x, y]),
    lineTo: (x, y) => points.push([x, y]),
    curveTo: (x1, y1, x2, y2, x, y) => points.push([x, y]),
    rectTo: (x, y, width, height) => points.push([x, y], [x + width, y + height]),
    closePath: () => {},
  });
  const placed = points.map(([x, y]) => [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ]);
  const xs = placed.map((point) => point[0]);
  const ys = placed.map((point) => point[1]);
  return {
    x0: round(Math.min(...xs)),
    y0: round(Math.min(...ys)),
    x1: round(Math.max(...xs)),
    y1: round(Math.max(...ys)),
    n: points.length,
  };
}

/** Every shape drawn on a page, in drawing order (see the file header). */
function pageRects(page) {
  const rects = [];
  const device = new mupdf.Device({
    fillPath(path, evenOdd, matrix, colourSpace, colour) {
      rects.push({ ...pathBox(path, matrix), col: hexColour(colour) });
    },
    strokePath(path, stroke, matrix, colourSpace, colour) {
      rects.push({ stroke: 1, ...pathBox(path, matrix), col: hexColour(colour) });
    },
  });
  page.run(device, mupdf.Matrix.identity);
  device.close();
  return rects;
}

/** Page models of every page of a PDF, given its bytes. */
export function readPdfPages(pdfBytes) {
  const document = mupdf.Document.openDocument(pdfBytes, 'application/pdf');
  const pages = [];
  for (let index = 0; index < document.countPages(); index++) {
    const page = document.loadPage(index);
    pages.push({ spans: pageSpans(page), rects: pageRects(page) });
  }
  return pages;
}
