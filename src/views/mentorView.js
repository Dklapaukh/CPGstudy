/* The mentor screen: create a tracker or open an existing one. Markup only; see events.js. */
import { escapeHtml } from '../logic.js';
import { coverHtml } from './templates.js';

const app = document.getElementById('app');

function createdTrackerHtml(created) {
  return `<div class="success-box"><b>New tracker created: ${escapeHtml(created.label)}</b>
    <div class="passcode-display" id="new-passcode">${escapeHtml(created.code)}</div>
    <button class="button button--secondary" id="copy-button" data-action="copy-passcode">
      Copy passcode</button>
    <p class="subtitle">Pass this passcode on to the mentee (and anyone else who should use this
      tracker). Write it down or copy it now.</p>
    <button class="button" data-action="open-created-tracker">Open this tracker</button></div>`;
}

/**
 * Draws the mentor screen.
 * `created` is the tracker just made (or null); labelValue and openValue refill the two boxes.
 */
export function renderMentor({ name, created, message, labelValue, openValue }) {
  const warning = message ? `<div class="warning-message">${escapeHtml(message)}</div>` : '';
  const subtitle = `Mentor screen${name ? ` · ${escapeHtml(name)}` : ''}`;
  const signOutButton =
    '<button class="switch-button" data-action="mentor-sign-out">Sign out</button>';
  app.innerHTML = `${coverHtml({ buttonHtml: signOutButton, subtitleHtml: subtitle })}
    <div class="page-padding">${warning}
    <div class="section-title">Create a new tracker</div>
    <input class="text-input" id="label-input" type="text"
      placeholder="Label, for example Sam - 2026" autocomplete="off"
      value="${escapeHtml(labelValue || '')}">
    <button class="button" id="create-button" data-action="create-tracker">
      Create new tracker</button>
    ${created ? createdTrackerHtml(created) : ''}
    <div class="section-title">Open an existing tracker</div>
    <input class="text-input" id="open-code-input" type="text" placeholder="Tracker passcode"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
      value="${escapeHtml(openValue || '')}">
    <button class="button button--secondary" id="open-existing-button"
      data-action="open-existing-tracker">Open tracker</button></div>`;
}
