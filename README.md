# NZCPG study app (EAS CPG Mentoring Tracker)

A phone-first web app: guidelines list, per-guideline status and notes, shared with a mentor
through a Google Sheet.

## Structure

| Path                                                | Purpose                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `index.html`                                        | Page shell. Loads the styles and `src/main.js`.                                 |
| `styles/app.css`                                    | All styles. Class names say what the element is.                                |
| `content/guidelines.js`                             | Guideline text as data, one guideline per line. Not edited by hand.             |
| `src/constants.js`                                  | Named constants: status codes, storage key, backend address, timings, messages. |
| `src/logic.js`, `src/comments.js`                   | Pure logic (merge, filters, comment lines). Tested.                             |
| `src/state.js`                                      | The one state object and saving it on the phone.                                |
| `src/api.js`, `src/sync.js`                         | Talking to the backend; queued edits and merging.                               |
| `src/views/`                                        | One file per screen: login, mentor, list, guideline.                            |
| `src/navigation.js`, `src/events.js`, `src/main.js` | Screen changes, all clicks and typing, start-up.                                |
| `backend/Code.gs`                                   | The Google Apps Script service (see "Backend").                                 |
| `tests/`                                            | `npm test`. Includes a simulated-browser run of the whole app.                  |

## Run, check and publish

- Needs a web server: ES modules do not load from a file opened directly. Locally: `npx serve .`.
- Publishing: GitHub Pages serving the `main` branch root. The address stays the same.
- `npm ci` once, then `npm run check` (formatting, error checking, tests). GitHub runs it on
  every push.

## Content

Guideline text is trusted content built into the app and is put on the page as markup.
If content is ever downloaded automatically (feature 6) it must be validated first.
The export date and source line shown on each guideline come from `content/guidelines.js`.

## Backend (what the Apps Script does)

A small program attached to the Google Sheet. The app sends it the passcode and any edits; it
checks the passcode against the `Mentors` and `Trackers` tabs, reads or writes the `Data` tab,
and sends back this tracker's entries. To update it: Sheet, Extensions, Apps Script, paste
`backend/Code.gs`, then Deploy, Manage deployments, edit, New version. The address stays the same.
Passcodes are stored as plain text in the Sheet, so keep its sharing limited and replace the
placeholder mentor passcode created by `setup()`. The passcode is also kept in the phone's
browser and the backend address is in the page; anyone with a tracker passcode can read and
change that tracker, so keep passcodes long and unguessable.

## Behaviour checklist (same result before and after any tidy-up)

Automated in `tests/app.test.js` unless marked "by hand".

- Sign in with a tracker passcode and a mentor passcode; a wrong passcode shows the message.
- Mentor creates a tracker and sees the new passcode; opens an existing tracker.
- List shows 14 sections and 180 guidelines with correct counts; sections stay as left (by hand).
- Filters (All, Incomplete, Needs review, Complete) and search.
- Opening a guideline shows all content; headings fold and unfold; previous and next (by hand).
- Changing status and notes saves, showing "Saving…" then "Saved".
- Two devices on one passcode show the same data after a sync (by hand).
- Offline: changes are kept and sent when signal returns (by hand).
- Comment button adds to the notes and highlights the point.
- Switch tracker and sign out.
