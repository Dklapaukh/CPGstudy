// Tests for Anonymised jobs: the pure logic (src/anonymisedJobs.js), the daily copy of approved
// jobs and their photos (scripts/sync-edits.js), the job's markup (views/scenarioMarkup.js) and
// the published file (content/anonymised-jobs.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  jobEditId,
  jobIdOfEdit,
  isJobId,
  lessonsOfJob,
  readLessonsBox,
  readLinksBox,
  linksBoxText,
  isSafeUrl,
  newJobEntry,
  jobEntryWith,
  cleanJobEntry,
  liveJobs,
  filterJobs,
  MAX_LESSONS,
  MAX_LINKS,
} from '../src/anonymisedJobs.js';
import { emptyPatient, scenarioFromSubmission } from '../src/scenarioSubmission.js';
import { guidelines, guidelineById } from '../src/guidelines.js';
import { cleanJobEdits, photosToPublish } from '../scripts/sync-edits.js';
import { jobBodyHtml } from '../src/views/scenarioMarkup.js';
import { anonymisedJobs } from '../content/anonymised-jobs.js';

const JOB_ID = 'job-mabc123-x1y2';
const realId = guidelines[0].id;
const isRealId = (id) => Boolean(guidelineById(id));
const sectionOf = (id) => guidelineById(id)?.sec;

/** A job as the editor page approves it (the shape of a scenario), with `changes` on top. */
const approvedJob = (changes = {}, photos = []) =>
  scenarioFromSubmission(
    {
      title: 'Chest pain',
      story: 'A 58-year-old man with chest pain.',
      complexity: 1,
      intention: 'Spot a STEMI',
      guidelines: [realId],
      outcomes: ['Does a 12-lead within 10 minutes'],
      patients: [emptyPatient()],
      ...changes,
    },
    JOB_ID,
    photos,
  );

test('edit ids: a job is saved under job|<id>; only safe job ids are kept', () => {
  assert.equal(jobEditId(JOB_ID), `job|${JOB_ID}`);
  assert.equal(jobIdOfEdit(`job|${JOB_ID}`), JOB_ID);
  assert.equal(jobIdOfEdit('scenario|long-lie'), '');
  assert.ok(isJobId(JOB_ID));
  assert.equal(isJobId('job-../x'), false);
  assert.equal(isJobId('long-lie'), false);
});

test('lessonsOfJob: what it could teach, then the debrief points; "Not given" is left out', () => {
  assert.deepEqual(lessonsOfJob(approvedJob()), [
    'Spot a STEMI',
    'Does a 12-lead within 10 minutes',
  ]);
  assert.deepEqual(lessonsOfJob(approvedJob({ intention: '' })), [
    'Does a 12-lead within 10 minutes',
  ]);
  assert.deepEqual(lessonsOfJob(approvedJob({ outcomes: ['Not given'] })), ['Spot a STEMI']);
});

test('readLessonsBox: one per line, bullets and blank lines dropped, limits checked', () => {
  assert.deepEqual(readLessonsBox('- One\n\n• Two \n'), { value: ['One', 'Two'] });
  assert.ok(
    readLessonsBox(
      Array(MAX_LESSONS + 1)
        .fill('x')
        .join('\n'),
    ).error,
  );
  assert.ok(readLessonsBox('x'.repeat(401)).error);
});

test('readLinksBox: "Title | address" or just the address; only https', () => {
  const read = readLinksBox(
    'Teaching session, 3 Dec | https://example.org/video\nhttps://drive.google.com/x',
  );
  assert.deepEqual(read.value, [
    { title: 'Teaching session, 3 Dec', url: 'https://example.org/video' },
    { title: 'drive.google.com', url: 'https://drive.google.com/x' },
  ]);
  assert.ok(readLinksBox('Bad | javascript:alert(1)').error);
  assert.ok(readLinksBox('http://example.org').error);
  assert.ok(
    readLinksBox(
      Array(MAX_LINKS + 1)
        .fill('https://a.nz')
        .join('\n'),
    ).error,
  );
  assert.equal(
    linksBoxText(read.value).split('\n')[0],
    read.value[0].title + ' | ' + read.value[0].url,
  );
  assert.deepEqual(readLinksBox(linksBoxText(read.value)).value, read.value);
  assert.equal(isSafeUrl('https://a.nz/x'), true);
  assert.equal(isSafeUrl('not an address'), false);
});

