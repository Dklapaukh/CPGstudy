# Anonymised jobs

Quiz > **Anonymised jobs** (`#jobs`), the sixth Quiz button, is a library of real jobs staff
went to, anonymised and checked by an editor: interesting jobs and the lessons learnt from them.
Mentors use them as ideas for scenarios; nothing is run, rated or saved here. It is separate
from the editor-written Scenarios (decision 26 Nov 2026).

## How a job gets there

1. **Staff send it** with the Add a job form (`submit.html`), linked at the top of the list. The
   form is described in [Scenarios](scenarios.md), "Add a job (the form)": no sign-in, an
   anonymity tick and warnings, photos re-saved without location data.
2. **An editor checks it** on the editor page under "Submitted jobs to check" (`#j-<id>`):
   **Edit and approve** (change anything first, or take a photo out), **Approve as it is**, or
   **Reject** (asks once more, deletes its photos). Approving saves the job to the Edits tab as
   `job|<job id>` (`src/anonymisedJobs.js`) and marks it Approved. It is not added to Scenarios.
3. **The daily copy** (`scripts/sync-edits.js`) checks each approved job and writes
   `content/anonymised-jobs.yaml` and `.js`, and publishes the photos it shows to
   `content/scenario-photos/`. Phones get it on their next reload.

A team presentation of a job is arranged outside the app; once it is recorded, its link is
added to the job.

## What a job shows

The list is newest first, each row with its title, suburb, presentation and the date it was
added, and a **Theme** dropdown (the scenario themes, worked out from the job's guidelines).
One job (`#job-<id>`) shows, all open (`jobBodyHtml` in `src/views/scenarioMarkup.js`):

- the job as sent: presentation and scene load, title, suburb and date, the history, each
  patient's vitals and background, "What happened next" (later vitals and the treatment and
  response), the photos and the guidelines (links into the app);
- **Lessons learnt**: a list. It starts as what the sender said it could teach and its debrief
  points (`lessonsOfJob`), so editing those in Edit and approve edits the lessons;
- **Recordings and links**, when there are any: each opens in a new tab.

## Changing a job (editors)

The editor page's first screen has an **Anonymised jobs** section once a job is approved. One
job (`#aj-<id>`) is shown as learners see it, with a card:

- **Lessons learnt**: one per line, at most 12 (`MAX_LESSONS`), each under 400 characters;
- **Recordings and links**: one per line, "Title | https://…" or just the address (its site is
  then the title), at most 8 (`MAX_LINKS`). Only https addresses are kept;
- **Save**, and **Remove from the app**, which asks once more and deletes the entry for good.

The app is public on GitHub Pages, so anyone with its address can see a job and its links. A
recording stays private only if it is shared that way where it is kept (Drive limited to the
organisation, an unlisted video).

## Decisions

- AJ (owner, 26 Nov 2026): staff jobs go in their own library, a sixth Quiz button "Anonymised
  jobs", for lessons learnt, interesting jobs and ideas for scenarios, with links to any
  recorded content. Replaces the earlier plan to add approved jobs as scenarios in their own
  section of the Scenarios list; the Add a job form stays.
- AJ-A (owner): approving adds a job to Anonymised jobs only, not to Scenarios; an editor can
  still write one up as a scenario with "+ New scenario". Rejected: a tick to also add it as a
  scenario; keeping the approve-as-scenario buttons beside a new one.
- AJ-B (owner): anyone on the Editors tab reviews, on the editor page. Rejected: the owner only.
- AJ-C (owner): a job shows the job as sent, then Lessons learnt, then Recordings and links.
  Rejected: a reviewer's summary with the job folded; lessons and links only.
- AJ-D (owner): the sender's "What could it teach" and debrief points start Lessons learnt; the
  reviewer changes them when approving and later. Rejected: written from scratch.
- AJ-E (owner): no presentation status in the app; presenting is arranged outside it and a
  recording link added when there is one. Rejected: a Not planned / Planned / Presented status,
  in the app or on the editor page only.
- AJ-F (owner): any number of links (at most 8), each with a title, https only, added on the
  editor page at any time. Rejected: one link per job.
- AJ-G (owner): newest first with the scenarios' theme dropdown. Rejected: grouped by theme;
  no filters.
- AJ-H (owner): the "Add a job you went to" link moves from the end of Scenarios to the top of
  Anonymised jobs; the form is now titled "Add a job".
- AJ-I (Claude): an approved job is saved as `job|<id>` in the Edits tab, beside the other
  edits, so no backend change was needed; approving a job no longer counts as a scenario change,
  so it works even while scenario editing is paused (SC-M).
- AJ-J (owner, 26 Nov 2026): the form drops presentation, scene load and debrief points (editors
  set them, so jobs can later become scenarios); History splits into Dispatch notes and History,
  plus Assessment; Teaching becomes Learning points; Send for checking becomes Send. A job with
  no outcomes gets "Not given", left out of Lessons learnt.
