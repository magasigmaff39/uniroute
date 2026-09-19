// Admission years the applicant can choose: from this year to five years ahead (a 7th-grader applies in five
// years), plus a year saved earlier that has already left that window, so an old answer never disappears.
const SPAN = 5;

export function admissionYears(saved?: string | null, today = new Date()): string[] {
  const first = today.getFullYear();
  const years = Array.from({ length: SPAN + 1 }, (_, i) => String(first + i));
  if (saved && /^\d{4}$/.test(saved) && !years.includes(saved)) years.unshift(saved);
  return years;
}

/** Admission campaign the knowledge-base deadlines belong to (entry in autumn of this year). */
export const KNOWLEDGE_BASE_INTAKE = 2027;
