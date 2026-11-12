/*
 * Small markup helpers shared by the screens. Returns strings of markup, touches nothing else.
 * Guideline text is trusted content built into the app (see README, "Content").
 * Colours that come from the content are passed as CSS custom properties, not as styles.
 */
import { BLOCK, MESSAGES, FEEDBACK_EMAIL } from '../constants.js';
import { escapeHtml, feedbackMailto } from '../logic.js';
import { documentInfo } from '../../content/guidelines.js';

const COMMENT_BUTTON = `<button class="comment-button" type="button" data-action="comment"
  aria-label="Comment on this point" title="Comment on this point">💬</button>`;

const INFO_ICON = `<svg class="ai-notice__icon" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
  <path d="M8 7.2v4.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
  <circle cx="8" cy="4.8" r="0.95" fill="currentColor"></circle></svg>`;

/** The general "Report a mistake or request" email link, or '' when no address is set. */
export function generalFeedbackLinkHtml() {
  const href = feedbackMailto(
    FEEDBACK_EMAIL,
    'NZCPG study app: mistake or request',
    `Guidelines exported: ${documentInfo.exportedOn}\n\nWhat is wrong or what would you like?\n`,
  );
  return href
    ? `<a class="feedback-link" href="${escapeHtml(href)}">${MESSAGES.FEEDBACK_LINK}</a>`
    : '';
}

/**
 * The small notice that the app was made with AI and is for study only. Shown on the passcode,
 * list and guideline screens; kept quiet (small, grey) so it never gets in the way of studying.
 */
export function aiNoticeHtml() {
  return `<p class="ai-notice" role="note">${INFO_ICON}<span>${MESSAGES.AI_NOTICE}</span></p>`;
}

/** The green banner at the top of the login, mentor and list screens. */
export function coverHtml({ labelHtml = '', buttonHtml = '', subtitleHtml }) {
  return `<div class="cover">
    <div class="top-bar"><b class="tracker-label">${labelHtml}</b>${buttonHtml}</div>
    <h1>Emergency Ambulance Service</h1>
    <p>Clinical Practice Guidelines</p>
    <small>${subtitleHtml}</small>
  </div>`;
}

function tableHtml(rows) {
  const rowsHtml = rows.map((row) => `<tr>${row.map(cellHtml).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table>${rowsHtml}</table></div>`;
}

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
