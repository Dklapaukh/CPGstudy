# Scenario design and variations (design, not built)

Status: decided 26 Nov 2026 (SC-N to SC-U below) after the owner's review of all 40 scenarios
(`content/scenario-reviews.yaml`) and a look at how other fields train decision-making with
scenarios. It replaces the rule-based generator planned in SC-K. Built so far: the three levels
(shown as "Presentation", stored as `complexity`), the openings and "give if asked" facts, the
variation cards, the competency ratings and the benchmark and "move on" sets (steps 1 to 6
below). Not built: level suggestions (SC-T). Decision points were dropped.

## What a scenario is for

A scenario is a **prompt for a mentor**, not a script (owner, review of `svt-lambton-quay`). The
mentor matches it to their learner. So the app gives a reviewed starting point and short
prompts for changing it; it never shows a learner something no editor has checked.

## Scenario levels (replaces Straightforward / Common / Complex)

| Level | What it trains                                                    | Name                          |
| ----- | ----------------------------------------------------------------- | ----------------------------- |
| 1     | Structured assessment; problem representation and illness scripts | Common presentation           |
| 2     | Diagnostic uncertainty: X **or** Y (look-alikes)                  | Undifferentiated presentation |
| 3     | Diagnostic complexity: X **and** Y                                | Complex or atypical           |

Level 3 climbs a ladder of how the two problems relate (after Piette and Kerr's concordant and
discordant conditions):

1. **Unrelated**, including a clinically dominant problem that eclipses the other (asthma and a
   fracture; STEMI with a minor cut)
2. **Complementary**: one treatment helps both (asthma and anaphylaxis)
3. **Overlapping**: they meet at one decision (COPD, chest infection and CHF at CPAP)
4. **Contradictory**: treating one harms the other (STEMI or stroke with external haemorrhage);
   single-condition CPGs give least help here (Boyd 2005)

Atypical presentations (a silent MI) are really level 2 problems; editors may file them there.

**Severity** and **scene load** are separate tags. A variation raises severity _or_ the level,
not both at once: stress cuts working memory and decision-making (LeBlanc 2009).

## The stages are what the mentor rates, not separate kinds of scenario (SC-O)

Assessment and reasoning can't be separated in practice, so every scenario is run whole at
every level (4C/ID: whole-task practice, support fading). The learner's level sets what the
mentor expects them to do **unaided**: at Student, a structured assessment and a one-line
problem representation; then differentials and look-alikes; then holding two problems at once.

## Openings (SC-P)

One short, neutral opening: **sentence 1 is the call notes, sentence 2 the history** the mentor
can give or let the learner find out (owner, review of `rash-in-the-hostel`). Everything that
would give the answer away moves to **mentor notes, "give if asked"**, with a line on how freely
to give it by level: freely for a student, only when asked precisely for an ICP (expertise
reversal effect, Kalyuga). Lower levels may get clearer symptoms (`not-himself`).

## Ways to vary it: variation cards (SC-N)

Each reviewed scenario gets a short list of **variation cards**. A card is one or two lines for the
mentor, tagged with:

- **lever**: Uncertainty, Complexity, Severity, Deterioration, Escalation (call ICP or consult),
  or Scene load;
- the **levels** it suits;
- for Complexity, its rung on the ladder above.

Examples from the review: "Uncertainty: the chest pain is a PE" (`chest-pain-lawns`); "Severity:
work of breathing rises despite oxygen, so CPAP is considered" (`copd-or-sepsis`); "Escalation:
the dislocation needs reduction; call ICP and go through the dissociation checklist"
(`netball-ankle`). The mentor picks one card, or none. A scenario plus a card is still reviewed
content, since both were checked.

The cards are drafted by Claude from the owner's review notes (`otherLevels`, notes and
comments) and reviewed on the editor page like any scenario change. Cards are the same data a
generator would need, so a generator can still be built on them later if variety runs short.

## Decision points (SC-Q): dropped

