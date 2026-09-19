// Human-readable values of profile facts, shared by the cabinet, the tests and the profile editor.
import type { ApplicantProfile, ProfileFact } from '../../types';
import { UNIVERSITY_BY_ID } from '../../data/universities';

type T = (key: string, vars?: Record<string, string | number>) => string;

export const GRADE_LABELS: Record<string, string> = {
  grade_7: '7 класс',
  grade_8: '8 класс',
  grade_9: '9 класс',
  grade_10: '10 класс',
  grade_11: '11 класс',
  grade_12: '12 класс',
  college: 'Колледж',
  gap_year: 'Gap Year',
};

export const SCHOOL_LABELS: Record<ApplicantProfile['schoolType'], string> = {
  nis: 'НИШ (NIS)',
  bil: 'БИЛ / Лицей',
  rfms: 'РФМШ / СУНЦ',
  gymnasium: 'Гимназия',
  standard: 'Общеобразовательная',
  international: 'Международная',
};

export const EXTRA_CHIPS = [
  { id: 'olympiad', label: 'Олимпиады' },
  { id: 'hackathon', label: 'Хакатоны' },
  { id: 'research', label: 'Исследования' },
  { id: 'volunteer', label: 'Волонтёрство' },
  { id: 'startup', label: 'Стартап / клуб' },
  { id: 'debate', label: 'Дебаты / MUN' },
  { id: 'sport', label: 'Спорт' },
  { id: 'media', label: 'Медиа / дизайн' },
  { id: 'internship', label: 'Стажировка' },
];

export function factValue(fact: ProfileFact, p: ApplicantProfile, t: T): string {
  switch (fact) {
    case 'name':
      return p.name;
    case 'birthDate':
      return p.birthDate ? new Date(p.birthDate).toLocaleDateString('ru-RU') : '';
    case 'age':
      return String(p.age);
    case 'location':
      return [p.city, p.country].filter(Boolean).join(', ');
    case 'grade':
      return t(GRADE_LABELS[p.grade] || p.grade);
    case 'targetTrack':
      return t(`profile.track.${p.targetTrack || 'university'}`);
    case 'schoolType':
      return t(SCHOOL_LABELS[p.schoolType] || p.schoolType);
    case 'schoolName':
      return p.schoolName || '';
    case 'gpa':
      return `${p.gpa.toFixed(2)} / ${p.gpaScale}`;
    case 'profileSubjects':
      return (p.profileSubjects || []).join(', ');
    case 'english': {
      const parts = [p.englishLevel || '', p.hasIelts && p.ieltsScore ? `IELTS ${p.ieltsScore}` : ''].filter(Boolean);
      return parts.length ? parts.join(' · ') : t('fact.value.noIelts');
    }
    case 'exams': {
      const parts = [
        p.hasIelts && p.ieltsScore ? `IELTS ${p.ieltsScore}` : '',
        p.hasSat && p.satScore ? `SAT ${p.satScore}` : '',
        p.hasUnt && p.untScore ? `${t('fact.value.unt')} ${p.untScore}` : '',
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : t('fact.value.noExams');
    }
    case 'otherExams':
      return (p.otherExams || [])
        .filter((e) => e.name)
        .map((e) => (e.score ? `${e.name} ${e.score}` : e.name))
        .join(', ');
    case 'olympiadLevel':
      return t(`quick.olympiad.${p.olympiadLevel || 'none'}`);
    case 'olympiadDetails':
      return p.olympiadDetails || '';
    case 'leadership':
      return (p.leadershipActivities || []).join('; ');
    case 'extracurriculars':
      return (p.extracurriculars || []).map((id) => t(EXTRA_CHIPS.find((c) => c.id === id)?.label || id)).join(', ');
    case 'interests':
      return (p.interests || []).join(', ');
    case 'skills':
      return (p.skills || []).join(', ');
    case 'majors':
      return (p.targetMajors || []).map((m) => t(`quick.major.${m}`)).join(', ');
    case 'regions':
      return (p.targetRegions || []).map((r) => t(`region.${r}`)).join(', ');
    case 'targetUniversities':
      return (p.targetUniversityIds || []).map((id) => UNIVERSITY_BY_ID.get(id)?.shortName || id).join(', ');
    case 'targetYear':
      return p.targetYear;
    case 'careerGoal':
      return p.careerGoal || '';
    case 'careerPlans':
      return p.careerPlans || '';
    case 'budget':
      return t(`quick.budget.${p.budgetTier}`);
    case 'languages':
      return (p.languagesSpoken || []).join(', ');
    case 'preferences': {
      const bits = [
        p.climatePreference && p.climatePreference !== 'any' ? `${t('profile.climate')}: ${t(`profile.climate.${p.climatePreference}`)}` : '',
        p.cityPreference && p.cityPreference !== 'any' ? `${t('profile.city')}: ${t(`profile.city.${p.cityPreference}`)}` : '',
        p.healthNotes || p.allergies || p.dietaryNeeds ? t('fact.value.health') : '',
        p.personalNotes ? t('fact.value.notes') : '',
      ].filter(Boolean);
      return bits.join(' · ');
    }
    default:
      return '';
  }
}