/*
 * Manager page: one small chart as SVG markup, drawn without a library (the app has no build
 * step). Pure: takes points, returns text. Colours and fonts come from styles/manager.css.
 * Each chart shows one measure on one axis; hovering a week shows its numbers.
 * Depends on logic.js (escapeHtml).
 */
import { escapeHtml } from '../logic.js';

// Sizes in SVG units; the drawing scales to the width of the page.
const SIZE = { WIDTH: 640, HEIGHT: 220, LEFT: 40, RIGHT: 10, TOP: 12, BOTTOM: 28 };
const PLOT_WIDTH = SIZE.WIDTH - SIZE.LEFT - SIZE.RIGHT;
const PLOT_HEIGHT = SIZE.HEIGHT - SIZE.TOP - SIZE.BOTTOM;
const BASELINE = SIZE.TOP + PLOT_HEIGHT;
const GRID_STEPS = 4;
const MAX_DATE_LABELS = 6;
const BAR = { SHARE_OF_SLOT: 0.7, MAX_WIDTH: 28, CORNER: 4 };
const DOT_RADIUS = 4;
export const CHART_KIND = { BARS: 'bars', LINE: 'line' };

/** The top of the value axis: `fixedMax` when given, otherwise a round number above the data. */
function axisMax(points, fixedMax) {
  if (fixedMax) return fixedMax;
  const largest = Math.max(0, ...points.map((point) => point.value || 0));
  return Math.max(1, Math.ceil(largest / GRID_STEPS)) * GRID_STEPS;
}

/** Grid lines with their numbers down the left side. */
function gridHtml(max, unit) {
  let html = '';
  for (let step = 0; step <= GRID_STEPS; step++) {
    const y = BASELINE - (PLOT_HEIGHT * step) / GRID_STEPS;
    const lineClass = step === 0 ? 'chart__baseline' : 'chart__grid';
    html +=
      `<line class="${lineClass}" x1="${SIZE.LEFT}" x2="${SIZE.WIDTH - SIZE.RIGHT}" ` +
      `y1="${y}" y2="${y}"/>` +
      `<text class="chart__label" x="${SIZE.LEFT - 6}" y="${y + 4}" text-anchor="end">` +
      `${(max * step) / GRID_STEPS}${unit}</text>`;
  }
  return html;
}

/** A bar from the baseline up to `y`, with only its top corners rounded. */
function barPath(centreX, y, width) {
  const corner = Math.min(BAR.CORNER, width / 2, BASELINE - y);
  const left = centreX - width / 2;
  const right = centreX + width / 2;
  return (
    `M${left} ${BASELINE}V${y + corner}Q${left} ${y} ${left + corner} ${y}` +
    `H${right - corner}Q${right} ${y} ${right} ${y + corner}V${BASELINE}Z`
  );
}

/**
 * Markup of one chart. `points` is [{ label, value, tip }], one per week in order: `label` goes
 * under the axis, `value` is a number or null (nothing that week) and `tip` is shown on hover.
 * `kind` is bars or line, `title` is read out by screen readers, `unit` follows the axis numbers
 * and `max` fixes the top of the axis (for percentages).
 */
export function chartSvg({ points, kind, title, unit = '', max = 0 }) {
  const top = axisMax(points, max);
  const slot = PLOT_WIDTH / Math.max(1, points.length);
  const labelEvery = Math.ceil(points.length / MAX_DATE_LABELS);
  const centreX = (index) => SIZE.LEFT + slot * (index + 0.5);
  const valueY = (value) => BASELINE - (PLOT_HEIGHT * value) / top;
  const barWidth = Math.min(BAR.MAX_WIDTH, slot * BAR.SHARE_OF_SLOT);

  let lines = '';
  let slots = '';
  points.forEach((point, index) => {
    const x = centreX(index);
    const hasValue = point.value !== null && point.value !== undefined;
    let mark = '';
    if (hasValue && kind === CHART_KIND.BARS && point.value > 0) {
      mark = `<path class="chart__bar" d="${barPath(x, valueY(point.value), barWidth)}"/>`;
    }
    if (hasValue && kind === CHART_KIND.LINE) {
      mark = `<circle class="chart__dot" cx="${x}" cy="${valueY(point.value)}" r="${DOT_RADIUS}"/>`;
      const previous = points[index - 1];
      // Joined only to the week before, so a week with no quiz leaves a gap, not a guess.
      if (previous && previous.value !== null && previous.value !== undefined) {
        lines +=
          `<line class="chart__line" x1="${centreX(index - 1)}" y1="${valueY(previous.value)}" ` +
          `x2="${x}" y2="${valueY(point.value)}"/>`;
      }
    }
    const dateLabel =
      index % labelEvery === 0
        ? `<text class="chart__label" x="${x}" y="${SIZE.HEIGHT - 8}" text-anchor="middle">` +
          `${escapeHtml(point.label)}</text>`
        : '';
    // The whole column is the hover target, so thin bars and small dots are easy to point at.
    slots +=
      `<g class="chart__slot"><title>${escapeHtml(point.tip)}</title>` +
      `<rect class="chart__hit" x="${x - slot / 2}" y="${SIZE.TOP}" width="${slot}" ` +
      `height="${PLOT_HEIGHT}"/>${mark}${dateLabel}</g>`;
  });

  return (
    `<svg class="chart" viewBox="0 0 ${SIZE.WIDTH} ${SIZE.HEIGHT}" role="img" ` +
    `aria-label="${escapeHtml(title)}">${gridHtml(top, unit)}${lines}${slots}</svg>`
  );
}
