# Manager view

A separate page for managers: <https://dklapaukh.github.io/CPGstudy/manager.html>.
It uses the same guideline data and backend as the study app and is published the same way.

**What it shows**

- Sign in with a manager passcode (Managers tab). The passcode is kept until the browser tab is
  closed.
- **Team table**, one line per person: guidelines incomplete, for review and complete; guideline
  quizzes done; scenarios run and their average latest score; last active (the last time
  anything was saved on the tracker).
- **Person page** (tap a name): guidelines overall and by section; each guideline quiz played
  with its most recent and highest score and their dates; Medicines on their own (statuses,
  flashcards learnt and due today); Scenarios; general numbers; charts.
- **Scenarios** (team and person pages): scenarios run, runs recorded, the average first and
  latest scores and how many scenarios went up or down since their first run; the same by
  complexity and scene load; the guidelines most often ticked as struggled. A person page also
  lists each scenario run with its runs, first, latest and change in score, last run date and
  the guidelines struggled with in the latest run. Debrief notes are never sent.
- **Over time**: a From and To date and three charts by week, guidelines marked complete, the
  average guideline quiz score and the average scenario score. On the team page they cover everyone; on a person page, that
  person. "Show these numbers as a table" is under the charts.
- Guideline counts leave out the Medicines section, because it has its own part of the page.
- A manager sees only the trackers assigned to them in the `Assignments` tab. Self sign-ups
  are not assigned to anyone until you add a line there.

**Scenario runs need the 19 Nov 2026 backend.** Until it is redeployed
([Backend](backend.md#redeploying-the-backend)), the Scenarios sections stay empty. From then on every run is logged in
History with its score; runs saved earlier are taken from the tracker, which keeps the last 3
per scenario.

**What a manager can never see.** The page is sent numbers only: statuses, scores, counts and
dates. Notes, comments and tracker passcodes never leave the Sheet through the manager view.

**Quiz plays are counted from launch only.** Before the manager view, the app kept just the
best and the most recent score of each guideline quiz, so "Plays counted" starts from the day
the manager view was switched on (16 Nov 2026). Older dates in the charts come from the saved marked dates and those two
scores.

**Switching it on (once).**

1. Redeploy the backend: [Backend, "Redeploying the backend"](backend.md#redeploying-the-backend).
   `setup` adds the `Managers`, `Assignments` and `History` tabs and fills `History` from the
   dates already saved.
2. **Fill the `Managers` tab.** One line per manager: their name in column A, a passcode you
   make up in column B. Make it long (four or more words), different from every other
   passcode, and send it to that manager privately.
3. **Fill the `Assignments` tab.** One line for each person a manager should see:
   column A is the manager's name exactly as written in the `Managers` tab,
   column B is the tracker's label exactly as written in column A of the `Trackers` tab (for
   example `Sam - 2026`). Capital letters do not matter; spelling does. A viewer who should
   see five people has five lines. To stop someone seeing a tracker, delete the line. If two
   trackers have the same label, the viewer sees both.
4. **Open the manager page**, <https://dklapaukh.github.io/CPGstudy/manager.html>, and sign in
   with a manager passcode. Changes to the two tabs show after pressing Refresh.

Leave the `History` tab alone: the backend adds a line each time a guideline's status changes
or a guideline quiz is finished (tracker passcode, entry, value, time; "back-fill" marks the
lines `setup` made). It never holds notes.

## Decisions

Owner, 16 Nov 2026 (MV-A to MV-C; letters prefixed because D to Z were taken):

- MV-A: a second page, `manager.html`, in the same repository, reusing section data, tests and
  publishing.
- MV-B: the admin assigns people in the Assignments tab; no admin screen.
- MV-C: withdrawn 18 Nov 2026 with the mentors (self sign-up replaced them).
- Backend: History rows on status changes and quiz scores only, never notes; "stats" returns
  numbers only.

Claude's choices, 16 Nov 2026 (say if any should change):

- MV-D: History names a tracker by passcode (labels repeat); fifth column Source = "back-fill"
  so those rows are left out of attempt counts.
- MV-E: back-fill runs once: per `marked-` date the status then, per quiz its best and latest.
- MV-F: Medicines left out of guideline counts; "learnt" = interval ≥ 1 day, "due" = today or
  earlier.
- MV-G: manager passcode in sessionStorage only; Assignments labels match ignoring capitals.
- MV-H: `src/manager/` is not in `version.json`, so phones don't download it.
- MV-I: "stats" sends every History row and the page does the sums; revisit with C5.
- SC-G (19 Nov 2026): scenario trends are first rated run against latest rated run, plus a
  weekly average and the most-struggled guidelines; debrief texts never sent; each run adds a
  History row; no back-fill for scenarios.
