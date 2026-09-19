// Motivation letter builder: the four stages and when a stage counts as drafted. Shared by the builder itself
// and the home page, which shows how far the letter has got.
import type { EssayDraft, EssayStage } from '../types';

export const ESSAY_STAGES: EssayStage[] = ['hook', 'projects', 'university', 'future'];

const filled = (v: string | undefined, min = 1) => (v || '').trim().length >= min;

/** A stage counts as drafted when its core fields hold real text. */
export function essayStageDone(stage: EssayStage, d: EssayDraft): boolean {
  if (stage === 'hook') return filled(d.hook, 100);
  if (stage === 'projects') return d.projects.some((p) => filled(p.title) && filled(p.result) && filled(p.problem));
  if (stage === 'university') return Boolean(d.university.universityId) && filled(d.university.whyUniversity, 40);
  return Object.values(d.future).filter((v) => filled(v, 15)).length >= 3;
}

export function essayProgress(d: EssayDraft | null | undefined): number {
  if (!d) return 0;
  try {
    return ESSAY_STAGES.filter((s) => essayStageDone(s, d)).length;
  } catch {
    return 0; // a draft saved by an older version with missing parts
  }
}
