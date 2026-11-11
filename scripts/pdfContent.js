/*
 * Pure functions that turn the page models of the EAS guidelines PDF into guideline content
 * (feature 6 stage B). A page model is { spans, rects } as made by scripts/pdfPages.js:
 * spans are runs of text in one font and colour, rects are drawn shapes (bands, boxes, outlines,
 * bullet markers, table rules). No AI and no randomness: one PDF always gives the same content.
 * The rules copy how the current content/guidelines.js was made, so the 24.09.2026 PDF rebuilds
 * it; see tests/pdfContent.test.js and README "Rebuilding the content from the PDF".
 * A content block is a list such as ['b', text, level, colour]; every kind of block is listed
 * at the top of scripts/contentCheck.js.
 * Depends on scripts/pdfRows.js (rows of text) and scripts/pdfTables.js (tables).
 */

import { BODY_BOTTOM, BODY_TOP, WHITE, groupRows, rowHtml, textIsInside } from './pdfRows.js';
import { pageTables } from './pdfTables.js';

// Page layout, in PDF points from the top left corner (see also scripts/pdfRows.js).
const PAGE_LEFT_MARGIN = 15;
const TITLE_FONT_SIZE = 20;
const TITLE_SIZE_TOLERANCE = 0.5;
// The title band runs from the top edge of the page to 68. Its bottom edge is lower than this,
// which tells it from the thin shapes that also start at the top edge.
const TITLE_BAND_MIN_BOTTOM = 40;

// A row joins the block above when it is no further below it than this and starts at the same x.
const MAX_JOIN_GAP = 20;
const SAME_X_TOLERANCE = 1.5;

// Indent levels by left edge. Text at the page margin is level 0.
const INDENT_EDGES = [40, 65, 90];
// A bullet marker is a small coloured drawn shape with many points (a chevron or dot). Black dots
// are not bullets in the content.
const MARKER_MAX_SIZE = 13;
const MARKER_MIN_POINTS = 10;
const BLACK = '#000000';
// A row belongs to a marker on its left only within this distance.
const MARKER_MAX_DISTANCE = 100;
// A band is a full-width coloured shape; one with a single row of text is a heading.
const HEADING_MAX_HEIGHT = 30;
const PANEL_MIN_HEIGHT = 15;
// A key is a coloured rounded square holding one white letter (for example the ISBAR letters).
const KEY_MIN_SIZE = 18;
const KEY_MAX_SIZE = 26;

const PAGE_GREY = '#EEEEEE';
// The "More Information" band is grey and its title is kept as a plain paragraph.
const MORE_INFORMATION_GREY = '#C7C8CA';

/** The level of a left edge against a list of edges: 0 before the first edge, and so on. */
function levelOf(x, edges) {
  const index = edges.findIndex((edge) => x < edge);
  return index === -1 ? edges.length : index;
}

/** The parts of a page: its shapes sorted into kinds. */
function pageShapes(rects) {
  const onBody = rects.filter((rect) => rect.y1 > BODY_TOP && rect.y0 < BODY_BOTTOM);
  const filled = onBody.filter((rect) => !rect.stroke);
  const width = (rect) => rect.x1 - rect.x0;
  const height = (rect) => rect.y1 - rect.y0;
  const isMarker = (rect) =>
    rect.n >= MARKER_MIN_POINTS &&
    rect.col !== BLACK &&
    width(rect) <= MARKER_MAX_SIZE &&
    height(rect) <= MARKER_MAX_SIZE;
  const isKey = (rect) =>
    width(rect) >= KEY_MIN_SIZE &&
    width(rect) <= KEY_MAX_SIZE &&
    height(rect) >= KEY_MIN_SIZE &&
    height(rect) <= KEY_MAX_SIZE &&
    rect.col !== WHITE;
  const isPanel = (rect) =>
    rect.col !== WHITE &&
    rect.col !== PAGE_GREY &&
    rect.col !== MORE_INFORMATION_GREY &&
    width(rect) > KEY_MAX_SIZE &&
    height(rect) > PANEL_MIN_HEIGHT &&
    rect.x0 >= PAGE_LEFT_MARGIN - 1 &&
    rect.y0 >= 0;
  return {
    markers: filled.filter(isMarker),
    keys: filled.filter(isKey),
    // Outlined boxes count as panels too, in their outline colour.
    panels: onBody.filter(isPanel).map((panel, order) => ({ ...panel, order })),
  };
}

