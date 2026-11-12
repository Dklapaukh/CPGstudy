/* The passcode screen. Draws markup only; clicks are handled in events.js. */
import { escapeHtml } from '../logic.js';
import { coverHtml, aiNoticeHtml } from './templates.js';

const app = document.getElementById('app');

/**
 * Draws the passcode screen, with an optional message and a passcode to keep in the box.
 * `backLabel` is the label of the tracker still open behind this screen (Switch tracker): a
 * back link to it is shown. Empty or missing when no tracker is open.
 */
export function renderLogin(message, passcodeValue, backLabel) {
  const warning = message ? `<div class="warning-message">${escapeHtml(message)}</div>` : '';
  const back =
    backLabel === undefined || backLabel === null
      ? ''
      : `<a class="back-link" href="#" data-action="back-to-tracker">‹ Back${
          backLabel ? ` to ${escapeHtml(backLabel)}` : ''
        }</a>`;
  app.innerHTML = `${back}${coverHtml({ subtitleHtml: 'Mentoring tracker · enter your passcode' })}
    <div class="page-padding">${warning}
    <p class="subtitle">Type the passcode you were given. It isn’t case sensitive.</p>
    <input class="text-input" id="passcode-input" type="text" placeholder="Passcode"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
      value="${escapeHtml(passcodeValue || '')}">
    <button class="button" id="open-button" data-action="submit-passcode">Open</button>
    ${aiNoticeHtml()}</div>`;
}
