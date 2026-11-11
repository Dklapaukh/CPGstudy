/*
 * Feature 7 on screen: the "new version available" banner above every screen and the footer of
 * the list screen (export date, last check, study-aid notice). Both are drawn from the state.
 * The banner sits outside the app container, so redrawing it never disturbs a note being typed.
 * Depends on state.js, updates.js and content/guidelines.js.
 */
import { state } from '../state.js';
import { formatCheckedTime } from '../updates.js';
import { documentInfo } from '../../content/guidelines.js';
import { MESSAGES } from '../constants.js';

function bannerHtml() {
  if (state.updateInProgress) {
    return `<p class="update-banner__text">${MESSAGES.UPDATE_DOWNLOADING}</p>`;
  }
  const failed = state.updateFailed
    ? `<p class="update-banner__error">${MESSAGES.UPDATE_FAILED}</p>`
    : '';
  return `<p class="update-banner__text">${MESSAGES.UPDATE_AVAILABLE}</p>
    <button class="update-banner__button" type="button" data-action="apply-update">
      ${MESSAGES.UPDATE_BUTTON}</button>${failed}`;
}

/** Markup for the list screen footer. Its last-check line is filled in by drawUpdateStatus. */
export function footerHtml() {
  return `<footer class="app-footer"><p>Guidelines exported ${documentInfo.exportedOn} ·
    last checked for updates <span class="update-checked-time"></span></p>
    <p>${MESSAGES.STUDY_AID_NOTICE} ${documentInfo.sourceLine}</p></footer>`;
}

/** Redraws the banner and the last-check time from the state. */
export function drawUpdateStatus() {
  const banner = document.getElementById('update-banner');
  if (banner) {
    banner.hidden = !state.updateAvailable;
    banner.innerHTML = state.updateAvailable ? bannerHtml() : '';
  }
  document.querySelectorAll('.update-checked-time').forEach((element) => {
    element.textContent = formatCheckedTime(state.lastUpdateCheckAt);
  });
}
