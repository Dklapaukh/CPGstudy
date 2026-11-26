/*
 * Copies the editors' changes from the Sheet's Edits tab into the app: content/card-edits.yaml
 * (the readable record, one entry per edited question) and content/card-edits.js (what the app
 * loads), and the scenario edits (changed, new and deleted scenarios) into
 * content/scenario-edits.yaml and content/scenario-edits.js, the benchmark sets edit into
 * content/scenario-set-edits.yaml and .js (src/scenarioSets.js), and the editors' reviews of scenarios
 * into content/scenario-reviews.yaml (read before writing new scenarios), and the approved
 * anonymised jobs into content/anonymised-jobs.yaml and .js (src/anonymisedJobs.js). It also
 * copies the photos of approved submitted jobs that new scenarios or anonymised jobs use into
 * content/scenario-photos. Run every morning by .github/workflows/edits-sync.yml, or by hand with
 * `node scripts/sync-edits.js`. Prints how many edits need an editor's review after a guideline
 * update (the editor page lists them).
 * Depends on src/api.js, src/questionEdits.js, src/scenarioEdits.js, src/scenarioSets.js,
 * src/scenarioReviews.js, src/anonymisedJobs.js,
 * src/guidelines.js,
 * src/editor/questions.js, content/scenarios.js and the yaml package.
 */
import { writeFileSync, readdirSync, unlinkSync } from 'node:fs';
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
import { SCENARIO_SETS_EDIT_ID, cleanSetsEdit } from '../src/scenarioSets.js';
import { isReviewEditId, cleanReview, reviewReport } from '../src/scenarioReviews.js';
import { allComments, partName } from '../src/scenarioComments.js';
import { guidelineById } from '../src/guidelines.js';
import { scenarios } from '../content/scenarios.js';
import { SCENARIO_PHOTO_FOLDER } from '../src/constants.js';
import { photoName } from '../src/scenarioSubmission.js';
import { jobIdOfEdit, cleanJobEntry } from '../src/anonymisedJobs.js';

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
  jobs: {
    name: 'anonymised-jobs',
    exported: 'anonymisedJobs',
    header: `Approved anonymised jobs, by edit id (src/anonymisedJobs.js). Written by\n${WRITTEN_BY}`,
  },
  sets: {
    name: 'scenario-set-edits',
    exported: 'scenarioSetEdits',
    header: `Editors' changes to the benchmark sets, by edit id (src/scenarioSets.js). Written by\n${WRITTEN_BY}`,
  },
};

/**
 * The benchmark sets edit (SC-L) by its id, keeping only scenarios the app has (in the file or
 * added by editors, in `scenarioEditsById`); {} when there is none.
 */
export function cleanSetEdits(edits, scenarioEditsById) {
  const added = Object.values(scenarioEditsById).map((edit) => edit.added?.id);
  const ids = new Set([...scenarios.map((scenario) => scenario.id), ...added]);
  const clean = cleanSetsEdit(edits[SCENARIO_SETS_EDIT_ID], (id) => ids.has(id));
  return clean ? { [SCENARIO_SETS_EDIT_ID]: clean } : {};
}

/** The approved anonymised jobs by edit id, each checked (bad ones dropped), sorted by id. */
export function cleanJobEdits(edits) {
  const sorted = {};
  Object.keys(edits)
    .filter(jobIdOfEdit)
    .sort()
    .forEach((id) => {
      const clean = cleanJobEntry(edits[id], jobIdOfEdit(id), isGuidelineId);
      if (clean) sorted[id] = clean;
    });
  return sorted;
}

/** The reviews among the edits, each checked, oldest first; bad ones are dropped. */
export function cleanReviews(edits) {
  return Object.keys(edits)
    .filter(isReviewEditId)
    .map((id) => cleanReview(edits[id]))
    .filter(Boolean)
    .sort((first, second) => first.at - second.at);
}

const REVIEWS_HEADER = `Editors' reviews of scenarios (src/scenarioReviews.js): a summary, each level's notes,
then each reviewed scenario with its in-line comments (src/scenarioComments.js). Read this before writing new scenarios. Written by\n${WRITTEN_BY}`;

/**
 * Writes the reviews' and in-line comments' readable record; the app doesn't load it, so there
 * is no .js file.
 */
