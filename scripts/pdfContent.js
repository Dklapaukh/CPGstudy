/*
 * Pure functions that turn the page models of the EAS guidelines PDF into guideline content
 * (feature 6 stage B). A page model is { spans, rects } as made by scripts/pdfPages.js:
 * spans are runs of text in one font and colour, rects are drawn shapes (bands, boxes, outlines,
 * bullet markers, table rules). No AI and no randomness: one PDF always gives the same content.
 * The rules copy how the current content/guidelines.js was made, so the 24.09.2026 PDF rebuilds
 * it; see tests/pdfContent.test.js and README "Rebuilding the content from the PDF".
 * No dependencies.
 */

// Page layout of every guideline page, in PDF points from the top left corner.
const BODY_TOP = 75; // the coloured title band ends at 68
const BODY_BOTTOM = 800; // the footer rule starts at 807
const PAGE_LEFT_MARGIN = 15;
const TITLE_FONT_SIZE = 20;

// Rows: spans whose tops are this close are one row. Tops, not baselines, so that a superscript
// joins its row while a subscript (its top is lower) becomes a row of its own, as in the content.
const ROW_TOLERANCE = 3;
const DESCENT = 0.365;
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

const WHITE = '#FFFFFF';
const PAGE_GREY = '#EEEEEE';
// The "More Information" band is grey and its title is kept as a plain paragraph.
const MORE_INFORMATION_GREY = '#C7C8CA';

/** True when a font name is one of the bold weights used in the PDF. */
function isBoldFont(fontName) {
  return /Heavy|Black|Bold|Semibold|Medium/.test(fontName);
}

/** Escapes text for the content's HTML strings (only "<" occurs in the guidelines). */
function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** The level of a left edge against a list of edges: 0 before the first edge, and so on. */
function levelOf(x, edges) {
  const index = edges.findIndex((edge) => x < edge);
  return index === -1 ? edges.length : index;
}

/** True when a point lies inside a rect. */
function contains(rect, x, y) {
  return x >= rect.x0 - 0.5 && x <= rect.x1 + 0.5 && y >= rect.y0 - 0.5 && y <= rect.y1 + 0.5;
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
  return keys.find((key) => contains(key, first.x + 1, first.y - 2));
}

/**
 * The coloured panel (band or box) that holds a row, if any. A heading band drawn over a box
 * holds its row itself, so the box keeps only the rows below the band.
 */
function panelOfRow(row, panels) {
  const holding = panels.filter((panel) => contains(panel, row.x + 1, row.baseline - 2));
  const band = holding.find((panel) => panel.y1 - panel.y0 <= HEADING_MAX_HEIGHT);
  return band || holding[0];
}

/** Starts a new block for a row. Returns { block, x, y, panel }. */
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

// Tables are drawn as thin grey rules around every cell.
const TABLE_RULE_COLOUR = '#B2B2B2';
const RULE_MAX_THICKNESS = 1.5;
const GRID_TOLERANCE = 1.5;
const MIN_TABLE_LINES = 3;

/** True when two rects touch or overlap (with a small margin). */
function touches(first, second) {
  const margin = GRID_TOLERANCE;
  return (
    first.x0 <= second.x1 + margin &&
    second.x0 <= first.x1 + margin &&
    first.y0 <= second.y1 + margin &&
    second.y0 <= first.y1 + margin
  );
}

/** Groups touching rules into tables. Returns a list of rule lists. */
function groupRules(rules) {
  const groups = [];
  for (const rule of rules) {
    const joined = groups.filter((group) => group.some((other) => touches(rule, other)));
    const merged = [rule, ...joined.flat()];
    for (const group of joined) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  }
  return groups;
}

/** Sorted distinct values, treating values closer than the grid tolerance as one. */
function distinctEdges(values) {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted.filter((value, index) => index === 0 || value - sorted[index - 1] > GRID_TOLERANCE);
}

/**
 * The part of a span between two x positions (a header such as "EMT Paramedic ICP CCP" is one
 * span across four cells). Returns a span with only those characters.
 */
function clipSpan(span, left, right) {
  const characters = Array.from(span.t);
  const xs = span.xs || characters.map(() => span.x);
  const keep = characters.map((_, index) => xs[index] >= left - 0.5 && xs[index] < right);
  const first = keep.indexOf(true);
  return {
    ...span,
    t: characters.filter((_, index) => keep[index]).join(''),
    xs: xs.filter((_, index) => keep[index]),
    x: first === -1 ? span.x : xs[first],
  };
}

