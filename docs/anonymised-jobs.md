# Anonymised jobs

Quiz > **Anonymised jobs**, the sixth Quiz button, opens the SharePoint page where real jobs
staff went to are kept, anonymised: interesting jobs and the lessons learnt from them, for
mentors to use as ideas for scenarios. Under the Quiz buttons, **Add a job you went to** opens
the work form staff send a job with. Both open in a new tab (`target="_blank"`,
`rel="noopener noreferrer"`).

**The app holds no job data** (AJ-L, 28 Nov 2026). Nothing about a job is sent to, kept in or
published by the app, the backend, the Sheet, Drive or this repository. Checking a job,
anonymising it, writing its lessons and linking any recording all happen on the SharePoint
page and the work form, under the organisation's own sign-in and sharing.

## The addresses

Both are named constants in `src/constants.js`:

- `ANONYMISED_JOBS_URL`: the SharePoint page;
- `ADD_JOB_FORM_URL`: the work form.

They are **placeholders** until the owner gives the real addresses (plan 8.4). Changing one is a
one-line change; `tests/app.test.js` checks each is an https link that opens in a new tab.

## Decisions

- AJ-L (owner, 28 Nov 2026), Option C: the app holds no job data. The Anonymised jobs button
  opens an external SharePoint page and the Add a job link an external work form. Removed: the
  Add a job form (`submit.html`), the in-app list and job screens (`#jobs`, `#job-<id>`), the
  editor page's "Submitted jobs to check" and Anonymised jobs sections, the backend's
  `scenario-submit`, `submission-photo`, `submission-decide` and `approved-scenarios` actions
  and its Drive job folders and Docs, the daily copy of approved jobs and their photos, and
  `content/anonymised-jobs.*`. Scenario photos went too, since they only ever came from jobs;
  later vitals, assessment, treatment and follow up stay as optional parts of a new scenario.
- AJ-M (Claude): "Add a job you went to" is a plain link across the Quiz choice, under the
  buttons, since the Anonymised jobs button now leaves the app and there is no list screen to
  hold it. Old `#jobs` addresses show the guideline list.
- Superseded by AJ-L: AJ (26 Nov 2026, the in-app library), AJ-A to AJ-I (approval on the
  editor page, the job layout, lessons and links, the theme dropdown, `job|<id>` edits), AJ-J
  (the form's boxes) and AJ-K (a Drive subfolder and Google Doc per job). Their detail is in
  git history (this file before 28 Nov 2026).
- Clean-up for the owner (by hand, optional): the Sheet's `Submissions` tab, the "CPG scenario
  submissions" Drive folder and any `job|…` rows in the `Edits` tab are no longer read and can
  be deleted, once anything worth keeping has been moved to SharePoint.
