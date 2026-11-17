/*
 * Copies the editors' changes from the Sheet's Edits tab into the app: content/card-edits.yaml
 * (the readable record, one entry per edited question) and content/card-edits.js (what the app
 * loads). Run every morning by .github/workflows/edits-sync.yml, or by hand with
 * `node scripts/sync-edits.js`. Prints how many edits need an editor's review after a guideline
 * update (the editor page lists them).
 * Depends on src/api.js, src/questionEdits.js, src/editor/questions.js and the yaml package.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { sendRequest } from '../src/api.js';
import { EDIT_FIELDS, reviewState } from '../src/questionEdits.js';
import { questionBank } from '../src/editor/questions.js';

const YAML_PATH = fileURLToPath(new URL('../content/card-edits.yaml', import.meta.url));
const JS_PATH = fileURLToPath(new URL('../content/card-edits.js', import.meta.url));
const KEPT_KEYS = ['kind', 'off', 'was'];

/** An edit with only the keys the app knows, or null when it is not an edit of a known kind. */
function cleanEdit(edit) {
  if (!edit || !EDIT_FIELDS[edit.kind]) return null;
  const clean = {};
  [...EDIT_FIELDS[edit.kind], ...KEPT_KEYS].forEach((key) => {
    if (edit[key] !== undefined) clean[key] = edit[key];
  });
  return clean;
}

/** The edits sorted by question id, so the files only change when an edit changes. */
export function cleanEdits(edits) {
  const sorted = {};
  Object.keys(edits)
    .sort()
    .forEach((id) => {
      const clean = cleanEdit(edits[id]);
      if (clean) sorted[id] = clean;
    });
  return sorted;
}

const HEADER =
  "Editors' changes to quiz questions, by question id (src/questionEdits.js). Written by\n" +
  "scripts/sync-edits.js from the Sheet's Edits tab every morning; do not edit by hand.";

/** Writes both files. */
export function writeEdits(edits) {
  const yamlHeader = HEADER.replace(/^/gm, '# ');
  writeFileSync(YAML_PATH, `${yamlHeader}\n${stringify(edits)}`);
  const jsHeader = HEADER.replace(/^/gm, '// ');
  writeFileSync(
    JS_PATH,
    `${jsHeader}\nexport const cardEdits = ${JSON.stringify(edits, null, 2)};\n`,
  );
}

/** The ids of edits whose question changed or went since they were made. */
export function editsToReview(edits) {
  const { byId } = questionBank();
  return Object.keys(edits).filter((id) => reviewState(byId[id]?.question, edits[id]));
}

/** Fetches the edits, writes both files and lists the edits that need review. */
async function main() {
  const reply = await sendRequest({ action: 'edits' });
  if (!reply.ok) {
    console.error(`The backend refused: ${reply.error}. Is backend/Code.gs redeployed?`);
    process.exit(1);
  }
  const edits = cleanEdits(reply.edits || {});
  writeEdits(edits);
  const toReview = editsToReview(edits);
  console.log(`${Object.keys(edits).length} edits written; ${toReview.length} need review.`);
  toReview.forEach((id) => console.log(`  needs review: ${id}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
