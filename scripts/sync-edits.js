/*
 * Copies the editors' changes from the Sheet's Edits tab into the app: content/card-edits.yaml
 * (the readable record, one entry per edited question) and content/card-edits.js (what the app
 * loads), and the scenario edits (changed, new and deleted scenarios) into
 * content/scenario-edits.yaml and content/scenario-edits.js. Run every morning by .github/workflows/edits-sync.yml, or by hand with
 * `node scripts/sync-edits.js`. Prints how many edits need an editor's review after a guideline
 * update (the editor page lists them).
 * Depends on src/api.js, src/questionEdits.js, src/scenarioEdits.js, src/guidelines.js,
 * src/editor/questions.js, content/scenarios.js and the yaml package.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { sendRequest } from '../src/api.js';
import { EDIT_FIELDS, reviewState } from '../src/questionEdits.js';
import { questionBank } from '../src/editor/questions.js';
import {
  SCENARIO_EDIT_KIND,
  scenarioIdOfEdit,
  scenarioPathsToReview,
  cleanAddedScenario,
  scenarioEditDeleted,
} from '../src/scenarioEdits.js';
import { guidelineById } from '../src/guidelines.js';
import { scenarios } from '../content/scenarios.js';

const contentPath = (name) => fileURLToPath(new URL(`../content/${name}`, import.meta.url));
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
      const clean = scenarioIdOfEdit(id) ? null : cleanEdit(edits[id]);
      if (clean) sorted[id] = clean;
    });
  return sorted;
}

// A scenario id the app can put in an address (as tests/scenarios.test.js checks).
const SCENARIO_ID_PATTERN = /^[a-z0-9-]+$/;
const isGuidelineId = (id) => Boolean(guidelineById(id));

/**
 * A scenario edit with only the keys the app knows, or null when it is not one. A new scenario
 * is kept only when it is whole and its id is safe; a deleted one keeps only that it is deleted.
 */
function cleanScenarioEdit(edit, scenarioId) {
  if (edit?.kind !== SCENARIO_EDIT_KIND) return null;
  if (edit.deleted) return scenarioEditDeleted();
  if (edit.added) {
    const added = SCENARIO_ID_PATTERN.test(scenarioId)
      ? cleanAddedScenario(edit.added, scenarioId, isGuidelineId)
      : null;
    return added ? { kind: SCENARIO_EDIT_KIND, ...(edit.off ? { off: true } : {}), added } : null;
  }
  if (!edit.fields || typeof edit.fields !== 'object') return null;
  const fields = {};
  Object.keys(edit.fields)
    .sort()
    .forEach((path) => {
      const { was, to } = edit.fields[path] || {};
      if (to !== undefined) fields[path] = { was, to };
    });
  return { kind: SCENARIO_EDIT_KIND, ...(edit.off ? { off: true } : {}), fields };
}

/** The scenario edits sorted by id, so the files only change when an edit changes. */
export function cleanScenarioEdits(edits) {
  const sorted = {};
  Object.keys(edits)
    .filter(scenarioIdOfEdit)
    .sort()
    .forEach((id) => {
      const clean = cleanScenarioEdit(edits[id], scenarioIdOfEdit(id));
      if (clean) sorted[id] = clean;
    });
  return sorted;
}

const WRITTEN_BY =
  "scripts/sync-edits.js from the Sheet's Edits tab every morning; do not edit by hand.";
const FILES = {
  cards: {
    name: 'card-edits',
    exported: 'cardEdits',
    header: `Editors' changes to quiz questions, by question id (src/questionEdits.js). Written by\n${WRITTEN_BY}`,
  },
  scenarios: {
    name: 'scenario-edits',
    exported: 'scenarioEdits',
    header: `Editors' changes to scenarios, by edit id (src/scenarioEdits.js). Written by\n${WRITTEN_BY}`,
  },
};

/** Writes one kind of edit to its two files (see FILES). */
function writeEdits(file, edits) {
  const yamlHeader = file.header.replace(/^/gm, '# ');
  writeFileSync(contentPath(`${file.name}.yaml`), `${yamlHeader}\n${stringify(edits)}`);
  const jsHeader = file.header.replace(/^/gm, '// ');
  writeFileSync(
    contentPath(`${file.name}.js`),
    `${jsHeader}\nexport const ${file.exported} = ${JSON.stringify(edits, null, 2)};\n`,
  );
}

/** The ids of edits whose question or scenario changed or went since they were made. */
function editsToReview(edits, scenarioEditsById) {
  const { byId } = questionBank();
  const scenarioOf = (id) => scenarios.find((scenario) => scenario.id === scenarioIdOfEdit(id));
  return [
    ...Object.keys(edits).filter((id) => reviewState(byId[id]?.question, edits[id])),
    ...Object.keys(scenarioEditsById).filter(
      (id) => scenarioPathsToReview(scenarioOf(id), scenarioEditsById[id]).length,
    ),
  ];
}

/** Fetches the edits, writes both files and lists the edits that need review. */
async function main() {
  const reply = await sendRequest({ action: 'edits' });
  if (!reply.ok) {
    console.error(`The backend refused: ${reply.error}. Is backend/Code.gs redeployed?`);
    process.exit(1);
  }
  const edits = cleanEdits(reply.edits || {});
  const scenarioEditsById = cleanScenarioEdits(reply.edits || {});
  writeEdits(FILES.cards, edits);
  writeEdits(FILES.scenarios, scenarioEditsById);
  const toReview = editsToReview(edits, scenarioEditsById);
  const count = Object.keys(edits).length + Object.keys(scenarioEditsById).length;
  console.log(`${count} edits written; ${toReview.length} need review.`);
  toReview.forEach((id) => console.log(`  needs review: ${id}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
