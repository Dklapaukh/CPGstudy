/*
 * Small markup helpers shared by the screens. Returns strings of markup, touches nothing else.
 * Guideline text is trusted content built into the app (see README, "Content").
 * Colours that come from the content are passed as CSS custom properties, not as styles.
 */
import { BLOCK, MESSAGES } from '../constants.js';

const COMMENT_BUTTON = `<button class="comment-button" type="button" data-action="comment"
  aria-label="Comment on this point" title="Comment on this point">💬</button>`;

const INFO_ICON = `<svg class="ai-notice__icon" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
  <path d="M8 7.2v4.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
  <circle cx="8" cy="4.8" r="0.95" fill="currentColor"></circle></svg>`;

// Simple line icons for the Quiz choice buttons, drawn in the button's text colour.
const QUIZ_ICON_PATHS = {
  // A capsule: the Medicines quiz.
  capsule: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="m7 10 7 7"/>',
  // An open book: the Guideline quiz.
  book:
    '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/>' +
    '<path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
  // A clipboard with a tick: the Medicine test.
  clipboard:
    '<rect x="8" y="2" width="8" height="4" rx="1"/>' +
    '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>' +
    '<path d="m9 14 2 2 4-4"/>',
  // A heartbeat line: Scenarios.
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  // Four squares: Pick the guideline (sorting pieces).
  grid:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
};

/** One Quiz choice icon by name (capsule, book, clipboard or grid), hidden from screen readers. */
export const quizIconHtml = (name) =>
  `<svg class="quiz-button__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${QUIZ_ICON_PATHS[name]}</svg>`;

/**
 * The small notice that the app was made with AI and is for study only. Shown on the passcode,
 * list and guideline screens; kept quiet (small, grey) so it never gets in the way of studying.
 */
export function aiNoticeHtml() {
  return `<p class="ai-notice" role="note">${INFO_ICON}<span>${MESSAGES.AI_NOTICE}</span></p>`;
}

/** The green banner at the top of the login, sign-up and list screens. */
export function coverHtml({ labelHtml = '', buttonHtml = '', subtitleHtml }) {
  return `<div class="cover">
    <div class="top-bar"><b class="tracker-label">${labelHtml}</b>${buttonHtml}</div>
    <h1>Emergency Ambulance Service</h1>
    <p>Clinical Practice Guidelines</p>
    <small>${subtitleHtml}</small>
  </div>`;
}

/** A guideline table. */
function tableHtml(rows) {
  const rowsHtml = rows.map((row) => `<tr>${row.map(cellHtml).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table>${rowsHtml}</table></div>`;
}

/** One table cell, with its header style and colour from the content. */
function cellHtml(cell) {
  if (!cell) return '<td></td>';
  const classes = [cell.w ? 'table-header-cell' : '', cell.bg ? 'table-cell--coloured' : ''];
  const style = cell.bg ? ` style="--block-colour:${cell.bg}"` : '';
  return `<td class="${classes.join(' ').trim()}"${style}>${cell.t}</td>`;
}

/**
 * Markup for one content block other than a heading. `commentButton` is the markup added to each
 * point; the quiz passes '' because its answers have no notes to comment into.
 */
export function blockHtml(block, commentButton = COMMENT_BUTTON) {
  const [kind] = block;
  if (kind === BLOCK.PARAGRAPH) return `<p class="indent-${block[2]}">${block[1]}</p>`;
  if (kind === BLOCK.BULLET) {
    const [, text, level, colour] = block;
    const indent = level > 1 ? ` indent-${level - 1}` : '';
    const marker = level > 1 ? '»' : '›';
    return `<div class="bullet-row${indent}" style="--block-colour:${colour}">
      <i class="bullet-marker">${marker}</i><span>${text}</span>${commentButton}</div>`;
  }
  if (kind === BLOCK.KEY) {
    const [, label, text, colour] = block;
    return `<div class="key-row" style="--block-colour:${colour}">
      <i class="key-marker">${label}</i><span>${text}</span>${commentButton}</div>`;
  }
  if (kind === BLOCK.BOX) {
    const inner = block[1].map((inside) => blockHtml(inside, commentButton)).join('');
    return `<div class="colour-box" style="--block-colour:${block[2]}">${inner}</div>`;
  }
  if (kind === BLOCK.TABLE) return tableHtml(block[1]);
  return '';
}

/**
 * Markup for a whole guideline body. Each heading becomes a button that folds the blocks under
 * it; only the first heading starts open.
 */
export function bodyHtml(blocks) {
  let html = '';
  let headingCount = 0;
  blocks.forEach((block) => {
    if (block[0] !== BLOCK.HEADING) {
      html += blockHtml(block);
      return;
    }
    const isFirst = headingCount === 0;
    if (!isFirst) html += '</div>';
    headingCount++;
    html += `<div class="heading-bar" data-action="toggle-heading" role="button" tabindex="0"
      aria-expanded="${isFirst}" style="--block-colour:${block[2]}">${block[1]}</div>
      <div class="heading-section"${isFirst ? '' : ' hidden'}>`;
  });
  return headingCount > 0 ? `${html}</div>` : html;
}
