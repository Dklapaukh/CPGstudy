/*
 * The study streak's pictures: the dark rat in shield sunglasses in the top bar (sad while today's
 * quiz is still to do, powered up once it is done) and the full-screen celebration when the
 * first quiz of the day lights the streak. On the demo tracker a double tap on the rat switches
 * today's streak off and on again (owner, 17 Nov 2026). Depends on streakState.js, constants.js.
 */
import {
  currentStreak,
  streakDays,
  todayNumber,
  takeCelebration,
  isDemoTracker,
} from '../streakState.js';
import { DOUBLE_TAP_MS, STATS_HASH } from '../constants.js';

let svgCount = 0; // gives each drawing its own gradient and clip ids, as several can be on the page

// The lens outline, shared by the lens itself and the clip that keeps the glint inside it.
const LENS_PATH = `M12 31 Q32 27 52 31 L51 35.5 Q49 40 42.5 39.5 Q36 39 32 36 Q28 39 21.5 39.5
  Q15 40 13 35.5 Z`;

/** The ears: pricked up when `fired`, drooping otherwise. */
function earsSvg(fired) {
  if (fired) {
    return `<circle cx="14" cy="23" r="9" fill="#3d3632" stroke="#6e645d" stroke-width="0.8"/>
      <circle cx="14" cy="23" r="5" fill="#c98f8a"/>
      <circle cx="50" cy="23" r="9" fill="#3d3632" stroke="#6e645d" stroke-width="0.8"/>
      <circle cx="50" cy="23" r="5" fill="#c98f8a"/>`;
  }
  return `<ellipse cx="12" cy="32" rx="9.5" ry="6" transform="rotate(-32 12 32)" fill="#3d3632"
      stroke="#6e645d" stroke-width="0.8"/>
    <ellipse cx="12" cy="32" rx="5.5" ry="3" transform="rotate(-32 12 32)" fill="#a8746f"/>
    <ellipse cx="52" cy="32" rx="9.5" ry="6" transform="rotate(32 52 32)" fill="#3d3632"
      stroke="#6e645d" stroke-width="0.8"/>
    <ellipse cx="52" cy="32" rx="5.5" ry="3" transform="rotate(32 52 32)" fill="#a8746f"/>`;
}

/** The mouth: a grin with two front teeth when `fired`, otherwise a frown and a tear. */
function mouthSvg(fired) {
  if (fired) {
    return `<path d="M30.4 49.6 h3.2 v2.5 Q32 52.8 30.4 52.1 Z" fill="#fffaf0" stroke="#1b1716"
        stroke-width="0.5"/>
      <path d="M32 49.6 v2.9" stroke="#1b1716" stroke-width="0.4"/>
      <path d="M26.5 48.5 Q32 53 37.5 48.5" fill="none" stroke="#1b1716" stroke-width="1.7"
        stroke-linecap="round"/>`;
  }
  return `<path d="M28 51.5 Q32 47.8 36 51.5" fill="none" stroke="#1b1716" stroke-width="1.6"
      stroke-linecap="round"/>
    <path d="M46.5 40 Q49.2 44.8 46.5 46.8 Q43.8 44.8 46.5 40 Z" fill="#7cc7ff"/>`;
}

/**
 * The shield sunglasses: a speckled mint frame and a mirrored lens running yellow to red, with
 * a glint (class rat__glint) that the celebration sweeps across. `id` makes the ids unique.
 */
