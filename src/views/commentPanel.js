/*
 * The comment panel, opened by a guideline point's 💬 button. It replaces the browser's prompt
 * box so that "Report a mistake in this point" can sit beside the comment box: someone who taps
 * 💬 because a point looks wrong can report it straight away.
 * The panel lives in index.html outside the app container (like the update banner), so a redraw
 * of the guideline never closes it. Listeners are attached here, so this file is self-contained.
 * Depends on report.js.
 */
import { canReport, openReport } from '../report.js';

const panel = document.getElementById('comment-panel');
const pointLabel = document.getElementById('comment-panel-point');
const commentInput = document.getElementById('comment-panel-input');
const reportButton = document.getElementById('comment-panel-report');

// What the open panel is about: { snippet, pointText, onSave, returnFocusTo }, or null.
let openComment = null;

/**
 * Opens the panel for one point. Takes the point's snippet and full text, the function to call
 * with the typed comment when Save is pressed, and the element to focus again on closing.
 */
export function openCommentPanel({ snippet, pointText, onSave, returnFocusTo }) {
  openComment = { snippet, pointText, onSave, returnFocusTo };
  pointLabel.textContent = snippet;
  commentInput.value = '';
  reportButton.hidden = !canReport();
  panel.hidden = false;
  commentInput.focus();
}

function closeCommentPanel() {
  panel.hidden = true;
  const returnFocusTo = openComment && openComment.returnFocusTo;
  openComment = null;
  if (returnFocusTo && returnFocusTo.isConnected) returnFocusTo.focus();
}

/** Saves the typed comment through the caller's function; an empty comment saves nothing. */
function saveComment() {
  const comment = commentInput.value.trim();
  const onSave = openComment.onSave;
  closeCommentPanel();
  if (comment) onSave(comment);
}

/** Reports the point, with any comment typed so far, then closes the panel. */
function reportPoint() {
  const lines = [`Point: ${openComment.pointText}`];
  const comment = commentInput.value.trim();
  if (comment) lines.push(`Comment: ${comment}`);
  closeCommentPanel();
  openReport(lines);
}

const ACTIONS = {
  'save-comment': saveComment,
  'cancel-comment': closeCommentPanel,
  'report-point': reportPoint,
};

panel.addEventListener('click', (event) => {
  if (!openComment) return;
  // A tap on the dimmed backdrop (the panel itself, not its card) cancels, like a dialog.
  if (event.target === panel) {
    closeCommentPanel();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (button && ACTIONS[button.dataset.action]) ACTIONS[button.dataset.action]();
});

panel.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && openComment) closeCommentPanel();
});
