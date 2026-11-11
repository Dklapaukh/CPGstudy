/*
 * Pure functions that find the tables of a page of the EAS guidelines PDF (feature 6 stage B).
 * A table is drawn as thin grey rules around every cell. The rules give the grid, a missing
 * rule means two cells are merged, and the text and background of each cell are read from the
 * spans and filled shapes inside it. Page models are described in scripts/pdfPages.js.
 * Used by scripts/pdfContent.js. Depends on scripts/pdfRows.js.
 */
import {
  BODY_BOTTOM,
  BODY_TOP,
  EDGE_MARGIN,
  TEXT_PROBE_UP,
  WHITE,
  contains,
  groupRows,
  rowHtml,
} from './pdfRows.js';

// The rules are thin grey shapes; rules that touch belong to one table.
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
  const keep = characters.map((_, index) => xs[index] >= left - EDGE_MARGIN && xs[index] < right);
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
    .filter((span) => span.y - TEXT_PROBE_UP >= box.y0 && span.y - TEXT_PROBE_UP <= box.y1)
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

/** The box a grid position belongs to: itself, or the merged cell that covers it. */
function ownerOf(grid, currentRow, row, column) {
  const rowBoxes = row === grid.length ? currentRow : grid[row];
  for (let index = column; index >= 0; index--) {
    if (rowBoxes[index]) return rowBoxes[index];
  }
  return row > 0 ? ownerOf(grid, currentRow, row - 1, column) : null;
}

/** The cell that a box with no rule on its left or above it is part of (null when it has both). */
function mergedInto(grid, currentRow, row, column, openLeft, openTop) {
  if (openLeft) return ownerOf(grid, currentRow, row, column - 1);
  if (openTop) return ownerOf(grid, currentRow, row - 1, column);
  return null;
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
      const owner = mergedInto(grid, boxes, row, column, openLeft, openTop);
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