function sunglassesSvg(id) {
  return `<path d="${LENS_PATH}" fill="url(#rat-lens-${id})" stroke="#111" stroke-width="1.3"/>
    <g clip-path="url(#rat-clip-${id})"><path class="rat__glint" d="M14 42 L22 26 L26 26 L18 42 Z"
      fill="#fff" fill-opacity="0.55"/></g>
    <path d="M15 32.6 Q22 31.2 28 32.6" fill="none" stroke="#fff8c4" stroke-opacity="0.8"
      stroke-width="1.1" stroke-linecap="round"/>
    <path d="M10 30.6 Q32 25.4 54 30.6" fill="none" stroke="#111" stroke-width="3.6"
      stroke-linecap="round"/>
    <path d="M10 30.6 Q32 25.4 54 30.6" fill="none" stroke="#8fe8d3" stroke-width="2.2"
      stroke-linecap="round"/>
    <g fill="#16302b"><circle cx="15" cy="29.3" r="0.5"/><circle cx="20" cy="28.2" r="0.4"/>
      <circle cx="25.5" cy="27.6" r="0.55"/><circle cx="38" cy="27.5" r="0.45"/>
      <circle cx="43" cy="28" r="0.55"/><circle cx="48.5" cy="29" r="0.4"/></g>`;
}

/** The rat in shield sunglasses as an SVG. `fired`: ears up and a grin; otherwise a sad rat. */
export function ratSvg(fired) {
  svgCount += 1;
  const id = svgCount;
  return `<svg class="rat" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="rat-lens-${id}" x1="0" x2="0.25" y1="0" y2="1">
        <stop offset="0" stop-color="#fff36b"/><stop offset="0.35" stop-color="#ffb31a"/>
        <stop offset="0.7" stop-color="#ff5a1f"/><stop offset="1" stop-color="#d0175a"/>
      </linearGradient>
      <radialGradient id="rat-fur-${id}" cx="0.45" cy="0.35" r="0.75">
        <stop offset="0" stop-color="#5c524b"/><stop offset="1" stop-color="#26211f"/>
      </radialGradient>
      <clipPath id="rat-clip-${id}"><path d="${LENS_PATH}"/></clipPath>
    </defs>
    ${earsSvg(fired)}
    <ellipse cx="32" cy="38" rx="18.5" ry="16" fill="url(#rat-fur-${id})" stroke="#6e645d"
      stroke-width="0.8"/>
    <path d="M27 24.5 L29 21.5 L30.5 24 L32.5 20.8 L34 24 L36.5 21.8 L37 25" fill="#3a332f"/>
    <ellipse cx="32" cy="47" rx="9" ry="7" fill="#48403b"/>
    <ellipse cx="32" cy="43" rx="2.9" ry="2.2" fill="#e88d9c"/>
    <path d="M23 45 L12 42.5 M23 47 L12 48.5 M41 45 L52 42.5 M41 47 L52 48.5" stroke="#d8d2cc"
      stroke-opacity="0.85" stroke-width="0.7" stroke-linecap="round"/>
    ${mouthSvg(fired)}
    ${sunglassesSvg(id)}
  </svg>`;
}

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

/** The celebration's stage: light rays, aura, the two rats, the shock wave, flash and sparks. */
function celebrationStageHtml() {
  const embers = '<span class="streak-celebration__ember"></span>'.repeat(EMBER_COUNT);
  return `<div class="streak-celebration__stage">
      <div class="streak-celebration__rays" aria-hidden="true"></div>
      <div class="streak-celebration__aura" aria-hidden="true"></div>
      <div class="streak-celebration__flame" aria-hidden="true"></div>
      <div class="streak-celebration__charge" aria-hidden="true"></div>
      <div class="streak-celebration__rat streak-celebration__rat--sad">${ratSvg(false)}</div>
      <div class="streak-celebration__rat streak-celebration__rat--fired">${ratSvg(true)}</div>
      <div class="streak-celebration__shockwave" aria-hidden="true"></div>
      <div class="streak-celebration__embers" aria-hidden="true">${embers}</div>
      <div class="streak-celebration__flash" aria-hidden="true"></div>
    </div>`;
}

/**
 * Shows the full-screen celebration if a quiz has just lit today's streak: the sad rat charges
 * up and shakes, a flash and shock wave, then the powered-up rat in its aura and the day count
 * ticking over. Stays until Continue is pressed.
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
