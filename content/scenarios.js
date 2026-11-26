/*
 * Scenarios for mentors to run with students, grads and mentees (Quiz > Scenarios).
 * Hand-written. Each scenario is only an opening: the mentor runs and directs it from there.
 *
 * Fields:
 *   id         short unique name, used in the address (#scenario-<id>)
 *   complexity 1 to 3, how clinically hard it is (SCENARIO_COMPLEXITY in src/constants.js)
 *   load       'single', 'delegation' or 'several': the team and scene load (SCENARIO_LOADS);
 *              'several' exactly when there is more than one patient
 *   title, suburb (Wellington, Porirua, Kāpiti or Hutt Valley), story (SC-P: sentence 1 the call
 *              notes, sentence 2 the history the mentor can give or let the learner find out)
 *   giveIfAsked facts the learner finds out by asking, such as what would give the answer away;
 *              mentor only, optional (SC-P)
 *   levels     the levels it suits (SCENARIO_LEVELS), from the editors' reviews; optional
 *   rural      true for a rural scenario or one with a long transport (the Rural theme); optional
 *   intention  what the scenario practises and what to watch for
 *   outcomes   the intended outcomes, short and observable; the debrief rates each one
 *   guidelines guideline ids in the order they are shown (checked by tests/scenarios.test.js)
 *   patients   one or more { label (only when more than one), history, medications, allergies,
 *              social, vitals { gcs, rr, spo2, hr, bp, temp, bgl, pain } }. Vitals are text,
 *              so "VF" or "–" can be written; they are shown in that order.
 */
