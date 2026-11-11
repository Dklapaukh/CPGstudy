/*
 * Pure logic for the "new version available" prompt (feature 7): comparing export dates,
 * fingerprinting guideline text to find which guidelines changed, and checking the file list
 * in version.json. Touches nothing outside its arguments. Depends on nothing.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
// Paths in version.json may only be plain relative paths inside the app (no "..", no address).
const SAFE_FILE_PATH = /^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9_./-]*$/;

/** Short fingerprint (FNV-1a, 8 hex characters) of a text. Same text, same fingerprint. */
export function fingerprintText(text) {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Fingerprint of each guideline's title and content. Returns { guideline id: fingerprint }. */
export function guidelineFingerprints(guidelines) {
  const fingerprints = {};
  guidelines.forEach((guideline) => {
    fingerprints[guideline.id] = fingerprintText(JSON.stringify([guideline.t, guideline.b]));
  });
  return fingerprints;
}

/** Ids whose fingerprint is new or different in `newFingerprints`. Removed ids are ignored. */
export function changedGuidelineIds(oldFingerprints, newFingerprints) {
  return Object.keys(newFingerprints).filter((id) => oldFingerprints[id] !== newFingerprints[id]);
}

/** Turns an export date written "dd.mm.yyyy" into a sortable number, or null if malformed. */
export function exportDateValue(exportedOn) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(exportedOn));
  if (!match) return null;
  const [, day, month, year] = match;
  return Number(year + month + day);
}

/**
 * True when the published export date is later than the one loaded.
 * Only "later" counts, so a briefly out-of-date copy of version.json never offers a downgrade.
 */
export function isNewerExport(loadedExportedOn, publishedExportedOn) {
  const loaded = exportDateValue(loadedExportedOn);
  const published = exportDateValue(publishedExportedOn);
  return loaded !== null && published !== null && published > loaded;
}

/** The file list from version.json if every entry is a safe relative path, otherwise []. */
export function safeFileList(files) {
  if (!Array.isArray(files)) return [];
  const allSafe = files.every((path) => typeof path === 'string' && SAFE_FILE_PATH.test(path));
  return allSafe ? files : [];
}

/**
 * Works out the record kept on this phone after the app has loaded its content.
 * Takes the stored record ({ exportedOn, fingerprints, updatedIds }, or null), the loaded export
 * date and the guideline list. Returns the record to store. Fingerprints are only worked out on
 * the first run and when the export date changes, so normal start-ups do no extra work.
 * The first run tags nothing: there is no earlier version to compare with.
 */
export function nextUpdateRecord(stored, exportedOn, guidelines) {
  const hasStored = Boolean(stored && stored.exportedOn && stored.fingerprints);
  if (hasStored && stored.exportedOn === exportedOn) return stored;
  const fingerprints = guidelineFingerprints(guidelines);
  const earlierUpdatedIds = hasStored && Array.isArray(stored.updatedIds) ? stored.updatedIds : [];
  const newlyChanged = hasStored ? changedGuidelineIds(stored.fingerprints, fingerprints) : [];
  const updatedIds = [...new Set([...earlierUpdatedIds, ...newlyChanged])].filter(
    (id) => id in fingerprints,
  );
  return { exportedOn, fingerprints, updatedIds };
}

/** "11 Nov 2026, 5:40 pm" for a time in milliseconds, or "not yet" when it is 0. */
export function formatCheckedTime(milliseconds) {
  if (!milliseconds) return 'not yet';
  return new Date(milliseconds).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
