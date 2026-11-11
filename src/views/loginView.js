/* The passcode screen. Draws markup only; clicks are handled in events.js. */
import { escapeHtml } from '../logic.js';
import { coverHtml } from './templates.js';

const app = document.getElementById('app');

/** Draws the passcode screen, with an optional message and a passcode to keep in the box. */
export function renderLogin(message, passcodeValue) {
  const warning = message ? `<div class="warning-message">${escapeHtml(message)}</div>` : '';
  app.innerHTML = `${coverHtml({ subtitleHtml: 'Mentoring tracker · enter your passcode' })}
    <div class="page-padding">${warning}
    <p class="subtitle">Type the passcode you were given. It isn’t case sensitive.</p>
    <input class="text-input" id="passcode-input" type="text" placeholder="Passcode"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
      value="${escapeHtml(passcodeValue || '')}">
    <button class="button" id="open-button" data-action="submit-passcode">Open</button></div>`;
}
