// Single entry point for the institutions knowledge base (universities, colleges, schools).
// Imported by the frontend (Vite) as `shared/data/universities/index.js` and by the backend (Node ESM).

import { KAZAKHSTAN_UNIVERSITIES } from './kazakhstan.js';
import { USA_UNIVERSITIES } from './usa.js';
import { EUROPE_UNIVERSITIES } from './europe.js';
import { ASIA_UNIVERSITIES } from './asia.js';
import { SCHOOLS_DATABASE } from './schools.js';
import { COLLEGES_DATABASE } from './colleges.js';

// Ensure category is explicitly set on all records
const UNIVERSITY_RECORDS = [
  ...KAZAKHSTAN_UNIVERSITIES,
  ...USA_UNIVERSITIES,
  ...EUROPE_UNIVERSITIES,
  ...ASIA_UNIVERSITIES,
].map((u) => (u.category ? u : { ...u, category: 'university' }));

/** @type {import('./schema').University[]} */
export const UNIVERSITY_DATABASE = [
  ...UNIVERSITY_RECORDS,
  ...SCHOOLS_DATABASE,
  ...COLLEGES_DATABASE,
];

/** @type {Map<string, import('./schema').University>} */
export const UNIVERSITY_BY_ID = new Map(UNIVERSITY_DATABASE.map((u) => [u.id, u]));

export const UNIVERSITY_COUNTS = {
  total: UNIVERSITY_DATABASE.length,
  universities: UNIVERSITY_RECORDS.length,
  schools: SCHOOLS_DATABASE.length,
  colleges: COLLEGES_DATABASE.length,
  kazakhstan: UNIVERSITY_DATABASE.filter((u) => u.region === 'kazakhstan').length,
  usa_canada: UNIVERSITY_DATABASE.filter((u) => u.region === 'usa_canada').length,
  europe: UNIVERSITY_DATABASE.filter((u) => u.region === 'europe').length,
  asia: UNIVERSITY_DATABASE.filter((u) => u.region === 'asia').length,
};

/** Validates that every record has the fields the matching engine depends on. Throws on the first problem. */
export function validateUniversityDatabase() {
  const seen = new Set();
  for (const u of UNIVERSITY_DATABASE) {
    if (seen.has(u.id)) throw new Error(`Duplicate university id: ${u.id}`);
    seen.add(u.id);
    for (const key of ['name', 'city', 'country', 'region', 'minGpa', 'minIelts', 'acceptanceRate', 'regularDeadline', 'officialPortalUrl']) {
      if (u[key] === undefined || u[key] === null || u[key] === '') {
        throw new Error(`University ${u.id} is missing required field "${key}"`);
      }
    }
    if (!Array.isArray(u.supportedMajors) || u.supportedMajors.length === 0) {
      throw new Error(`University ${u.id} has no supportedMajors`);
    }
  }
  return true;
}

export {
  KAZAKHSTAN_UNIVERSITIES,
  USA_UNIVERSITIES,
  EUROPE_UNIVERSITIES,
  ASIA_UNIVERSITIES,
  SCHOOLS_DATABASE,
  COLLEGES_DATABASE,
};
