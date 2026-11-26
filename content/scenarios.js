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
    story: "A 34-year-old woman rolled her ankle at netball and can't put weight on it.",
    intention:
      'Run a full primary and secondary survey and handover on a stable patient. Insist on the whole structure even though the problem is obvious.',
    outcomes: [
      'Completes the primary survey before focusing on the ankle',
      'Examines the joints above and below and checks circulation, sensation and movement',
      'Gives a clear, structured handover',
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
    complexity: 1,
    load: 'single',
    levels: ['supervised', 'paramedic'],
    title: 'Just not himself',
    suburb: 'Paraparaumu',
    story: 'A 72-year-old man\'s daughter called because he\'s been "off" for two days.',
    intention:
      'Take a structured history when there is no clear complaint. See whether they dig in or give up when nothing stands out; the prostate history and low fever point to a urinary infection.',
    outcomes: [
      'Takes a structured history although there is no clear complaint',
      'Does a full set of vitals and a head-to-toe check',
      'Links the prostate history and low fever to a possible urinary infection',
    ],
    guidelines: ['cpg-1-17', 'cpg-12-9', 'cpg-1-6'],
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Chest pain mowing the lawns',
    suburb: 'Cannons Creek',
    story:
      'A 58-year-old man has had central chest pressure for 40 minutes, which started while he was mowing the lawns.',
    intention: 'Practise assessing chest pain. Watch whether they get a 12-lead early.',
    outcomes: [
      'Gets a 12-lead ECG early and interprets it',
      'Takes a focused chest pain history, including risk factors',
      'Treats and gives pain relief by the guideline',
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad', 'supervised', 'paramedic'],
    title: 'Long lie',
    suburb: 'Waterloo, Lower Hutt',
    story:
      'An 84-year-old woman was found on the floor this morning after falling overnight. Her left hip is sore and the leg is shortened.',
    intention:
      'Assess a fall in an older person. Ask why she fell, and check for pressure areas and hypothermia. The codeine allergy tests the analgesia choice.',
    outcomes: [
      'Asks why she fell and looks for a medical cause',
      'Checks for pressure areas, hypothermia and injuries from the long lie',
      'Chooses pain relief that suits her codeine allergy',
    ],
    guidelines: ['cpg-13-3', 'cpg-4-11', 'cpg-1-18', 'cpg-12-9'],
    patients: [
      {
        history: 'Osteoporosis, hypertension, hypothyroidism',
        medications: 'Alendronate (weekly), amlodipine, levothyroxine',
        allergies: 'Codeine (vomiting)',
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
      'A 26-year-old man has had abdominal pain since last night. It started around the belly button and has moved to the right lower abdomen.',
    intention:
      'Assess abdominal pain. Look for a systematic abdominal exam and a sensible analgesia choice.',
    outcomes: [
      'Does a systematic abdominal examination',
      'Considers the serious causes of right-sided pain',
      'Chooses sensible pain relief and gives it by the guideline',
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
    complexity: 3,
    load: 'single',
    levels: ['grad'],
    title: 'COPD or sepsis?',
    suburb: 'Ōtaki',
    story:
      'A 67-year-old woman with known COPD has been more short of breath for three days and is now feverish.',
    intention:
      'Work through differentials and titrate oxygen. Watch the oxygen target and whether they think of sepsis. Ask what the long trip to hospital changes.',
    outcomes: [
      'Titrates oxygen to the right target for COPD',
      'Considers sepsis alongside an exacerbation',
      'Plans for the long trip to hospital',
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
    complexity: 3,
    load: 'single',
    levels: ['student'],
    title: 'Head strike on warfarin',
    suburb: 'Waikanae',
    story:
      "A 79-year-old man tripped in the garden and hit his head. He's on warfarin. He was briefly confused and says he's fine now.",
    intention:
      'Recognise risk hidden behind a minor injury. Does anyone suggest leaving him at home? Ask whether he really tripped.',
    outcomes: [
      'Recognises the bleeding risk of a head strike on warfarin',
      'Asks whether he really tripped and looks for a medical cause',
      'Transports him rather than leaving him at home',
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
    complexity: 2,
    load: 'delegation',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Café anaphylaxis',
    suburb: 'Te Aro',
    story:
      'A 19-year-old woman ate a dish with peanuts in it and now has hives, wheeze and feels faint.',
    intention:
      'Lead a crew through several urgent interventions at once. The point is who does what (adrenaline, airway, IV access, fluids, a second adrenaline dose), not the medicine itself.',
    outcomes: [
      'Gives intramuscular adrenaline without delay',
      'Gives each crew member a clear task (airway, IV access, fluids)',
      'Reassesses and gives a second adrenaline dose when needed',
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
    complexity: 2,
    load: 'delegation',
    levels: ['supervised', 'paramedic'],
    title: 'Collapse at the gym',
    suburb: 'Trentham, Upper Hutt',
    story:
      "A 55-year-old man collapsed on the treadmill. Staff are doing CPR and have applied the gym's AED.",
    intention:
      'Run a cardiac arrest as team leader. Make them hand off compressions and keep oversight of the whole team. Bring in his partner whenever you want more pressure.',
    outcomes: [
      'Leads the team and keeps oversight rather than doing compressions',
      'Organises compression changes and keeps pauses short',
      'Follows the arrest guideline for rhythm checks, shocks and medicines',
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
      "Two cars have collided on State Highway 1 in Transmission Gully. You're a single crew and the first to arrive.",
    intention:
      "Triage, call for resources and manage the scene as the first crew there. Watch the first report, the triage order and when they ask for a helicopter. The passenger is the driver's mother and on an anticoagulant.",
    outcomes: [
      'Sends a clear first report and asks for resources early',
      'Triages all three patients in a sensible order',
      'Weighs the passenger’s anticoagulant and the helicopter decision',
    ],
    guidelines: ['cpg-1-11', 'cpg-4-2', 'cpg-4-23', 'cpg-1-12'],
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
      'A 6-year-old boy fell off the backyard trampoline onto his outstretched hand. His mum says his wrist "looks funny".',
    intention:
      'Run the full structure on a child: talk to the child as well as the parent, get child-sized vitals and use the paediatric ranges. Watch whether the obvious wrist stops them checking for other injuries.',
    outcomes: [
      'Talks to the child as well as the parent',
      'Uses the paediatric ranges for the vitals',
      'Checks for other injuries beyond the obvious wrist',
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
    complexity: 1,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Dizzy at the bus stop',
    suburb: 'Lower Hutt',
    story:
      'A 45-year-old woman is sitting on the footpath at a bus stop on High Street. She says the world is spinning and she has vomited once.',
    intention:
      'Keep to the structure when nothing obvious stands out. Watch whether they separate vertigo from light-headedness and look for the features that point to a stroke rather than an inner-ear cause.',
    outcomes: [
      'Keeps to the full assessment structure',
      'Separates vertigo from light-headedness',
      'Looks for features of a stroke rather than an inner-ear cause',
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
      'An 81-year-old woman slipped on her kitchen floor. Her neighbour helped her up and called 111. She is adamant she is not going to hospital.',
    intention:
      'Practise assessing capacity, informed consent and a safe decision to leave someone at home. Watch for a full falls assessment, a clear explanation of the risks and a sensible safety-net plan.',
    outcomes: [
      'Assesses capacity and informed consent',
      'Does a full falls assessment',
      'Explains the risks clearly and leaves a safety-net plan',
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
    complexity: 1,
    load: 'single',
    levels: ['paramedic'],
    title: 'Hot toddler',
    suburb: 'Ranui',
    story:
      'An 18-month-old girl has had a fever since yesterday. Her dad is worried because she is "floppy" and not drinking much.',
    intention:
      'Assess a febrile young child in a structured way and make a treatment and referral decision. Watch for hydration, a look for a rash and how they explain what to watch for if she stays home.',
    outcomes: [
      'Assesses hydration and looks for a rash',
      'Makes a clear treatment and referral decision',
      'Explains what to watch for if she stays home',
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad', 'supervised', 'paramedic', 'icp'],
    title: 'Wheezy at school',
    suburb: 'Naenae',
    story:
      'A 15-year-old girl became short of breath during PE. The school nurse has given her four puffs of her inhaler and called you.',
    intention:
      'Grade the severity of asthma and treat by the guideline, with the dose for her age and weight. Watch whether they reassess after each nebuliser and decide on transport.',
    outcomes: [
      'Grades the severity of the asthma',
      'Gives the right dose for her age and weight',
      'Reassesses after each nebuliser and decides on transport',
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
          spo2: '93%',
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
    complexity: 2,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Croup at 2 am',
    suburb: 'Titahi Bay',
    story:
      'A 3-year-old boy woke at 2 am with a barking cough and noisy breathing. His mum has him on her knee in the bathroom with the shower running.',
    intention:
      'Recognise croup, grade it and treat it while keeping the child calm. Watch that they leave him with his mum, avoid upsetting him, and separate croup from other causes of stridor.',
    outcomes: [
      'Recognises and grades the croup',
      'Keeps the child calm and with his mum',
      'Considers other causes of stridor',
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Hypo on the building site',
    suburb: 'Petone',
    story:
      'A 39-year-old builder is sweaty and confused. His workmates say he skipped lunch and has type 1 diabetes.',
    intention:
      "Treat hypoglycaemia and decide whether he can safely stay. Watch for the cause, a repeat glucose, food after treatment and the conditions for leaving him in someone's care.",
    outcomes: [
      'Treats the low glucose and repeats the glucose check',
      'Looks for the cause and makes sure he eats',
      'Applies the conditions for leaving him in someone’s care',
    ],
    guidelines: ['cpg-5-3', 'cpg-1-6'],
    patients: [
      {
        history: 'Type 1 diabetes since age 12',
        medications: 'Insulin glargine at night, insulin aspart with meals',
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Seizure at Coastlands',
    suburb: 'Paraparaumu',
    story:
      'A 24-year-old man had a seizure in the food court. It has stopped, and his friend says "he\'s fine, he has these all the time".',
    intention:
      "Manage the post-ictal patient and decide on transport. Watch whether they check for injuries and for a change to his usual seizures, and whether they assess his capacity before taking the friend's word.",
    outcomes: [
      'Checks for injuries after the seizure',
      'Asks whether this seizure was different from his usual ones',
      'Assesses his capacity before taking the friend’s word',
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad'],
    title: 'Stroke at breakfast',
    suburb: 'Stokes Valley',
    story:
      'A 67-year-old man dropped his cup at breakfast and his wife noticed his face drooping. It started 35 minutes ago.',
    intention:
      'Recognise a stroke, establish the time of onset and decide on the stroke clot retrieval pathway. Watch for a quick scene time and a clear radio notification to hospital.',
    outcomes: [
      'Recognises the stroke and establishes the time of onset',
      'Applies the clot retrieval pathway',
      'Keeps the scene time short and gives a clear radio notification',
    ],
    guidelines: ['cpg-12-6', 'cpg-12-8', 'cpg-1-23'],
    patients: [
      {
        history: 'Atrial fibrillation, high cholesterol',
        medications: "Apixaban (his wife thinks he missed last night's dose), atorvastatin",
        allergies: 'None known',
        social: 'Retired electrician. Lives with his wife. Ex-smoker.',
        vitals: {
          gcs: '14',
          rr: '16',
          spo2: '96%',
          hr: '96 irregular',
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
    complexity: 2,
    load: 'single',
    levels: ['student', 'grad', 'supervised'],
    title: 'Racing heart at work',
    suburb: 'Wellington Central',
    story:
      'A 28-year-old office worker has had a pounding heart for 30 minutes. A colleague called 111.',
    intention:
      'Identify SVT on the monitor and manage it by the guideline. Watch for a 12-lead before and after treatment, vagal manoeuvres done well and the signs that would make it unstable.',
    outcomes: [
      'Identifies SVT and records a 12-lead before and after treatment',
      'Performs vagal manoeuvres well',
      'Knows the signs that would make it unstable',
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
      'A 31-year-old woman who is nine weeks pregnant has bleeding and lower abdominal cramping that started this morning.',
    intention:
      'Assess bleeding in early pregnancy, look for shock and think of ectopic pregnancy. Watch for a sensitive approach, pain relief and a clear explanation of where she is going.',
    outcomes: [
      'Looks for shock and considers an ectopic pregnancy',
      'Takes a sensitive approach and gives pain relief',
      'Explains clearly where she is going and why',
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
    complexity: 2,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'The phone call',
    suburb: 'Newtown',
    story:
      'A 22-year-old man rang a friend and said he was going to end his life. The friend called 111. Police are on their way.',
    intention:
      'Assess someone with thoughts of suicide: build rapport, ask directly and assess risk and capacity. Watch for scene safety, a calm conversation and a plan that keeps him safe.',
    outcomes: [
      'Keeps the scene safe',
      'Builds rapport and asks directly about suicide',
      'Assesses risk and capacity and makes a plan that keeps him safe',
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
    complexity: 2,
    load: 'single',
    levels: ['grad', 'supervised'],
    title: 'Back gone lifting',
    suburb: 'Upper Hutt',
    story:
      'A 52-year-old man felt his lower back "go" while lifting a bag of concrete. He is lying on the garage floor.',
    intention:
      'Assess non-traumatic back pain, give good pain relief and search for the red flags. Watch whether they ask about bladder and bowel control, numbness in the saddle area and leg weakness.',
    outcomes: [
      'Asks about bladder and bowel control, saddle numbness and leg weakness',
      'Gives good pain relief',
      'Makes a safe transport or referral decision',
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
      "A 17-year-old girl's mum found her drowsy in her bedroom with empty blister packs of her mum's medicines. The girl won't say how many she took.",
    intention:
      'Manage a mixed overdose of medicines in a young person who may not consent. Watch for working out what and how much was taken and when, an ECG, thinking about her safety at home, and capacity for a 17-year-old.',
    outcomes: [
      'Works out what was taken, how much and when',
      'Records an ECG',
      'Considers her safety at home and her capacity at 17',
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
      'Flatmates called because a 20-year-old man is hot, sweaty and agitated after a party. They say he "took something".',
    intention:
      'Manage recreational drug toxicity with hyperthermia and agitation. Watch for scene safety, cooling, sedation decisions and recognising when this is becoming life-threatening.',
    outcomes: [
      'Keeps the scene safe',
      'Starts cooling and makes sound sedation decisions',
      'Recognises when it is becoming life-threatening',
    ],
    guidelines: ['cpg-5-6', 'cpg-11-3', 'cpg-5-1'],
    patients: [
      {
        history: 'Nil known',
        medications: 'Nil',
        allergies: 'Unknown',
        social:
          'Student. Flatmates think he took MDMA and maybe something else. Has been dancing for hours.',
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
    complexity: 3,
    load: 'single',
    levels: ['supervised', 'paramedic'],
    title: 'Baby not feeding',
    suburb: 'Waitangirua',
    story:
      'A 4-month-old baby has had a cough for three days and is now taking half her usual feeds. Her nana is looking after her.',
    intention:
      'Assess bronchiolitis and decide whether a borderline baby needs to go. Watch for counting breathing properly, feeding and wet nappies, the risk factors that lower the threshold, and how they involve nana.',
    outcomes: [
      'Counts the breathing properly and asks about feeding and wet nappies',
      'Names the risk factors that lower the threshold to transport',
      'Involves nana in the decision',
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
    complexity: 3,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Headache at 36 weeks',
    suburb: 'Kilbirnie',
    story:
      'A 29-year-old woman who is 36 weeks pregnant has a severe headache and blurred vision. Partway through the job, she has a seizure.',
    intention:
      'Recognise pre-eclampsia, then manage an eclamptic seizure. Watch for checking the blood pressure early, positioning for pregnancy, the treatment of the seizure and early notice to the hospital.',
    outcomes: [
      'Checks the blood pressure early and recognises pre-eclampsia',
      'Positions her correctly for pregnancy',
      'Treats the eclamptic seizure and warns the hospital early',
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
    title: 'Tramper at Ōtaki Forks',
    suburb: 'Ōtaki Forks',
    rural: true,
    story:
      "A 61-year-old tramper slipped on the track about an hour's walk in. It is late afternoon, raining and 9°C. His friend walked out to get signal.",
    intention:
      'Manage a lower leg fracture far from the road, with hypothermia setting in. Watch for planning the extraction early, asking for a helicopter or more crew, keeping him warm and pain relief for a long carry.',
    outcomes: [
      'Plans the extraction early and asks for a helicopter or more crew',
      'Keeps him warm',
      'Gives pain relief that will last a long carry',
    ],
    guidelines: ['cpg-4-11', 'cpg-11-4', 'cpg-1-12', 'cpg-1-18'],
    patients: [
      {
        history: 'Hypertension, hip replacement two years ago',
        medications: 'Losartan',
        allergies: 'None known',
        social:
          'Retired. Lives with his wife in Waikanae. Tramps every weekend. Wearing wet cotton.',
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
      'A 44-year-old motorcyclist came off on a bend on the Remutaka Hill Road. His thigh is deformed and he is lying on the roadside.',
    intention:
      'Manage a femur fracture with bleeding and a long transport. Watch for a full trauma survey despite the distracting injury, traction and splinting, bleeding control, and the transport and helicopter decision.',
    outcomes: [
      'Completes a full trauma survey despite the femur',
      'Applies traction and splinting and controls bleeding',
      'Makes a sound transport and helicopter decision',
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
    complexity: 3,
    load: 'single',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'In the cells',
    suburb: 'Lower Hutt',
    story:
      'Police have asked you to see a 33-year-old man in the cells at the Hutt Valley police station. He is shouting, sweating and fighting the officers.',
    intention:
      'Manage acute behavioural disturbance safely with police. Watch for scene safety, looking for medical causes, sedation by the guideline, monitoring afterwards and the law on treatment without consent.',
    outcomes: [
      'Keeps the scene safe and works with police',
      'Looks for medical causes of the behaviour',
      'Sedates by the guideline, monitors afterwards and applies the law on treatment without consent',
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
    complexity: 3,
    load: 'single',
    levels: ['grad', 'supervised', 'paramedic'],
    title: 'Rash in the hostel',
    suburb: 'Kelburn',
    story:
      'A 19-year-old student felt unwell overnight. Her friend found her vomiting and noticed a few purple spots on her legs.',
    intention:
      'Recognise meningococcal septicaemia early and treat it fast. Watch for infection precautions, the antibiotic given without delay, fluids for shock and warning the hospital.',
    outcomes: [
      'Uses infection precautions',
      'Gives the antibiotic without delay',
      'Gives fluids for shock and warns the hospital',
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
      'A 27-year-old woman in her second labour is on the bathroom floor, pushing. Her partner is on the phone to the midwife, who is 40 minutes away.',
    intention:
      'Manage an imminent birth, then a baby who is slow to breathe. Watch how they use the partner and their crewmate, prepare for the newborn before the birth and run newborn resuscitation.',
    outcomes: [
      'Prepares for the newborn before the birth',
      'Gives the partner and crewmate clear roles',
      'Runs newborn resuscitation by the guideline',
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
    complexity: 3,
    load: 'delegation',
    title: 'Toddler in the pool',
    suburb: 'Paraparaumu Beach',
    story:
      'A 2-year-old boy was found face down in a backyard pool. A neighbour is doing CPR when you arrive.',
    intention:
      'Run a paediatric cardiac arrest from drowning. Watch for rescue breaths, doses by weight, roles given to the crew and the neighbour, and looking after the distraught parents.',
    outcomes: [
      'Gives rescue breaths and doses by weight',
      'Gives roles to the crew and the neighbour',
      'Looks after the distraught parents',
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
    complexity: 3,
    load: 'delegation',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'Home birth haemorrhage',
    suburb: 'Te Horo',
    rural: true,
    story:
      "A 34-year-old woman gave birth at home 20 minutes ago. Her midwife says she is bleeding heavily and the placenta hasn't come.",
    intention:
      'Manage a postpartum haemorrhage far from hospital alongside the midwife. Watch for clear roles with the midwife, fundal massage and medicines, the helicopter decision and the transport checklist.',
    outcomes: [
      'Agrees clear roles with the midwife',
      'Gives fundal massage and medicines for the bleeding',
      'Makes the helicopter decision and uses the transport checklist',
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
    complexity: 3,
    load: 'delegation',
    levels: ['supervised', 'paramedic', 'icp'],
    title: "Can't talk",
    suburb: 'Ascot Park',
    story:
      "A 36-year-old woman's partner called because she can't breathe. She is sitting upright, can only say single words and is getting tired.",
    intention:
      'Manage life-threatening asthma that is close to arrest. Watch for early adrenaline, getting more help, preparing for her to stop breathing and delegating tasks to the crew.',
    outcomes: [
      'Gives adrenaline early',
      'Calls for more help and delegates tasks to the crew',
      'Prepares for her to stop breathing',
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
    complexity: 3,
    load: 'delegation',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'STEMI that arrests',
    suburb: 'Tawa',
    story:
      'A 62-year-old man has crushing chest pain. His 12-lead shows an inferior STEMI. During loading he goes into VF.',
    intention:
      'Manage a STEMI, then a cardiac arrest in the back of the ambulance and care after return of circulation. Watch for roles inside a small space, the reperfusion pathway and the post-arrest checks.',
    outcomes: [
      'Recognises the STEMI and follows the reperfusion pathway',
      'Gives clear roles in a small space during the arrest',
      'Completes the post-arrest checks',
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
    complexity: 2,
    load: 'several',
    levels: ['supervised', 'paramedic', 'icp'],
    title: 'Generator in the garage',
    suburb: 'Wainuiomata',
    story:
      'During a power cut a family ran a petrol generator in their garage. The mum called because everyone has a headache and her son vomited.',
    intention:
      'Recognise carbon monoxide poisoning in a family and triage it. Watch for scene safety first, oxygen for everyone, the pregnant mum and the child, and asking for more ambulances.',
    outcomes: [
      'Puts scene safety first and recognises carbon monoxide poisoning',
      'Gives oxygen to everyone and prioritises the pregnant mum and the child',
      'Asks for more ambulances early',
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
    complexity: 3,
    load: 'several',
    levels: ['paramedic', 'icp'],
    title: 'Bus versus pedestrians',
    suburb: 'Te Aro',
    story:
      'A bus mounted the kerb on Courtenay Place at 11 pm on a Friday. Three people are hurt and a crowd has gathered.',
    intention:
      'Take charge of a scene with several patients: triage, call for resources and give a clear handover. Watch for the first report, the triage order, management of the head injury and a safe crowd.',
    outcomes: [
      'Sends a clear first report and calls for resources',
      'Triages in a sensible order and manages the head injury',
      'Keeps the crowd safe and gives a clear handover',
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
    complexity: 2,
    load: 'several',
    levels: ['paramedic'],
    title: 'Rest-home gastro',
    suburb: 'Naenae',
    story:
      'A rest home has a vomiting bug. The nurse has asked you to see three residents who are getting worse.',
    intention:
      'Prioritise several elderly patients with fluid loss and decide who goes. Watch for infection precautions, the frailty of older patients, advance care plans and referral decisions for those who stay.',
    outcomes: [
      'Uses infection precautions',
      'Prioritises by frailty and fluid loss and checks advance care plans',
      'Makes sound referral decisions for those who stay',
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
      'A car has gone off the Kāpiti Expressway into a ditch at Peka Peka. Inside are a pregnant driver and a child in a car seat. You are the only crew for 20 minutes.',
    intention:
      'Manage two very different patients far from a trauma centre. Watch for triage, assessing a pregnant trauma patient, the child in the car seat, and when to ask for a helicopter and more crews.',
    outcomes: [
      'Triages both patients and asks early for a helicopter and more crews',
      'Assesses the pregnant trauma patient correctly',
      'Assesses the child in the car seat',
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
