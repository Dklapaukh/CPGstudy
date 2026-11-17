/*
 * The Settings screen (#settings): the tracker with its Switch tracker button, dark mode, and a
 * wheel (like the iPhone's) for how many days after Complete a guideline is marked for review.
 * Its Data tab (#stats) shows the study stats (dataView.js).
 * The listeners are attached here, so this file is self-contained. Depends on state.js,
 * settingsState.js, theme.js, logic.js, dataView.js and constants.js.
 */
import { state } from '../state.js';
import { getReviewAfterDays, saveReviewAfterDays } from '../settingsState.js';
import { isDarkMode, setDarkMode } from '../theme.js';
import { escapeHtml } from '../logic.js';
import { dataHtml } from './dataView.js';
import { REVIEW_AFTER_DAYS, SETTINGS_HASH, STATS_HASH } from '../constants.js';

const app = document.getElementById('app');
const ITEM_HEIGHT = 40; // px, the same as .wheel__item in styles/app.css
const SAVE_DELAY_MS = 150; // wait for the wheel to stop before saving

const dayText = (days) => (days === 0 ? 'Off' : `${days} ${days === 1 ? 'day' : 'days'}`);

/** The sentence under the wheel saying what the chosen days do. */
function summaryText(days) {
  return days === 0
    ? 'Complete guidelines stay Complete.'
    : `Complete guidelines go back to Needs review ${dayText(days)} after they were marked.`;
}

/** The scrolling wheel of day choices. */
function wheelHtml(days) {
  const items = [];
  for (let value = REVIEW_AFTER_DAYS.MIN; value <= REVIEW_AFTER_DAYS.MAX; value += 1) {
    items.push(`<li class="wheel__item" data-value="${value}">${dayText(value)}</li>`);
  }
  return `<div class="wheel">
    <div class="wheel__band" aria-hidden="true"></div>
    <ol class="wheel__list" id="review-days-wheel" tabindex="0" role="spinbutton"
      aria-labelledby="review-days-label" aria-valuemin="${REVIEW_AFTER_DAYS.MIN}"
      aria-valuemax="${REVIEW_AFTER_DAYS.MAX}" aria-valuenow="${days}"
      aria-valuetext="${dayText(days)}">${items.join('')}</ol></div>`;
}

/** The tracker's name with the Switch tracker button (moved here from the list screen). */
function trackerGroupHtml() {
  return `<section class="settings-group" aria-label="Tracker">
    <div class="settings-row"><span>${escapeHtml(state.label)}</span>
    <button class="settings-switch-button" type="button" data-action="switch-tracker">Switch
    tracker</button></div></section>`;
}

/** The two tabs at the top: General (the settings) and Data (the stats). */
function tabsHtml(showData) {
  const tab = (href, name, isCurrent) =>
    `<a class="settings-tab" href="#${href}"${isCurrent ? ' aria-current="page"' : ''}>${name}</a>`;
  return `<nav class="settings-tabs" aria-label="Settings sections">
    ${tab(SETTINGS_HASH, 'General', !showData)}${tab(STATS_HASH, 'Data', showData)}</nav>`;
}

/** The General tab: the tracker, dark mode and the review-after wheel. */
function generalHtml(days) {
  return `${trackerGroupHtml()}
    <section class="settings-group" aria-label="Appearance">
      <label class="settings-row"><span>Dark mode</span>
      <input class="switch" id="dark-mode-switch" type="checkbox" role="switch"
        ${isDarkMode() ? 'checked' : ''}></label>
    </section>
    <section class="settings-group">
      <p class="settings-row settings-row--stacked" id="review-days-label">Mark guidelines for
      review this many days after they're marked Complete</p>
      ${wheelHtml(days)}
      <p class="settings-hint" id="review-days-summary">${summaryText(days)}
      ${state.label ? 'Shared with everyone who has this passcode.' : ''}</p>
    </section>`;
}

/** Draws the Settings screen; `showData` opens the Data tab (stats). */
export function renderSettingsScreen(showData = false) {
  const days = getReviewAfterDays();
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding settings-screen"><h1 class="quiz-title">Settings</h1>
    <span class="sync-status"></span>
    ${tabsHtml(showData)}
    ${showData ? dataHtml() : generalHtml(days)}</div>`;
  window.scrollTo(0, 0);
  if (!showData) attachListeners(days);
}

/** Tilts and fades the wheel's items away from the middle, like a drum turning. */
function drawDrum(wheel, items) {
  const centre = wheel.scrollTop / ITEM_HEIGHT;
  const first = Math.max(0, Math.floor(centre) - 4);
  const last = Math.min(items.length - 1, Math.ceil(centre) + 4);
  for (let index = first; index <= last; index += 1) {
    const distance = index - centre;
    const style = items[index].style;
    style.transform = `rotateX(${(-distance * 20).toFixed(1)}deg)`;
    style.opacity = String(Math.max(0.15, 1 - Math.abs(distance) * 0.28).toFixed(2));
  }
}

/** The days a key moves the wheel to from `shown`, or null for a key the wheel ignores. */
function daysForKey(key, shown) {
  const steps = { ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 };
  if (key in steps) return shown + steps[key];
  if (key === 'Home') return REVIEW_AFTER_DAYS.MIN;
  if (key === 'End') return REVIEW_AFTER_DAYS.MAX;
  return null;
}

/** Connects the wheel: scrolling, tapping a day or the arrow keys; it saves once it stops. */
function attachWheel(startDays) {
  const wheel = app.querySelector('#review-days-wheel');
  const items = [...wheel.children];
  let shown = startDays;
  let saved = startDays;
  let saveTimer = 0;

  const show = (days) => {
    shown = days;
    wheel.setAttribute('aria-valuenow', String(days));
    wheel.setAttribute('aria-valuetext', dayText(days));
    items.forEach((item, index) => item.classList.toggle('wheel__item--chosen', index === days));
    app.querySelector('#review-days-summary').firstChild.textContent = `${summaryText(days)} `;
  };
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (shown === saved) return;
      saved = shown;
      saveReviewAfterDays(shown);
    }, SAVE_DELAY_MS);
  };
  const scrollToDays = (days, smooth) => {
    const target = Math.min(REVIEW_AFTER_DAYS.MAX, Math.max(REVIEW_AFTER_DAYS.MIN, days));
    if (smooth && wheel.scrollTo) wheel.scrollTo({ top: target * ITEM_HEIGHT, behavior: 'smooth' });
    else wheel.scrollTop = target * ITEM_HEIGHT;
    show(target);
    drawDrum(wheel, items);
    saveSoon();
  };

  wheel.addEventListener('scroll', () => {
    drawDrum(wheel, items);
    const days = Math.round(wheel.scrollTop / ITEM_HEIGHT);
    if (days !== shown) show(days);
    saveSoon();
  });
  wheel.addEventListener('click', (event) => {
    const item = event.target.closest('.wheel__item');
    if (item) scrollToDays(Number(item.dataset.value), true);
  });
  wheel.addEventListener('keydown', (event) => {
    const days = daysForKey(event.key, shown);
    if (days === null) return;
    event.preventDefault();
    scrollToDays(days, false);
  });

  show(startDays);
  wheel.scrollTop = startDays * ITEM_HEIGHT;
  drawDrum(wheel, items);
}

/** Connects the dark mode switch and the wheel. */
function attachListeners(startDays) {
  app.querySelector('#dark-mode-switch').addEventListener('change', (event) => {
    setDarkMode(event.target.checked);
  });
  attachWheel(startDays);
}