Planned as two or three "what an experienced paramedic notices, does and why" points per
scenario. Dropped (owner, 26 Nov 2026): scenarios are meant to be initial prompts, and the
variation cards and debrief already add enough content.

## Rating the same competencies every run (SC-R)

The debrief rates a fixed set of competencies in every run, in place of each scenario's own
outcomes, so scores compare across scenarios and can suggest the next level (aviation EBT
assesses competencies across scenarios, not single events). The set (agreed 26 Nov 2026):
structured assessment; problem representation; differentials; management to the CPG;
escalation and consultation; handover and communication. A scenario's intention still names what it
emphasises. The O-SCORE ratings (SC-F) stay as the scale. Built 26 Nov 2026 (see
[Scenarios](scenarios.md)): any competency may be left blank, and the debrief saves the
learner's level with the run, a few characters in the same saved entry (no extra backend
requests or rows), for the level suggestions later.

## Running high-severity scenarios (SC-S)

The debrief guide offers the mentor a choice for algorithm-heavy scenarios (arrest,
anaphylaxis, critical asthma): **pause, correct and restart** until fluent (rapid cycle deliberate
practice, Hunt 2014), or the usual PEARLS debrief at the end. No tag; the mentor's choice.

## Progression (SC-T)

Guided, not locked: mentors can pick any scenario. No automatic "next level" suggestion from
the ratings for now (owner, 26 Nov 2026); progression comes from the benchmark and "move on"
sets below. Some scenarios need earlier ones first (`bus-v-pedestrians` after a
multi-patient scenario such as `generator-garage`); these get a "Do first" note.

## Benchmark and "move on" sets (SC-L)

For each learner level, Claude drafts **5 scenarios**: a benchmark set to place a learner, and a
"move on" series, drawn from the levels ticked in the reviews. The presentation levels match
the grade (owner, 26 Nov 2026):

| Learner level        | Common | Undifferentiated | Complex |
| -------------------- | ------ | ---------------- | ------- |
| Student              | 5      |                  |         |
| Graduate paramedic   | 3      | 2                |         |
| Supervised paramedic | 2      | 3                |         |
| Paramedic            | 1      | 2                | 2       |
| ICP                  |        | 1                | 4       |

Built 26 Nov 2026 (`content/scenario-sets.js`, `src/scenarioSets.js`): a **Benchmark set**
dropdown on the Scenarios list shows one level's set in order, and a Benchmark sets section on
the editor page changes them ([Editor page](editor.md)). The owner approved Claude's draft:

| Learner level        | Set, in order                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Student              | netball-ankle, chest-pain-lawns, wheezy-at-school, hypo-building-site, stroke-breakfast          |
| Graduate paramedic   | cafe-anaphylaxis, croup-2am, seizure-coastlands, right-abdo-pain, copd-or-sepsis                 |
| Supervised paramedic | gym-collapse, generator-garage, not-himself, bus-stop-dizzy, bleeding-nine-weeks                 |
| Paramedic            | stemi-arrest-tawa, hot-toddler, rash-in-the-hostel, mums-pills, remutaka-motorbike               |
| ICP                  | in-the-cells, transmission-gully-crash, birth-in-the-bathroom, expressway-crash, after-the-party |

Each uses only scenarios ticked for its level, and no scenario is in two sets, so moving up
brings new ones. Only 3 Complex scenarios were ticked for ICP, so `after-the-party` gained ICP.
Two of ICP's are crashes, so that set leans to trauma until more Complex scenarios exist.

## Lessons from the review for writing content

- Check every medicine against what is carried (CPG medicines section): no codeine; fentanyl is
  used far more than morphine; tramadol rarely.
- Places must be in the catchment (Mākara Peak, Colonial Knob; not Ōtaki Forks); a helicopter
  is not sent that close in (Paekākāriki at the earliest).
- Follow the CPG's disposition, not hospital decisions (stroke: nearest stroke centre).
- Don't imply causes the evidence doesn't support (one missed apixaban dose).
- Vitals must match the intended severity (SpO₂ under 97% is not mild asthma).
- Children at lower levels are sick enough to transport; leaving one at home is a Paramedic
  decision.
