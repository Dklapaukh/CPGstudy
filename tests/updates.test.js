// Tests for the update prompt logic (src/updates.js) and the published version.json file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  fingerprintText,
  guidelineFingerprints,
  changedGuidelineIds,
  exportDateValue,
  isNewerExport,
  safeFileList,
  nextUpdateRecord,
  formatCheckedTime,
} from '../src/updates.js';
import { documentInfo } from '../content/guidelines.js';

const guideline = (id, title, text) => ({ id, t: title, b: [['p', text, 0]] });

test('fingerprints are stable for the same text and differ when the text changes', () => {
  assert.equal(fingerprintText('adrenaline 1 mg'), fingerprintText('adrenaline 1 mg'));
  assert.notEqual(fingerprintText('adrenaline 1 mg'), fingerprintText('adrenaline 10 mg'));
  assert.match(fingerprintText(''), /^[0-9a-f]{8}$/);
});

test('changed guidelines are the ones with a new or different fingerprint', () => {
  const before = guidelineFingerprints([guideline('a', 'A', 'one'), guideline('b', 'B', 'two')]);
  const after = guidelineFingerprints([
    guideline('a', 'A', 'one'),
    guideline('b', 'B', 'two, changed'),
    guideline('c', 'C', 'new'),
  ]);
  assert.deepEqual(changedGuidelineIds(before, after), ['b', 'c']);
});

test('only a later, well-formed export date counts as newer', () => {
  assert.equal(exportDateValue('24.09.2026'), 20260924);
  assert.equal(exportDateValue('2026-09-24'), null);
  assert.equal(isNewerExport('24.09.2026', '01.10.2026'), true);
  assert.equal(isNewerExport('24.09.2026', '24.09.2026'), false);
  assert.equal(isNewerExport('24.09.2026', '01.01.2026'), false);
  assert.equal(isNewerExport('24.09.2026', undefined), false);
});

test('the file list is used only when every path is a plain relative path', () => {
  assert.deepEqual(safeFileList(['index.html', 'src/main.js']), ['index.html', 'src/main.js']);
  assert.deepEqual(safeFileList(['index.html', '../secret']), []);
  assert.deepEqual(safeFileList(['https://example.com/x.js']), []);
  assert.deepEqual(safeFileList(['/index.html']), []);
  assert.deepEqual(safeFileList('index.html'), []);
});

test('the stored record tags changed guidelines only when the export date changes', () => {
  const oldList = [guideline('a', 'A', 'one'), guideline('b', 'B', 'two')];
  const first = nextUpdateRecord(null, '24.09.2026', oldList);
  assert.deepEqual(first.updatedIds, []); // first run: nothing to compare with
  assert.equal(nextUpdateRecord(first, '24.09.2026', oldList), first); // no work when unchanged
  const newList = [guideline('a', 'A', 'one'), guideline('b', 'B', 'two, changed')];
  const second = nextUpdateRecord({ ...first, updatedIds: ['a'] }, '01.10.2026', newList);
  assert.deepEqual(second.updatedIds, ['a', 'b']); // earlier tags not yet opened are kept
  assert.equal(second.exportedOn, '01.10.2026');
});

test('the last check time reads "not yet" before the first check', () => {
  assert.equal(formatCheckedTime(0), 'not yet');
  assert.match(formatCheckedTime(Date.UTC(2026, 10, 11)), /2026/);
});

test('version.json matches the content and lists every file the app loads', () => {
  const published = JSON.parse(readFileSync('version.json', 'utf8'));
  assert.equal(published.guidelinesExportedOn, documentInfo.exportedOn);
  const folderFiles = (folder) =>
    readdirSync(folder)
      .filter((name) => name.endsWith('.js'))
      .map((name) => `${folder}/${name}`);
  const appFiles = [
    'index.html',
    'styles/app.css',
    ...folderFiles('content'),
    ...folderFiles('src'),
    ...folderFiles('src/views'),
  ];
  assert.deepEqual([...published.files].sort(), appFiles.sort());
  assert.deepEqual(safeFileList(published.files), published.files);
});
