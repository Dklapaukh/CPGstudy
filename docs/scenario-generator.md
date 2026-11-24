# Scenario generator (design, not built)

Status: proposed 24 Nov 2026. The approach is open decision 4 in section 8.3 of the plan. This
page says how a generator could work **without AI on the phone**, so it can be built in steps.

## What it should do

Make a scenario for a chosen **level** (Student, Graduate, Supervised paramedic, Paramedic,
ICP), either:

- from **random** problems and guidelines, or
- from **problems and/or guidelines the mentor picks** (for example "chest pain" and CPG 3.2),
  or from the learner's **Guidelines to learn** list.

The result has the same shape as a written scenario (`content/scenarios.js`), so the scenario
screen, Finish and the debrief work unchanged.

## How the level changes a scenario

The owner's view (24 Nov 2026), which this design follows: mostly the **intention and debrief
points** change with the level; higher levels also get **more steps and actions**, more
**diagnostic complexity** and more **ambiguity**. Each level is a profile of dials:

| Dial                       | Student             | Grad               | Supervised / Paramedic   | ICP                                 |
| -------------------------- | ------------------- | ------------------ | ------------------------ | ----------------------------------- |
| Severity of the problem    | mild to moderate    | moderate           | moderate to severe       | severe, peri-arrest                 |
| Complicating factors       | 0                   | 0 to 1             | 1 to 2                   | 2 to 3                              |
| Look-alike (ambiguity)     | none: classic case  | rarely             | often                    | usually; sometimes two causes       |
| Deterioration              | none                | after a clear cue  | during care              | early, needs a quick change of plan |
| Patients and delegation    | one                 | one                | one or two, delegation   | several, leading a team             |
| Debrief points chosen from | structure, history, | applying the CPG,  | decisions, transport and | advanced care, leadership,          |
|                            | vitals, handover    | doses, reassessing | referral, delegation     | ambiguity, ethics                   |

Scope of practice is checked against CPG 1.1, which the app already reads for the medicines
quiz: a scenario never _expects_ a treatment above the level. When a problem needs one (an ICP
drug at Paramedic level), the debrief point becomes "recognises the need and calls for ICP
backup" instead.

## Building blocks (content, written once and reviewed)

1. **Problems** (`content/scenario-bank.js`, about 10 to start): each has its guidelines; an
   age and sex range; story openings; history, medicines and allergies that fit; vitals ranges
   per severity (with paediatric ranges by age); what happens after treatment and without it;
   red flags; **look-alikes** (problems that present the same way); and debrief points, each
   tagged with the levels it suits.
2. **Complicating factors**, each with the problems it can join: a medicine that changes the
   treatment (anticoagulant, PDE5 inhibitor before GTN), a second condition (COPD and oxygen
   targets, diabetes), consent and capacity, a language barrier or upset whānau, a long
   transport or no backup, night, a bystander's misleading history.
3. **Scene pieces**: suburbs (Wellington region, with which are rural), callers, times of day.
4. **Level profiles**: the dials above, as data.

## How one is made

1. A **seed** is chosen (or typed), so the same code always gives the same scenario and a
   mentor can share it ("CP-7F3K").
2. Problems: the ones picked, or random ones weighted toward the learner's Guidelines to learn
   and away from ones run recently. Two problems become one patient when they can combine (a
   fall from hypoglycaemia) or two patients otherwise.
3. The level profile sets severity, the number of complicating factors, whether a look-alike is
   used and the debrief points to pick.
4. Each part is filled from the bank within its ranges; rules check the result (vitals agree
   with the severity, medicines with the history, guidelines exist, treatments are in scope).
5. It is shown as **Generated, not reviewed**, with "Reroll patient", "Reroll story" and "Save
   to the bank" (which sends it to the editor page like a submitted job, to be reviewed).

## Learning from reviews

Generated scenarios are graded with the same Review card as written ones
(`content/scenario-reviews.yaml`). Problems and factors whose scenarios are often "Vitals don't
fit" or "Needs rewriting" are shown to the owner to fix, and can be weighted down until fixed.

## Suggested steps

1. Problems bank for 10 common presentations, with tests that every range and rule holds.
2. A "Generate" button on the Scenarios list: level and random only.
3. Picking problems or guidelines, and Guidelines to learn.
4. Complicating factors and look-alikes for the higher levels.
5. Save to the bank and review.