function writeReviews(reviews, comments, scenarioEditsById) {
  const added = Object.values(scenarioEditsById)
    .map((edit) => edit.added)
    .filter(Boolean);
  const scenarioOf = (id) => [...scenarios, ...added].find((scenario) => scenario.id === id);
  const names = {
    titleOf: (id) => scenarioOf(id)?.title || '',
    partNameOf: (id, part) => partName(part, scenarioOf(id)?.patients.length || 1),
    numberOf: (id) => guidelineById(id)?.n || id,
  };
  const header = REVIEWS_HEADER.replace(/^/gm, '# ');
  const report = reviewReport(reviews, names, comments);
  writeFileSync(contentPath('scenario-reviews.yaml'), `${header}\n${stringify(report)}`);
}

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

/**
 * The photos to publish: those of approved jobs ({ id, photos: [{ data }] } from the backend)
 * that a new scenario in `scenarioEditsById` or an anonymised job in `jobEditsById` shows, as
 * { name, data }. A photo an editor took
 * out before approving is never published. Names are "<job id>-<n>.jpg", as the editor page
 * gives them (src/scenarioSubmission.js, photoName).
 */
export function photosToPublish(submissions, scenarioEditsById, jobEditsById = {}) {
  const shown = [
    ...Object.values(scenarioEditsById).map((edit) => edit.added),
    ...Object.values(jobEditsById).map((edit) => edit.job),
  ];
  const used = new Set(shown.flatMap((item) => (item?.photos || []).map((photo) => photo.src)));
  return submissions.flatMap(({ id, photos = [] }) =>
    photos
      .map((photo, index) => ({ name: photoName(id, index), data: photo.data }))
      .filter((photo) => used.has(`${SCENARIO_PHOTO_FOLDER}/${photo.name}`)),
  );
}

/** Writes the photos to publish and removes any other photo in the folder. */
function writePhotos(files) {
  const folder = fileURLToPath(new URL(`../${SCENARIO_PHOTO_FOLDER}/`, import.meta.url));
  const names = new Set(files.map((file) => file.name));
  readdirSync(folder)
    .filter((name) => name.endsWith('.jpg') && !names.has(name))
    .forEach((name) => unlinkSync(folder + name));
  files.forEach((file) => writeFileSync(folder + file.name, Buffer.from(file.data, 'base64')));
}

/**
 * Writes the question, scenario, benchmark set and anonymised job edits; returns the question,
 * scenario and job edits, cleaned.
 */
function writeAllEdits(sheetEdits) {
  const edits = cleanEdits(sheetEdits);
  const scenarioEditsById = cleanScenarioEdits(sheetEdits);
  const jobEditsById = cleanJobEdits(sheetEdits);
  writeEdits(FILES.cards, edits);
  writeEdits(FILES.scenarios, scenarioEditsById);
  writeEdits(FILES.sets, cleanSetEdits(sheetEdits, scenarioEditsById));
  writeEdits(FILES.jobs, jobEditsById);
  return { edits, scenarioEditsById, jobEditsById };
}

/** Fetches the edits, writes their files and lists the edits that need review. */
async function main() {
  const reply = await sendRequest({ action: 'edits' });
  if (!reply.ok) {
    console.error(`The backend refused: ${reply.error}. Is backend/Code.gs redeployed?`);
    process.exit(1);
  }
  const { edits, scenarioEditsById, jobEditsById } = writeAllEdits(reply.edits || {});
  const reviews = cleanReviews(reply.edits || {});
  const comments = allComments(reply.edits || {}, isGuidelineId);
  writeReviews(reviews, comments, scenarioEditsById);
  console.log(
    `${reviews.length} scenario reviews and ${comments.length} editors' comments written.`,
  );
  const toReview = editsToReview(edits, scenarioEditsById);
  const count = Object.keys(edits).length + Object.keys(scenarioEditsById).length;
  console.log(`${count} edits written; ${toReview.length} need review.`);
  toReview.forEach((id) => console.log(`  needs review: ${id}`));

  const approved = await sendRequest({ action: 'approved-scenarios' });
  if (!approved.ok) {
    console.error(`The backend refused approved jobs: ${approved.error}. Is it redeployed?`);
    process.exit(1);
  }
  const photos = photosToPublish(approved.submissions || [], scenarioEditsById, jobEditsById);
  console.log(`${Object.keys(jobEditsById).length} anonymised jobs written.`);
  writePhotos(photos);
  console.log(`${photos.length} photos of approved jobs written.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
