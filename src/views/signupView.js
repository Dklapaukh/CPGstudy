/*
 * The Make an account screen: a name box, then the new passcode. Markup only; see events.js.
 * The hidden "website" box is a bot trap: people never see it, form-filling bots fill it in.
 */
import { escapeHtml } from '../logic.js';
import { coverHtml, aiNoticeHtml } from './templates.js';

const app = document.getElementById('app');

/** The box showing the new account's passcode, with Copy and Open buttons. */
function createdAccountHtml(created) {
  return `<div class="success-box"><b>Your account is ready, ${escapeHtml(created.label)}</b>
    <p class="subtitle">This is your passcode. Write it down or copy it now: you’ll need it to
      sign in on another phone or after signing out.</p>
    <div class="passcode-display" id="new-passcode">${escapeHtml(created.code)}</div>
    <button class="button button--secondary" id="copy-button" data-action="copy-passcode">
      Copy passcode</button>
    <button class="button" data-action="open-signup-tracker">Start studying</button></div>`;
}

/**
 * Draws the Make an account screen. `created` is { code, label } once the account is made;
 * `nameValue` refills the name box after a message.
 */
export function renderSignup({ message, nameValue, created }) {
  const warning = message ? `<div class="warning-message">${escapeHtml(message)}</div>` : '';
  const back = created ? '' : '<a class="back-link" href="#" data-action="signup-back">‹ Back</a>';
  const form = `<p class="subtitle">Type your name and we’ll make you a passcode. Your progress
      is saved to it, so you can pick up on any phone.</p>
    <label class="signup-trap" aria-hidden="true">Website
      <input id="signup-website" type="text" tabindex="-1" autocomplete="off"></label>
    <input class="text-input" id="signup-name" type="text" placeholder="Your name"
      autocomplete="name" maxlength="60" value="${escapeHtml(nameValue || '')}">
    <button class="button" id="signup-button" data-action="submit-signup">
      Make my account</button>`;
  app.innerHTML = `${back}${coverHtml({ subtitleHtml: 'Make an account' })}
    <div class="page-padding">${warning}${created ? createdAccountHtml(created) : form}
    ${aiNoticeHtml()}</div>`;
}
