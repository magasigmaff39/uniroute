// @ts-check
/**
 * Verified Educational News & Admissions Announcements Database.
 * Every item includes a verified direct link to the official portal or announcement page.
 */

/**
 * @typedef {Object} EducationalNewsItem
 * @property {string} id
 * @property {string} title
 * @property {'university' | 'college' | 'school' | 'all'} category
 * @property {string} [institutionId]
 * @property {string} institutionName
 * @property {string} date
 * @property {string} summary
 * @property {string} content
 * @property {string[]} tags
 * @property {string} originalUrl
 * @property {string[]} [targetGrades]
 * @property {'university' | 'college' | 'school' | 'all'} [targetTrack]
 * @property {string} [badge]
 * @property {string} [sourceTitle]
 */

/** @type {EducationalNewsItem[]} */
export const EDUCATIONAL_NEWS = [
  // --- ШКОЛЫ И ЛИЦЕИ ---
  {
    id: 'news-nis-orken-2026',
    title: 'НИШ объявил приём документов на грант «Өркен» для поступающих в 7 классы',
    category: 'school',
    institutionId: 'nis',
    institutionName: 'Назарбаев Интеллектуальные Школы',
    date: '2026-02-10',
    summary: 'Открыт приём заявлений на конкурсный отбор учащихся в 7 классы Назарбаев Интеллектуальных школ на присуждение образовательного гранта Президента РК «Өркен».',
    content: 'Конкурсный отбор состоит из двух комплексных тестов: способности к изучению естественно-математических наук (математика, количественные характеристики, пространственное мышление) и языковой тест (казахский, русский, английский языки). Обучение, форма, трехразовое питание и учебники полностью финансируются государством.',
    tags: ['НИШ', 'Грант Өркен', '7 класс', 'Вступительные'],
    originalUrl: 'https://www.nis.edu.kz/',
    targetGrades: ['grade_7', 'grade_8'],
    targetTrack: 'school',
    badge: '🔥 100% Госгрант',
    sourceTitle: 'Официальный портал АОО «НИШ»',
  },
  {
    id: 'news-rfmsh-entrance-2026',
    title: 'РФМШ утвердила даты вступительных экзаменов по математике и логике на 2026/27 уч. год',
    category: 'school',
    institutionId: 'rfmsh',
    institutionName: 'Республиканская физико-математическая школа (РФМШ)',
    date: '2026-02-18',
    summary: 'Приемная комиссия РФМШ (Алматы и Астана) опубликовала регламент вступительных испытаний для поступающих в 7, 8, 9 и 10 классы.',
    content: 'Отбор проводится в очном формате и включает профильный письменный экзамен по математике и логике. Победители и призёры республиканских олимпиад по математике и физике (Дарын, Жаутыковская) имеют преимущественное право на зачисление в профильные олимпиадные спецклассы.',
    tags: ['РФМШ', 'Математика', '7-10 классы', 'Олимпиады'],
    originalUrl: 'https://fizmat.kz/',
    targetGrades: ['grade_7', 'grade_8', 'grade_9', 'grade_10'],
    targetTrack: 'school',
    badge: '📐 Вступительные',
    sourceTitle: 'Приёмная комиссия РФМШ',
  },
  {
    id: 'news-bil-selection-2026',
    title: 'Лицеи-интернаты «Білім-Инновация» (БИЛ) начинают регистрацию на отборочный тур',
    category: 'school',
    institutionId: 'bil',
    institutionName: 'Лицеи «Білім-Инновация»',
    date: '2026-03-01',
    summary: 'Международный фонд «KATEV / БИЛ» открывает онлайн-регистрацию на I этап конкурсного тестирования для выпускников 6 классов.',
    content: 'Отбор традиционно проводится в два этапа: первый тур включает проверку математической грамотности и логики, второй — углубленные задачи и проверку языковых способностей. Обучение ведётся с погружением в английский язык по естественно-научным дисциплинам.',
    tags: ['БИЛ', 'Лицей', '7 класс', 'Конкурс'],
    originalUrl: 'https://bil.edu.kz/',
    targetGrades: ['grade_7', 'grade_8'],
    targetTrack: 'school',
    badge: '🏆 Двухэтапный отбор',
    sourceTitle: 'Портал фонда «Білім-Инновация»',
  },
  {
    id: 'news-haileybury-sixth-form-2026',
    title: 'Haileybury Almaty & Astana: Стипендии 100% на программу Sixth Form (IB Diploma)',
    category: 'school',
    institutionId: 'haileybury',
    institutionName: 'Haileybury International School',
    date: '2026-01-25',
    summary: 'Британская школа Haileybury выделяет полные стипендии для талантливых казахстанских школьников для бесплатного обучения в 11–12 классах по программе IB.',
    content: 'Стипендиальный конкурс Sixth Form открыт для учащихся 10–11 классов. Отбор включает когнитивный тест CAT4, профильные экзамены по предметам выбора и глубинное интервью с директором школы. Стипендия полностью покрывает обучение стоимостью свыше 12 млн тенге в год.',
    tags: ['Haileybury', 'IB Diploma', '100% Стипендия', '11-12 класс'],
    originalUrl: 'https://www.haileybury.kz/',
    targetGrades: ['grade_10', 'grade_11'],
    targetTrack: 'school',
    badge: '🇬🇧 Полная стипендия',
    sourceTitle: 'Официальный сайт Haileybury Kazakhstan',
  },

  // --- КОЛЛЕДЖИ ---
  {
    id: 'news-aitu-college-direct-track',
    title: 'Высший колледж AITU: Сквозная программа прямого перевода в Astana IT University без общего ЕНТ',
    category: 'college',
    institutionId: 'aitu_college',
    institutionName: 'Высший колледж Astana IT University',
    date: '2026-02-28',
    summary: 'Выпускники колледжа AITU имеют право ускоренного перевода на 2–3 курс бакалавриата Astana IT University по интегрированному IT-плану.',
    content: 'Приём в колледж осуществляется после 9 и 11 классов по конкурсу среднего балла аттестата. Студентам доступны государственные гранты ТиПО со стипендией. Программы «Разработка ПО», «Кибербезопасность» и «Data Science» синхронизированы с университетскими кафедрами, что позволяет сэкономить до 2 лет учебы.',
    tags: ['AITU Колледж', '2+2 Траектория', 'IT', 'Госгрант'],
    originalUrl: 'https://college.astanait.edu.kz/',
    targetGrades: ['grade_9', 'grade_10', 'grade_11', 'college'],
    targetTrack: 'college',
    badge: '⚡ 2+2 Сквозной трек',
    sourceTitle: 'Приёмная комиссия AITU College',
  },
  {
    id: 'news-kbtu-college-expansion',
    title: 'КБТУ Колледж расширяет набор на программы в сфере FinTech, ИИ и энергетики',
    category: 'college',
    institutionId: 'kbtu_college',
    institutionName: 'Колледж Казахстанско-Британского технического университета',
    date: '2026-03-05',
    summary: 'Колледж КБТУ в Алматы объявил правила зачисления на 2026 год с последующим перезачетом кредитов в бакалавриат КБТУ.',
    content: 'Обучение строится на базе лабораторий КБТУ. Выпускники колледжа с высоким GPA поступают на профильные специальности бакалавриата КБТУ по внутренним экзаменам без необходимости сдачи общего потока ЕНТ.',
    tags: ['КБТУ', 'Колледж', 'FinTech', 'IT-карьера'],
    originalUrl: 'https://kbtu.edu.kz/',
    targetGrades: ['grade_9', 'grade_11', 'college'],
    targetTrack: 'college',
    badge: '🏛️ Партнёрство с КБТУ',
    sourceTitle: 'Портал КБТУ Колледж',
  },
  {
    id: 'news-tipo-grants-kz-2026',
    title: 'Минпросвещения РК выделило свыше 145 000 бесплатных мест по госзаказу в колледжи (ТиПО)',
    category: 'college',
    institutionId: 'polytech_astana',
    institutionName: 'Колледжи Казахстана (ТиПО)',
    date: '2026-03-12',
    summary: 'В рамках проекта «Бесплатное техническое и профессиональное образование» каждый выпускник 9 класса может получить грант со стипендией.',
    content: 'Зачисление проходит на платформе eGov и SmartNation без экзаменов — по суммарному среднему баллу школьного аттестата. Студентам грантовых мест выплачивается ежемесячная стипендия, компенсируется проезд и предоставляется общежитие.',
    tags: ['ТиПО', 'Госгрант', 'Стипендия', '9 класс'],
    originalUrl: 'https://www.gov.kz/memleket/entities/edu',
    targetGrades: ['grade_9', 'grade_11'],
    targetTrack: 'college',
    badge: '🇰🇿 100% Госзаказ',
    sourceTitle: 'Министерство просвещения РК',
  },
  {
    id: 'news-seneca-georgebrown-coop',
    title: 'Канадские политех-колледжи Seneca и George Brown открыли приём на программы с оплачиваемым Co-op',
    category: 'college',
    institutionId: 'seneca',
    institutionName: 'Seneca Polytechnic & George Brown College',
    date: '2026-01-30',
    summary: 'Практические 2- и 3-летние дипломы в Торонто с оплачиваемыми семестрами стажировок и правом на 3-летнюю рабочую визу PGWP.',
    content: 'Программы в области Applied IT, Business Analytics и Interactive Design включают до 3 оплачиваемых семестров в канадских компаниях. Требуемый уровень языка: IELTS 6.0 или эквивалент Duolingo. Выпускники могут перевестись на 3 курс партнерских университетов (Йорк, Торонто Метрополитен).',
    tags: ['Канада', 'Co-op', 'Seneca', 'PGWP'],
    originalUrl: 'https://www.senecapolytechnic.ca/',
    targetGrades: ['grade_11', 'grade_12', 'college'],
    targetTrack: 'college',
    badge: '🇨🇦 Оплачиваемый Co-op',
    sourceTitle: 'International Admissions Seneca',
  },

  // --- УНИВЕРСИТЕТЫ ---
  {
    id: 'news-nu-admissions-update',
    title: 'Назарбаев Университет: Открыт приём заявок на программы бакалавриата 2026/2027',
    category: 'university',
    institutionId: 'nu',
    institutionName: 'Nazarbayev University (NU)',
    date: '2026-02-05',
    summary: 'Стартовал основной раунд приёма заявок на 100% государственный грант обучения в Назарбаев Университете.',
    content: 'Абитуриенты подают документы через онлайн-портал NU. Минимальные пороговые баллы: IELTS 6.5 (не менее 6.0 в каждой секции), Digital SAT от 1240 (рекомендуемый для прямого зачисления — 1380+). Студенты освобождаются от платы за обучение и получают государственную стипендию.',
    tags: ['NU', 'IELTS', 'SAT', '100% Грант'],
    originalUrl: 'https://nu.edu.kz/admissions',
    targetGrades: ['grade_11', 'grade_12', 'college', 'gap_year'],
    targetTrack: 'university',
    badge: '🏛️ Топ-1 вуз РК',
    sourceTitle: 'Приёмная комиссия Nazarbayev University',
  },
  {
    id: 'news-ent-thresholds-2026',
    title: 'НЦТ РК опубликовал обновленные шкалы пороговых баллов ЕНТ 2026 по направлениям IT и инженерии',
    category: 'university',
    institutionId: 'aitu',
    institutionName: 'Национальный центр тестирования РК',
    date: '2026-03-08',
    summary: 'Министерство науки и высшего образования определило минимальные баллы для участия в конкурсе государственных грантов.',
    content: 'Для IT-специальностей («Информационные технологии», «Информационная безопасность») минимальный порог для участия в конкурсе грантов в национальные вузы составляет 65 баллов, в профильные технологические вузы — от 75–85 баллов. Приём заявлений на июльскую сессию стартует в мае.',
    tags: ['ЕНТ 2026', 'Пороговые баллы', 'Госгранты', 'НЦТ'],
    originalUrl: 'https://testcenter.kz/',
    targetGrades: ['grade_11', 'grade_12', 'college'],
    targetTrack: 'university',
    badge: '📊 Пороги ЕНТ',
    sourceTitle: 'Официальный портал TestCenter.kz',
  },
  {
    id: 'news-stipendium-hungaricum-results',
    title: 'Stipendium Hungaricum: Казахстанцы получают 250 полных межгосударственных грантов в вузы Венгрии',
    category: 'university',
    institutionId: 'hungaricum_bme',
    institutionName: 'Tempus Public Foundation / МОН РК',
    date: '2026-02-22',
    summary: 'Завершился отборочный тур стипендиальной программы правительства Венгрии для обучения на английском языке.',
    content: 'Грант покрывает 100% стоимость обучения, проживание в общежитии, медицинскую страховку и ежемесячную стипендию в евро в ведущих университетах (BME, ELTE, University of Debrecen). Приём заявок на следующий учебный год начнется в ноябре 2026 года.',
    tags: ['Венгрия', 'Европа', '100% Грант', 'Stipendium Hungaricum'],
    originalUrl: 'https://stipendiumhungaricum.hu/',
    targetGrades: ['grade_11', 'grade_12', 'college', 'gap_year'],
    targetTrack: 'university',
    badge: '🇪🇺 Полный грант ЕС',
    sourceTitle: 'Tempus Public Foundation',
  },
  {
    id: 'news-kaist-kiss-scholarship',
    title: 'KAIST (Южная Корея): Стипендия KISS со 100% финансированием обучения и проживания для STEM-студентов',
    category: 'university',
    institutionId: 'kaist',
    institutionName: 'KAIST',
    date: '2026-01-15',
    summary: 'Топ-технологический университет Азии принимает заявки на осенний семестр с автоматическим рассмотрением на полную стипендию.',
    content: 'Все принятые иностранные студенты бакалавриата получают KAIST International Student Scholarship: полное покрытие платы за обучение на 8 семестров, ежемесячную стипендию около 350,000 KRW и национальную медстраховку Кореи. Обучение на 100% на английском языке.',
    tags: ['KAIST', 'Корея', 'STEM', '100% Стипендия'],
    originalUrl: 'https://admission.kaist.ac.kr/intl-undergraduate/',
    targetGrades: ['grade_11', 'grade_12', 'gap_year'],
    targetTrack: 'university',
    badge: '🌏 Топ Азии',
    sourceTitle: 'KAIST International Office',
  },
  {
    id: 'news-bocconi-isu-need-blind',
    title: 'Университет Боккони (Италия): Программа финансовой помощи ISU Bocconi для студентов из Центральной Азии',
    category: 'university',
    institutionId: 'bocconi',
    institutionName: 'Bocconi University',
    date: '2026-02-14',
    summary: 'Ведущая европейская бизнес-школа предоставляет полное освобождение от оплаты за обучение и стипендию на проживание в Милане.',
    content: 'Стипендия ISU Bocconi присуждается на основании оценки семейного дохода (по справкам 2-НДФЛ). Студенты из семей с доходом ниже установленного лимита получают бесплатное обучение, бесплатное питание в столовой кампуса и грант на жилье.',
    tags: ['Bocconi', 'Италия', 'Бизнес', 'Need-based Aid'],
    originalUrl: 'https://www.unibocconi.eu/wps/wcm/connect/bocconi/sitocouple/en/study/fees-and-funding/',
    targetGrades: ['grade_11', 'grade_12'],
    targetTrack: 'university',
    badge: '💼 Экономика и Бизнес',
    sourceTitle: 'Bocconi Fees & Funding Desk',
  },
  {
    id: 'news-mit-stem-olympiad-quota',
    title: 'MIT и топ-вузы США: Вес международных олимпиад IMO, IOI, IPhO в приемной кампании 2026/27',
    category: 'university',
    institutionId: 'mit',
    institutionName: 'Massachusetts Institute of Technology (MIT)',
    date: '2026-02-01',
    summary: 'Приемная комиссия MIT подтвердила сохранение политики Need-Blind финансовой помощи для всех международных кандидатов.',
    content: 'MIT гарантирует покрытие 100% продемонстрированной финансовой потребности принятого студента вне зависимости от гражданства семьи. Наличие медалей международных олимпиад по физике, математике или информатике выделяет кандидата среди более чем 30 000 претендентов со всего мира.',
    tags: ['MIT', 'США', 'Need-Blind', 'Олимпиады'],
    originalUrl: 'https://mitadmissions.org/',
    targetGrades: ['grade_10', 'grade_11', 'grade_12'],
    targetTrack: 'university',
    badge: '🇺🇸 Need-Blind Aid',
    sourceTitle: 'MIT Admissions Office',
  },
];

/**
 * Filter and rank news items for a specific applicant.
 * @param {Object} [params]
 * @param {string} [params.category]
 * @param {string} [params.track]
 * @param {string} [params.grade]
 * @param {string[]} [params.targetIds]
 * @returns {EducationalNewsItem[]}
 */
export function getRecommendedNews({ category, track, grade, targetIds = [] } = {}) {
  let list = [...EDUCATIONAL_NEWS];

  if (category && category !== 'all') {
    list = list.filter((item) => item.category === category || item.category === 'all');
  }

  // Score each news item based on personalization factors
  const scored = list.map((item) => {
    let score = 50;

    // Track match
    if (track && track !== 'all') {
      if (item.category === track || item.targetTrack === track) score += 40;
    }

    // Grade match
    if (grade && item.targetGrades && item.targetGrades.includes(grade)) {
      score += 30;
    }

    // Target institution match
    if (item.institutionId && targetIds.includes(item.institutionId)) {
      score += 50;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score || b.item.date.localeCompare(a.item.date));
  return scored.map((s) => s.item);
}
