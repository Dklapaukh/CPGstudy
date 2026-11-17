/*
 * Dark mode: chosen in the study app's Settings and kept on this device (localStorage), so the
 * manager and editor pages follow it too. Depends on constants.js.
 */
import { THEME_STORAGE_KEY } from './constants.js';

/** True when dark mode is saved on this device. */
export function isDarkMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    return false; // blocked storage: light mode
  }
}

/** Puts the saved theme on the page (data-theme on <html>, read by the styles). */
export function applyTheme() {
  document.documentElement.dataset.theme = isDarkMode() ? 'dark' : 'light';
}

/** Saves dark mode on or off and applies it at once. */
export function setDarkMode(on) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, on ? 'dark' : 'light');
  } catch {
    // Blocked storage: the theme still changes until the page is reloaded.
  }
  document.documentElement.dataset.theme = on ? 'dark' : 'light';
}
