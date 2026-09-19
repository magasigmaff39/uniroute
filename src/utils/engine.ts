import { ApplicantProfile, DiagnosticResult, University, RoadmapStep, FitTier } from '../types';
import { UNIVERSITY_DATABASE, UNIVERSITY_BY_ID } from '../data/universities';
import { estimateChance, parseAcceptanceRate } from '../../shared/logic/chance.js';

// Normalize GPA to 4.0 scale
function getNormalizedGpa(gpa: number, scale: '4.0' | '5.0'): number {
  if (scale === '5.0') {
    return Math.min(4.0, (gpa / 5.0) * 4.0);
  }
  return Math.min(4.0, gpa);
}

// 1. Diagnostic Engine
export function runDiagnostic(profile: ApplicantProfile): DiagnosticResult {
  const normGpa = getNormalizedGpa(profile.gpa, profile.gpaScale);
  // Real counts from the knowledge base (instead of unsourced statistics in the strength texts)
  const totalInstitutions = UNIVERSITY_DATABASE.length;
  const gpaPassCount = UNIVERSITY_DATABASE.filter((u) => normGpa >= u.minGpa).length;
  const ieltsPassCount = profile.hasIelts && profile.ieltsScore ? UNIVERSITY_DATABASE.filter((u) => (profile.ieltsScore as number) >= u.minIelts).length : 0;

  // Academic readiness (0 - 100)
  let academic = Math.round((normGpa / 4.0) * 80);
  if (profile.hasSat && profile.satScore) {
    if (profile.satScore >= 1500) academic += 20;
    else if (profile.satScore >= 1400) academic += 15;
    else if (profile.satScore >= 1250) academic += 10;
    else academic += 5;
  } else if (profile.hasUnt && profile.untScore) {
    if (profile.untScore >= 120) academic += 20;
    else if (profile.untScore >= 100) academic += 15;
    else academic += 8;
  } else {
    academic += 5;
  }
  academic = Math.min(100, Math.max(30, academic));

  // Language readiness (0 - 100)
  let language = 50;
  if (profile.hasIelts && profile.ieltsScore) {
    if (profile.ieltsScore >= 7.5) language = 98;
    else if (profile.ieltsScore >= 7.0) language = 90;
    else if (profile.ieltsScore >= 6.5) language = 80;
    else if (profile.ieltsScore >= 6.0) language = 68;
    else language = 55;
  } else {
    language = 45;
  }

  // Portfolio & Extracurriculars (0 - 100)
  let portfolio = 40;
  if (profile.olympiadLevel === 'international') portfolio += 55;
  else if (profile.olympiadLevel === 'republican') portfolio += 45;
  else if (profile.olympiadLevel === 'city') portfolio += 30;
  else if (profile.olympiadLevel === 'school') portfolio += 15;

  portfolio += Math.min(25, (profile.leadershipActivities || []).length * 10);
  portfolio = Math.min(100, portfolio);

  // Financial Feasibility (0 - 100)
  let financialFeasibility = 80;
  if (profile.budgetTier === 'grant_only') {
    // Grant only is totally fine, but requires matching with full funding
    financialFeasibility = (academic >= 80 || portfolio >= 75) ? 90 : 70;
  } else if (profile.budgetTier === 'up_to_5k') {
    financialFeasibility = 85;
  } else {
    financialFeasibility = 95;
  }

  const overall = Math.round((academic * 0.35) + (language * 0.25) + (portfolio * 0.25) + (financialFeasibility * 0.15));

  // Strengths identification
  const strengths: { title: string; desc: string; icon: string }[] = [];
  
  if (normGpa >= 3.7) {
    strengths.push({
      title: 'Сильный академический фундамент (GPA ' + profile.gpa + ')',
      desc: `Академический порог пройден: ${gpaPassCount} из ${totalInstitutions} (база UniRoute).`,
      icon: 'GraduationCap'
    });
  }

  if (profile.hasIelts && profile.ieltsScore && profile.ieltsScore >= 7.0) {
    strengths.push({
      title: 'Превосходный языковой уровень (IELTS ' + profile.ieltsScore + ')',
      desc: `Языковой порог пройден: ${ieltsPassCount} из ${totalInstitutions} (база UniRoute).`,
      icon: 'Languages'
    });
  } else if (profile.hasIelts && profile.ieltsScore && profile.ieltsScore >= 6.5) {
    strengths.push({
      title: 'Уверенный академический английский (IELTS ' + profile.ieltsScore + ')',
      desc: `Языковой порог пройден: ${ieltsPassCount} из ${totalInstitutions} (база UniRoute).`,
      icon: 'Languages'
    });
  }

  if (profile.olympiadLevel === 'republican' || profile.olympiadLevel === 'international') {
    strengths.push({
      title: 'Олимпиадный статус национального уровня',
      desc: 'Призовые места в олимпиадах — сильный сигнал для грантового конкурса и отбора в KAIST, HKUST и NU.',
      icon: 'Trophy'
    });
  }

  if ((profile.leadershipActivities || []).length >= 2) {
    strengths.push({
      title: 'Активный профиль внеклассной деятельности',
      desc: 'Участие в клубах и проектах усиливает заявку при целостном рассмотрении (Holistic Review).',
      icon: 'Users'
    });
  }

  if (profile.hasSat && profile.satScore && profile.satScore >= 1450) {
    strengths.push({
      title: 'Выдающийся результат SAT (' + profile.satScore + ')',
      desc: 'Math/Reading результат позволяет конкурировать за Full-Ride стипендии в США, Корее и Гонконге.',
      icon: 'Award'
    });
  }

  // Fallback strength if needed
  if (strengths.length === 0) {
    strengths.push({
      title: 'Четкая цель и осознанный старт',
      desc: 'Своевременное планирование в ' + (profile.grade === 'grade_10' ? '10-м' : '11-м') + ' классе оставляет запас времени на подготовку.',
      icon: 'Compass'
    });
  }

  // Bottlenecks / Risks identification
  const bottlenecks: { title: string; desc: string; severity: 'high' | 'medium' | 'info'; action: string }[] = [];

  if (!profile.hasSat && (profile.targetRegions.includes('usa_canada') || profile.targetRegions.includes('asia'))) {
    bottlenecks.push({
      title: 'Отсутствие стандартизированного теста SAT',
      desc: 'Для подачи в топ-вузы США, KAIST и получения 100% гранта в Гонконге необходим сертификат SAT с высоким баллом.',
      severity: 'high',
      action: 'Зарегистрироваться на ближайшую сессию Digital SAT и составить 8-недельный план подготовки.'
    });
  }

  if (profile.budgetTier === 'grant_only') {
    bottlenecks.push({
      title: 'Финансовое ограничение: только 100% грант',
      desc: 'Платные формы обучения исключены. Стратегия должна фокусироваться на госгрантах МНВО РК, NU, Stipendium Hungaricum, KAIST KISS и Need-Blind колледжах.',
      severity: 'medium',
      action: 'Диверсифицировать список вузов программами с полным финансированием.'
    });
  }

  if (!profile.hasIelts) {
    bottlenecks.push({
      title: 'Нет подтвержденного языкового сертификата',
      desc: 'Без официального IELTS/TOEFL большинство зарубежных программ и NU не примут документы к основному конкурсу.',
      severity: 'high',
      action: 'Сдать диагностический mock-тест IELTS и забронировать официальную дату сдачи.'
    });
  } else if (profile.ieltsScore && profile.ieltsScore < 6.5) {
    bottlenecks.push({
      title: 'IELTS ' + profile.ieltsScore + ' — в зоне риска для зарубежных программ',
      desc: 'Для топовых зарубежных вузов и прямого поступления в NU без подготовительного года (NUFYP) требуется 6.5+ (no band < 6.0).',
      severity: 'medium',
      action: 'Подтянуть секции Writing и Speaking с упором на академическую лексику.'
    });
  }

  if (profile.leadershipActivities.length === 0) {
    bottlenecks.push({
      title: 'Дефицит подтвержденного внеклассного портфолио',
      desc: 'Для вузов США и Европы одного табеля с оценками недостаточно — требуется подтверждение инициативности.',
      severity: 'medium',
      action: 'Запустить собственный социальный проект или присоединиться к волонтерской организации в течение 3 месяцев.'
    });
  }

  // Strategic advice tailored by advisor tone
  let strategicAdvice = '';
  if (profile.advisorTone === 'strategic') {
    strategicAdvice = `Рекомендуется стратегия тройного эшелона: 2 амбициозных Dream-вуза с полным грантом (KAIST, NYUAD), 2 надежных Target-варианта (Nazarbayev University, Constructor/Jacobs) и 1 надёжный Safety-вариант (AITU по госгранту). Главная точка приложения усилий сейчас — ${!profile.hasSat ? 'сдача Digital SAT на 1450+' : 'шлифовка мотивационного эссе'}.`;
  } else if (profile.advisorTone === 'academic') {
    strategicAdvice = `Ваш академический профиль демонстрирует высокую дисциплину. Для перехода на уровень топ-мировых программ следует сфокусироваться на профильных дисциплинах STEM, подготовке развернутого портфолио исследовательских проектов и получении детализированных академических рекомендаций от преподавателей.`;
  } else {
    strategicAdvice = `У вас отличный стартовый потенциал! Самое главное сейчас — не распыляться на десятки вузов, а уверенно идти по шагам. Мы сформировали для вас сбалансированный маршрут: запасные варианты с бесплатным обучением снижают риск остаться без места.`;
  }

  const recommendedCategoryFocus = (profile.budgetTier === 'grant_only') 
    ? 'Госгранты Казахстана + 100% Зарубежные правительственные стипендии'
    : 'Сбалансированные англоязычные программы Европы и Центральной Азии';

  return {
    readiness: {
      overall,
      academic,
      language,
      portfolio,
      financialFeasibility,
    },
    strengths,
    bottlenecks,
    strategicAdvice,
    recommendedCategoryFocus,
  };
}

