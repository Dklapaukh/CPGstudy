/*
 * The study streak's pictures: the rat in Pit Viper sunglasses in the top bar (sad while today's
 * quiz is still to do, powered up once it is done) and the full-screen celebration when the
 * first quiz of the day lights the streak. Depends on streakState.js.
 */
import { currentStreak, streakDays, todayNumber, takeCelebration } from '../streakState.js';

let svgCount = 0; // gives each drawing its own gradient id, as several can be on the page

/** The rat as an SVG. `fired`: spiky gold hair and a grin; otherwise drooping ears, a frown, a tear. */
export function ratSvg(fired) {
  svgCount += 1;
  const lens = `rat-lens-${svgCount}`;
  const ears = fired
    ? `<circle cx="13" cy="24" r="8.5" fill="#9aa0a6"/><circle cx="13" cy="24" r="4.5" fill="#f2a7b6"/>
       <circle cx="51" cy="24" r="8.5" fill="#9aa0a6"/><circle cx="51" cy="24" r="4.5" fill="#f2a7b6"/>`
    : `<ellipse cx="12" cy="31" rx="9" ry="6" transform="rotate(-30 12 31)" fill="#9aa0a6"/>
       <ellipse cx="12" cy="31" rx="5" ry="3" transform="rotate(-30 12 31)" fill="#f2a7b6"/>
       <ellipse cx="52" cy="31" rx="9" ry="6" transform="rotate(30 52 31)" fill="#9aa0a6"/>
       <ellipse cx="52" cy="31" rx="5" ry="3" transform="rotate(30 52 31)" fill="#f2a7b6"/>`;
  const hair = fired
    ? `<path d="M17 31 L5 14 L18 19 L13 2 L26 14 L31 -2 L35 13 L47 1 L44 17 L60 10 L47 31 Z"
        fill="#ffd21f" stroke="#f29d00" stroke-width="1.5" stroke-linejoin="round"/>`
    : '';
  const tear = fired
    ? ''
    : '<path d="M46.5 40 Q49 44.5 46.5 46.5 Q44 44.5 46.5 40 Z" fill="#7cc7ff"/>';
  const mouth = fired ? 'M27 48.5 Q32 54 37 48.5' : 'M28 51 Q32 47.5 36 51';
  return `<svg class="rat" viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="${lens}" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ff4fa3"/><stop offset="0.45" stop-color="#7b5cff"/>
      <stop offset="0.75" stop-color="#18c6ff"/><stop offset="1" stop-color="#b6ff3b"/>
    </linearGradient></defs>
    ${ears}
    <ellipse cx="32" cy="38" rx="18" ry="16" fill="#9aa0a6"/>
    ${hair}
    <ellipse cx="32" cy="47" rx="9" ry="7" fill="#c7cbcf"/>
    <ellipse cx="32" cy="43" rx="2.8" ry="2.1" fill="#f0809b"/>
    <path d="M23 45 L13 43 M23 47 L13 48 M41 45 L51 43 M41 47 L51 48" stroke="#5f656b"
      stroke-width="0.8" stroke-linecap="round"/>
    <path d="${mouth}" fill="none" stroke="#3a3f44" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12 31 Q32 27 52 31 L51 35.5 Q49 40 42.5 39.5 Q36 39 32 36 Q28 39 21.5 39.5
      Q15 40 13 35.5 Z" fill="url(#${lens})" stroke="#111" stroke-width="1.4"/>
    <path d="M10.5 30.5 Q32 25.5 53.5 30.5" fill="none" stroke="#111" stroke-width="2.6"
      stroke-linecap="round"/>
    <path d="M16 33 L22 32.5 M38 32.5 L44 33" stroke="#fff" stroke-opacity="0.7"
      stroke-width="1.2" stroke-linecap="round"/>
    ${tear}
  </svg>`;
}

/** The top-bar button: the rat and the day count. It opens the Data tab of Settings. */
export function streakButtonHtml() {
  const { count, isActive } = currentStreak(streakDays(), todayNumber());
  const label = isActive
    ? `${count}-day streak. Today's quiz is done.`
    : `Streak ${count} ${count === 1 ? 'day' : 'days'}. Finish a quiz today to keep it going.`;
  return `<a class="streak-button${isActive ? ' streak-button--active' : ''}" href="#stats"
    aria-label="${label}" title="${label}">${ratSvg(isActive)}<span>${count}</span></a>`;
}

/**
 * Shows the full-screen celebration if a quiz has just lit today's streak: the sad rat shakes,
 * powers up and the day count appears. Stays until Continue is pressed.
 */
export function showPendingCelebration() {
  if (!takeCelebration()) return;
  const { count } = currentStreak(streakDays(), todayNumber());
  const overlay = document.createElement('div');
  overlay.className = 'streak-celebration';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `Streak lit: ${count} ${count === 1 ? 'day' : 'days'}`);
  overlay.innerHTML = `<div class="streak-celebration__stage">
      <div class="streak-celebration__aura" aria-hidden="true"></div>
      <div class="streak-celebration__rat streak-celebration__rat--sad">${ratSvg(false)}</div>
      <div class="streak-celebration__rat streak-celebration__rat--fired">${ratSvg(true)}</div>
      <div class="streak-celebration__flash" aria-hidden="true"></div>
    </div>
    <p class="streak-celebration__count">${count}</p>
    <p class="streak-celebration__text">${count === 1 ? 'day streak. Powered up.' : 'day streak. Still powered up.'}</p>
    <button class="streak-celebration__button" type="button">Continue</button>`;
  const button = overlay.querySelector('button');
  button.addEventListener('click', () => overlay.remove());
  document.body.append(overlay);
  button.focus();
}
