// University fit and automatic target selection from the applicant's preferences (majors, regions,
// budget, scores, olympiads, climate / diet / safety). Shared by the React engine and the backend so
// "the AI picked these universities" means the same list everywhere.
import { estimateChance, normalizeGpa, parseAcceptanceRate } from './chance.js';

/** 45..98 — how well one university matches the applicant's preferences and numbers. */
export function scoreUniversityFit(profile, uni) {
  return Math.min(98, Math.max(45, rawFit(profile, uni)));
}

/** Uncapped fit used for ranking, so strong matches do not tie at the display ceiling. */
function rawFit(profile, uni) {
  const normGpa = normalizeGpa(Number(profile.gpa) || 0, profile.gpaScale || '4.0');
  const userIelts = profile.hasIelts ? Number(profile.ieltsScore) || 6.0 : 5.5;
  const userSat = profile.hasSat ? Number(profile.satScore) || 1200 : 0;
  const userUnt = profile.hasUnt ? Number(profile.untScore) || 80 : 0;
  const majors = profile.targetMajors || [];
  const regions = profile.targetRegions || [];

  let score = 70;
  const track = profile.targetTrack || (profile.grade === 'grade_7' || profile.grade === 'grade_8' ? 'school' : profile.grade === 'college' ? 'college' : 'university');
  if (uni.category === track) score += 20;
  else if (track !== 'all' && uni.category && uni.category !== track) score -= 30;

  if (uni.category === 'school' && (profile.grade === 'grade_7' || profile.grade === 'grade_8')) score += 15;
  if (uni.category === 'college' && profile.grade === 'grade_9') score += 15;

  if ((uni.supportedMajors || []).some((m) => majors.includes(m))) score += 15;
  if (regions.includes(uni.region)) score += 10;

  const gpaDiff = normGpa - uni.minGpa;
  if (gpaDiff >= 0.3) score += 10;
  else if (gpaDiff >= 0) score += 5;
  else score -= 15;

  const ieltsDiff = userIelts - uni.minIelts;
  if (ieltsDiff >= 0.5) score += 8;
  else if (ieltsDiff >= 0) score += 4;
  else score -= 12;

  if (uni.minSat) {
    if (userSat >= uni.minSat + 50) score += 10;
    else if (userSat >= uni.minSat) score += 5;
    else if (userSat === 0) score -= 10;
    else score -= 15;
  }
  if (uni.minUnt) {
    if (userUnt >= uni.minUnt + 15) score += 10;
    else if (userUnt >= uni.minUnt) score += 5;
    else if (userUnt === 0 && uni.region === 'kazakhstan') score -= 5;
  }

  if (profile.olympiadLevel === 'republican' || profile.olympiadLevel === 'international') {
    score += parseAcceptanceRate(uni.acceptanceRate) <= 20 ? 15 : 6;
  }

  // Soft preferences from the "personal" tab: climate, safety, diet.
  if (uni.environment && profile.climatePreference && profile.climatePreference !== 'any') {
    const climate = String(uni.environment.climate || '').toLowerCase();
    const warm = /жарк|тёпл|тепл|субтроп|средиземн|экватор|пустын/.test(climate);
    const cold = /холодн|снежн|резко|суров/.test(climate);
    if (profile.climatePreference === 'warm' && warm) score += 4;
    if (profile.climatePreference === 'warm' && cold) score -= 4;
    if (profile.climatePreference === 'cold' && cold) score += 3;
    if (profile.climatePreference === 'mild' && !warm && !cold) score += 3;
  }
  if (uni.campus && uni.campus.neighborhoodSafety <= 5) score -= 3;
  if (profile.dietaryNeeds && /хал|halal/i.test(profile.dietaryNeeds) && uni.environment) {
    const halal = (uni.environment.foodOptions || []).some((f) => /хал|halal/i.test(f));
    score += halal ? 2 : -4;
  }

  if (profile.budgetTier === 'grant_only') {
    if (uni.hasFullGrantOrScholarship) score += 10;
    else if (uni.tuitionUSDPerYear > 5000) score -= 40;
  } else if (profile.budgetTier === 'up_to_5k') {
    if (uni.tuitionUSDPerYear <= 5000 || uni.hasFullGrantOrScholarship) score += 5;
    else score -= 20;
  }

  return score;
}

/** Human-readable reasons (Russian; the UI translates dynamic strings) for why a university was picked. */
export function fitReasons(profile, uni) {
  const reasons = [];
  const majors = profile.targetMajors || [];
  if ((uni.supportedMajors || []).some((m) => majors.includes(m))) reasons.push('есть ваше направление');
  if ((profile.targetRegions || []).includes(uni.region)) reasons.push('выбранный регион');
  if (profile.budgetTier === 'grant_only' && uni.hasFullGrantOrScholarship) reasons.push('есть 100% грант');
  const c = estimateChance(profile, uni);
  reasons.push(`шанс ≈ ${c.probability}%`);
  return reasons;
}

/**
 * Picks a balanced application list (safety / target / dream) from the applicant's preferences.
 * @returns {Array<{ id: string, name: string, shortName: string, fit: number, probability: number, tier: string, reasons: string[] }>}
 */
export function pickTargetUniversities(profile, universities, { limit = 5 } = {}) {
  if (!profile) return [];
  const track = profile.targetTrack || (profile.grade === 'grade_7' || profile.grade === 'grade_8' ? 'school' : profile.grade === 'college' ? 'college' : 'university');
  const inTrack = track && track !== 'all' ? universities.filter((u) => u.category === track) : universities;
  const trackPool = inTrack.length >= limit ? inTrack : universities;

  const regions = profile.targetRegions || [];
  // Regions the applicant chose come first; other regions only fill the list when those run out.
  const inRegion = regions.length ? trackPool.filter((u) => regions.includes(u.region)) : trackPool;
  const pool = inRegion.length >= limit ? inRegion : trackPool;
  const ranked = pool
    .map((u) => {
      const chance = estimateChance(profile, u);
      return { id: u.id, name: u.name, shortName: u.shortName, fit: scoreUniversityFit(profile, u), raw: rawFit(profile, u), probability: chance.probability, tier: chance.tier, reasons: fitReasons(profile, u) };
    })
    .sort((a, b) => b.raw - a.raw || b.probability - a.probability);

  // Quotas keep the list realistic: mostly reachable options plus one or two ambitious ones.
  const quotas = limit >= 5 ? { Safety: 2, Target: 2, Dream: limit - 4 } : limit >= 3 ? { Safety: 1, Target: 1, Dream: limit - 2 } : { Safety: 0, Target: limit, Dream: 0 };
  const picked = [];
  const taken = new Set();
  for (const tier of ['Target', 'Safety', 'Dream']) {
    for (const u of ranked) {
      if (picked.length >= limit || (quotas[tier] || 0) <= 0) break;
      if (taken.has(u.id) || u.tier !== tier) continue;
      picked.push(u);
      taken.add(u.id);
      quotas[tier] -= 1;
    }
  }
  // Fill any unused quota with the best remaining matches.
  for (const u of ranked) {
    if (picked.length >= limit) break;
    if (!taken.has(u.id)) {
      picked.push(u);
      taken.add(u.id);
    }
  }
  return picked.sort((a, b) => b.raw - a.raw).map(({ raw: _raw, ...u }) => u);
}