test('newJobEntry and cleanJobEntry: a whole job with its date, lessons and https links', () => {
  const entry = newJobEntry(approvedJob(), new Date('2026-11-26T03:00:00Z'));
  assert.equal(entry.approved, '2026-11-26');
  assert.deepEqual(entry.links, []);
  const clean = cleanJobEntry(entry, JOB_ID, isRealId);
  assert.equal(clean.job.id, JOB_ID);
  assert.deepEqual(clean.lessons, entry.lessons);
  assert.equal(cleanJobEntry(entry, 'bad id', isRealId), null);
  assert.equal(cleanJobEntry({ ...entry, approved: 'today' }, JOB_ID, isRealId), null);
  assert.equal(cleanJobEntry({ ...entry, kind: 'scenario' }, JOB_ID, isRealId), null);
  assert.equal(cleanJobEntry({ ...entry, job: { title: 'x' } }, JOB_ID, isRealId), null);
  const badLink = jobEntryWith(entry, [], [{ title: 'x', url: 'javascript:alert(1)' }]);
  assert.equal(cleanJobEntry(badLink, JOB_ID, isRealId), null);
});

test('cleanJobEdits: keeps only good job entries, by id; other edits are left alone', () => {
  const entry = newJobEntry(approvedJob(), new Date('2026-11-26T03:00:00Z'));
  const edits = {
    [`job|${JOB_ID}`]: entry,
    'job|job-bad-1': { kind: 'anonymised-job', approved: '2026-11-26', job: {} },
    'scenario|long-lie': { kind: 'scenario', fields: {} },
  };
  assert.deepEqual(Object.keys(cleanJobEdits(edits)), [`job|${JOB_ID}`]);
});

test('liveJobs and filterJobs: newest first, filtered by theme from the guidelines', () => {
  const older = newJobEntry(approvedJob({ title: 'Older' }), new Date('2026-11-20T03:00:00Z'));
  const newer = newJobEntry(approvedJob({ title: 'Newer' }), new Date('2026-11-26T03:00:00Z'));
  const jobs = liveJobs({
    'job|job-a': { ...older, job: { ...older.job, id: 'job-a' } },
    'job|job-b': { ...newer, job: { ...newer.job, id: 'job-b' } },
    'scenario|x': { kind: 'scenario', fields: {} },
  });
  assert.deepEqual(
    jobs.map((job) => job.title),
    ['Newer', 'Older'],
  );
  assert.deepEqual(jobs[0].links, []);
  assert.equal(filterJobs(jobs, '', sectionOf).length, 2);
  assert.equal(filterJobs(jobs, 'No such theme', sectionOf).length, 0);
});

test('photosToPublish: an anonymised job’s photos are published too', () => {
  const photos = [{ src: 'content/scenario-photos/job-mabc123-x1y2-1.jpg', caption: 'ECG' }];
  const entry = newJobEntry(approvedJob({}, photos), new Date());
  const submissions = [{ id: JOB_ID, photos: [{ data: 'QUJD' }, { data: 'AAAA' }] }];
  assert.deepEqual(photosToPublish(submissions, {}, { [`job|${JOB_ID}`]: entry }), [
    { name: 'job-mabc123-x1y2-1.jpg', data: 'QUJD' },
  ]);
});

test('jobBodyHtml: the job, then Lessons learnt and its links, all text escaped', () => {
  const entry = newJobEntry(approvedJob({ story: 'Pain <b>bad</b>' }), new Date());
  const job = {
    ...entry.job,
    approved: entry.approved,
    lessons: ['Think <PE>'],
    links: [{ title: 'Session "1"', url: 'https://example.org/a?b=1&c=2' }],
  };
  const html = jobBodyHtml(job, '26 Nov 2026');
  assert.ok(html.includes('Pain &lt;b&gt;bad&lt;/b&gt;'));
  assert.ok(html.includes('Think &lt;PE&gt;'));
  assert.ok(html.includes('href="https://example.org/a?b=1&amp;c=2"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.indexOf('Guidelines (') < html.indexOf('Lessons learnt'));
  assert.ok(html.indexOf('Lessons learnt') < html.indexOf('Recordings and links'));
  assert.ok(!jobBodyHtml({ ...job, links: [] }, '').includes('Recordings and links'));
});

test('the published anonymised jobs are whole, and every photo they show is in the repository', () => {
  Object.entries(anonymisedJobs).forEach(([id, entry]) => {
    assert.ok(cleanJobEntry(entry, jobIdOfEdit(id), isRealId), id);
    (entry.job.photos || []).forEach((photo) => assert.ok(existsSync(photo.src), photo.src));
  });
});
