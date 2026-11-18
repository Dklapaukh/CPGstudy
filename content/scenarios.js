/*
 * Scenarios for mentors to run with students, grads and mentees (Quiz > Scenarios).
 * Hand-written. Each scenario is only an opening: the mentor runs and directs it from there.
 *
 * Fields:
 *   id         short unique name, used in the address (#scenario-<id>)
 *   level      1 to 5, see SCENARIO_LEVELS in src/constants.js
 *   title, suburb (Wellington, Porirua, Kāpiti or Hutt Valley), story
 *   intention  what the scenario practises and what to watch for
 *   guidelines guideline ids in the order they are shown (checked by tests/scenarios.test.js)
 *   patients   one or more { label (only when more than one), history, medications, allergies,
 *              social, vitals { gcs, rr, spo2, hr, bp, temp, bgl, pain } }. Vitals are text,
 *              so "VF" or "–" can be written; they are shown in that order.
 */
export const scenarios = [
  {
    id: 'netball-ankle',
    level: 1,
    title: 'Netball ankle',
    suburb: 'Hataitai',
    story: "A 34-year-old woman rolled her ankle at netball and can't put weight on it.",
    intention:
      'Run a full primary and secondary survey and handover on a stable patient. Insist on the whole structure even though the problem is obvious.',
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
    level: 1,
    title: 'Just not himself',
    suburb: 'Paraparaumu',
    story: 'A 72-year-old man\'s daughter called because he\'s been "off" for two days.',
    intention:
      'Take a structured history when there is no clear complaint. See whether they dig in or give up when nothing stands out; the prostate history and low fever point to a urinary infection.',
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
    level: 2,
    title: 'Chest pain mowing the lawns',
    suburb: 'Cannons Creek',
    story:
      'A 58-year-old man has had central chest pressure for 40 minutes, which started while he was mowing the lawns.',
    intention: 'Practise assessing chest pain. Watch whether they get a 12-lead early.',
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
    level: 2,
    title: 'Long lie',
    suburb: 'Waterloo, Lower Hutt',
    story:
      'An 84-year-old woman was found on the floor this morning after falling overnight. Her left hip is sore and the leg is shortened.',
    intention:
      'Assess a fall in an older person. Ask why she fell, and check for pressure areas and hypothermia. The codeine allergy tests the analgesia choice.',
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
    level: 2,
    title: 'Right-sided abdominal pain',
    suburb: 'Johnsonville',
    story:
      'A 26-year-old man has had abdominal pain since last night. It started around the belly button and has moved to the right lower abdomen.',
    intention:
      'Assess abdominal pain. Look for a systematic abdominal exam and a sensible analgesia choice.',
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
    level: 3,
    title: 'COPD or sepsis?',
    suburb: 'Ōtaki',
    story:
      'A 67-year-old woman with known COPD has been more short of breath for three days and is now feverish.',
    intention:
      'Work through differentials and titrate oxygen. Watch the oxygen target and whether they think of sepsis. Ask what the long trip to hospital changes.',
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
    level: 3,
    title: 'Head strike on warfarin',
    suburb: 'Waikanae',
    story:
      "A 79-year-old man tripped in the garden and hit his head. He's on warfarin. He was briefly confused and says he's fine now.",
    intention:
      'Recognise risk hidden behind a minor injury. Does anyone suggest leaving him at home? Ask whether he really tripped.',
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
    level: 4,
    title: 'Café anaphylaxis',
    suburb: 'Te Aro',
    story:
      'A 19-year-old woman ate a dish with peanuts in it and now has hives, wheeze and feels faint.',
    intention:
      'Lead a crew through several urgent interventions at once. The point is who does what (adrenaline, airway, IV access, fluids, a second adrenaline dose), not the medicine itself.',
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
    level: 4,
    title: 'Collapse at the gym',
    suburb: 'Trentham, Upper Hutt',
    story:
      "A 55-year-old man collapsed on the treadmill. Staff are doing CPR and have applied the gym's AED.",
    intention:
      'Run a cardiac arrest as team leader. Make them hand off compressions and keep oversight of the whole team. Bring in his partner whenever you want more pressure.',
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
    level: 5,
    title: 'Transmission Gully crash',
    suburb: 'Pāuatahanui',
    story:
      "Two cars have collided on State Highway 1 in Transmission Gully. You're a single crew and the first to arrive.",
    intention:
      "Triage, call for resources and manage the scene as the first crew there. Watch the first report, the triage order and when they ask for a helicopter. The passenger is the driver's mother and on an anticoagulant.",
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
];
