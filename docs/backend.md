# Backend, demo and sign-up

## Backend

A small Apps Script program attached to the Google Sheet. The app sends it the passcode and any
edits; it checks the passcode against the `Trackers` tab, reads or writes the
`Data` tab, and sends back this tracker's entries. For the manager view it also keeps the
`History` tab and answers "stats" requests from the `Managers` and `Assignments` tabs. For the
editor page it reads and writes the `Edits` tab for passcodes in the `Editors` tab, and gives
the edits to the daily copy ("edits", no passcode: they are published anyway).

- Update it: Sheet, Extensions, Apps Script, paste `backend/Code.gs`, run `setup` if the
  version adds tabs, then Deploy, Manage deployments, edit, New version. The address stays the
  same. Needs the V8 runtime. Every step is spelt out under "Manager view".
- A "stats" request reads the `Data` and `History` tabs whole and sends all of the viewer's
  History lines; the page does the sums. `History` grows by one line per status change or quiz
  play.
- Passcodes are plain text in the Sheet, so keep its sharing limited. Mentors were removed on
  18 Nov 2026: an old `Mentors` tab is no longer read and can be deleted.
- The passcode is also kept in the phone's browser and the backend address is in the page.
  Anyone with a tracker passcode can read and change that tracker, so keep passcodes long.
- Every request reads the whole `Data` tab. Revisit that (for example one tab per tracker) at
  about 20,000 rows, roughly 40 full trackers, or when a sync takes more than 3 seconds.

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
- **Switching it on:** paste `backend/Code.gs` into Apps Script, press Run on `setup` once so
  Google asks for the new permission ("Send email as you"), allow it, then Deploy, Manage
  deployments, the pencil, Version: New version, Deploy. Opening the backend address should
  say "version without mentors (18 Nov 2026)" (or a later version, such as "version with
  scenario runs (19 Nov 2026)"). Check there is a `Trackers` row
  labelled `demo`.
