/* The guideline list used by every screen. Depends on content/guidelines.js and logic.js. */
import { guidelineData } from '../content/guidelines.js';
import { flattenGuidelines } from './logic.js';

export const guidelines = flattenGuidelines(guidelineData);
export const sections = guidelineData.sections;

/** The guideline with this id, or undefined. */
export const guidelineById = (id) => guidelines.find((guideline) => guideline.id === id);
