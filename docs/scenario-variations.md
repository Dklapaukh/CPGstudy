# Scenario design and variations (design, not built)

Status: decided 26 Nov 2026 (SC-N to SC-T below) after the owner's review of all 40 scenarios
(`content/scenario-reviews.yaml`) and a look at how other fields train decision-making with
scenarios. It replaces the rule-based generator planned in SC-K. Nothing here is built yet.

## What a scenario is for

A scenario is a **prompt for a mentor**, not a script (owner, review of `svt-lambton-quay`). The
mentor matches it to their learner. So the app gives a reviewed starting point and short
prompts for changing it; it never shows a learner something no editor has checked.

## Scenario levels (replaces Straightforward / Common / Complex)

| Level | What it trains                                                    | Name                                                                 |
| ----- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | Structured assessment; problem representation and illness scripts | Common presentation                                                  |
| 2     | Diagnostic uncertainty: X **or** Y (look-alikes)                  | name to choose (plan 8.3); suggested "Undifferentiated presentation" |
| 3     | Diagnostic complexity: X **and** Y                                | Complex or atypical                                                  |

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

## Decision points (SC-Q)

Two or three **decision points** per scenario, each with "what an experienced paramedic
notices, does and why". They support a new mentor's debrief (the review flagged inexperienced
mentors several times) and could later let a learner practise alone and compare with the
expert view (ShadowBox, Klein and Hintze). Written first for the scenarios run most.

## Rating the same competencies every run (SC-R)

The debrief rates a fixed set of competencies in every run, in place of each scenario's own
outcomes, so scores compare across scenarios and can suggest the next level (aviation EBT
assesses competencies across scenarios, not single events). Draft set, to agree: structured
assessment; problem representation; differentials; management to the CPG; escalation and
consultation; handover and communication. A scenario's intention still names what it
emphasises. The O-SCORE ratings (SC-F) stay as the scale.

## Running high-severity scenarios (SC-S)

The debrief guide offers the mentor a choice for algorithm-heavy scenarios (arrest,
anaphylaxis, critical asthma): **pause, correct and restart** until fluent (rapid cycle deliberate
practice, Hunt 2014), or the usual PEARLS debrief at the end. No tag; the mentor's choice.

## Progression (SC-T)

Guided, not locked: the app suggests the next level from the competency ratings, and mentors can
pick any scenario. Some scenarios need earlier ones first (`bus-v-pedestrians` after a
multi-patient scenario such as `generator-garage`); these get a "Do first" note.

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

1. Rewrite the 7 scenarios marked Small changes and fix the in-line comments (content only).
2. New openings and "give if asked" notes for all scenarios; re-tag levels 1 to 3.
3. Variation cards drafted from the review notes; editors review them.
4. Show cards on the scenario screen ("Ways to vary it", folded, for the mentor).
5. Competency ratings in the debrief (SC-R), then level suggestions (SC-T, with SC-L).
6. Decision points, starting with the most-run scenarios.

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
- SC-Q (owner, 26 Nov 2026): decision points with an expert's view.
- SC-R (owner, 26 Nov 2026): a fixed set of competencies rated every run.
- SC-S (owner, 26 Nov 2026): pause-and-correct offered in the debrief guide, mentor's choice.
- SC-T (owner, 26 Nov 2026): guided progression, not locked.