/** The marker shape just left of a row, if the row starts a bullet. */
function markerOfRow(row, markers) {
  return markers.find(
    (marker) =>
      marker.x1 < row.x &&
      row.x - marker.x1 <= MARKER_MAX_DISTANCE &&
      row.middle >= marker.y0 &&
      row.middle <= marker.y1,
  );
}

/** The key square under the first span of a row, if the row starts a key item. */
function keyOfRow(row, keys) {
  const first = row.spans[0];
  return keys.find((key) => textIsInside(key, first.x, first.y));
}

/**
 * The coloured panel (band or box) that holds a row, if any. A heading band drawn over a box
 * holds its row itself, so the box keeps only the rows below the band.
 */
function panelOfRow(row, panels) {
  const holding = panels.filter((panel) => textIsInside(panel, row.x, row.baseline));
  const band = holding.find((panel) => panel.y1 - panel.y0 <= HEADING_MAX_HEIGHT);
  return band || holding[0];
}

/**
 * Starts a new block for a row. Returns { block, x, y, panel }, where x is the left edge that
 * the next rows of the block must share. A key block also has labelX (the left edge of its
 * label), and its x is null while a label on a row of its own waits for its text.
 */
function startBlock(row, shapes) {
  const panel = panelOfRow(row, shapes.panels);
  const key = keyOfRow(row, shapes.keys);
  if (key) {
    const [label, ...rest] = row.spans;
    const text = rowHtml({ spans: rest });
    const block = ['k', label.t.trim(), text, key.col];
    // A label on a row of its own takes the next row as its text, wherever that row starts.
    return { block, x: rest[0] ? row.x : null, labelX: row.x, y: row.y, panel };
  }
  // Bullet markers inside a coloured box are ignored: the content keeps those rows as paragraphs.
  const marker = panel ? null : markerOfRow(row, shapes.markers);
  if (marker) {
    const level = Math.max(1, levelOf(row.x, INDENT_EDGES));
    const block = ['b', rowHtml(row), level, marker.col];
    return { block, x: row.x, y: row.y, panel };
  }
  return { block: ['p', rowHtml(row), levelOf(row.x, INDENT_EDGES)], x: row.x, y: row.y, panel };
}

/** Index of the text inside a block (k blocks keep it after the label). */
function textIndex(block) {
  return block[0] === 'k' ? 2 : 1;
}

/** True when a row continues the block that is being built. */
function continuesBlock(current, row, shapes) {
  if (!current) return false;
  const panel = panelOfRow(row, shapes.panels);
  if (panel !== current.panel) return false;
  if ((!panel && markerOfRow(row, shapes.markers)) || keyOfRow(row, shapes.keys)) return false;
  const closeBelow = row.y - current.y <= MAX_JOIN_GAP;
  if (current.x === null) return closeBelow;
  return closeBelow && Math.abs(row.x - current.x) <= SAME_X_TOLERANCE;
}

