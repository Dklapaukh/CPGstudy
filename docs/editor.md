# Editor page

A page for editors to change the quiz questions:
<https://dklapaukh.github.io/CPGstudy/editor.html>. Questions are still built from the
guidelines by the same code as the app; an edit replaces only what an editor changed. Each
question is shown as learners see it once they answer it right, drawn by the quiz screens' own
markup (`src/views/quizMarkup.js`): a card turned over, a round marked, or the choices with the
right one ticked. Random wrong answers are one example, the same each time the page is opened.

**What an editor can do.** Sign in with an editor passcode (Editors tab) and find a guideline:
its questions are stacked as learners see them. Tap any text (a question, an answer, a choice,
an ordering card, a situation) to change just that text in a box drawn in its place; emptying a
step or wrong answer takes it out, and changing a random wrong answer keeps the others shown.
"Edit all" opens the whole form. For each question (Medicines quiz cards and every guideline
quiz question) an editor can:

- change the question and the right answer (a card's answer: "- " starts a bullet, two spaces
  before it indent it);
- choose the wrong answers (empty means chosen at random each time, as before);
- change an ordering round's steps;
- leave a question out of the quiz;
- undo an edit.

**Scenarios.** The first screen has a Scenarios section. A scenario (`#s-<id>`) is drawn by
the app's own markup (`src/views/scenarioMarkup.js`) with its edits. Tap any value (title,
suburb, story, level, a patient's label or background, a vital, the intention, the guidelines
as CPG numbers) to change it in place. "Leave this scenario out of the app" hides it, and "Undo
all edits" removes the edit. A scenario edit is saved in the same `Edits` tab under
`scenario|<id>` and keeps what each value said when it was edited. When `content/scenarios.js`
later changes that value, the scenario is listed under "Needs review".
**Paused for now (SC-M):** while `SCENARIO_EDITING_ENABLED` in `src/constants.js` is `false`,
scenarios are shown read-only with their Review card and comments; none of the changes in this
and the next paragraph, nor approving a job, can be made.

**Reviewing scenarios.** On the editor page every part of a scenario is shown open, the
intention with its intended outcomes as "Intention and debrief points". Each part has a 💬
Comment button with that part's questions; under the scenario a Review card grades it, sets the
levels it suits and ends with short summary questions, one per level. Reviews and comments are
saved under the editor's name, aiming for 3 editors per scenario; the first screen counts how
many you have reviewed and opens the next. See
[Scenarios](scenarios.md), "Reviewing scenarios".

**New and deleted scenarios.** "+ New scenario" at the top of the Scenarios section opens one
form (`#new-scenario`): title, suburb, story, intention, complexity, scene load, intended
outcomes (one per line), guidelines (CPG numbers) and one or more patients (up to 4), each with
a label, background and all eight vitals. Every box is needed; several patients need the
"several" scene load and a label each. Saving checks the whole scenario, gives it an id from its
title (`fall-at-the-marae`, with `-2` when taken) and saves it as `scenario|<id>` with the whole
scenario under `added`. It is then changed in place like any other (there is no file version to
review). "Delete this scenario" asks once more, then deletes it for good: a new scenario's edit
is removed; a scenario of `content/scenarios.js` gets `{ "kind": "scenario", "deleted": true }`,
which hides it from the app and the editor page with no undo (to hide one for now, leave it out
instead). The daily copy keeps a new scenario only when it is whole (the same rules as
`tests/scenarios.test.js`, which also checks the published ones). To remove a deleted scenario's
text from the repo too, delete it from `content/scenarios.js` by hand; its edit then does
nothing.

**When edits go live.** Saving writes the edit to the Sheet's `Edits` tab at once (one row per
question; the page marks it "Not in the app yet"). Every morning `edits-sync.yml` runs
`scripts/sync-edits.js`, which copies the tab into `content/card-edits.yaml` (the readable
record) and `content/card-edits.js` (what the app loads), and the scenario edits into
`content/scenario-edits.yaml` and `content/scenario-edits.js`, runs `npm run check` and pushes to
`main`. Phones get them on their next reload. To publish sooner, run "edits-sync" from the
Actions tab. The bot's commits have no `CHANGELOG.md` entry; the git history records them.

**After a guidelines update.** Questions with no edit simply follow the new guidelines. Each
edit keeps a copy of what its question said when it was edited; when an update changes that
(a different dose, step or wording) or removes the question, the edit is listed under "Needs
review" and shown three ways: when edited, what learners see now, and what the guideline now
gives. Until an editor chooses, learners keep the edit. "Keep the edit" accepts the new
guideline under it; "Use the guideline's version" removes it. Question ids leave out numbers, so
a changed dose keeps its edit for review instead of losing it. The daily copy also prints how
many edits need review.

**Switching it on (once).**

1. Redeploy the backend ([Backend, "Redeploying the backend"](backend.md#redeploying-the-backend));
   `setup` adds the `Editors` and `Edits` tabs.
2. **Fill the `Editors` tab:** a name in column A and a long passcode you make up in column B,
   one line per editor. Send each passcode privately.
3. Open the editor page and sign in. Leave the `Edits` tab alone: the page writes it.

## Decisions

- ED-A (owner, 17 Nov 2026): questions are built from the guidelines at run time; only edits
  are stored (`content/card-edits.yaml` and `.js`). AU-B: the YAML stays as the readable record.
- ED-B (owner): the page saves to the `Edits` tab; a daily workflow copies it to the repo.
  Rejected: the backend committing with a GitHub token; editors sending files to the owner.
  Local-only storage was also rejected (managers read the Sheet; Safari clears data after 7 days).
- ED-C (owner): editors change a question, its answers, an ordering round's steps, or leave it out.
- ED-D (Claude): review is per question; an edit whose question changed stays live until kept or
  dropped.
- ED-E (Claude): question ids leave out digits, so a changed dose keeps its edit for review.
- ED-F (owner, 17 Nov 2026): laid out like the study app; no longer loads `manager.css`.
- ED-G (owner, 17 Nov 2026): questions shown as learners see them, in the answered-right state;
  random wrong answers seeded by question id; markup shared via `src/views/quizMarkup.js`.
- ED-H (owner, 18 Nov 2026): tap any box to edit it in place; "Edit all" keeps the whole form
  (the only place to leave a question out); markup shared via an optional `editing` argument.
- SC-D (18 Nov 2026): scenarios are edited in place; edits go in `Edits` as `scenario|<id>`.
- SC-M (owner, 25 Nov 2026): scenario editing paused until the review is finished, behind one
  flag (`SCENARIO_EDITING_ENABLED`); the page blocks every scenario write. Re-enable: plan 8.4.
