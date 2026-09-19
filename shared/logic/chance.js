// Admission-chance estimator shared by the frontend (instant, offline) and the backend (/api/chance).
//
// The model is deliberately transparent: a base probability derived from the university's acceptance
// rate is adjusted by explainable factors (GPA gap, IELTS gap, SAT/UNT gap, olympiads, activities, fit,
// budget). When a test has not been taken yet we return *projections* — what the probability would be
// at several plausible scores — plus a preparation plan sized to the gap.
import { PREP_PLANS } from '../data/admissionsKnowledge.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function normalizeGpa(gpa, scale) {
  if (!gpa) return 0;
  return scale === '5.0' ? clamp((gpa / 5) * 4, 0, 4) : clamp(gpa, 0, 4);
}

export function parseAcceptanceRate(rate) {
  const m = String(rate || '').match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return clamp(parseFloat(m[1]), 1, 95);
  // Non-percentage descriptions (e.g. "Numerus fixus") → assume selective
  return 25;
}

/**
 * Core factor computation. Returns { probability, factors, tier } for a given (profile, university, overrides).
 * `overrides` lets projections substitute a hypothetical IELTS/SAT/UNT score.
 */
export function estimateChance(profile, uni, overrides = {}) {
  const factors = [];
  const acceptance = parseAcceptanceRate(uni.acceptanceRate);
  // Base: acceptance rate compressed towards the middle so a 4% school starts at ~10% for a *qualified* applicant.
  let p = clamp(8 + acceptance * 0.9, 5, 85);

  const gpa = normalizeGpa(profile.gpa, profile.gpaScale);
  const gpaGap = gpa - uni.minGpa;
  if (gpaGap >= 0.3) push(factors, 'GPA', +12, `GPA ${gpa.toFixed(2)} заметно выше порога ${uni.minGpa}`);
  else if (gpaGap >= 0) push(factors, 'GPA', +5, `GPA ${gpa.toFixed(2)} соответствует порогу ${uni.minGpa}`);
  else if (gpaGap >= -0.3) push(factors, 'GPA', -12, `GPA ${gpa.toFixed(2)} ниже порога ${uni.minGpa}`);
  else push(factors, 'GPA', -25, `GPA ${gpa.toFixed(2)} существенно ниже порога ${uni.minGpa}`);

  // IELTS
  const ielts = overrides.ielts ?? (profile.hasIelts ? profile.ieltsScore : null);
  const isLocalSchoolOrCollege = uni.region === 'kazakhstan' && (uni.category === 'school' || uni.category === 'college');
  if (ielts == null) {
    if (isLocalSchoolOrCollege) {
      push(factors, 'IELTS', -2, `Языковой сертификат опционален (отбор по внутреннему тестированию и табелю)`);
    } else {
      push(factors, 'IELTS', -18, `IELTS ещё не сдан (требуется ${uni.minIelts}+)`);
    }
  } else {
    const gap = ielts - uni.minIelts;
    if (gap >= 1) push(factors, 'IELTS', +10, `IELTS ${ielts} — сильный запас над порогом ${uni.minIelts}`);
    else if (gap >= 0.5) push(factors, 'IELTS', +7, `IELTS ${ielts} выше порога ${uni.minIelts}`);
    else if (gap >= 0) push(factors, 'IELTS', +3, `IELTS ${ielts} на пороге ${uni.minIelts}`);
    else if (gap >= -0.5) push(factors, 'IELTS', -14, `IELTS ${ielts} ниже порога ${uni.minIelts} на полбалла`);
    else push(factors, 'IELTS', -28, `IELTS ${ielts} значительно ниже порога ${uni.minIelts}`);
  }

  // SAT (only where the university uses it)
  const policy = uni.admissions?.testPolicy || (uni.minSat ? 'required' : uni.minUnt ? 'unt' : 'optional');
  if (uni.minSat && policy !== 'blind') {
    const sat = overrides.sat ?? (profile.hasSat ? profile.satScore : null);
    if (sat == null) {
      if (policy === 'required') push(factors, 'SAT', -22, `SAT обязателен (ориентир ${uni.minSat}+), ещё не сдан`);
      else push(factors, 'SAT', -6, `SAT опционален, но ${uni.minSat}+ усилил бы заявку`);
    } else {
      const gap = sat - uni.minSat;
      if (gap >= 80) push(factors, 'SAT', +14, `SAT ${sat} — уровень зачисленных (${uni.minSat}+)`);
      else if (gap >= 0) push(factors, 'SAT', +7, `SAT ${sat} проходит ориентир ${uni.minSat}`);
      else if (gap >= -80) push(factors, 'SAT', -12, `SAT ${sat} чуть ниже ориентира ${uni.minSat}`);
      else push(factors, 'SAT', -24, `SAT ${sat} заметно ниже ориентира ${uni.minSat}`);
    }
  }

  // UNT for Kazakhstan grant competition
  if (uni.minUnt) {
    const unt = overrides.unt ?? (profile.hasUnt ? profile.untScore : null);
    if (unt == null) {
      push(factors, 'ЕНТ', uni.region === 'kazakhstan' ? -15 : -4, `ЕНТ не сдан (для гранта ориентир ${uni.minUnt}+)`);
    } else {
      const gap = unt - uni.minUnt;
      if (gap >= 20) push(factors, 'ЕНТ', +16, `ЕНТ ${unt} — уверенно на грант (${uni.minUnt}+)`);
      else if (gap >= 0) push(factors, 'ЕНТ', +8, `ЕНТ ${unt} проходит порог ${uni.minUnt}`);
      else push(factors, 'ЕНТ', -18, `ЕНТ ${unt} ниже порога ${uni.minUnt}`);
    }
  }

  // Olympiads
  const oly = profile.olympiadLevel || 'none';
  if (oly === 'international') push(factors, 'Олимпиады', +22, 'Международная олимпиада — сильнейший сигнал для STEM-вузов');
  else if (oly === 'republican') push(factors, 'Олимпиады', +14, 'Республиканская олимпиада — конкурентное преимущество');
  else if (oly === 'city') push(factors, 'Олимпиады', +6, 'Городская олимпиада — плюс к портфолио');
  else if (acceptance <= 15) push(factors, 'Олимпиады', -6, 'Нет олимпиадных наград — для селективного вуза это минус');

  // Activities / leadership — weighted more for holistic (US) admissions
  const acts = (profile.leadershipActivities || []).length + (profile.extracurriculars || []).length;
  const holistic = uni.region === 'usa_canada' || (uni.admissions?.interview ?? false);
  if (acts >= 4) push(factors, 'Портфолио', holistic ? +12 : +5, 'Насыщенное внеклассное портфолио');
  else if (acts >= 2) push(factors, 'Портфолио', holistic ? +6 : +2, 'Есть лидерский опыт и активности');
  else push(factors, 'Портфолио', holistic ? -10 : -2, 'Слабое внеклассное портфолио');

  // Major fit
  const majorFit = (uni.supportedMajors || []).some((m) => (profile.targetMajors || []).includes(m));
  if (majorFit) push(factors, 'Специальность', +4, 'Вуз силён в выбранной специальности');
  else push(factors, 'Специальность', -8, 'Выбранная специальность не входит в сильные направления вуза');

  // Budget feasibility
  if (profile.budgetTier === 'grant_only') {
    if (uni.hasFullGrantOrScholarship) push(factors, 'Финансы', +3, 'Есть путь к 100% финансированию');
    else push(factors, 'Финансы', -30, 'Полного гранта нет — при бюджете $0 поступление нереалистично');
    if (uni.financialAidType === 'need_based' && uni.region === 'usa_canada') {
      push(factors, 'Финансы', -6, 'Need-aware приём: запрос полной помощи снижает шансы иностранцев');
    }
  } else if (profile.budgetTier === 'up_to_5k' && !uni.hasFullGrantOrScholarship && uni.tuitionUSDPerYear > 8000) {
    push(factors, 'Финансы', -18, `Стоимость $${uni.tuitionUSDPerYear.toLocaleString()} превышает бюджет без стипендии`);
  }

  const total = factors.reduce((s, f) => s + f.impact, 0);
  // Diminishing returns near the extremes
  p = clamp(p + total * (p < 30 ? 0.7 : 1), 2, 96);
  const probability = Math.round(p);

  let tier = 'Target';
  if (probability < 30) tier = 'Dream';
  else if (probability >= 60) tier = 'Safety';

  return { probability, tier, factors };
}

