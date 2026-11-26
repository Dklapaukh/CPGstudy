/*
 * Anonymised jobs (Quiz > Anonymised jobs, AJ-A to AJ-H in docs/anonymised-jobs.md): jobs staff
 * sent with the Add a scenario form, approved by an editor, kept as a library of interesting
 * jobs and lessons learnt that mentors use as ideas for scenarios. Pure logic: takes edits and
 * text and returns new values; touches no page, storage or network.
 * Tested in tests/anonymisedJobs.test.js.
 *
 * An approved job is saved in the Sheet's Edits tab, beside the scenario edits, under
 * `job|<job id>`, so it needs no backend change:
 *   { kind: 'anonymised-job', approved: 'YYYY-MM-DD', job: <the job as a scenario>,
 *     lessons: [lines], links: [{ title, url }] }
 * The job has the shape of a scenario (scenarioSubmission.js, scenarioFromSubmission), so the
 * scenario markup draws it. The daily copy writes these to content/anonymised-jobs.js.
 * Depends on scenarioEdits.js and scenarioLogic.js.
 */
import { cleanAddedScenario } from './scenarioEdits.js';
import { scenarioThemes } from './scenarioLogic.js';

export const JOB_EDIT_PREFIX = 'job|';
export const JOB_EDIT_KIND = 'anonymised-job';
// Limits on what a reviewer types, so one job stays well under the Edits tab's cell size.
export const MAX_LESSONS = 12;
export const MAX_LESSON_TEXT = 400;
export const MAX_LINKS = 8;
export const MAX_LINK_TITLE = 120;
export const MAX_LINK_URL = 500;
// What the form puts in a job's empty intention and outcomes; it is not a lesson.
const NOT_GIVEN = 'Not given';
// A job id as the backend makes them ("job-mabc123-x1y2"), safe in an address and a file name.
const JOB_ID_PATTERN = /^job-[a-z0-9-]{1,60}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The Edits tab id of a job's entry. */
export const jobEditId = (jobId) => `${JOB_EDIT_PREFIX}${jobId}`;

/** The job id of an entry's edit id, or '' when the id is not a job's. */
export const jobIdOfEdit = (editId) =>
  String(editId).startsWith(JOB_EDIT_PREFIX) ? String(editId).slice(JOB_EDIT_PREFIX.length) : '';

/** True for a job id the app can put in an address. */
export const isJobId = (id) => JOB_ID_PATTERN.test(String(id));

/** The text trimmed with runs of spaces made one, cut to `max` characters. */
const tidy = (text, max) =>
  String(text ?? '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);

/** The lessons as clean lines: no empty ones, each cut short, at most MAX_LESSONS. */
const tidyLessons = (lines) =>
  (Array.isArray(lines) ? lines : [])
    .map((line) => tidy(line, MAX_LESSON_TEXT))
    .filter(Boolean)
    .slice(0, MAX_LESSONS);

/**
 * The lessons a job starts with (AJ-D): what the sender said it could teach, then its debrief
 * points. The reviewer changes them when approving and later.
 */
export function lessonsOfJob(job) {
  // Each line of the learning points is its own lesson.
  const lines = [...String(job.intention || '').split('\n'), ...(job.outcomes || [])];
  return tidyLessons(lines.filter((line) => line && line !== NOT_GIVEN));
}

/** Reads the Lessons learnt box, one lesson per line: { value: lines } or { error }. */
export function readLessonsBox(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length > MAX_LESSONS) return { error: `Keep it to ${MAX_LESSONS} lessons.` };
  const long = lines.find((line) => line.length > MAX_LESSON_TEXT);
  if (long) return { error: `Keep each lesson under ${MAX_LESSON_TEXT} characters.` };
  return { value: lines };
}

/** True for an https address with a host, the only kind a link may have (AJ-F). */
export function isSafeUrl(url) {
  try {
    const address = new URL(url);
    return address.protocol === 'https:' && Boolean(address.hostname);
  } catch {
    return false; // not an address at all
  }
}

/** A link tidied ({ title, url }), or null when its address is not https. */
function cleanLink(link) {
  const url = tidy(link?.url, MAX_LINK_URL);
  if (!isSafeUrl(url)) return null;
  return { title: tidy(link.title, MAX_LINK_TITLE) || new URL(url).hostname, url };
}

/**
 * Reads the Recordings and links box: one link per line, "Title | https://…" or just the
 * address (its site is then the title). Returns { value: [{ title, url }] } or { error }.
 */
export function readLinksBox(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > MAX_LINKS) return { error: `Keep it to ${MAX_LINKS} links.` };
  const links = [];
  for (const line of lines) {
    const bar = line.lastIndexOf('|');
    const link = bar < 0 ? { url: line } : { title: line.slice(0, bar), url: line.slice(bar + 1) };
    const clean = cleanLink(link);
    if (!clean) return { error: `“${line.slice(0, 60)}” needs an address starting https://.` };
    links.push(clean);
  }
  return { value: links };
}

/** The links as the box shows them, one "Title | address" per line. */
export const linksBoxText = (links) =>
  (links || []).map((link) => `${link.title} | ${link.url}`).join('\n');

/** Today's date as "YYYY-MM-DD" (the approved date), from a Date. */
export const dateKey = (date) => date.toISOString().slice(0, 10);

/**
 * A job's entry from its parts, checked: the job must be a whole scenario (as the editor's form
 * makes it) with its id set to the job's, and every link https. Null when anything is wrong.
 */
export function cleanJobEntry(entry, jobId, isGuidelineId) {
  if (entry?.kind !== JOB_EDIT_KIND || !isJobId(jobId)) return null;
  const job = cleanAddedScenario(entry.job, jobId, isGuidelineId);
  if (!job || !DATE_PATTERN.test(String(entry.approved))) return null;
  const links = (Array.isArray(entry.links) ? entry.links : []).slice(0, MAX_LINKS).map(cleanLink);
  if (links.includes(null)) return null;
  return {
    kind: JOB_EDIT_KIND,
    approved: entry.approved,
    job,
    lessons: tidyLessons(entry.lessons),
    links,
  };
}

/** A new entry for a job approved today: its lessons come from the job (lessonsOfJob). */
export const newJobEntry = (job, today) => ({
  kind: JOB_EDIT_KIND,
  approved: dateKey(today),
  job,
  lessons: lessonsOfJob(job),
  links: [],
});

/** The entry with its lessons and links changed. */
export const jobEntryWith = (entry, lessons, links) => ({ ...entry, lessons, links });

/**
 * The jobs to show, newest approved first (then by title): each is the job with `approved`,
 * `lessons` and `links`. Only entries of the right kind with a job are kept.
 */
export function liveJobs(edits) {
  return Object.keys(edits)
    .filter((id) => jobIdOfEdit(id) && edits[id]?.kind === JOB_EDIT_KIND && edits[id].job)
    .map((id) => {
      const { job, approved, lessons, links } = edits[id];
      return { ...job, approved, lessons: lessons || [], links: links || [] };
    })
    .sort(
      (first, second) =>
        second.approved.localeCompare(first.approved) || first.title.localeCompare(second.title),
    );
}

/** The jobs with this theme ('' = any), as scenarioThemes works it out from their guidelines. */
export const filterJobs = (jobs, theme, sectionOf) =>
  jobs.filter((job) => !theme || scenarioThemes(job, sectionOf).includes(theme));