- ICP may be split into phase 1 (practise new skills and drugs) and phase 2 (challenge
  thinking).
- Bank ideas for later: overdoses by medicine class with their symptoms and maximum doses
  (`mums-pills`); sedation contraindications (`after-the-party`).

## Suggested steps

1. ~~Rewrite the 7 scenarios marked Small changes and fix the in-line comments~~ (done 26 Nov
   2026, with new openings for those and the other commented scenarios).
2. ~~New openings and "give if asked" notes for all scenarios; re-tag levels 1 to 3~~ (done 26
   Nov 2026; Claude's tags, for editors to check: 23 at level 1, 9 at 2, 8 at 3).
3. ~~Variation cards drafted from the review notes~~ (done 26 Nov 2026: 109 cards on all 40,
   for editors to review and change on the editor page).
4. ~~Show cards on the scenario screen ("Ways to vary it", folded, for the mentor)~~ (done).
5. ~~Competency ratings in the debrief (SC-R)~~ (done 26 Nov 2026).
6. ~~Benchmark and "move on" sets, 5 per learner level (SC-L, table above)~~ (done 26 Nov 2026).
7. ~~Decision points~~ (dropped 26 Nov 2026).

## Decisions

- SC-K (owner, 24 Nov 2026): a rule-based generator, no AI at run time. **Replaced by SC-N.**
- SC-N (owner, 26 Nov 2026): variation cards on reviewed scenarios instead of the generator.
  Everything a learner sees is reviewed; it uses the owner's review notes; a generator can
  still be built on the cards later. Rejected: the rule-based generator (unreviewed
  combinations; the review showed most errors were local knowledge that rules can't check).
- SC-O (owner, 26 Nov 2026): three levels as above (Straightforward dropped; Common presentation
  becomes level 1); the learner's stage sets what is rated, not which scenarios exist; clinically
  dominant problems count as Unrelated.
- SC-P (owner, 26 Nov 2026): one opening (call notes, then history) plus "give if asked" mentor
  notes. Rejected: staged layers; a separate opening per level.
- SC-Q (owner, 26 Nov 2026): decision points with an expert's view. **Dropped** the same day
  after seeing examples: too much content for what are meant to be initial prompts.
- SC-R (owner, 26 Nov 2026): a fixed set of competencies rated every run.
- SC-S (owner, 26 Nov 2026): pause-and-correct offered in the debrief guide, mentor's choice.
- SC-T (owner, 26 Nov 2026): guided progression, not locked. No suggestion of the next level
  from the ratings for now (rejected: a score rule; a rule per competency by learner level).
- SC-R built (owner, 26 Nov 2026): a competency may be left blank (rejected: all six required);
  the debrief asks the learner's level, starting on the last run's, saved with the run
  (rejected: a Settings field; not saving it).
- SC-L (owner, 26 Nov 2026): 5 scenarios per learner level, presentation levels as in the table
  above; Claude drafts, editors change them.
- SC-L built (owner, 26 Nov 2026): editors change the sets in their own Benchmark sets
  section, one ordered list per level (rejected: an "In the benchmark set for" field on each
  scenario); a separate Benchmark set dropdown on the list (rejected: the choices inside the
  Suits dropdown; a pill on the scenario screen too); ICP's fourth Complex is `after-the-party`,
  ICP ticked (rejected: `rest-home-gastro`; 3 Complex with `cant-talk-asthma`). More scenarios
  on the review's themes wait until staff can add jobs as scenarios in their own section.
- SC-U (owner, 26 Nov 2026): level 2 is named **Undifferentiated presentation** (the story fits
  more than one condition and the learner narrows it; pairs with "Common presentation").
  Rejected: "Look-alikes", "Differential diagnosis", "Uncertain diagnosis". One review per
  scenario (the owner's) is enough: the review is finished and scenario editing is back on
  (SC-M). The competency set in SC-R is agreed as drafted. The levels ticked in each review were
  copied into `content/scenarios.js`.