// 2. Personalization & University Matching Engine
export function matchUniversities(profile: ApplicantProfile): University[] {
  const normGpa = getNormalizedGpa(profile.gpa, profile.gpaScale);
  const userIelts = profile.hasIelts ? (profile.ieltsScore || 6.0) : 5.5;
  const userSat = profile.hasSat ? (profile.satScore || 1200) : 0;
  const userUnt = profile.hasUnt ? (profile.untScore || 80) : 0;

  // Filter and score universities
  const track = profile.targetTrack || (profile.grade === 'grade_7' || profile.grade === 'grade_8' ? 'school' : profile.grade === 'college' ? 'college' : 'university');
  const regions = profile.targetRegions || [];
  // Ordering keys kept outside the returned objects: the displayed score is capped at 98, so ranking uses the uncapped one.
  const order = new Map<string, { inTrack: number; inRegion: number; raw: number; probability: number }>();

  const scored = UNIVERSITY_DATABASE.map(uni => {
    let score = 70;
    
    // Category & track preference
    if (uni.category === track) score += 20;
    else if (track !== 'all' && uni.category && uni.category !== track) score -= 30;

    if (uni.category === 'school' && (profile.grade === 'grade_7' || profile.grade === 'grade_8')) score += 15;
    if (uni.category === 'college' && profile.grade === 'grade_9') score += 15;

    // Major compatibility bonus
    const majorMatch = uni.supportedMajors.some(m => profile.targetMajors.includes(m));
    if (majorMatch) score += 15;

    // Region preference bonus
    const regionMatch = profile.targetRegions.includes(uni.region);
    if (regionMatch) score += 10;

    // Academic threshold check
    const gpaDiff = normGpa - uni.minGpa;
    if (gpaDiff >= 0.3) score += 10;
    else if (gpaDiff >= 0) score += 5;
    else score -= 15;

    // Language threshold check
    const ieltsDiff = userIelts - uni.minIelts;
    if (ieltsDiff >= 0.5) score += 8;
    else if (ieltsDiff >= 0) score += 4;
    else score -= 12;

    // SAT check if applicable
    if (uni.minSat) {
      if (userSat >= uni.minSat + 50) score += 10;
      else if (userSat >= uni.minSat) score += 5;
      else if (userSat === 0) score -= 10;
      else score -= 15;
    }

    // UNT check if applicable
    if (uni.minUnt) {
      if (userUnt >= uni.minUnt + 15) score += 10;
      else if (userUnt >= uni.minUnt) score += 5;
      else if (userUnt === 0 && uni.region === 'kazakhstan') score -= 5;
    }

    // Olympiad bonus — selective universities (≤ 20% acceptance) weigh awards the most
    if (profile.olympiadLevel === 'republican' || profile.olympiadLevel === 'international') {
      if (parseAcceptanceRate(uni.acceptanceRate) <= 20) score += 15;
      else score += 6;
    }

    // Lifestyle fit from the extended knowledge base (climate preference, safety, diet)
    if (uni.environment && profile.climatePreference && profile.climatePreference !== 'any') {
      const climate = uni.environment.climate.toLowerCase();
      const warm = /жарк|тёпл|тепл|субтроп|средиземн|экватор|пустын/.test(climate);
      const cold = /холодн|снежн|резко|суров/.test(climate);
      if (profile.climatePreference === 'warm' && warm) score += 4;
      if (profile.climatePreference === 'warm' && cold) score -= 4;
      if (profile.climatePreference === 'cold' && cold) score += 3;
      if (profile.climatePreference === 'mild' && !warm && !cold) score += 3;
    }
    if (uni.campus && uni.campus.neighborhoodSafety <= 5) score -= 3;
    if (profile.dietaryNeeds && /хал|halal/i.test(profile.dietaryNeeds) && uni.environment) {
      const halal = uni.environment.foodOptions.some((f) => /хал|halal/i.test(f));
      score += halal ? 2 : -4;
    }

    // Budget compatibility
    if (profile.budgetTier === 'grant_only') {
      if (uni.hasFullGrantOrScholarship) {
        score += 10;
      } else if (uni.tuitionUSDPerYear > 5000) {
        score -= 40; // Heavy penalty if no full grant and expensive
      }
    } else if (profile.budgetTier === 'up_to_5k') {
      if (uni.tuitionUSDPerYear <= 5000 || uni.hasFullGrantOrScholarship) {
        score += 5;
      } else {
        score -= 20;
      }
    }

    const rawScore = score;
    score = Math.min(98, Math.max(45, score));

    // Fit tier comes from the shared, explainable chance model (same numbers the backend and the details panel use)
    const chance = estimateChance(profile, uni);
    const fitTier: FitTier = chance.tier;
    order.set(uni.id, {
      inTrack: track === 'all' || (uni.category || 'university') === track ? 1 : 0,
      inRegion: regions.includes(uni.region) ? 1 : 0,
      raw: rawScore,
      probability: chance.probability,
    });

    // Generate clear, human-language "Why it fits" explanation tailored to user's exact inputs
    let customWhyItFits = '';
    // Statements below depend on the applicant's real numbers, so they never claim a fit that the thresholds do not show.
    const budgetLabel = profile.budgetTier === 'grant_only' ? 'только 100% грант' : 'бюджет до $5,000';
    const grantMention = (profile.budgetTier === 'grant_only' || profile.budgetTier === 'up_to_5k')
      ? uni.hasFullGrantOrScholarship
        ? `С учётом вашего бюджета (${budgetLabel}) важно, что здесь есть путь к полному финансированию: ${uni.scholarshipName}. `
        : `С учётом вашего бюджета (${budgetLabel}): полного гранта нет, стоимость — $${uni.tuitionUSDPerYear.toLocaleString()} в год. `
      : '';
    const gpaLabel = `${profile.gpa}/${profile.gpaScale}${profile.gpaScale === '5.0' ? ` (≈${normGpa.toFixed(1)} из 4.0)` : ''}`;
    const gpaNote = normGpa >= uni.minGpa
      ? `Ваш GPA ${gpaLabel} проходит порог ${uni.minGpa} из 4.0.`
      : `Ваш GPA ${gpaLabel} пока ниже порога ${uni.minGpa} из 4.0.`;
    const ieltsNote = !profile.hasIelts
      ? `Нужен IELTS ${uni.minIelts}+ — сертификата пока нет.`
      : userIelts >= uni.minIelts
        ? `IELTS ${userIelts} проходит порог ${uni.minIelts}.`
        : `IELTS ${userIelts} пока ниже порога ${uni.minIelts}.`;

    if (uni.id === 'nu') {
      customWhyItFits = `Назарбаев Университет: ${gpaNote} ${ieltsNote} ${grantMention}Для поступивших по государственному гранту обучение покрывается полностью, с ежемесячной стипендией.`;
    } else if (uni.id === 'aitu') {
      customWhyItFits = `Сильный вариант для направления ${profile.targetMajors.includes('cs_ai') ? 'Computer Science & AI' : 'Software Engineering'}. ${profile.hasUnt ? `Ваш балл ЕНТ (${userUnt}) участвует в конкурсе на госгрант МНВО РК${uni.minUnt ? ` (ориентир ${uni.minUnt}+)` : ''}.` : 'Можно претендовать на государственный грант по профилю Математика + Информатика — для этого нужен ЕНТ.'} Кампус расположен в Astana Hub, рядом с IT-компаниями.`;
    } else if (uni.id === 'kaist') {
      customWhyItFits = `Как сильному STEM-кандидату ${profile.olympiadLevel !== 'none' ? 'с подтвержденным олимпиадным опытом' : 'с фокусом на технологии'}, KAIST предлагает обучение в топ-1 технологическом институте Азии со 100% стипендией KISS и ежемесячным пособием.`;
    } else if (uni.id === 'constructor') {
      customWhyItFits = `Качественное немецкое образование на 100% английском языке. ${gpaNote} Программа отложенной оплаты JU Study Plan позволяет начать учёбу без полной оплаты вперёд.`;
    } else if (uni.id === 'bocconi') {
      customWhyItFits = `Ведущая бизнес-школа континентальной Европы. Для студентов из Центральной Азии действует программа ISU Bocconi, которая при предоставлении справок о доходах семьи (2-НДФЛ) полностью оплачивает обучение и выделяет денежную стипендию на жизнь в Милане.`;
    } else if (uni.id === 'hungaricum_bme') {
      customWhyItFits = `Межправительственная программа Stipendium Hungaricum — один из самых доступных способов получить европейский инженерный диплом: для стипендиатов — 100% грант, бесплатное общежитие и стипендия. ${ieltsNote}`;
    } else if (uni.id === 'sdu') {
      customWhyItFits = `Университет предоставляет отличную базу по IT и бизнесу. Участие во внутренней олимпиаде SDU SPT позволяет выиграть 100% грант на все 4 года бакалавриата еще до сдачи школьных выпускных экзаменов.`;
    } else if (uni.id === 'nis') {
      customWhyItFits = `Назарбаев Интеллектуальная Школа — обучение по гранту «Өркен». Отбор проходит через комплексное тестирование по математике и естественным наукам; ${gpaNote.charAt(0).toLowerCase()}${gpaNote.slice(1)}`;
    } else if (uni.id === 'rfmsh') {
      customWhyItFits = `РФМШ — легендарная физмат школа. Идеальный выбор для кандидатов с математическими способностями; олимпиадный резерв и прямое поступление в топ-вузы.`;
    } else if (uni.id === 'haileybury') {
      customWhyItFits = `Haileybury — элитный британский диплом IB DP / IGCSE. Стипендиальная программа Sixth Form Scholarship позволяет учиться полностью бесплатно по результатам тестов CAT4.`;
    } else if (uni.id === 'aitu_college') {
      customWhyItFits = `Высший колледж AITU — прямой интегрированный переход на 2–3 курс бакалавриата Astana IT University без сдачи общего ЕНТ. Государственный грант со стипендией.`;
    } else if (uni.id === 'polytech_astana') {
      customWhyItFits = `Астанинский политехнический колледж — обучение на новейшем оборудовании Festo и стандартам WorldSkills со 100% госзаказом, стипендией и общежитием.`;
    } else if (uni.id === 'george_brown') {
      customWhyItFits = `George Brown College (Торонто) — прикладной канадский диплом с оплачиваемыми Co-op семестрами и правом на 3-летнее разрешение на работу в Канаде (PGWP).`;
    } else {
      customWhyItFits = uni.whyItFits + ' ' + grantMention;
    }

    return {
      ...uni,
      matchScore: score,
      fitTier,
      whyItFits: customWhyItFits,
    };
  });

  // Same priorities as the automatic pick (shared/logic/match.js): the chosen track first, then the chosen regions,
  // then the uncapped fit and the estimated chance. Changing a region or the budget therefore reorders the list.
  scored.sort((a, b) => {
    const ka = order.get(a.id)!;
    const kb = order.get(b.id)!;
    return kb.inTrack - ka.inTrack || kb.inRegion - ka.inRegion || kb.raw - ka.raw || kb.probability - ka.probability;
  });

  return scored;
}

