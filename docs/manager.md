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

**Scenario runs need the 19 Nov 2026 backend.** Until `backend/Code.gs` is pasted in and
redeployed (step 4 below), the Scenarios sections stay empty. From then on every run is logged in
History with its score; runs saved earlier are taken from the tracker, which keeps the last 3
per scenario.

**What a manager can never see.** The page is sent numbers only: statuses, scores, counts and
dates. Notes, comments and tracker passcodes never leave the Sheet through the manager view.

**Quiz plays are counted from launch only.** Before the manager view, the app kept just the
best and the most recent score of each guideline quiz, so "Plays counted" starts from the day
step 4 below was done. Older dates in the charts come from the saved marked dates and those two
scores.

**Switching it on (once), step by step.** No programming needed; allow 10 minutes.

1. **Open the script.** Open the Google Sheet. In the menu choose Extensions, then Apps Script.
   A new browser tab opens showing a file called `Code.gs`.
2. **Paste the new code.** In another tab open
   <https://github.com/Dklapaukh/CPGstudy/blob/main/backend/Code.gs> and press the "Copy raw
   file" button (two overlapping squares, top right of the code). Go back to the Apps Script
   tab, click in the code, select all of it (Ctrl+A, or Cmd+A on a Mac), and paste (Ctrl+V or
   Cmd+V) so the new code replaces the old. Press the Save button (the disk picture).
3. **Run `setup`.** In the bar above the code is a small drop-down list of names; choose
   `setup`, then press Run. If Google asks for permission, press Review permissions, choose your
   account and press Allow. Wait for "Execution completed" at the bottom. The Sheet now has
   three new tabs, `Managers`, `Assignments` and `History`, and `History` has been filled from
   the dates already saved. Nothing in the old tabs is changed, and running `setup` again does
   no harm.
4. **Redeploy at the same address.** Top right, press Deploy, then **Manage deployments** (not
   "New deployment": that would make a new address and the app would stop working). Press the
   pencil (Edit). Under Version choose **New version**. Press Deploy, then Done. The address
   stays the same, so nothing in the app needs changing.
   **Check it worked:** open
   <https://script.google.com/macros/s/AKfycbxbWfT-QHIqOAYU2DykLE_rVss4ewVKoWLpKW6j-I_U9heUYyvJ-l71j4oVwduKS4zVVA/exec>
   in a browser. It must say "CPG tracker service is running, version with the manager view
   (16 Nov 2026)". If it says only "CPG tracker service is running", the app's address still
   runs the old code: in Manage deployments make sure you edit the deployment whose Web app URL
   is the address above, and choose New version. If the manager page says "still running an
   older version of the backend", the same applies.
5. **Fill the `Managers` tab.** One line per manager: their name in column A, a passcode you
   make up in column B. Make it long (four or more words), different from every other
   passcode, and send it to that manager privately.
6. **Fill the `Assignments` tab.** One line for each person a manager should see:
   column A is the manager's name exactly as written in the `Managers` tab,
   column B is the tracker's label exactly as written in column A of the `Trackers` tab (for
   example `Sam - 2026`). Capital letters do not matter; spelling does. A viewer who should
   see five people has five lines. To stop someone seeing a tracker, delete the line. If two
   trackers have the same label, the viewer sees both.
7. **Open the manager page**, <https://dklapaukh.github.io/CPGstudy/manager.html>, and sign in
   with a manager passcode. Changes to the two tabs show after pressing Refresh.

Leave the `History` tab alone: the backend adds a line each time a guideline's status changes
or a guideline quiz is finished (tracker passcode, entry, value, time; "back-fill" marks the
lines made in step 3). It never holds notes.