/** Turns the panels of a page into headings (one row) or boxes (several rows). */
function wrapPanels(items, tables) {
  const blocks = tables.map((table) => ({ block: table.block, top: table.top, order: -1 }));
  let index = 0;
  while (index < items.length) {
    const panel = items[index].panel;
    if (!panel) {
      blocks.push({ block: items[index].block, top: items[index].y, order: -1 });
      index++;
      continue;
    }
    const inside = [];
    while (index < items.length && items[index].panel === panel) {
      inside.push(items[index]);
      index++;
    }
    const isHeading =
      panel.y1 - panel.y0 <= HEADING_MAX_HEIGHT &&
      inside.length === 1 &&
      inside[0].block[0] === 'p';
    const block = isHeading
      ? ['h', inside[0].block[1], panel.col]
      : ['box', inside.map((item) => item.block), panel.col];
    blocks.push({ block, top: panel.y0, order: panel.order });
  }
  // A panel is placed by its top edge, and panels with the same top keep their drawing order, so
  // a box with a heading band drawn over its top comes before that heading, as in the content.
  blocks.sort((first, second) => first.top - second.top || first.order - second.order);
  return blocks.map((entry) => entry.block);
}

/** Content blocks of one page body, top to bottom. */
export function pageBlocks(page) {
  const tables = pageTables(page);
  const inTable = (span) => tables.some((table) => textIsInside(table.box, span.x, span.y));
  const bodySpans = page.spans.filter(
    (span) => span.y > BODY_TOP && span.y < BODY_BOTTOM && span.t.trim() && !inTable(span),
  );
  const shapes = pageShapes(page.rects);
  const items = [];
  let current = null;
  for (const row of groupRows(bodySpans)) {
    if (continuesBlock(current, row, shapes)) {
      const at = textIndex(current.block);
      current.block[at] = `${current.block[at]} ${rowHtml(row)}`.trim();
      current.y = row.y;
      // A lone key label takes only the one row after it as its text.
      if (current.x === null) current.x = current.labelX;
      continue;
    }
    current = startBlock(row, shapes);
    items.push(current);
  }
  return wrapPanels(items, tables);
}

/** The title of a guideline: the large white text in the band at the top of its first page. */
export function pageTitle(page) {
  const titleSpans = page.spans.filter(
    (span) => span.y < BODY_TOP && Math.abs(span.size - TITLE_FONT_SIZE) < TITLE_SIZE_TOLERANCE,
  );
  // The title is set in pieces (for example "Providing T" + "reatment"), so touching pieces join
  // without a space.
  return groupRows(titleSpans)
    .map((row) => row.spans.map((span) => span.t).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The colour of the title band at the top of a page. */
export function headerColour(page) {
  const band = page.rects.find(
    (rect) => !rect.stroke && rect.y0 <= 0 && rect.y1 < BODY_TOP && rect.y1 > TITLE_BAND_MIN_BOTTOM,
  );
  return band ? band.col : null;
}

/**
 * Builds one guideline from its pages. Takes the guideline number and its page models in order.
 * Returns { n, t, hc, b } (the id and section are added by the caller).
 */
export function buildGuideline(number, pages) {
  return {
    n: number,
    t: pageTitle(pages[0]),
    hc: headerColour(pages[0]),
    b: pages.flatMap((page) => pageBlocks(page)),
  };
}

// Every page header reads "CPG EAS <number> St John New Zealand".
const HEADER_NUMBER = /CPG EAS (\d+\.\d+)/;

/** The guideline number in a page's header, or null (the cover and the copyright page). */
export function pageNumberOf(page) {
  const header = page.spans.find((span) => span.y < BODY_TOP && HEADER_NUMBER.test(span.t));
  return header ? header.t.match(HEADER_NUMBER)[1] : null;
}

/**
 * Builds every guideline in the PDF, in PDF order, from its page models.
 * Returns a list of { n, t, hc, b }.
 */
export function buildAllGuidelines(pages) {
  const pagesByNumber = new Map();
  for (const page of pages) {
    const number = pageNumberOf(page);
    if (!number) continue;
    if (!pagesByNumber.has(number)) pagesByNumber.set(number, []);
    pagesByNumber.get(number).push(page);
  }
  return [...pagesByNumber].map(([number, guidelinePages]) =>
    buildGuideline(number, guidelinePages),
  );
}