/** One table cell: its text (lines joined by <br>), background colour and white-text flag. */
function tableCell(box, spans, fills) {
  const inside = spans
    .filter((span) => span.y - 2 >= box.y0 && span.y - 2 <= box.y1)
    .map((span) => clipSpan(span, box.x0, box.x1))
    .filter((span) => span.t.trim());
  // Only a fill covering the whole cell is its background (not a dot or tick drawn inside it).
  const fill = fills
    .filter(
      (rect) => contains(rect, box.x0 + 1, box.y0 + 1) && contains(rect, box.x1 - 1, box.y1 - 1),
    )
    .at(-1);
  return {
    t: groupRows(inside)
      .map((row) => rowHtml(row))
      .join('<br>'),
    bg: fill ? fill.col : null,
    w: inside.length > 0 && inside[0].col === WHITE,
  };
}

/** True when one of the rules runs along the given edge (vertical when x0 === x1). */
function hasRule(rules, x0, y0, x1, y1) {
  const middleX = (x0 + x1) / 2;
  const middleY = (y0 + y1) / 2;
  return rules.some(
    (rule) => contains(rule, middleX, middleY) && touches(rule, { x0, y0, x1, y1 }),
  );
}

/**
 * The cell boxes of a table grid, row by row. A cell with no rule on its left is part of the
 * cell on its left, and one with no rule above is part of the cell above: it is null and the
 * cell it belongs to grows over it (as merged cells are kept in the content).
 */
function tableGrid(rules, columns, lines) {
  const grid = [];
  for (let row = 0; row < lines.length - 1; row++) {
    const boxes = [];
    for (let column = 0; column < columns.length - 1; column++) {
      const box = {
        x0: columns[column],
        x1: columns[column + 1],
        y0: lines[row],
        y1: lines[row + 1],
      };
      const openLeft = column > 0 && !hasRule(rules, box.x0, box.y0, box.x0, box.y1);
      const openTop = row > 0 && !hasRule(rules, box.x0, box.y0, box.x1, box.y0);
      const owner = openLeft
        ? ownerOf(grid, boxes, row, column - 1)
        : openTop
          ? ownerOf(grid, boxes, row - 1, column)
          : null;
      if (owner) {
        owner.x1 = Math.max(owner.x1, box.x1);
        owner.y1 = Math.max(owner.y1, box.y1);
        boxes.push(null);
      } else {
        boxes.push(box);
      }
    }
    grid.push(boxes);
  }
  return grid;
}

/** The box a grid position belongs to: itself, or the merged cell that covers it. */
function ownerOf(grid, currentRow, row, column) {
  const rowBoxes = row === grid.length ? currentRow : grid[row];
  for (let index = column; index >= 0; index--) {
    if (rowBoxes[index]) return rowBoxes[index];
  }
  return row > 0 ? ownerOf(grid, currentRow, row - 1, column) : null;
}

/**
 * Finds the tables of a page. Returns a list of { top, box, block } where block is
 * ['tbl', rows of cells] and box is the area the table covers.
 */
export function pageTables(page) {
  const thin = (rect) =>
    rect.x1 - rect.x0 <= RULE_MAX_THICKNESS || rect.y1 - rect.y0 <= RULE_MAX_THICKNESS;
  const rules = page.rects.filter(
    (rect) =>
      !rect.stroke &&
      rect.col === TABLE_RULE_COLOUR &&
      thin(rect) &&
      rect.y0 > BODY_TOP &&
      rect.y1 < BODY_BOTTOM,
  );
  const fills = page.rects.filter((rect) => !rect.stroke && !thin(rect) && rect.col !== WHITE);
  const tables = [];
  for (const group of groupRules(rules)) {
    const columns = distinctEdges(
      group.filter((rule) => rule.x1 - rule.x0 <= RULE_MAX_THICKNESS).map((rule) => rule.x0),
    );
    const lines = distinctEdges(
      group.filter((rule) => rule.y1 - rule.y0 <= RULE_MAX_THICKNESS).map((rule) => rule.y0),
    );
    // A single row of cells is kept as text, as in the content.
    if (columns.length < 2 || lines.length < MIN_TABLE_LINES) continue;
    const grid = tableGrid(group, columns, lines);
    // A grid whose first row is one cell across the whole width (a chart with a title band) is
    // kept as a heading and text, as in the content.
    if (grid[0].slice(1).every((box) => box === null)) continue;
    const rows = grid.map((boxes) =>
      boxes.map((box) => (box ? tableCell(box, page.spans, fills) : null)),
    );
    const box = { x0: columns[0], x1: columns.at(-1), y0: lines[0], y1: lines.at(-1) };
    tables.push({ top: lines[0], box, block: ['tbl', rows] });
  }
  return tables;
}

/** Content blocks of one page body, top to bottom. */
export function pageBlocks(page) {
  const tables = pageTables(page);
  const inTable = (span) => tables.some((table) => contains(table.box, span.x + 1, span.y - 2));
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
    (span) => span.y < BODY_TOP && Math.abs(span.size - TITLE_FONT_SIZE) < 0.5,
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
    (rect) => !rect.stroke && rect.y0 <= 0 && rect.y1 < BODY_TOP && rect.y1 > 40,
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
