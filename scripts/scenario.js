/*
 * Prints one scenario as learners see it (editors' changes applied), with its guidelines named
 * and its editors' reviews beside it, so a session can work on one scenario without reading
 * content/scenarios.js and content/scenario-reviews.yaml whole. Changes nothing. Depends on the
 * content files, src/scenarioEdits.js, scripts/lookupText.js and the yaml package.
 *
 * Usage (npm run scenario -- …):
 *   <id>      one scenario and its reviews, e.g. netball-ankle
 *   --list    every scenario: id, complexity, load, number of reviews, title
 */
import { readFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { scenarios } from '../content/scenarios.js';
import { scenarioEdits } from '../content/scenario-edits.js';
import { guidelineData } from '../content/guidelines.js';
import { liveScenarios } from '../src/scenarioEdits.js';
import { plainText } from '../src/quizDoses.js';
import { allGuidelines, scenarioListLine, scenarioReport } from './lookupText.js';

const REVIEWS_FILE = new URL('../content/scenario-reviews.yaml', import.meta.url);
const USAGE = 'Usage: npm run scenario -- <id> | --list';

const live = liveScenarios(scenarios, scenarioEdits);
const reviewEntries = parse(readFileSync(REVIEWS_FILE, 'utf8')).scenarios || [];
const reviewOf = (id) => reviewEntries.find((entry) => entry.id === id);

const guidelineById = new Map(allGuidelines(guidelineData).map((item) => [item.id, item]));

/** A guideline id as "9.4 Title", or the id itself when it is not in the content. */
function guidelineName(id) {
  const item = guidelineById.get(id);
  return item ? `${item.n} ${plainText(item.t)}` : id;
}

/** What to print for the given command-line arguments. */
function output(args) {
  if (args.includes('--list')) {
    return live.map((scenario) => scenarioListLine(scenario, reviewOf(scenario.id))).join('\n');
  }
  if (!args[0]) return USAGE;
  const scenario = live.find((item) => item.id === args[0]);
  if (!scenario) return `No scenario ${args[0]}. Try --list.`;
  return stringify(scenarioReport(scenario, reviewOf(scenario.id), guidelineName));
}

console.log(output(process.argv.slice(2)));