function push(list, label, impact, note) {
  list.push({ label, impact, note });
}

/** Full estimate with projections for missing tests and prep plans. */
export function estimateWithProjections(profile, uni) {
  const base = estimateChance(profile, uni);
  const result = { universityId: uni.id, universityName: uni.name, ...base };

  const projections = {};
  const prepPlan = [];

  if (!profile.hasIelts) {
    const scores = [uni.minIelts, Math.min(9, uni.minIelts + 0.5), Math.min(9, uni.minIelts + 1)];
    projections.ifIelts = uniq(scores).map((score) => ({ score, probability: estimateChance(profile, uni, { ielts: score }).probability }));
    prepPlan.push(buildPrepPlan('IELTS', profile.ieltsScore ?? 5.0, uni.minIelts + 0.5));
  }
  if (uni.minSat && !profile.hasSat && (uni.admissions?.testPolicy || 'required') !== 'blind') {
    const scores = [uni.minSat, Math.min(1600, uni.minSat + 60), Math.min(1600, uni.minSat + 120)];
    projections.ifSat = uniq(scores).map((score) => ({ score, probability: estimateChance(profile, uni, { sat: score }).probability }));
    prepPlan.push(buildPrepPlan('SAT', profile.satScore ?? 1100, Math.min(1600, uni.minSat + 60)));
  }
  if (uni.minUnt && !profile.hasUnt) {
    const scores = [uni.minUnt, Math.min(140, uni.minUnt + 15), Math.min(140, uni.minUnt + 30)];
    projections.ifUnt = uniq(scores).map((score) => ({ score, probability: estimateChance(profile, uni, { unt: score }).probability }));
    prepPlan.push(buildPrepPlan('UNT', profile.untScore ?? 60, Math.min(140, uni.minUnt + 15)));
  }

  if (Object.keys(projections).length) result.projections = projections;
  if (prepPlan.length) result.prepPlan = prepPlan;
  return result;
}

function uniq(arr) {
  return [...new Set(arr)];
}

/** Size a preparation plan to the gap between the current (or assumed) level and the target. */
export function buildPrepPlan(exam, current, target) {
  const tpl = PREP_PLANS[exam];
  let weeks;
  if (exam === 'IELTS') weeks = Math.max(4, Math.ceil(Math.max(0, target - current) / 0.5) * tpl.weeksPerHalfBand);
  else if (exam === 'SAT') weeks = Math.max(4, Math.ceil(Math.max(0, target - current) / 100) * tpl.weeksPer100Points);
  else weeks = Math.max(4, Math.ceil(Math.max(0, target - current) / 15) * tpl.weeksPer15Points);
  weeks = Math.min(weeks, 40);
  return {
    exam,
    targetScore: exam === 'IELTS' ? target.toFixed(1) : String(target),
    weeks,
    hoursPerWeek: tpl.hoursPerWeek,
    milestones: tpl.milestones,
    resources: tpl.resources,
  };
}

/** Estimate for a list of universities, sorted by probability desc. */
export function estimateForAll(profile, universities) {
  return universities.map((u) => estimateWithProjections(profile, u)).sort((a, b) => b.probability - a.probability);
}
