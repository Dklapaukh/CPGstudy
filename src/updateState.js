/*
 * Feature 7: checks whether newer guidelines are published, downloads them when asked, and keeps
 * track of which guidelines changed. Everything here is kept on this phone only, in its own
 * storage key, so the saved tracker format {c, l, s, p} and the backend are unchanged.
 * Depends on state.js, guidelines.js, updates.js, views/updateView.js and content/guidelines.js.
 */
import { state, saveSession } from './state.js';
import { guidelines } from './guidelines.js';
import { isNewerExport, nextUpdateRecord, safeFileList } from './updates.js';
import { drawUpdateStatus } from './views/updateView.js';
import { documentInfo } from '../content/guidelines.js';
import { VERSION_FILE_URL, UPDATE_STORAGE_KEY, UPDATE_CHECK_MIN_INTERVAL_MS } from './constants.js';

let storedRecord = null;

function readStoredRecord() {
  try {
    return JSON.parse(localStorage.getItem(UPDATE_STORAGE_KEY));
  } catch {
    // Blocked or corrupt storage: treated as a first run, so nothing is tagged "Updated".
    return null;
  }
}

function writeStoredRecord() {
  try {
    localStorage.setItem(UPDATE_STORAGE_KEY, JSON.stringify(storedRecord));
  } catch {
    // Blocked storage: the tags and the last-check time only last until the page closes.
  }
}

/**
 * Runs once at start-up. Compares the content just loaded with the content this phone had last
 * time, and tags the guidelines whose text changed. Puts the result into the state.
 */
export function recordLoadedContent() {
  const stored = readStoredRecord();
  storedRecord = nextUpdateRecord(stored, documentInfo.exportedOn, guidelines);
  storedRecord.lastCheckedAt = (stored && stored.lastCheckedAt) || 0;
  state.updatedGuidelineIds = new Set(storedRecord.updatedIds);
  state.lastUpdateCheckAt = storedRecord.lastCheckedAt;
  writeStoredRecord();
}

/** Removes the "Updated" tag from a guideline once it has been opened on this phone. */
export function markGuidelineSeen(guidelineId) {
  if (!state.updatedGuidelineIds.delete(guidelineId) || !storedRecord) return;
  storedRecord.updatedIds = [...state.updatedGuidelineIds];
  writeStoredRecord();
}

/** Fetches version.json past every cache. Returns its contents, or null when it can't. */
async function fetchPublishedVersion() {
  try {
    const response = await fetch(`${VERSION_FILE_URL}?checked=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // Offline or a bad file: the app keeps working on what it has; the next check tries again.
    return null;
  }
}

/** Checks for newer guidelines, at most once a minute. Called on open and on return to the app. */
export async function checkForUpdate() {
  const now = Date.now();
  if (state.updateCheckInProgress || now - state.lastUpdateCheckAt < UPDATE_CHECK_MIN_INTERVAL_MS)
    return;
  state.updateCheckInProgress = true;
  const published = await fetchPublishedVersion();
  state.updateCheckInProgress = false;
  if (published) {
    state.updateAvailable = isNewerExport(documentInfo.exportedOn, published.guidelinesExportedOn);
    state.lastUpdateCheckAt = now;
    if (storedRecord) storedRecord.lastCheckedAt = now;
    writeStoredRecord();
  }
  drawUpdateStatus();
}

/**
 * Downloads every file again, then reloads. GitHub Pages lets browsers keep files for a few
 * minutes, and a plain reload could use those old copies; fetching with cache "reload" replaces
 * them first. If any file fails (for example no signal) the page is not reloaded, because there
 * is no offline copy and a failed reload would leave a blank page.
 */
export async function applyUpdate() {
  if (state.updateInProgress) return;
  saveSession(); // unsent edits are kept on the phone and sent after the reload
  state.updateInProgress = true;
  state.updateFailed = false;
  drawUpdateStatus();
  const published = await fetchPublishedVersion();
  const files = safeFileList(published && published.files);
  const allDownloaded =
    files.length > 0 && (await downloadFiles(files)).every((response) => response.ok);
  if (allDownloaded) {
    location.reload();
    return;
  }
  state.updateInProgress = false;
  state.updateFailed = true;
  drawUpdateStatus();
}

/** Fetches each file past the browser's copy. Returns the responses, or a failure for each. */
async function downloadFiles(files) {
  try {
    return await Promise.all(files.map((path) => fetch(path, { cache: 'reload' })));
  } catch {
    // A network error on any file: reported to the person by applyUpdate.
    return [{ ok: false }];
  }
}