// 3. Dynamic Roadmap Generator
export function generateRoadmap(profile: ApplicantProfile, matchedUnis: University[]): RoadmapStep[] {
  const is11th = profile.grade === 'grade_11' || profile.grade === 'grade_12';
  const targetMajorTitle = profile.targetMajors[0] ? profile.targetMajors[0].toUpperCase() : 'IT & STEM';

  // One concrete subtask per university/school/college the applicant selected, with its real deadline and portal
  const targetUniSubtasks = (profile.targetUniversityIds || [])
    .map((id) => UNIVERSITY_BY_ID.get(id))
    .filter((u): u is University => Boolean(u))
    .slice(0, 6)
    .map((u) => ({
      id: `dl-uni-${u.id}`,
      title: `Подать заявку в ${u.shortName}: ${u.earlyDeadline ? `ранний раунд ${u.earlyDeadline}, ` : ''}основной ${u.regularDeadline} (${u.officialPortalUrl})`,
      isCompleted: false,
      deadline: u.regularDeadline,
    }));

  const primaryTargetId = (profile.targetUniversityIds && profile.targetUniversityIds[0]) || null;
  const primaryTarget = primaryTargetId ? UNIVERSITY_BY_ID.get(primaryTargetId) : null;
  const targetCategory = primaryTarget?.category || (profile.targetTrack !== 'all' ? profile.targetTrack : null);

  // -------------------------------------------------------------------------
  // 1. SCHOOL / LYCEUM TRACK (НИШ, РФМШ, БИЛ, Haileybury, etc.)
  // -------------------------------------------------------------------------
  if (targetCategory === 'school') {
    const schoolName = primaryTarget?.shortName || 'Лицей / НИШ / РФМШ';
    const deadline = primaryTarget?.regularDeadline || 'Март 2027';
    const portal = primaryTarget?.officialPortalUrl || 'приёмная комиссия';

    return [
      {
        id: 'step-school-exams',
        title: `Вступительные испытания в ${schoolName}`,
        category: 'exams',
        timeFrame: 'immediate',
        targetDate: 'Январь - Февраль 2027',
        description: primaryTarget?.id === 'nis'
          ? 'Комплексное тестирование на грант Президента РК «Өркен» (Математика, естествознание, пространственное мышление и языковой блок).'
          : primaryTarget?.id === 'rfmsh'
          ? 'Профильный письменный экзамен по математике и логике РФМШ.'
          : primaryTarget?.id === 'haileybury'
          ? 'Когнитивное тестирование CAT4 и профильные академические предметы на стипендию Sixth Form.'
          : 'Сдача вступительного тестирования по математике и логике.',
        isKeyMilestone: true,
        guidanceTip: primaryTarget?.id === 'nis'
          ? 'Решайте сборники заданий НИШ прошлых лет на пространственное мышление и задачи на скорость/логику — на них срезаются до 40% абитуриентов.'
          : 'Высокие результаты в олимпиадах Дарын или Жаутыковской олимпиаде дают преимущественное право на зачисление.',
        templateAvailable: true,
        subtasks: [
          {
            id: 'sch-ex-1',
            title: primaryTarget?.id === 'nis'
              ? 'Пройти 5 пробных комплексных тестов «Өркен» (математическая грамотность, естествознание, пространственное мышление)'
              : primaryTarget?.id === 'haileybury'
              ? 'Подготовиться к тестам CAT4 (Non-verbal, Spatial, Verbal reasoning) и академическому английскому'
              : `Решить открытый банк вступительных экзаменов прошлых лет ${schoolName}`,
            isCompleted: false,
          },
          { id: 'sch-ex-2', title: 'Усилить языковой блок (казахский / русский / академический английский)', isCompleted: false },
          { id: 'sch-ex-3', title: 'Провести контрольный тайм-тест в условиях ограниченного времени (60-90 минут)', isCompleted: false },
        ],
      },
      {
        id: 'step-school-docs',
        title: 'Школьный пакет документов для приёмной комиссии',
        category: 'documents',
        timeFrame: '1-2_months',
        targetDate: 'Февраль - Март 2027',
        description: 'Формирование личного дела абитуриента согласно правилам конкурсного отбора.',
        isKeyMilestone: false,
        guidanceTip: 'Медицинские справки формы 075/у и флюорографию делайте заранее — поликлиники перегружены перед окончанием приёма.',
        templateAvailable: true,
        subtasks: [
          { id: 'sch-doc-1', title: 'Получить табель успеваемости за предыдущие классы, заверенный директором и круглой печатью школы', isCompleted: false },
          { id: 'sch-doc-2', title: 'Оформить медицинскую справку формы 075/у со снимком флюорографии и картой прививок 063/у', isCompleted: false },
          { id: 'sch-doc-3', title: 'Подготовить нотариальную копию свидетельства о рождении / удостоверения с ИИН и 4 фото 3х4', isCompleted: false },
          { id: 'sch-doc-4', title: 'Собрать оригиналы и копии дипломов олимпиад и конкурсов для портфолио', isCompleted: profile.olympiadLevel !== 'none' },
        ],
      },
      {
        id: 'step-school-application',
        title: `Подача заявления в ${schoolName}`,
        category: 'deadlines',
        timeFrame: '3-6_months',
        targetDate: deadline,
        description: `Регистрация на конкурсный отбор через ${portal}.`,
        isKeyMilestone: true,
        guidanceTip: 'После онлайн-подачи обязательно сохраните расписку о приёме документов и экзаменационный пропуск.',
        subtasks: [
          ...targetUniSubtasks,
          { id: 'sch-app-1', title: `Зарегистрироваться в электронной приёмной комиссии ${schoolName}`, isCompleted: false },
          { id: 'sch-app-2', title: 'Подать заявку на грантовое обучение («Өркен» / стипендиальный фонд)', isCompleted: false },
          { id: 'sch-app-3', title: 'Получить посадочный талон с датой, аудиторией и временем очного экзамена', isCompleted: false },
        ],
      },
      {
        id: 'step-school-final',
        title: 'Экзаменационный тур и зачисление',
        category: 'deadlines',
        timeFrame: 'final',
        targetDate: 'Апрель - Май 2027',
        description: 'Участие в очном экзамене, апелляция (при необходимости) и оформление приказа о зачислении.',
        isKeyMilestone: true,
        guidanceTip: 'В день экзамена возьмите оригинал свидетельства/удостоверения, пропуск и 2 гелевые ручки чёрного цвета.',
        subtasks: [
          { id: 'sch-fin-1', title: 'Явка на очный экзаменационный тур в назначенную дату', isCompleted: false },
          { id: 'sch-fin-2', title: 'Проверить результаты в протоколе республиканской приёмной комиссии', isCompleted: false },
          { id: 'sch-fin-3', title: 'Предоставить оригиналы документов в приёмную комиссию и подписать договор', isCompleted: false },
        ],
      },
    ];
  }

  // -------------------------------------------------------------------------
  // 2. COLLEGE TRACK (AITU College, КБТУ Колледж, Политех, Seneca, etc.)
  // -------------------------------------------------------------------------
  if (targetCategory === 'college') {
    const collegeName = primaryTarget?.shortName || 'Высший колледж';
    const isCanada = primaryTarget?.region === 'usa_canada';
    const deadline = primaryTarget?.regularDeadline || 'Август 2027';

    return [
      {
        id: 'step-college-academic',
        title: 'Аттестат и средний балл (GPA) для конкурса грантов',
        category: 'exams',
        timeFrame: 'immediate',
        targetDate: 'Март - Май 2027',
        description: 'Отбор на государственные гранты ТиПО и в престижные колледжи проводится по среднему баллу аттестата.',
        isKeyMilestone: true,
        guidanceTip: 'Чтобы повысить шансы на грант в IT и политехнических специальностях, держите средний балл аттестата не ниже 4.6–4.8.',
        templateAvailable: true,
        subtasks: [
          { id: 'col-ac-1', title: 'Повысить и зафиксировать средний балл аттестата за 9/11 класс выше 4.7', isCompleted: false },
          { id: 'col-ac-2', title: 'Сфокусироваться на профильных дисциплинах: алгебра, геометрия, физика, информатика', isCompleted: false },
          ...(isCanada ? [{ id: 'col-ac-3', title: 'Сдать IELTS Academic на 6.0+ или Duolingo 105+ для зачисления в Канаду', isCompleted: profile.hasIelts }] : []),
        ],
      },
      {
        id: 'step-college-docs',
        title: 'Пакет документов для зачисления в колледж',
        category: 'documents',
        timeFrame: '1-2_months',
        targetDate: 'Июнь - Июль 2027',
        description: 'Формирование пакета документов для подачи на платформе eGov или в приёмную комиссию колледжа.',
        isKeyMilestone: false,
        guidanceTip: 'Аттестат об окончании 9 или 11 класса выдаётся в конце июня — сразу заказывайте нотариальные копии.',
        templateAvailable: true,
        subtasks: [
          { id: 'col-doc-1', title: 'Получить подлинник аттестата об основном среднем (9 кл.) или общем среднем образовании с приложением', isCompleted: false },
          { id: 'col-doc-2', title: 'Пройти медосмотр и получить справку 075/у со снимком флюорографии и карту прививок 063/у', isCompleted: false },
          { id: 'col-doc-3', title: 'Подготовить удостоверение личности / свидетельство с ИИН и 4 фото 3х4', isCompleted: false },
          { id: 'col-doc-4', title: 'Оформить заявку на получение места в студенческом общежитии', isCompleted: false },
        ],
      },
      {
        id: 'step-college-grants',
        title: `Подача на госгрант ТиПО и в ${collegeName}`,
        category: 'deadlines',
        timeFrame: '3-6_months',
        targetDate: deadline,
        description: 'Участие в распределении государственного образовательного заказа ТиПО (100% покрытие, стипендия, проезд).',
        isKeyMilestone: true,
        guidanceTip: 'При подаче на ТиПО можно указать до 4 специальностей или колледжей в порядке приоритета.',
        subtasks: [
          ...targetUniSubtasks,
          { id: 'col-gr-1', title: `Подать заявку через eGov / SmartNation в ${collegeName} на грантовое место`, isCompleted: false },
          { id: 'col-gr-2', title: 'Пройти профильное собеседование или психометрический тест при колледже', isCompleted: false },
          { id: 'col-gr-3', title: 'Проверить списки обладателей государственных грантов ТиПО в августе', isCompleted: false },
        ],
      },
      {
        id: 'step-college-pathway',
        title: 'Сквозная программа 2+2 (Колледж → Университет)',
        category: 'deadlines',
        timeFrame: 'final',
        targetDate: 'Сентябрь 2027',
        description: 'Фиксация индивидуального плана перезачета кредитов для перехода на 2–3 курс университета-партнера без общего ЕНТ.',
        isKeyMilestone: true,
        guidanceTip: 'Учёба в колледже при университете (AITU, КБТУ, AlmaU) позволяет сэкономить 1–2 года на получении степени бакалавра.',
        subtasks: [
          { id: 'col-pw-1', title: 'Утвердить учебный план сквозной подготовки с академическим куратором программы', isCompleted: false },
          { id: 'col-pw-2', title: 'Подключиться к лабораториям университета и проектам Astana Hub / индустриальным партнерам', isCompleted: false },
          ...(isCanada ? [{ id: 'col-pw-3', title: 'Оформить разрешение на учёбу (Study Permit) и Co-op Work Permit для Канады', isCompleted: false }] : []),
        ],
      },
    ];
  }

  // -------------------------------------------------------------------------
  // 3. UNIVERSITY TRACK (Or general roadmap)
  // -------------------------------------------------------------------------
  const primaryUniName = primaryTarget?.shortName;

  const steps: RoadmapStep[] = [
    {
      id: 'step-exams',
      title: primaryUniName
        ? `Стандартизированные экзамены для ${primaryUniName}`
        : 'Стандартизированные экзамены (IELTS / SAT / ЕНТ)',
      category: 'exams',
      timeFrame: 'immediate',
      targetDate: is11th ? 'Октябрь - Ноябрь 2026' : 'Весна 2027',
      description: primaryTarget
        ? `Требования ${primaryTarget.shortName}: IELTS от ${primaryTarget.minIelts || '—'}, SAT от ${primaryTarget.minSat || '—'}, ЕНТ от ${primaryTarget.minUnt || '—'}.`
        : 'Закрытие главного формального барьера для участия во всех стипендиальных конкурсах.',
      isKeyMilestone: true,
      guidanceTip: 'Сдача IELTS на 7.0+ и SAT на 1420+ автоматически переводит ваши заявки из очереди рассмотрения в приоритетный пул.',
      templateAvailable: true,
      subtasks: [
        { id: 'ex-1', title: profile.hasIelts ? `Подтвердить отправку официального TRF IELTS (${profile.ieltsScore}) в целевые университеты` : 'Зарегистрироваться на тест IELTS Academic и пройти 4 полных пробных теста (Mock)', isCompleted: profile.hasIelts },
        { id: 'ex-2', title: profile.hasSat ? `Проверить привязку аккаунта CollegeBoard к порталу вузов` : 'Сдать Digital SAT (целевой ориентир 1450+ для зарубежных грантов и NU)', isCompleted: profile.hasSat },
        { id: 'ex-3', title: profile.hasUnt ? `Сохранить электронный сертификат ЕНТ (${profile.untScore} баллов) с QR-кодом` : 'Зарегистрироваться на пробное тестирование Национального центра тестирования (ЕНТ)', isCompleted: profile.hasUnt },
      ]
    },
    {
      id: 'step-docs',
      title: 'Академический пакет документов и справки',
      category: 'documents',
      timeFrame: '1-2_months',
      targetDate: 'Ноябрь - Декабрь 2026',
      description: 'Сбор официальных транскриптов с оценками за 9–11 классы и справок для финансовой помощи.',
      isKeyMilestone: false,
      guidanceTip: 'Для итальянских и европейских стипендий (Bocconi ISU, EDISU) справки о доходах (2-НДФЛ) и состав семьи требуют апостиля и перевода — начните сбор заранее.',
      templateAvailable: true,
      subtasks: [
        { id: 'doc-1', title: 'Запросить в школьной канцелярии официальный транскрипт с печатью директора на двух языках (каз/рус и англ)', isCompleted: false },
        { id: 'doc-2', title: 'Получить подтвержденные рекомендации от 2 профильных учителей (математика/информатика + английский)', isCompleted: false },
        { id: 'doc-3', title: 'Собрать справки о доходах родителей (справка с места работы, форма 2-НДФЛ) для подачи на стипендии', isCompleted: false },
        { id: 'doc-4', title: 'Оцифровать грамоты и дипломы олимпиад в единый PDF-архив портфолио', isCompleted: profile.olympiadLevel !== 'none' }
      ]
    },
    {
      id: 'step-essay',
      title: 'Мотивационное эссе (Personal Statement & SOP)',
      category: 'essay',
      timeFrame: '1-2_months',
      targetDate: 'Декабрь 2026',
      description: 'Ключевой фактор дифференциации: почему именно эта специальность, чего вы хотите достичь и какую пользу принесете обществу.',
      isKeyMilestone: true,
      guidanceTip: 'Избегайте банальных фраз вроде "Я люблю программировать с детства". Покажите конкретную решенную проблему, проект или преодоленный вызов.',
      templateAvailable: true,
      subtasks: [
        { id: 'ess-1', title: 'Сформулировать личную "искру" (The Hook): личный опыт, вдохновивший на изучение ' + targetMajorTitle, isCompleted: false },
        { id: 'ess-2', title: 'Написать первый драфт эссе по структуре: Проблема -> Исследование -> Проект -> Почему именно этот вуз', isCompleted: false },
        { id: 'ess-3', title: 'Провести вычитку с ментором или носителем языка на логику и стиль', isCompleted: false }
      ]
    },
    {
      id: 'step-deadlines',
      title: 'Подача заявок на ранние дедлайны и гранты',
      category: 'deadlines',
      timeFrame: '3-6_months',
      targetDate: 'Январь - Март 2027',
      description: 'Отправка пакетов документов на платформы вузов (Common App, портал NU, Tempus Hungaricum, KAIST Portal).',
      isKeyMilestone: true,
      guidanceTip: 'Не ждите последнего дня дедлайна — серверы приемных комиссий часто перегружены за 6 часов до закрытия.',
      subtasks: [
        ...targetUniSubtasks,
        { id: 'dl-1', title: 'Подать заявку на грантовую программу Stipendium Hungaricum (дедлайн 15 января)', isCompleted: false },
        { id: 'dl-2', title: 'Завершить регистрацию в личных кабинетах абитуриента Nazarbayev University и KAIST', isCompleted: false },
        { id: 'dl-3', title: 'Подать финансовую заявку на стипендию ISU Bocconi / Financial Aid package', isCompleted: false }
      ]
    },
    {
      id: 'step-kz-grants',
      title: 'Конкурс государственных грантов РК (МНВО)',
      category: 'deadlines',
      timeFrame: 'final',
      targetDate: '13 - 20 июля 2027',
      description: 'Подача заявления на распределение образовательных грантов Республики Казахстан через портал eGov.',
      isKeyMilestone: true,
      guidanceTip: 'В списке из 4 вузов на грант ставьте первым приоритетом вуз вашей мечты (напр., AITU или SDU), вторым и третьим — надежные региональные и профильные вузы.',
      subtasks: [
        { id: 'kz-1', title: 'Сдать основную сессию ЕНТ (май - июнь) и получить финальный электронный сертификат', isCompleted: false },
        { id: 'kz-2', title: 'Выбрать 4 комбинации ВУЗ + образовательная программа для участия в конкурсе грантов', isCompleted: false },
        { id: 'kz-3', title: 'Подать заявку через eGov с ЭЦП в период 13–20 июля', isCompleted: false }
      ]
    }
  ];

  return steps;
}

// 4. Next Immediate Action Resolver
export function getNextAction(roadmap: RoadmapStep[]) {
  // Find the first uncompleted subtask in the roadmap
  for (const step of roadmap) {
    const uncompletedSubtask = step.subtasks.find(st => !st.isCompleted);
    if (uncompletedSubtask) {
      return {
        stepId: step.id,
        stepTitle: step.title,
        taskTitle: uncompletedSubtask.title,
        taskId: uncompletedSubtask.id,
        category: step.category,
        deadline: step.targetDate,
        guidanceTip: step.guidanceTip,
        totalTasks: step.subtasks.length,
        completedTasks: step.subtasks.filter(st => st.isCompleted).length,
      };
    }
  }

  // All completed
  return {
    stepId: 'completed',
    stepTitle: 'Все ключевые задачи выполнены!',
    taskTitle: 'Проверить почту приемных комиссий и ожидать официальных решений',
    taskId: 'finish',
    category: 'deadlines',
    deadline: 'Август 2027',
    guidanceTip: 'Поздравляем! Ваш маршрут полностью сформирован и запущен.',
    totalTasks: 1,
    completedTasks: 1,
  };
}