export const scenarios = [
  {
    id: 'netball-ankle',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad', 'supervised'],
    title: 'Netball ankle',
    suburb: 'Hataitai',
    story:
      'A 34-year-old woman has hurt her ankle at netball; her coach is calling. She rolled it going for the ball and can’t put weight on it.',
    giveIfAsked: [
      'It is swollen over the outside of the ankle and tender at the back of the bone.',
      'She felt a pop, and has never hurt it before.',
    ],
    intention:
      'Run a full primary and secondary survey and handover on a stable patient. Insist on the whole structure even though the problem is obvious.',
    outcomes: [
      'Completes the primary survey before focusing on the ankle',
      'Examines the joints above and below and checks circulation, sensation and movement',
      'Gives a clear, structured handover',
    ],
    variations: [
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'The ankle is dislocated and the foot is pale: it needs reduction. Call an ICP and go through the procedural dissociation checklist. ICP phase 1: do the reduction safely.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic'],
        text: 'She went light-headed just before she fell: add a medical cause of the fall to find and treat.',
      },
    ],
    guidelines: ['cpg-1-17', 'cpg-4-11', 'cpg-1-9'],
    patients: [
      {
        history: 'Nil',
        medications: 'Oral contraceptive',
        allergies: 'None known',
        social: 'Office worker who lives with her partner. Non-smoker.',
        vitals: {
          gcs: '15',
          rr: '16',
          spo2: '99%',
          hr: '84',
          bp: '124/78',
          temp: '36.7',
          bgl: '5.6',
          pain: '5/10',
        },
      },
    ],
  },
  {
    id: 'not-himself',
    complexity: 2,
    load: 'single',
    levels: ['supervised', 'paramedic'],
    title: 'Just not himself',
    suburb: 'Paraparaumu',
    story:
      'A 72-year-old man is "not himself"; his daughter is calling. She says he has been off for two days, quieter than usual and sleeping more.',
    giveIfAsked: [
      'He has been getting up to pass urine several times a night this week, and it stings.',
      'He was muddled last night and his daughter found him in the garden at 2 am.',
      'He has been eating and drinking less, and had a shivering spell last night.',
    ],
    intention:
      'Take a structured history when there is no clear complaint. See whether they dig in or give up when nothing stands out: the urinary symptoms only come out with a structured history, and with the low fever and his prostate history they point to a urinary infection. Give the facts below freely at lower levels; at Paramedic, only when asked precisely.',
    outcomes: [
      'Takes a structured history although there is no clear complaint',
      'Does a full set of vitals and a head-to-toe check',
      'Finds the urinary symptoms and links them to a possible urinary infection, keeping other causes in mind',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['student', 'grad'],
        text: 'Make it clearer for a newer learner: a fever of 38.9, rigors and burning when he passes urine.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'He is septic: BP 88/50, HR 118 and mottled knees.',
      },
    ],
    guidelines: ['cpg-1-17', 'cpg-6-7', 'cpg-12-9', 'cpg-1-6'],
    patients: [
      {
        history: 'Type 2 diabetes, hypertension, enlarged prostate',
        medications: 'Metformin, cilazapril, tamsulosin',
        allergies: 'Penicillin (rash)',
        social:
          'Widower who lives alone. His daughter visits weekly. Still drives. Has two beers a night.',
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '96%',
          hr: '92',
          bp: '136/80',
          temp: '37.6',
          bgl: '7.2',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'chest-pain-lawns',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Chest pain mowing the lawns',
    suburb: 'Cannons Creek',
    story:
      'A 58-year-old man has chest pain; his wife is calling. It came on while he was mowing the lawns about 40 minutes ago and hasn’t gone away.',
    giveIfAsked: [
      'It is a central pressure that spreads to his left arm, and he feels sick and sweaty.',
      'He has had twinges walking up hills for a few weeks, which went with rest.',
    ],
    intention: 'Practise assessing chest pain. Watch whether they get a 12-lead early.',
    outcomes: [
      'Gets a 12-lead ECG early and interprets it',
      'Takes a focused chest pain history, including risk factors',
      'Treats and gives pain relief by the guideline',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'It is a PE: the pain is sharp on breathing in, he flew back from Perth last week and his left calf is swollen.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'It is a pericardial effusion: breathless, a viral illness last week and soft heart sounds. Keep the differential broad for a common complaint.',
      },
      {
        lever: 'deterioration',
        levels: ['icp'],
        text: 'ICP phase 2: he becomes shocked (BP 78/50) and needs a vasopressor.',
      },
    ],
    guidelines: ['cpg-3-2', 'cpg-3-3', 'cpg-1-18'],
    patients: [
      {
        history: 'Hypertension, high cholesterol',
        medications: 'Cilazapril, atorvastatin',
        allergies: 'None known',
        social: 'Builder who lives with his wife and adult son. Smokes 20 a day.',
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '96%',
          hr: '96',
          bp: '152/88',
          temp: '36.8',
          bgl: '6.2',
          pain: '7/10',
        },
      },
    ],
  },
  {
    id: 'long-lie',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad', 'supervised', 'paramedic'],
    title: 'Long lie',
    suburb: 'Waterloo, Lower Hutt',
    story:
      'An 84-year-old woman has been found on the floor with a sore hip; her neighbour is calling. She fell overnight and the neighbour found her this morning when her curtains stayed shut.',
    giveIfAsked: [
      'Her left leg is shortened and turned out.',
      'She got up to the toilet in the night, felt dizzy and fell; she has been on the floor about eight hours.',
      'She has had nothing to drink since.',
    ],
    intention:
      'Assess a fall in an older person. Ask why she fell, and check for pressure areas and hypothermia. The fentanyl allergy tests the analgesia choice.',
    outcomes: [
      'Asks why she fell and looks for a medical cause',
      'Checks for pressure areas, hypothermia and injuries from the long lie',
      'Chooses pain relief that suits her fentanyl allergy',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'She has been down 24 hours: temperature 34.8, dark urine and a pressure area on her hip.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'She fell because of something new: an irregular pulse or a weak hand to find and explain.',
      },
    ],
    guidelines: ['cpg-13-3', 'cpg-4-11', 'cpg-1-18', 'cpg-12-9'],
    patients: [
      {
        history: 'Osteoporosis, hypertension, hypothyroidism',
        medications: 'Alendronate (weekly), amlodipine, levothyroxine',
        allergies: 'Fentanyl (rash and itch)',
        social: 'Lives alone. Independent with a walker. No medical alarm.',
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '95%',
          hr: '88',
          bp: '168/92',
          temp: '35.9',
          bgl: '5.8',
          pain: '8/10',
        },
      },
    ],
  },
  {
    id: 'right-abdo-pain',
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad', 'supervised'],
    title: 'Right-sided abdominal pain',
    suburb: 'Johnsonville',
    story:
      'A 26-year-old man has had abdominal pain since last night; his flatmate is calling. It has been getting worse and he has vomited once.',
    giveIfAsked: [
      'It started around his belly button and has moved to the right lower abdomen.',
      'It hurts more when he walks or coughs.',
      'No urinary symptoms and no testicular pain.',
    ],
    intention:
      'Assess abdominal pain and talk through the differentials. Look for a systematic abdominal exam, the serious causes of right-sided pain considered, and a sensible analgesia choice.',
    outcomes: [
      'Does a systematic abdominal examination',
      'Talks through the differentials for right-sided pain and the serious causes',
      'Chooses sensible pain relief and gives it by the guideline',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'Make the patient a 28-year-old woman: ectopic pregnancy and ovarian torsion join the differentials.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'Make him 72: a leaking aneurysm, bowel obstruction or diverticulitis join the differentials.',
      },
      {
        lever: 'severity',
        levels: ['grad', 'supervised'],
        text: 'His abdomen is rigid and his temperature 39.2: peritonitis, so look for sepsis.',
      },
    ],
    guidelines: ['cpg-13-2', 'cpg-1-18'],
    patients: [
      {
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Works in a café and lives with flatmates. Drinks occasionally.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '99%',
          hr: '104',
          bp: '128/78',
          temp: '38.1',
          bgl: '5.4',
          pain: '6/10',
        },
      },
    ],
  },
  {
    id: 'copd-or-sepsis',
    complexity: 2,
    load: 'single',
    levels: ['grad'],
    title: 'COPD or sepsis?',
    suburb: 'Ōtaki',
    story:
      'A 67-year-old woman with COPD is more short of breath; her husband is calling. She has been getting worse for three days and today she is hot and shivery.',
    giveIfAsked: [
      'Her sputum has turned green and there is more of it.',
      'She is more muddled than usual, and has hardly passed urine today.',
      'Her usual oxygen saturation is 88 to 92% (her respiratory nurse’s plan is on the fridge).',
    ],
    intention:
      'Work through differentials and titrate oxygen. Watch the oxygen target and whether they think of sepsis. Ask what the long trip to hospital changes.',
    outcomes: [
      'Titrates oxygen to the right target for COPD',
      'Considers sepsis alongside an exacerbation',
      'Plans for the long trip to hospital',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'Lower the fever to 37.8 so sepsis is less clear.',
      },
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'Her work of breathing stays high or rises despite oxygen, so CPAP is considered. Keep the BP normal so CPAP can be given.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'As above, with a low BP (88/50).',
      },
      {
        lever: 'complexity',
        rung: 'overlapping',
        levels: ['paramedic', 'icp'],
        text: 'She also has heart failure (crackles, swollen ankles): COPD, a chest infection and heart failure meet at the CPAP decision.',
      },
    ],
    guidelines: ['cpg-2-2', 'cpg-6-2', 'cpg-1-16'],
    patients: [
      {
        history: 'COPD with two admissions this year, hypertension',
        medications:
          'Tiotropium, budesonide/formoterol, salbutamol, cilazapril. Started her prednisone rescue pack yesterday.',
        allergies: 'None known',
        social: 'Ex-smoker of about 40 pack-years, quit 3 years ago. Lives with her husband.',
        vitals: {
          gcs: '15',
          rr: '28',
          spo2: '86% RA',
          hr: '112',
          bp: '104/62',
          temp: '38.6',
          bgl: '9.1',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'head-strike-warfarin',
    complexity: 2,
    load: 'single',
    levels: ['student'],
    title: 'Fall in the garden',
    suburb: 'Waikanae',
    story:
      'A 79-year-old man has fallen in the garden and hit his head; his wife is calling. She says he was confused for a minute or two but now says he is fine and does not want to go anywhere.',
    giveIfAsked: [
      'He did not trip: he stood up from weeding, felt light-headed, and the next thing he knew he was on the ground.',
      'His wife says he has asked her the same question twice since the fall.',
      'He takes his warfarin every night and has not missed a dose.',
    ],
    intention:
      'Recognise risk hidden behind a common, minor-looking fall. Watch whether they find out why he fell (he blacked out on standing, he did not trip), weigh a head strike on warfarin, and transport him rather than leave him at home.',
    outcomes: [
      'Finds out why he fell and looks for a medical cause (postural blood pressure, ECG)',
      'Recognises the bleeding risk of a head strike on warfarin',
      'Transports him rather than leaving him at home',
    ],
    variations: [
      {
        lever: 'deterioration',
        levels: ['grad', 'supervised'],
        text: 'Over 20 minutes his GCS falls to 12 and he vomits: a bleed on warfarin.',
      },
      {
        lever: 'complexity',
        rung: 'unrelated',
        levels: ['supervised', 'paramedic'],
        text: 'He also has a painful, shortened leg (a hip fracture) that pulls attention from his head and the cause of the fall.',
      },
    ],
    guidelines: ['cpg-4-9', 'cpg-13-3', 'cpg-12-9'],
    patients: [
      {
        history: 'Atrial fibrillation, stroke in 2021 with no lasting effects, hypertension',
        medications: 'Warfarin (INR 3.1 last week), metoprolol, cilazapril',
        allergies: 'None known',
        social: 'Lives with his wife. Keen gardener, fully independent.',
        vitals: {
          gcs: '14 (V4)',
          rr: '16',
          spo2: '97%',
          hr: '64 irreg',
          bp: '158/84',
          temp: '36.4',
          bgl: '6.8',
          pain: '3/10',
        },
      },
    ],
  },
  {
    id: 'cafe-anaphylaxis',
    complexity: 1,
    load: 'delegation',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Café anaphylaxis',
    suburb: 'Te Aro',
    story:
      'A 19-year-old woman is having an allergic reaction at a café; her friend is calling. She ate a dish with peanuts in it and now has hives and feels faint.',
    giveIfAsked: ['She is wheezy and says her throat feels tight.'],
    intention:
      'Lead a crew through several urgent interventions at once. The point is who does what (adrenaline, positioning, IV access, fluids, a second adrenaline dose), not the medicine itself.',
    outcomes: [
      'Gives intramuscular adrenaline without delay',
      'Gives each crew member a clear task (positioning, IV access, fluids)',
      'Reassesses and gives a second adrenaline dose when needed',
      'Considers additional treatments once adrenaline is working, by the guideline',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'No hives: only wheeze, vomiting and cramping after the meal, so anaphylaxis is less obvious.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic'],
        text: 'She is no better 5 to 10 minutes after one IM dose: request ICP backup.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'ICP phase 1: no better after two IM doses, so IV adrenaline (an infusion is preferred).',
      },
    ],
    guidelines: ['cpg-12-12', 'cpg-1-8'],
    patients: [
      {
        history: 'Mild asthma. Known peanut allergy.',
        medications: 'Salbutamol when needed. Her adrenaline autoinjector is at home.',
        allergies: 'Peanuts (anaphylaxis at age 8)',
        social: 'University student, out with friends.',
        vitals: {
          gcs: '14',
          rr: '30',
          spo2: '90%',
          hr: '132',
          bp: '78/40',
          temp: '36.9',
          bgl: '6.0',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'gym-collapse',
    complexity: 1,
    load: 'delegation',
    levels: ['supervised', 'paramedic'],
    title: 'Collapse at the gym',
    suburb: 'Trentham, Upper Hutt',
    story:
      'A 55-year-old man has collapsed at a gym; staff are calling. They are doing CPR and have put the gym’s AED on him.',
    giveIfAsked: [
      'He collapsed on the treadmill without warning, about six minutes before you arrive.',
      'The AED has given one shock.',
    ],
    intention:
      'Run a cardiac arrest as team leader. Make them hand off compressions and keep oversight of the whole team. Bring in his partner whenever you want more pressure.',
    outcomes: [
      'Leads the team and keeps oversight rather than doing compressions',
      'Organises compression changes and keeps pauses short',
      'Follows the arrest guideline for rhythm checks, shocks and medicines',
    ],
    variations: [
      {
        lever: 'deterioration',
        levels: ['paramedic', 'icp'],
        text: 'VF continues after three shocks: follow the guideline for refractory VF.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'Circulation returns after the second shock: run the post-arrest checks.',
      },
    ],
    guidelines: ['cpg-3-14', 'cpg-1-8'],
    patients: [
      {
        history:
          'Unknown at first. His partner later says high blood pressure and "a heart check booked".',
        medications: 'Unknown at first. His partner later says cilazapril.',
        allergies: 'Unknown',
        social: 'Gym staff only know his name.',
        vitals: {
          gcs: '3',
          rr: '0',
          spo2: '–',
          hr: 'VF',
          bp: '–',
          temp: '–',
          bgl: '–',
          pain: '–',
        },
      },
    ],
  },
  {
    id: 'transmission-gully-crash',
    complexity: 3,
    load: 'several',
    levels: ['paramedic', 'icp'],
    title: 'Transmission Gully crash',
    suburb: 'Pāuatahanui',
    story:
      'Two cars have collided on State Highway 1 in Transmission Gully, three patients reported. You are a single crew and the first to arrive.',
    giveIfAsked: [
      'The passenger hit her head on the side window and keeps asking what happened.',
      'Fire is 10 minutes away; the next ambulance is 15 minutes away.',
    ],
    intention:
      'Triage, call for resources and manage the scene as the first crew there. Watch the first report, the triage order and how early they ask for more road crews. The passenger is the driver’s mother and on an anticoagulant.',
    outcomes: [
      'Sends a clear first report and asks for resources early',
      'Triages all three patients in a sensible order',
      'Weighs the passenger’s anticoagulant and head strike in her triage and destination',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['supervised', 'paramedic'],
        text: 'You are double-crewed instead of single: give each a role (this was hard even for a Paramedic alone).',
      },
      {
        lever: 'deterioration',
        levels: ['icp'],
        text: 'The passenger’s GCS falls to 9: a bleed on her anticoagulant.',
      },
    ],
    guidelines: ['cpg-1-11', 'cpg-4-2', 'cpg-4-23'],
    patients: [
      {
        label: 'Driver, 45-year-old man, seatbelt chest pain',
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Driving to work with his mother.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '96%',
          hr: '98',
          bp: '138/86',
          temp: '36.6',
          bgl: '5.9',
          pain: '6/10',
        },
      },
      {
        label: 'Passenger, 70-year-old woman, confused',
        history: 'Atrial fibrillation, type 2 diabetes',
        medications: 'Dabigatran, metformin',
        allergies: 'Sulfa drugs',
        social: 'Lives with her son, the driver.',
        vitals: {
          gcs: '13',
          rr: '24',
          spo2: '93%',
          hr: '118',
          bp: '92/60',
          temp: '36.2',
          bgl: '11.4',
          pain: '?',
        },
      },
      {
        label: 'Other driver, 17-year-old man, walking around, forearm laceration',
        history: 'ADHD',
        medications: 'Methylphenidate',
        allergies: 'None known',
        social: 'Restricted licence, driving alone. Panicking about his parents.',
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '99%',
          hr: '110',
          bp: '130/80',
          temp: '36.8',
          bgl: '6.1',
          pain: '4/10',
        },
      },
    ],
  },
  {
    id: 'trampoline-wrist',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad', 'supervised'],
    title: 'Off the trampoline',
    suburb: 'Tawa',
    story:
      'A 6-year-old boy has hurt his wrist; his mum is calling. He fell off the backyard trampoline onto his outstretched hand, and she says the wrist "looks funny".',
    giveIfAsked: [
      'He bumped his head on the frame on the way down, but didn’t knock himself out.',
      'His elbow is sore too when it is moved.',
    ],
    intention:
      'Run the full structure on a child: talk to the child as well as the parent, get child-sized vitals and use the paediatric ranges. Watch whether the obvious wrist stops them checking for other injuries.',
    outcomes: [
      'Talks to the child as well as the parent',
      'Uses the paediatric ranges for the vitals',
      'Checks for other injuries beyond the obvious wrist',
    ],
    variations: [
      {
        lever: 'complexity',
        rung: 'unrelated',
        levels: ['supervised', 'paramedic'],
        text: 'He also landed on his elbow: a fracture above the elbow with a cool, pale hand.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'The hand is pale and pulseless: discuss calling an ICP to realign the limb.',
      },
    ],
    guidelines: ['cpg-7-1', 'cpg-4-11', 'cpg-1-18', 'cpg-1-17'],
    patients: [
      {
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Lives with his mum and older sister. Up to date with immunisations.',
        vitals: {
          gcs: '15',
          rr: '24',
          spo2: '99%',
          hr: '118',
          bp: '–',
          temp: '36.9',
          bgl: '5.8',
          pain: '6/10',
        },
      },
    ],
  },
  {
    id: 'bus-stop-dizzy',
    complexity: 2,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Dizzy at the bus stop',
    suburb: 'Lower Hutt',
    story:
      'A 45-year-old woman is dizzy at a bus stop on High Street; a passer-by is calling. She says the world is spinning and she has vomited once.',
    giveIfAsked: [
      'It came on suddenly while she was standing still, and it hasn’t eased since.',
      'She has a headache at the back of her head that she says is not like her migraines.',
      'She finds it hard to walk straight (only if they ask her to stand or walk).',
    ],
    intention:
      'Keep to the structure when nothing obvious stands out. The learner should think through the body systems that could be involved (neurological, cardiac, inner ear), then the specific conditions. Watch whether they separate vertigo from light-headedness and look for the features that point to a stroke rather than an inner-ear cause.',
    outcomes: [
      'Keeps to the full assessment structure',
      'Separates vertigo from light-headedness',
      'Looks for features of a stroke rather than an inner-ear cause',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['grad', 'supervised'],
        text: 'Make it clearly inner ear: worse on turning her head, no headache, she walks normally. Can they say why it is not a stroke?',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic'],
        text: 'She has palpitations and nearly fainted: light-headedness from an arrhythmia, not vertigo.',
      },
      {
        lever: 'deterioration',
        levels: ['icp'],
        text: 'ICP phase 1: on the way her GCS falls to 9: a cerebellar haemorrhage needing airway management.',
      },
    ],
    guidelines: ['cpg-13-9', 'cpg-1-17', 'cpg-1-6'],
    patients: [
      {
        history: 'Migraine',
        medications: 'Sumatriptan when needed',
        allergies: 'None known',
        social: 'Teacher on her way to work. Lives with her husband and two teenagers. Non-smoker.',
        vitals: {
          gcs: '15',
          rr: '16',
          spo2: '99%',
          hr: '78',
          bp: '142/88',
          temp: '36.5',
          bgl: '6.2',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'refuses-transport',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad', 'supervised', 'paramedic', 'icp'],
    title: "Doesn't want to go",
    suburb: 'Karori',
    story:
      'An 81-year-old woman has had a fall at home; her neighbour is calling. She slipped on the kitchen floor, the neighbour helped her up, and she is adamant she is not going to hospital.',
    giveIfAsked: [
      'She slipped on water by the sink; she didn’t feel faint or dizzy first.',
      'Her right wrist is a little sore but she can move it fully.',
      'She lives alone and her daughter is in Auckland.',
    ],
    intention:
      'Practise assessing capacity, informed consent and a safe decision to leave someone at home. Watch for a full falls assessment, a clear explanation of the risks and a sensible safety-net plan.',
    outcomes: [
      'Assesses capacity and informed consent',
      'Does a full falls assessment',
      'Explains the risks clearly and leaves a safety-net plan',
    ],
    variations: [
      {
        lever: 'complexity',
        rung: 'overlapping',
        levels: ['paramedic', 'icp'],
        text: 'She has had two glasses of wine, which bears on her capacity.',
      },
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'Bruises of different ages on her arms and a nervous family member: think of elder abuse.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'She stays home: make the referral and safety net, and explain what made her fall and what would make the next fall less likely.',
      },
    ],
    guidelines: ['cpg-1-4', 'cpg-1-5', 'cpg-1-6', 'cpg-13-3'],
    patients: [
      {
        history: 'Osteoporosis, hypertension, cataracts',
        medications: 'Alendronate, amlodipine, calcium',
        allergies: 'Codeine (vomiting)',
        social:
          "Widow who lives alone. Her neighbour checks in daily. Walks with a stick outside. Doesn't drink.",
        vitals: {
          gcs: '15',
          rr: '16',
          spo2: '97%',
          hr: '76',
          bp: '148/82',
          temp: '36.4',
          bgl: '5.9',
          pain: '2/10',
        },
      },
    ],
  },
  {
    id: 'hot-toddler',
    complexity: 2,
    load: 'single',
    levels: ['paramedic'],
    title: 'Hot toddler',
    suburb: 'Ranui',
    story:
      'An 18-month-old girl has a fever; her dad is calling. She has been hot since yesterday, and today he says she is "floppy" and not drinking much.',
    giveIfAsked: [
      'She has had two wet nappies since last night.',
      'She has a few spots on her tummy that fade when pressed.',
      'Her brother at daycare had a cold last week.',
    ],
    intention:
      'Assess a febrile young child in a structured way and make a treatment and referral decision. Watch for hydration, a look for a rash and how they explain what to watch for if she stays home.',
    outcomes: [
      'Assesses hydration and looks for a rash',
      'Makes a clear treatment and referral decision',
      'Explains what to watch for if she stays home',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['student', 'grad', 'supervised'],
        text: 'Make her sick enough to transport (HR 180, RR 44, cool hands, no wet nappy today) and focus on how assessing a child differs.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'The spots on her tummy don’t fade when pressed.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'She is well enough to stay home but has an ear infection: when to consult about antibiotics, given the age limit.',
      },
    ],
    guidelines: ['cpg-6-10', 'cpg-7-1', 'cpg-1-17', 'cpg-1-6'],
    patients: [
      {
        history: 'Born at 39 weeks. One ear infection last winter.',
        medications: 'Paracetamol given 3 hours ago',
        allergies: 'None known',
        social: 'Lives with both parents and a brother at daycare who had a cold last week.',
        vitals: {
          gcs: '15',
          rr: '34',
          spo2: '97%',
          hr: '160',
          bp: '–',
          temp: '39.1',
          bgl: '5.4',
          pain: '?',
        },
      },
    ],
  },
  {
    id: 'wheezy-at-school',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad', 'supervised', 'paramedic', 'icp'],
    title: 'Wheezy at school',
    suburb: 'Naenae',
    story:
      'A 15-year-old girl is short of breath at school; the school nurse is calling. She became wheezy during PE, and the nurse has given her four puffs of her inhaler.',
    giveIfAsked: [
      'She can speak in short sentences.',
      'She often forgets her preventer inhaler, and her uncle smokes in the house.',
    ],
    intention:
      'Grade the severity of asthma and treat by the guideline, with the dose for her age and weight. Watch whether they reassess after each nebuliser and decide on transport.',
    outcomes: [
      'Grades the severity of the asthma',
      'Gives the right dose for her age and weight',
      'Reassesses after each nebuliser and decides on transport',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['grad', 'supervised'],
        text: 'Add a brittle history: two ICU admissions and a course of prednisone last month.',
      },
      {
        lever: 'deterioration',
        levels: ['grad', 'supervised'],
        text: 'She doesn’t improve after the first nebuliser.',
      },
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'She is tiring and can only say words: does she need IM adrenaline first, or with the first nebuliser?',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'She ate a muesli bar with nuts at morning tea: is it anaphylaxis?',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'Make the patient 68 with heart failure and COPD: is it asthma at all?',
      },
    ],
    guidelines: ['cpg-2-1', 'cpg-7-2', 'cpg-1-16'],
    patients: [
      {
        history: 'Asthma, one hospital admission two years ago',
        medications: 'Salbutamol inhaler, budesonide inhaler (often forgets it)',
        allergies: 'None known',
        social: 'Lives with her mum. Her uncle smokes in the house.',
        vitals: {
          gcs: '15',
          rr: '30',
          spo2: '97%',
          hr: '124',
          bp: '118/72',
          temp: '36.8',
          bgl: '6.4',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'croup-2am',
    complexity: 1,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Croup at 2 am',
    suburb: 'Titahi Bay',
    story:
      'A 3-year-old boy has noisy breathing at 2 am; his mum is calling. He woke with a barking cough, and she has him on her knee in the bathroom with the shower running.',
    giveIfAsked: [
      'He has had a runny nose for two days.',
      'He had croup once before, last year.',
      'He is not drooling and can swallow, and he hasn’t choked on anything.',
    ],
    intention:
      'Recognise croup, grade it and treat it while keeping the child calm. Watch that they leave him with his mum, avoid upsetting him, and separate croup from other causes of stridor.',
    outcomes: [
      'Recognises and grades the croup',
      'Keeps the child calm and with his mum',
      'Considers other causes of stridor',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['grad', 'supervised'],
        text: 'Stridor at rest and he is tiring: severe croup.',
      },
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'He is drooling, can’t swallow and looks toxic with a fever of 39.5: talk through epiglottitis and bacterial tracheitis.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'Set it in Kāpiti with a toxic child: bacterial tracheitis, so consult about antibiotics for the long trip.',
      },
    ],
    guidelines: ['cpg-2-7', 'cpg-2-6', 'cpg-7-1'],
    patients: [
      {
        history: 'Croup once before, last year',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Lives with his parents and a baby sister. Had a runny nose for two days.',
        vitals: {
          gcs: '15',
          rr: '36',
          spo2: '96%',
          hr: '142',
          bp: '–',
          temp: '37.9',
          bgl: '–',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'hypo-building-site',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Hypo on the building site',
    suburb: 'Petone',
    story:
      'A 39-year-old builder is sweaty and confused on a building site; his foreman is calling. His workmates say he was fine this morning but has been acting strangely for the last 20 minutes.',
    giveIfAsked: [
      'He has type 1 diabetes; his workmates know if asked, and he wears a medical alert bracelet.',
      'He skipped lunch to finish a concrete pour and has been working hard in the sun.',
      'He took his usual insulin this morning.',
    ],
    intention:
      'Find and treat hypoglycaemia, then decide whether he can safely stay. Watch for a glucose check early, the cause, a repeat glucose, food after treatment and the conditions for leaving him in someone’s care.',
    outcomes: [
      'Checks the glucose early, treats the low glucose and repeats the check',
      'Looks for the cause and makes sure he eats',
      'Applies the conditions for leaving him in someone’s care',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'The call is for a seizure: he is fitting on the site and his glucose is 1.6.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'Make him 68 with heart and kidney disease: the confusion could be a stroke, sepsis or a hypo.',
      },
      {
        lever: 'complexity',
        rung: 'overlapping',
        levels: ['paramedic', 'icp'],
        text: 'He took extra insulin on purpose after bad news: his glucose falls again after treatment and he may not consent to stay.',
      },
    ],
    guidelines: ['cpg-5-3', 'cpg-1-6'],
    patients: [
      {
        history: 'Type 1 diabetes',
        medications: 'Insulin',
        allergies: 'None known',
        social: 'Lives with his partner. Drives a work ute. Had a big night on Saturday.',
        vitals: {
          gcs: '14',
          rr: '18',
          spo2: '98%',
          hr: '104',
          bp: '134/80',
          temp: '36.4',
          bgl: '2.1',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'seizure-coastlands',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Seizure at Coastlands',
    suburb: 'Paraparaumu',
    story:
      'A 24-year-old man has had a seizure at Coastlands; security is calling. It has stopped, and his friend says "he’s fine, he has these all the time".',
    giveIfAsked: [
      'He ran out of his sodium valproate a week ago.',
      'This one lasted longer than usual, about five minutes.',
      'He bit his tongue and hit his head on a chair as he fell.',
    ],
    intention:
      "Manage the post-ictal patient and decide on transport. Watch whether they check for injuries and for a change to his usual seizures, and whether they assess his capacity before taking the friend's word.",
    outcomes: [
      'Checks for injuries after the seizure',
      'Asks whether this seizure was different from his usual ones',
      'Assesses his capacity before taking the friend’s word',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'A second seizure starts while you are there and doesn’t stop.',
      },
      {
        lever: 'complexity',
        rung: 'unrelated',
        levels: ['supervised', 'paramedic'],
        text: 'He also has a cut over his eye that keeps bleeding.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic'],
        text: 'It was his first seizure, and he took something at a party last night.',
      },
    ],
    guidelines: ['cpg-5-8', 'cpg-1-6', 'cpg-1-4'],
    patients: [
      {
        history: 'Epilepsy',
        medications: 'Sodium valproate (he says he has run out)',
        allergies: 'None known',
        social: 'Lives in a flat with friends. Works at a café. Drinks at weekends.',
        vitals: {
          gcs: '13',
          rr: '18',
          spo2: '96%',
          hr: '102',
          bp: '128/76',
          temp: '37.2',
          bgl: '5.7',
          pain: '3/10',
        },
      },
    ],
  },
  {
    id: 'stroke-breakfast',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Dropped cup at breakfast',
    suburb: 'Stokes Valley',
    story:
      'A 67-year-old man is "not right" at breakfast; his wife is calling. She says he suddenly dropped his cup and his speech sounds odd.',
    giveIfAsked: [
      'The right side of his face droops and his right arm drifts down.',
      'It started 35 minutes ago; he was well when he got up.',
    ],
    intention:
      'Recognise a stroke, establish the time of onset and transport to the nearest stroke centre (Hutt Hospital) without delay. Watch for a quick scene time and a clear radio notification to hospital.',
    outcomes: [
      'Recognises the stroke and establishes the time of onset',
      'Transports to the nearest stroke centre by the guideline',
      'Keeps the scene time short and gives a clear radio notification',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'His glucose is 2.4: a hypo that looks like a stroke.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'He woke with the signs (a wake-up stroke): work out when he was last known well.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic'],
        text: 'He lives in Ōtaki, about equidistant from Palmerston North and Wellington: the destination by the guideline.',
      },
    ],
    guidelines: ['cpg-12-6', 'cpg-1-23'],
    patients: [
      {
        history: 'Atrial fibrillation, high cholesterol',
        medications: 'Apixaban, atorvastatin',
        allergies: 'None known',
        social: 'Retired electrician. Lives with his wife. Ex-smoker.',
        vitals: {
          gcs: '14',
          rr: '16',
          spo2: '96%',
          hr: '96 irreg',
          bp: '178/96',
          temp: '36.6',
          bgl: '7.1',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'svt-lambton-quay',
    complexity: 1,
    load: 'single',
    levels: ['student', 'grad', 'supervised'],
    title: 'Racing heart at work',
    suburb: 'Wellington Central',
    story:
      'A 28-year-old woman has a racing heart at work on Lambton Quay; a colleague is calling. It started suddenly 30 minutes ago while she was sitting at her desk.',
    giveIfAsked: [
      'She has had two similar episodes that stopped on their own.',
      'She has had three coffees today.',
      'No chest pain and she hasn’t fainted.',
    ],
    intention:
      'Identify SVT on the monitor and manage it by the guideline, after a structured assessment so they don’t lock onto the obvious diagnosis (premature closure). Watch for a 12-lead before and after treatment, vagal manoeuvres done well and the signs that would make it unstable.',
    outcomes: [
      'Does a structured assessment before settling on SVT',
      'Identifies SVT and records a 12-lead before and after treatment',
      'Performs vagal manoeuvres well',
      'Knows the signs that would make it unstable',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'Make her 66 with heart disease and a wider QRS: SVT with aberrancy or VT?',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'A less clear ECG: talk through AVRT and AVNRT, or flutter with 2:1 block at 150.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'Her BP falls to 82/50 and she has chest pain: unstable, so cardioversion.',
      },
    ],
    guidelines: ['cpg-3-9', 'cpg-3-7', 'cpg-3-11'],
    patients: [
      {
        history: 'Two similar episodes that stopped on their own',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Lives with flatmates. Three coffees today. Non-smoker.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '99%',
          hr: '196',
          bp: '112/70',
          temp: '36.7',
          bgl: '5.8',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'bleeding-nine-weeks',
    complexity: 2,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Bleeding at nine weeks',
    suburb: 'Wainuiomata',
    story:
      'A 31-year-old woman who is nine weeks pregnant has vaginal bleeding; she is calling herself. It started this morning with cramping low in her abdomen.',
    giveIfAsked: [
      'The pain is worse on the left and she felt faint when she stood up.',
      'She has a pain at the tip of her shoulder.',
      'She hasn’t had a scan in this pregnancy yet.',
    ],
    intention:
      'Assess bleeding in early pregnancy, look for shock and think of ectopic pregnancy. Watch for a sensitive approach, pain relief and a clear explanation of where she is going.',
    outcomes: [
      'Looks for shock and considers an ectopic pregnancy',
      'Takes a sensitive approach and gives pain relief',
      'Explains clearly where she is going and why',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'She becomes shocked (HR 128, BP 84/50): a ruptured ectopic pregnancy.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'The history is a false flag: the pain is a urinary infection, or the bleeding is from the bowel.',
      },
    ],
    guidelines: ['cpg-8-5', 'cpg-8-3', 'cpg-12-13'],
    patients: [
      {
        history: 'One previous pregnancy, a normal birth',
        medications: 'Folic acid',
        allergies: 'None known',
        social: 'Lives with her partner and their 3-year-old. Her partner is at work in town.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '99%',
          hr: '108',
          bp: '104/68',
          temp: '36.6',
          bgl: '5.5',
          pain: '6/10',
        },
      },
    ],
  },
  {
    id: 'phone-call-newtown',
    complexity: 1,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'The phone call',
    suburb: 'Newtown',
    story:
      'A 22-year-old man may harm himself; a friend is calling. He rang the friend and said he was going to end his life. Police are on their way.',
    giveIfAsked: [
      'He has been drinking, and he stopped his sertraline a month ago.',
      'He broke up with his partner last week.',
      'Asked directly, he says he has a plan and has thought about how and where.',
    ],
    intention:
      'Assess someone with thoughts of suicide: build rapport, ask directly and assess risk and capacity. Watch for scene safety, a calm conversation and a plan that keeps him safe.',
    outcomes: [
      'Keeps the scene safe',
      'Builds rapport and asks directly about suicide',
      'Assesses risk and capacity and makes a plan that keeps him safe',
    ],
    variations: [
      {
        lever: 'complexity',
        rung: 'overlapping',
        levels: ['paramedic', 'icp'],
        text: 'He is very drunk, which bears on his capacity and his risk.',
      },
      {
        lever: 'scene',
        levels: ['supervised', 'paramedic'],
        text: 'He becomes angry and threatens the crew before police arrive.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'He refuses to come: treatment without consent and working with police.',
      },
    ],
    guidelines: ['cpg-10-6', 'cpg-10-2', 'cpg-1-4', 'cpg-1-24'],
    patients: [
      {
        history: 'Depression',
        medications: 'Sertraline (stopped it a month ago)',
        allergies: 'None known',
        social:
          'University student. Broke up with his partner last week. Lives with flatmates who are away. Has been drinking.',
        vitals: {
          gcs: '15',
          rr: '16',
          spo2: '99%',
          hr: '96',
          bp: '128/78',
          temp: '36.8',
          bgl: '6.0',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'back-gone-lifting',
    complexity: 1,
    load: 'single',
    levels: ['grad', 'supervised'],
    title: 'Back gone lifting',
    suburb: 'Upper Hutt',
    story:
      'A 52-year-old man has severe lower back pain at home; his wife is calling. He felt his back "go" lifting a bag of concrete, walked inside and is now on the couch, unable to move for the pain.',
    giveIfAsked: [
      'He has no numbness between his legs and has passed urine normally.',
      'The pain goes into his right buttock but not below the knee.',
    ],
    intention:
      'Assess non-traumatic back pain, give good pain relief and search for the red flags. Watch whether they ask about bladder and bowel control, numbness in the saddle area and leg weakness.',
    outcomes: [
      'Asks about bladder and bowel control, saddle numbness and leg weakness',
      'Gives good pain relief',
      'Makes a safe transport or referral decision',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'He has new numbness between his legs and hasn’t passed urine since: cauda equina syndrome.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'Make him 70 with a sudden tearing pain and a weak femoral pulse: a leaking aortic aneurysm.',
      },
      {
        lever: 'escalation',
        levels: ['grad', 'supervised'],
        text: 'His pain eases with treatment: can he stay home, and what referral and safety net does he need?',
      },
    ],
    guidelines: ['cpg-13-7', 'cpg-1-18', 'cpg-1-6'],
    patients: [
      {
        history: 'Back pain on and off for years, gout',
        medications: 'Allopurinol, ibuprofen when needed',
        allergies: 'None known',
        social: 'Self-employed landscaper. Lives with his wife. Smokes 10 a day.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '98%',
          hr: '92',
          bp: '152/90',
          temp: '36.7',
          bgl: '6.6',
          pain: '8/10',
        },
      },
    ],
  },
  {
    id: 'mums-pills',
    complexity: 3,
    load: 'single',
    levels: ['supervised', 'paramedic'],
    title: "Her mum's pills",
    suburb: 'Porirua East',
    story:
      'A 17-year-old girl is drowsy after a possible overdose; her mum is calling. Her mum found her in her bedroom with empty blister packs of her own medicines.',
    giveIfAsked: [
      'Her mum counts the packs: up to 20 amitriptyline 25 mg and 16 paracetamol 500 mg are missing.',
      'She took them about two hours ago, after an argument.',
      'She won’t say how many she took. Asked gently and away from her mum, she says she wanted to die.',
    ],
    intention:
      'Manage a mixed overdose of medicines in a young person who may not consent. Watch for working out what and how much was taken and when, an ECG for the amitriptyline, thinking about her safety at home, and capacity for a 17-year-old.',
    outcomes: [
      'Works out what was taken, how much and when',
      'Records an ECG and looks for a widened QRS',
      'Considers her safety at home and her capacity at 17',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'Her QRS widens and she has a seizure: cyclic antidepressant toxicity.',
      },
      {
        lever: 'uncertainty',
        levels: ['supervised', 'paramedic'],
        text: 'Swap the medicines for another class (an antipsychotic, a beta blocker, a sedative) with its signs.',
      },
      {
        lever: 'escalation',
        levels: ['supervised', 'paramedic'],
        text: 'She refuses to go and her mum can’t make her: her capacity at 17 and treatment without consent.',
      },
    ],
    guidelines: ['cpg-5-5', 'cpg-10-3', 'cpg-1-20', 'cpg-1-24'],
    patients: [
      {
        history: 'Anxiety. Seen by the school counsellor.',
        medications: "Nil of her own. The packs are her mum's amitriptyline and paracetamol.",
        allergies: 'None known',
        social:
          'Lives with her mum and stepdad. Trouble at school. Her mum is upset and keeps asking her questions.',
        vitals: {
          gcs: '13',
          rr: '18',
          spo2: '97%',
          hr: '128',
          bp: '102/64',
          temp: '37.1',
          bgl: '6.3',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'after-the-party',
    complexity: 3,
    load: 'single',
    levels: ['supervised', 'paramedic'],
    title: 'After the party',
    suburb: 'Mount Cook',
    story:
      'A 20-year-old man is hot and agitated after a party; his flatmates are calling. They say he has been dancing for hours and "took something".',
    giveIfAsked: [
      'His flatmates think he took MDMA; one saw him take a second pill about an hour ago.',
      'A friend found a small bottle of clear liquid in his jacket; nobody knows what it is (possible GHB).',
      'He has had nothing to drink but alcohol for hours.',
    ],
    intention:
      'Manage recreational drug toxicity with hyperthermia and agitation. Watch for scene safety, active cooling, sedation chosen step by step with its cautions (he has been drinking and may have taken a second drug), and recognising when this is becoming life-threatening.',
    outcomes: [
      'Keeps the scene safe and asks for ICP backup if the risk to safety becomes severe',
      'Starts active cooling',
      'Chooses sedation step by step and weighs its cautions (alcohol, a possible second drug)',
      'Recognises when it is becoming life-threatening',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['supervised', 'paramedic'],
        text: 'He becomes combative and threatens the crew: police, and a higher risk to safety.',
      },
      {
        lever: 'complexity',
        rung: 'contradictory',
        levels: ['paramedic', 'icp'],
        text: 'He took GHB as well: sedation now risks his airway, while the agitation and heat need it.',
      },
      {
        lever: 'deterioration',
        levels: ['paramedic', 'icp'],
        text: 'His temperature rises to 41.5 and he has a seizure.',
      },
    ],
    guidelines: ['cpg-5-6', 'cpg-11-3', 'cpg-5-1'],
    patients: [
      {
        history: 'Nil known',
        medications: 'Nil',
        allergies: 'Unknown',
        social: 'Student. At a party at the flat since early evening; has been drinking.',
        vitals: {
          gcs: '14',
          rr: '28',
          spo2: '96%',
          hr: '148',
          bp: '164/98',
          temp: '40.1',
          bgl: '4.9',
          pain: '?',
        },
      },
    ],
  },
  {
    id: 'baby-not-feeding',
    complexity: 1,
    load: 'single',
    levels: ['supervised', 'paramedic'],
    title: 'Baby not feeding',
    suburb: 'Waitangirua',
    story:
      'A 4-month-old baby is coughing and not feeding well; her nana is calling. She has had a cough for three days and is now taking half her usual feeds.',
    giveIfAsked: [
      'She has had two wet nappies today.',
      'She was born at 35 weeks and spent five days in the neonatal unit.',
      'Nana noticed she stopped breathing for a few seconds while asleep this morning.',
    ],
    intention:
      'Assess bronchiolitis and decide whether a borderline baby needs to go. Watch for counting breathing properly, feeding and wet nappies, the risk factors that lower the threshold, and how they involve nana.',
    outcomes: [
      'Counts the breathing properly and asks about feeding and wet nappies',
      'Names the risk factors that lower the threshold to transport',
      'Involves nana in the decision',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['grad', 'supervised'],
        text: 'Make her clearly sick enough to go: RR 70, SpO₂ 88% and grunting.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic'],
        text: 'She looks well enough to stay and nana wants to keep her home: a Paramedic decision with a clear safety net.',
      },
      {
        lever: 'deterioration',
        levels: ['paramedic', 'icp'],
        text: 'She has an apnoea while you watch.',
      },
    ],
    guidelines: ['cpg-2-9', 'cpg-7-1', 'cpg-7-2', 'cpg-1-16'],
    patients: [
      {
        history: 'Born at 35 weeks. Spent five days in the neonatal unit.',
        medications: 'Nil',
        allergies: 'None known',
        social:
          'Lives with her mum, nana and four cousins. Mum is at work. Damp house, and an uncle smokes.',
        vitals: {
          gcs: 'Alert',
          rr: '58',
          spo2: '92%',
          hr: '168',
          bp: '–',
          temp: '37.8',
          bgl: '–',
          pain: '?',
        },
      },
    ],
  },
  {
    id: 'headache-36-weeks',
    complexity: 1,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Headache at 36 weeks',
    suburb: 'Kilbirnie',
    story:
      'A 29-year-old woman who is 36 weeks pregnant has a severe headache; her partner is calling. It started this morning and now her vision is blurred.',
    giveIfAsked: [
      'Her midwife noted high blood pressure last week.',
      'She has pain under her ribs on the right, and her face and hands have swollen in the last few days.',
    ],
    intention:
      'Recognise pre-eclampsia, then manage an eclamptic seizure: partway through the job, once the blood pressure is known, she has a seizure. Watch for checking the blood pressure early, asking early for an ICP or clinical advice for magnesium, positioning for pregnancy, the treatment of the seizure and early notice to the hospital.',
    outcomes: [
      'Checks the blood pressure early and recognises pre-eclampsia',
      'Asks early for an ICP or clinical advice for magnesium',
      'Positions her correctly for pregnancy',
      'Treats the eclamptic seizure and warns the hospital early',
    ],
    variations: [
      {
        lever: 'escalation',
        levels: ['grad', 'supervised'],
        text: 'No ICP is free for 30 minutes: what to do meanwhile, and who to call for clinical advice.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'She gave birth three days ago: a seizure up to six weeks after the birth is treated as eclampsia.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'ICP phase 1: give magnesium and midazolam together for the seizure.',
      },
    ],
    guidelines: ['cpg-8-4', 'cpg-8-3', 'cpg-8-8'],
    patients: [
      {
        history: 'First pregnancy. Midwife noted high blood pressure last week.',
        medications: 'Pregnancy multivitamin',
        allergies: 'None known',
        social: 'Lives with her partner, who is at home. Her midwife is not answering.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '97%',
          hr: '98',
          bp: '172/112',
          temp: '36.9',
          bgl: '5.2',
          pain: '8/10',
        },
      },
    ],
  },
  {
    id: 'otaki-forks-tramper',
    complexity: 3,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Tramper on Colonial Knob',
    suburb: 'Colonial Knob',
    rural: true,
    story:
      'A 61-year-old man has hurt his leg on the Colonial Knob track; his friend is calling. He slipped about 40 minutes’ walk up the track; it is late afternoon, raining and 9°C, and his friend walked down to get signal.',
    giveIfAsked: [
      'His lower leg is deformed above the ankle and he can’t stand on it.',
      'He has been lying on the wet track for about an hour and is shivering.',
    ],
    intention:
      'Manage a lower leg fracture far from the road, with hypothermia setting in. Watch for planning the carry-out early (more crew, equipment and a meeting point), keeping him warm and pain relief that will last a long carry.',
    outcomes: [
      'Plans the carry-out early and asks for more crew and equipment',
      'Keeps him warm and off the cold ground',
      'Gives pain relief that will last a long carry',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['supervised', 'paramedic'],
        text: 'Move it to Mākara Peak: a mountain biker with the same injury on a downhill track.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'He is drowsy and has stopped shivering: handle him gently.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic'],
        text: 'It is getting dark and the carry will take two hours: what more do you ask for?',
      },
    ],
    guidelines: ['cpg-4-11', 'cpg-11-4', 'cpg-1-18'],
    patients: [
      {
        history: 'Hypertension, hip replacement two years ago',
        medications: 'Losartan',
        allergies: 'None known',
        social:
          'Retired. Lives with his wife in Porirua. Walks the track most weekends. Wearing wet cotton.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '96%',
          hr: '96',
          bp: '138/84',
          temp: '35.2',
          bgl: '5.4',
          pain: '8/10',
        },
      },
    ],
  },
  {
    id: 'remutaka-motorbike',
    complexity: 3,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Remutaka Hill motorbike',
    suburb: 'Kaitoke',
    rural: true,
    story:
      'A 44-year-old motorcyclist has come off on the Remutaka Hill Road; another rider is calling. He came off on a bend and is lying on the roadside, and his thigh looks wrong.',
    giveIfAsked: [
      'He hit the barrier with his left side.',
      'His left chest hurts when he breathes in (found only on a full survey).',
      'His helmet is scuffed, but he remembers the crash.',
    ],
    intention:
      'Manage a femur fracture with bleeding and a long transport. Watch for a full trauma survey despite the distracting injury, traction and splinting, bleeding control, and the transport and helicopter decision.',
    outcomes: [
      'Completes a full trauma survey despite the femur',
      'Applies traction and splinting and controls bleeding',
      'Makes a sound transport and helicopter decision',
    ],
    variations: [
      {
        lever: 'escalation',
        levels: ['paramedic'],
        text: 'Discuss when to consult about ketamine for the femur, and its risks.',
      },
      {
        lever: 'complexity',
        rung: 'unrelated',
        levels: ['supervised', 'paramedic'],
        text: 'More injuries or more history: a chest injury with falling SpO₂, or make him 70 on an anticoagulant.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'ICP phase 1: ketamine for analgesia and a traction splint.',
      },
    ],
    guidelines: ['cpg-4-23', 'cpg-4-11', 'cpg-4-2', 'cpg-1-12'],
    patients: [
      {
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Riding with a group from Upper Hutt. Married with two kids.',
        vitals: {
          gcs: '15',
          rr: '24',
          spo2: '97%',
          hr: '122',
          bp: '108/70',
          temp: '36.1',
          bgl: '6.8',
          pain: '10/10',
        },
      },
    ],
  },
  {
    id: 'in-the-cells',
    complexity: 2,
    load: 'single',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'In the cells',
    suburb: 'Lower Hutt',
    story:
      'A 33-year-old man in police custody needs assessment; police at the Hutt Valley station are calling. He is in the cells, shouting, sweating and fighting the officers.',
    giveIfAsked: [
      'He was arrested an hour ago after a disturbance in a shop.',
      'Police found a pipe on him, and he has schizophrenia.',
      'He hasn’t eaten or drunk anything since he arrived.',
    ],
    intention:
      'Manage acute behavioural disturbance safely with police. Watch for scene safety, looking for medical causes, sedation by the guideline, monitoring afterwards and the law on treatment without consent.',
    outcomes: [
      'Keeps the scene safe and works with police',
      'Looks for medical causes of the behaviour',
      'Sedates by the guideline, monitors afterwards and applies the law on treatment without consent',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'His temperature is 39.6 and his neck is stiff: is the behaviour from an infection?',
      },
      {
        lever: 'deterioration',
        levels: ['paramedic', 'icp'],
        text: 'After sedation he goes suddenly quiet: check airway and breathing at once.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'ICP phase 1: ketamine is needed; manage his airway and monitoring afterwards.',
      },
    ],
    guidelines: ['cpg-5-1', 'cpg-10-2', 'cpg-1-24'],
    patients: [
      {
        history: 'Schizophrenia. Methamphetamine use.',
        medications: 'Olanzapine (police found a full pack)',
        allergies: 'Unknown',
        social: 'Arrested an hour ago after a disturbance in a shop. Lives in emergency housing.',
        vitals: {
          gcs: '14',
          rr: '28',
          spo2: '95%',
          hr: '136',
          bp: '168/100',
          temp: '38.4',
          bgl: '6.9',
          pain: '?',
        },
      },
    ],
  },
  {
    id: 'rash-in-the-hostel',
    complexity: 2,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Rash in the hostel',
    suburb: 'Kelburn',
    story:
      'A 19-year-old woman is vomiting and unwell in a university hall; her friend is calling. She felt unwell overnight and her friend found her vomiting this morning.',
    giveIfAsked: [
      'There are a few purple spots on her legs that don’t fade when pressed.',
      'She has a headache and her legs ache.',
    ],
    intention:
      'Recognise meningococcal septicaemia early and treat it fast. Watch for infection precautions, the antibiotic given without delay, fluids for shock and warning the hospital.',
    outcomes: [
      'Uses infection precautions',
      'Gives the antibiotic without delay',
      'Gives fluids for shock and warns the hospital',
    ],
    variations: [
      {
        lever: 'uncertainty',
        levels: ['grad', 'supervised'],
        text: 'No spots at first: only vomiting and a fever, so it looks like gastro.',
      },
      {
        lever: 'scene',
        levels: ['supervised', 'paramedic'],
        text: 'Worried students crowd the corridor asking if they will catch it.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'She stays shocked despite fluids (BP 74/40) and needs a vasopressor.',
      },
    ],
    guidelines: ['cpg-6-3', 'cpg-6-2', 'cpg-6-9'],
    patients: [
      {
        history: 'Nil',
        medications: 'Oral contraceptive',
        allergies: 'None known',
        social:
          'First-year student in a university hall. Several people on her floor have had colds.',
        vitals: {
          gcs: '15',
          rr: '26',
          spo2: '96%',
          hr: '132',
          bp: '92/54',
          temp: '38.9',
          bgl: '5.1',
          pain: '6/10',
        },
      },
    ],
  },
  {
    id: 'birth-in-the-bathroom',
    complexity: 3,
    load: 'delegation',
    levels: ['grad', 'supervised', 'paramedic', 'icp'],
    title: 'Birth in the bathroom',
    suburb: 'Pukerua Bay',
    story:
      'A 27-year-old woman is in labour and pushing; her partner is calling. It is her second baby, at 39 weeks, and the midwife is 40 minutes away.',
    giveIfAsked: [
      'Her first labour was three hours.',
      'Her waters broke 20 minutes ago and were clear.',
    ],
    intention:
      'Manage an imminent birth, then a baby who is slow to breathe. Watch how they use the partner and their crewmate, prepare for the newborn before the birth and run newborn resuscitation. A variation: discuss a birth complication (shoulder dystocia, cord prolapse, a breech).',
    outcomes: [
      'Prepares for the newborn before the birth',
      'Gives the partner and crewmate clear roles',
      'Runs newborn resuscitation by the guideline',
    ],
    variations: [
      {
        lever: 'severity',
        levels: ['supervised', 'paramedic'],
        text: 'The baby is breech.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'Shoulder dystocia: the head is born but the body doesn’t follow.',
      },
      {
        lever: 'complexity',
        rung: 'unrelated',
        levels: ['paramedic', 'icp'],
        text: 'The mother bleeds heavily while the baby needs resuscitation: two patients at once.',
      },
    ],
    guidelines: ['cpg-8-6', 'cpg-8-7', 'cpg-7-3', 'cpg-1-8'],
    patients: [
      {
        history: 'Second pregnancy, 39 weeks. First labour was 3 hours.',
        medications: 'Iron tablets',
        allergies: 'None known',
        social: 'Lives with her partner and their 2-year-old, who is asleep.',
        vitals: {
          gcs: '15',
          rr: '24',
          spo2: '99%',
          hr: '112',
          bp: '128/80',
          temp: '36.9',
          bgl: '5.8',
          pain: '10/10',
        },
      },
    ],
  },
  {
    id: 'toddler-in-the-pool',
    complexity: 1,
    load: 'delegation',
    title: 'Toddler in the pool',
    suburb: 'Paraparaumu Beach',
    story:
      'A 2-year-old boy has been found in a pool; his uncle is calling. He was found face down in the backyard pool at a family barbecue, and a neighbour is doing CPR.',
    giveIfAsked: [
      'Nobody knows how long he was in the water; he was last seen about 10 minutes before.',
      'He weighs about 12 kg.',
    ],
    intention:
      'Run a paediatric cardiac arrest from drowning. Watch for rescue breaths, doses by weight, roles given to the crew and the neighbour, and looking after the distraught parents.',
    outcomes: [
      'Gives rescue breaths and doses by weight',
      'Gives roles to the crew and the neighbour',
      'Looks after the distraught parents',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['paramedic', 'icp'],
        text: 'The parents arrive screaming and the neighbour freezes: give everyone a role.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'Circulation returns after six minutes: post-arrest care for a child.',
      },
    ],
    guidelines: ['cpg-11-1', 'cpg-3-14', 'cpg-7-2', 'cpg-1-8'],
    patients: [
      {
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'At a family barbecue. Nobody knows how long he was in the water.',
        vitals: {
          gcs: '3',
          rr: '0',
          spo2: '–',
          hr: 'Asystole',
          bp: '–',
          temp: '35.4',
          bgl: '–',
          pain: '–',
        },
      },
    ],
  },
  {
    id: 'home-birth-haemorrhage',
    complexity: 1,
    load: 'delegation',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'Home birth haemorrhage',
    suburb: 'Te Horo',
    rural: true,
    story:
      'A 34-year-old woman is bleeding heavily after a home birth; her midwife is calling. She gave birth 20 minutes ago and the placenta hasn’t come.',
    giveIfAsked: [
      'She bled heavily after her last birth.',
      'The midwife has given oxytocin IM and estimates she has lost a litre.',
    ],
    intention:
      'Manage a postpartum haemorrhage far from hospital alongside the midwife. Watch for clear roles with the midwife, fundal massage and medicines, the helicopter decision and the transport checklist.',
    outcomes: [
      'Agrees clear roles with the midwife',
      'Gives fundal massage and medicines for the bleeding',
      'Makes the helicopter decision and uses the transport checklist',
    ],
    variations: [
      {
        lever: 'escalation',
        levels: ['supervised', 'paramedic'],
        text: 'The midwife has been called away to another birth: you lead alone until she can be reached.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'She stays shocked despite oxytocin and fundal massage.',
      },
    ],
    guidelines: ['cpg-8-2', 'cpg-8-8', 'cpg-1-12', 'cpg-1-8'],
    patients: [
      {
        history: 'Third baby. Bled heavily after her last birth.',
        medications: 'Iron tablets',
        allergies: 'None known',
        social:
          'Planned home birth on a lifestyle block. Her husband and two older children are there.',
        vitals: {
          gcs: '14',
          rr: '26',
          spo2: '97%',
          hr: '128',
          bp: '88/52',
          temp: '36.3',
          bgl: '5.6',
          pain: '5/10',
        },
      },
    ],
  },
  {
    id: 'cant-talk-asthma',
    complexity: 1,
    load: 'delegation',
    levels: ['supervised', 'paramedic', 'icp'],
    title: "Can't talk",
    suburb: 'Ascot Park',
    story:
      'A 36-year-old woman can’t breathe; her partner is calling. She has asthma and has been unwell with a cold.',
    giveIfAsked: [
      'She is sitting upright, can only say single words and is getting tired.',
      'She was admitted to ICU with asthma five years ago.',
      'She has used her reliever about 20 times in the last two hours.',
    ],
    intention:
      'Manage life-threatening asthma that is close to arrest. Watch for early adrenaline, getting more help, preparing for her to stop breathing and delegating tasks to the crew.',
    outcomes: [
      'Gives adrenaline early',
      'Calls for more help and delegates tasks to the crew',
      'Prepares for her to stop breathing',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['supervised', 'paramedic'],
        text: 'Her three children are frightened and her partner is panicking: delegate them.',
      },
      {
        lever: 'deterioration',
        levels: ['paramedic', 'icp'],
        text: 'She stops breathing: assisted ventilation in severe asthma.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'ICP phase 1: an adrenaline infusion and magnesium.',
      },
    ],
    guidelines: ['cpg-2-1', 'cpg-2-5', 'cpg-1-16', 'cpg-1-8'],
    patients: [
      {
        history: 'Asthma, ICU admission five years ago',
        medications: 'Salbutamol and budesonide with formoterol inhalers',
        allergies: 'Aspirin (wheeze)',
        social: 'Lives with her partner and three children. Has been unwell with a cold.',
        vitals: {
          gcs: '14',
          rr: '34',
          spo2: '86%',
          hr: '138',
          bp: '102/60',
          temp: '37.4',
          bgl: '7.4',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'stemi-arrest-tawa',
    complexity: 1,
    load: 'delegation',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'STEMI that arrests',
    suburb: 'Tawa',
    story:
      'A 62-year-old man has chest pain at home in Tawa; his wife is calling. It came on an hour ago, crushing and central, while he was watching TV.',
    giveIfAsked: ['He is pale and sweaty and has vomited.', 'His 12-lead shows an inferior STEMI.'],
    intention:
      'Manage a STEMI, then a cardiac arrest in the back of the ambulance and care after return of circulation: bring in VF during loading. Watch for roles inside a small space, the reperfusion pathway and the post-arrest checks.',
    outcomes: [
      'Recognises the STEMI and follows the reperfusion pathway',
      'Gives clear roles in a small space during the arrest',
      'Completes the post-arrest checks',
    ],
    variations: [
      {
        lever: 'escalation',
        levels: ['paramedic'],
        text: 'Talk through the reperfusion pathway and destination for where he is.',
      },
      {
        lever: 'complexity',
        rung: 'contradictory',
        levels: ['paramedic', 'icp'],
        text: 'He fell when the pain started and has a bleeding scalp wound: treatment for the STEMI may worsen the bleeding.',
      },
    ],
    guidelines: ['cpg-3-3', 'cpg-3-16', 'cpg-3-14', 'cpg-3-15', 'cpg-1-8'],
    patients: [
      {
        history: 'Hypertension, type 2 diabetes',
        medications: 'Cilazapril, metformin, aspirin',
        allergies: 'None known',
        social: 'Lives with his wife. Smokes 20 a day. Works as a courier.',
        vitals: {
          gcs: '15',
          rr: '22',
          spo2: '95%',
          hr: '58',
          bp: '98/62',
          temp: '36.6',
          bgl: '9.8',
          pain: '9/10',
        },
      },
    ],
  },
  {
    id: 'generator-garage',
    complexity: 1,
    load: 'several',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'Generator in the garage',
    suburb: 'Wainuiomata',
    story:
      'A family all have headaches during a power cut; the mum is calling. Everyone has a headache and her son has vomited.',
    giveIfAsked: [
      'They are running a petrol generator in the garage, moved in out of the rain.',
      'The mum is 28 weeks pregnant.',
      'The son was asleep in the room next to the garage.',
    ],
    intention:
      'Recognise carbon monoxide poisoning in a family and triage it. Watch for scene safety first, oxygen for everyone, the pregnant mum and the child, and asking for more ambulances. Ask the learner to keep a note of each patient separately.',
    outcomes: [
      'Puts scene safety first and recognises carbon monoxide poisoning',
      'Gives oxygen to everyone and prioritises the pregnant mum and the child',
      'Asks for more ambulances early',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['grad', 'supervised'],
        text: 'Only the mum and the son: a smaller first scenario with several patients.',
      },
      {
        lever: 'severity',
        levels: ['paramedic', 'icp'],
        text: 'The son’s GCS falls to 9.',
      },
    ],
    guidelines: ['cpg-5-4', 'cpg-1-11', 'cpg-7-1', 'cpg-8-3'],
    patients: [
      {
        label: 'Mum, 32 years old, headache and dizzy',
        history: '28 weeks pregnant',
        medications: 'Pregnancy multivitamin',
        allergies: 'None known',
        social:
          'Lives with her husband and two children. They moved the generator in out of the rain.',
        vitals: {
          gcs: '15',
          rr: '20',
          spo2: '99%',
          hr: '108',
          bp: '118/72',
          temp: '36.7',
          bgl: '5.4',
          pain: '6/10',
        },
      },
      {
        label: 'Son, 6 years old, drowsy and vomiting',
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Was asleep in the room next to the garage.',
        vitals: {
          gcs: '13',
          rr: '26',
          spo2: '99%',
          hr: '132',
          bp: '–',
          temp: '36.9',
          bgl: '5.0',
          pain: '?',
        },
      },
      {
        label: 'Dad, 35 years old, mild headache',
        history: 'Gout',
        medications: 'Allopurinol',
        allergies: 'None known',
        social: 'Was outside fixing the fence for most of the evening.',
        vitals: {
          gcs: '15',
          rr: '16',
          spo2: '99%',
          hr: '88',
          bp: '136/84',
          temp: '36.6',
          bgl: '6.1',
          pain: '3/10',
        },
      },
      {
        label: 'Daughter, 10 years old, feels fine',
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: "Was at a friend's house until an hour ago.",
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '99%',
          hr: '96',
          bp: '–',
          temp: '36.8',
          bgl: '5.6',
          pain: '0/10',
        },
      },
    ],
  },
  {
    id: 'bus-v-pedestrians',
    complexity: 1,
    load: 'several',
    levels: ['paramedic', 'icp'],
    title: 'Bus versus pedestrians',
    suburb: 'Te Aro',
    story:
      'A bus has mounted the kerb on Courtenay Place at 11 pm on a Friday, three people hurt; police are calling. A crowd has gathered.',
    giveIfAsked: [
      'The unconscious man was hit by the bus’s mirror and thrown onto the road.',
      'Police have two officers there; the crowd is getting rowdy.',
    ],
    intention:
      'Do first: a scenario with several patients, such as Generator in the garage. Take charge of a scene with several patients: triage, call for resources and give a clear handover. Watch for the first report, the triage order, management of the head injury and a safe crowd.',
    outcomes: [
      'Sends a clear first report and calls for resources',
      'Triages in a sensible order and manages the head injury',
      'Keeps the crowd safe and gives a clear handover',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['grad', 'supervised'],
        text: 'After a scenario with several patients, and with the mentor helping: only two patients.',
      },
      {
        lever: 'deterioration',
        levels: ['icp'],
        text: 'ICP phase 2: the unconscious man’s pupils become unequal: airway and destination.',
      },
    ],
    guidelines: ['cpg-1-11', 'cpg-4-2', 'cpg-4-10', 'cpg-1-9'],
    patients: [
      {
        label: '23-year-old man, struck by the bus, unconscious',
        history: 'Unknown',
        medications: 'Unknown',
        allergies: 'Unknown',
        social: 'On a night out. Friends say he had been drinking.',
        vitals: {
          gcs: '7',
          rr: '10',
          spo2: '91%',
          hr: '56',
          bp: '178/98',
          temp: '35.9',
          bgl: '6.2',
          pain: '?',
        },
      },
      {
        label: '21-year-old woman, deformed lower leg',
        history: 'Asthma',
        medications: 'Salbutamol inhaler',
        allergies: 'None known',
        social: 'Out with friends.',
        vitals: {
          gcs: '15',
          rr: '22',
          spo2: '97%',
          hr: '112',
          bp: '124/78',
          temp: '36.4',
          bgl: '5.9',
          pain: '8/10',
        },
      },
      {
        label: '40-year-old man, grazes and a sore wrist',
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'Walking home from work. Very upset.',
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '99%',
          hr: '98',
          bp: '134/86',
          temp: '36.6',
          bgl: '6.0',
          pain: '3/10',
        },
      },
    ],
  },
  {
    id: 'rest-home-gastro',
    complexity: 3,
    load: 'several',
    levels: ['paramedic'],
    title: 'Rest-home gastro',
    suburb: 'Naenae',
    story:
      'Three residents at a rest home are getting worse with a vomiting bug; the nurse is calling. Several residents have had it this week.',
    giveIfAsked: [
      'The man with Parkinson’s has missed two doses of his medicine because of vomiting.',
      'He is on gliclazide and has eaten nothing today.',
      'The 88-year-old woman has an advance care plan: no CPR, comfort-focused care.',
    ],
    intention:
      'Prioritise several elderly patients with fluid loss and decide who goes. Watch for infection precautions, the frailty of older patients, advance care plans and referral decisions for those who stay.',
    outcomes: [
      'Uses infection precautions',
      'Prioritises by frailty and fluid loss and checks advance care plans',
      'Makes sound referral decisions for those who stay',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['supervised'],
        text: 'Only two residents: the drowsy woman and the man with Parkinson’s.',
      },
      {
        lever: 'uncertainty',
        levels: ['paramedic', 'icp'],
        text: 'One resident’s vomiting is a bowel obstruction: a swollen abdomen and no wind passed.',
      },
      {
        lever: 'escalation',
        levels: ['paramedic', 'icp'],
        text: 'The drowsy woman’s advance care plan says no transfer: comfort care where she is.',
      },
    ],
    guidelines: ['cpg-12-13', 'cpg-6-9', 'cpg-12-9', 'cpg-1-6'],
    patients: [
      {
        label: '88-year-old woman, drowsy, low blood pressure',
        history: 'Dementia, heart failure, chronic kidney disease',
        medications: 'Furosemide, metoprolol, donepezil',
        allergies: 'None known',
        social: 'Lives in the hospital-level wing. Has an advance care plan.',
        vitals: {
          gcs: '14',
          rr: '22',
          spo2: '94%',
          hr: '112',
          bp: '86/50',
          temp: '37.8',
          bgl: '6.8',
          pain: '?',
        },
      },
      {
        label: '79-year-old man, vomiting, more stiff than usual',
        history: "Parkinson's disease, type 2 diabetes",
        medications: 'Levodopa with carbidopa, gliclazide',
        allergies: 'Penicillin (rash)',
        social: "Has missed two doses of his Parkinson's medicine because of vomiting.",
        vitals: {
          gcs: '15',
          rr: '18',
          spo2: '96%',
          hr: '98',
          bp: '118/70',
          temp: '37.4',
          bgl: '3.6',
          pain: '2/10',
        },
      },
      {
        label: '84-year-old woman, diarrhoea, drinking well',
        history: 'Osteoarthritis, hypothyroidism',
        medications: 'Levothyroxine, paracetamol',
        allergies: 'None known',
        social: 'Independent in the rest-home flats. Wants to stay.',
        vitals: {
          gcs: '15',
          rr: '16',
          spo2: '97%',
          hr: '86',
          bp: '128/74',
          temp: '37.1',
          bgl: '5.9',
          pain: '3/10',
        },
      },
    ],
  },
  {
    id: 'expressway-crash',
    complexity: 3,
    load: 'several',
    levels: ['icp'],
    title: 'Expressway crash',
    suburb: 'Peka Peka',
    rural: true,
    story:
      'A car has gone off the Kāpiti Expressway into a ditch at Peka Peka; a passing driver is calling. Inside are a pregnant driver and a child in a car seat, and you are the only crew for 20 minutes.',
    giveIfAsked: [
      'The driver is 32 weeks pregnant and her seatbelt crossed her bump.',
      'She hasn’t felt the baby move since the crash.',
    ],
    intention:
      'Manage two very different patients far from a trauma centre. Watch for triage, assessing a pregnant trauma patient, the child in the car seat, and when to ask for a helicopter and more crews.',
    outcomes: [
      'Triages both patients and asks early for a helicopter and more crews',
      'Assesses the pregnant trauma patient correctly',
      'Assesses the child in the car seat',
    ],
    variations: [
      {
        lever: 'scene',
        levels: ['paramedic'],
        text: 'A second crew arrives in 10 minutes instead of 20.',
      },
      {
        lever: 'severity',
        levels: ['icp'],
        text: 'The driver becomes shocked (BP 82/50): bleeding inside or from the placenta.',
      },
    ],
    guidelines: ['cpg-4-2', 'cpg-8-3', 'cpg-7-1', 'cpg-1-12', 'cpg-1-11'],
    patients: [
      {
        label: 'Driver, 30-year-old woman, abdominal pain from the seatbelt',
        history: '32 weeks pregnant',
        medications: 'Iron tablets',
        allergies: 'None known',
        social: 'Driving home to Ōtaki with her son. Her partner is at work in Wellington.',
        vitals: {
          gcs: '15',
          rr: '22',
          spo2: '98%',
          hr: '116',
          bp: '100/64',
          temp: '36.5',
          bgl: '5.7',
          pain: '7/10',
        },
      },
      {
        label: 'Son, 2 years old, still in his car seat',
        history: 'Nil',
        medications: 'Nil',
        allergies: 'None known',
        social: 'In a rear-facing car seat. Crying.',
        vitals: {
          gcs: '15',
          rr: '32',
          spo2: '99%',
          hr: '140',
          bp: '–',
          temp: '36.8',
          bgl: '–',
          pain: '?',
        },
      },
    ],
  },
];
