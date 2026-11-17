/*
 * The study streak on screen: the top-bar button with the whole rat (sad while today's quiz is
 * still to do, powered up once it is done) and the full-screen celebration, where the hype rat
 * jumps and cheers when the first quiz of the day lights the streak. On the demo tracker a double
 * tap on the rat switches today's streak off and on again (owner, 17 Nov 2026).
 * Depends on streakState.js, constants.js and ratDrawings.js.
 */
import {
  currentStreak,
  streakDays,
  todayNumber,
  takeCelebration,
  isDemoTracker,
} from '../streakState.js';
import { DOUBLE_TAP_MS, STATS_HASH } from '../constants.js';
import { ratSvg, hypeRatSvg } from './ratDrawings.js';

/** The top-bar button: the rat and the day count. It opens the Data tab of Settings. */
export function streakButtonHtml() {
  const { count, isActive } = currentStreak(streakDays(), todayNumber());
  const label = isActive
    ? `${count}-day streak. Today's quiz is done.`
    : `Streak ${count} ${count === 1 ? 'day' : 'days'}. Finish a quiz today to keep it going.`;
  const classes = `streak-button${isActive ? ' streak-button--active' : ''}`;
  const inside = `${ratSvg(isActive)}<span>${count}</span>`;
  // The demo tracker gets a button, so a double tap can switch today's streak off and on.
  if (isDemoTracker()) {
    return `<button class="${classes}" type="button" data-action="streak-demo-tap"
      aria-label="${label} Double tap to demonstrate." title="${label}">${inside}</button>`;
  }
  return `<a class="${classes}" href="#stats" aria-label="${label}" title="${label}">${inside}</a>`;
}

let pendingTapTimer = null; // the single tap waiting to see whether a second tap follows

/**
 * A tap on the demo tracker's streak button. One tap opens the Data tab as usual (after a short
 * wait); two taps in quick succession run `onDoubleTap` instead.
 */
export function demoStreakTap(onDoubleTap) {
  if (pendingTapTimer) {
    clearTimeout(pendingTapTimer);
    pendingTapTimer = null;
    onDoubleTap();
    return;
  }
  pendingTapTimer = setTimeout(() => {
    pendingTapTimer = null;
    location.hash = STATS_HASH;
  }, DOUBLE_TAP_MS);
}

// Glowing sparks that rise round the powered-up rat; CSS gives each its place and timing.
const EMBER_COUNT = 10;

/**
 * The celebration's stage: light rays, the flickering charge glow, aura, flames, the hype rat,
 * shock wave, sparks and flash.
 */
function celebrationStageHtml() {
  const embers = '<span class="streak-celebration__ember"></span>'.repeat(EMBER_COUNT);
  return `<div class="streak-celebration__stage">
      <div class="streak-celebration__rays" aria-hidden="true"></div>
      <div class="streak-celebration__charge" aria-hidden="true"></div>
      <div class="streak-celebration__aura" aria-hidden="true"></div>
      <div class="streak-celebration__flame" aria-hidden="true"></div>
      <div class="streak-celebration__rat">${hypeRatSvg()}</div>
      <div class="streak-celebration__shockwave" aria-hidden="true"></div>
      <div class="streak-celebration__embers" aria-hidden="true">${embers}</div>
      <div class="streak-celebration__flash" aria-hidden="true"></div>
    </div>`;
}

/**
 * Shows the full-screen celebration if a quiz has just lit today's streak: the hype rat powers up
 * like a super Saiyan. It drops into a stance with fists clenched at its hips, strains and shakes
 * as a glow builds, then throws its arms down and out with a shout (a flash, a shock wave, its
 * aura bursts on) and stands powered up, flexing now and then, while the day count ticks over.
 * Stays until Continue.
 */
export function showPendingCelebration() {
  if (!takeCelebration()) return;
  const { count } = currentStreak(streakDays(), todayNumber());
  const overlay = document.createElement('div');
  overlay.className = 'streak-celebration';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `Streak lit: ${count} ${count === 1 ? 'day' : 'days'}`);
  overlay.innerHTML = `${celebrationStageHtml()}
    <p class="streak-celebration__count" aria-hidden="true">
      <span class="streak-celebration__number streak-celebration__number--old">${count - 1}</span>
      <span class="streak-celebration__number streak-celebration__number--new">${count}</span>
    </p>
    <p class="streak-celebration__text">${count === 1 ? 'day streak. Powered up.' : 'day streak. Still powered up.'}</p>
    <button class="streak-celebration__button" type="button">Continue</button>`;
  const button = overlay.querySelector('button');
  button.addEventListener('click', () => overlay.remove());
  document.body.append(overlay);
  button.focus();
}
