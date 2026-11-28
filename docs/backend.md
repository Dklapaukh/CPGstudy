# Backend, demo and sign-up

## Backend

A small Apps Script program attached to the Google Sheet. The app sends it the passcode and any
edits; it checks the passcode against the `Trackers` tab, reads or writes the
`Data` tab, and sends back this tracker's entries. For the manager view it also keeps the
`History` tab and answers "stats" requests from the `Managers` and `Assignments` tabs. For the
editor page it reads and writes the `Edits` tab for passcodes in the `Editors` tab, and gives
the edits to the daily copy ("edits", no passcode: they are published anyway).

- A "stats" request reads the `Data` and `History` tabs whole and sends all of the viewer's
  History lines; the page does the sums. `History` grows by one line per status change or quiz
  play.
- Passcodes are plain text in the Sheet, so keep its sharing limited. Mentors were removed on
  18 Nov 2026: an old `Mentors` tab is no longer read and can be deleted.
- The passcode is also kept in the phone's browser and the backend address is in the page.
  Anyone with a tracker passcode can read and change that tracker, so keep passcodes long.
- Only writes (save, signup, scenario-submit and the editor's edit-save and submission-decide,
  `WRITE_ACTIONS`) wait for the script lock; reads run side by side.
- A save reads the `Data` tab once into a key-to-row map and writes in batches (one per run of
  neighbouring changed rows, one for new rows), then answers from that same read.
- `load` and `save` take an optional `since` (ms) and send back only entries with `t` after it.
  The app sends its newest `t` less an hour (`SYNC_SINCE_MARGIN_MS`), since times come from each
  phone's clock; the first sync after the app opens asks for everything.
- Every request still reads the whole `Data` tab. Revisit that (for example one tab per
  tracker) at about 20,000 rows, roughly 40 full trackers, or when a sync takes more than 3
  seconds.

## Redeploying the backend

Needed whenever `backend/Code.gs` changes (the changelog says "needs the backend redeployed").
No programming needed; allow 10 minutes. Needs the V8 runtime.

1. **Open the script.** Open the Google Sheet. In the menu choose Extensions, then Apps Script.
   A new browser tab opens showing a file called `Code.gs`.
2. **Paste the new code.** In another tab open
   <https://github.com/Dklapaukh/CPGstudy/blob/main/backend/Code.gs> and press the "Copy raw
   file" button (two overlapping squares, top right of the code). Go back to the Apps Script
   tab, click in the code, select all of it (Ctrl+A, or Cmd+A on a Mac), and paste (Ctrl+V or
   Cmd+V) so the new code replaces the old. Press the Save button (the disk picture).
3. **Run `setup`.** In the bar above the code is a small drop-down list of names; choose
   `setup`, then press Run. If Google asks for permission (for example "Send email as you" or
   Drive), press Review permissions, choose your account and press Allow. Wait for "Execution
   completed" at the bottom. `setup` adds any missing tabs (`Managers`, `Assignments`,
   `History`, `Editors`, `Edits`, `Submissions`) and, the first time, fills `History` from the
   dates already saved. Nothing in the old tabs is changed, and running it again does no harm.
4. **Redeploy at the same address.** Top right, press Deploy, then **Manage deployments** (not
   "New deployment": that would make a new address and the app would stop working). Press the
   pencil (Edit). Under Version choose **New version**. Press Deploy, then Done. The address
   stays the same, so nothing in the app needs changing.
5. **Check it worked:** open
   <https://script.google.com/macros/s/AKfycbxbWfT-QHIqOAYU2DykLE_rVss4ewVKoWLpKW6j-I_U9heUYyvJ-l71j4oVwduKS4zVVA/exec>
   in a browser. It must say "CPG tracker service is running, " followed by `BACKEND_VERSION`
   from `backend/Code.gs` (today "version with since and read-only requests unlocked (28 Nov 2026)").
   If it says only "CPG tracker service is running", or a page says "still running an older
   version of the backend", the address still runs the old code: in Manage deployments edit the
   deployment whose Web app URL is the address above, and choose New version.

## Demo and sign-up

- **First visit:** a phone that has never opened a real tracker starts
  on the tracker labelled `demo` (any case) in the `Trackers` tab, fetched with the backend's
  "demo" action. The passcode screen says "Enter code demo to take a look", so the `demo`
  row's passcode must be `demo` too. Its list has a banner with **Make an account** and **I already have a
  passcode**. With no signal, or no `demo` tracker, the passcode screen shows instead. Once a
  real tracker opens, the phone remembers it (`eas-cpg-signed-in-v1`) and never starts on the
  demo again. The demo is shared: anything anyone marks in it is seen by everyone.
- **Make an account** (on the demo banner and the passcode screen) asks for a name and the
  backend's "signup" action adds a `Trackers` row: label = the name, a new passcode, Created by
  "Signed up in the app". The passcode is shown with Copy and Start studying.
- **Email:** the backend emails the Google account that deployed it, subject "CPG study app:
  new account for …", for every sign-up. The email is sent first: if it fails, no account is
  made. To remove an account, delete its `Trackers` row.
- **Bot checks:** a box hidden off screen that people never see (filled in → refused), the form
  must have been open at least 3 seconds, and at most 20 sign-ups per hour across everyone
  (`SIGNUP_MAX_PER_HOUR` in `backend/Code.gs`). A name needs a letter and cannot be "demo".
  If bots get past these, the next step is a Cloudflare Turnstile check (free, needs a key).
- Needs a `Trackers` row labelled `demo` with passcode `demo`.

## Decisions

- Extra entries: everything saved beyond a guideline's status and notes is an extra entry in the
  Data sheet (list in the README), so the backend never changes for a new feature. Entry fields
  stay `s`, `n`, `t`; the saved-on-phone format stays `{c, l, s, p}`.
- C2: edit times more than 5 minutes ahead of the backend's clock are cut back
  (`MAX_CLOCK_AHEAD_MS`).
- C4 (owner): passcodes stay plain text in the Sheet (see plan 8.3 item 3).
- C5: revisit reading the whole Data tab at about 20,000 rows or a sync over 3 seconds.
- C6 (28 Nov 2026): the lock is taken only for writes; a save reads the Data tab once and
  batches its writes; `since` trims load and save replies. A phone whose clock is more than an
  hour behind may have its edits reach other phones only when they next open the app.
