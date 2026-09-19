// Cross-university admissions knowledge: what committees reward, what they penalise, the most common
// inconveniences applicants from Kazakhstan run into, the document checklist and exam preparation plans.
// Sources: admissions office blogs (MIT, Harvard, Stanford, UC), NAFSA / IIE reports 2025–2026, counsellor
// surveys (Sarah Harberson, College Essay Guy), NU / МНВО РК admission rules 2026, student forums.

/** What admissions officers consistently say they LIKE — across regions. */
export const UNIVERSAL_LIKES = [
  { id: 'spike', title: 'Глубина в одной области («spike»)', desc: 'Один сильный, доказанный интерес (проект, олимпиада, исследование) ценится выше десяти поверхностных кружков.' },
  { id: 'authentic_voice', title: 'Собственный голос в эссе', desc: 'Конкретная история с деталями, рефлексией и тем, чему вы научились. Не пересказ резюме.' },
  { id: 'growth', title: 'Рост оценок за 10–11 классы', desc: 'Восходящая динамика важнее одной плохой четверти в 9 классе.' },
  { id: 'why_us', title: 'Конкретный «Why this university»', desc: 'Названия курсов, лабораторий, профессоров, клубов — и связь с вашей целью.' },
  { id: 'impact', title: 'Измеримое влияние на сообщество', desc: '«Организовал школу программирования для 40 детей» вместо «люблю помогать людям».' },
  { id: 'consistency', title: 'Согласованность заявки', desc: 'Эссе, рекомендации и список активностей рассказывают одну историю без противоречий.' },
  { id: 'rigor', title: 'Максимально сложная школьная программа', desc: 'Профильные предметы, AP/IB/A-level, олимпиадные курсы — комиссии сверяют с возможностями вашей школы.' },
  { id: 'early', title: 'Ранняя подача (ED/EA/Early Round)', desc: 'Показывает приоритет и часто даёт статистически более высокий шанс.' },
];

/** What admissions officers consistently DISLIKE / red flags. */
export const UNIVERSAL_DISLIKES = [
  { id: 'generic_essay', title: 'Шаблонное эссе', desc: 'Начало с цитаты Эйнштейна/Джобса, определения из словаря или «с детства мечтал» — маркер того, что нечего сказать.' },
  { id: 'resume_essay', title: 'Эссе-резюме', desc: 'Перечисление достижений, уже видных в списке активностей.' },
  { id: 'parent_voice', title: 'Взрослый голос в эссе', desc: 'Комиссии узнают текст, написанный родителями, консультантом или ИИ, — лексика не совпадает с возрастом.' },
  { id: 'typos', title: 'Опечатки и грамматика', desc: 'Особенно в названии университета («Why Harvard» в эссе для Yale).' },
  { id: 'inconsistency', title: 'Противоречия в заявке', desc: 'Даты активностей не совпадают, рекомендатель описывает другого человека.' },
  { id: 'prestige_only', title: 'Мотивация только престижем', desc: '«Рейтинг №1» и «известные выпускники» — не причина. Комиссия ищет fit.' },
  { id: 'missing_docs', title: 'Неполный пакет документов к дедлайну', desc: 'Не пришедший IELTS TRF или не загруженный транскрипт = автоматический отказ без рассмотрения.' },
  { id: 'blame', title: 'Обвинение других без рефлексии', desc: 'Эссе о трудностях должно показывать выводы, а не жаловаться на учителя.' },
];

/** Most common inconveniences for applicants from Kazakhstan / Central Asia (2025–2026 reports). */
export const COMMON_INCONVENIENCES = [
  {
    id: 'twelve_years',
    title: '11-летний аттестат ≠ 12 лет образования',
    desc: 'Большинство государственных вузов ЕС (Германия, Нидерланды, Италия, Япония MEXT) требуют 12 лет школы. Решения: год вуза в РК, Foundation year, IB/A-level, НИШ 12-летка.',
    regions: ['europe', 'asia'],
    fix: 'Уточнить требование заранее; выбрать вузы, принимающие 11-летний аттестат (Constructor, Hungaricum, Польша, Турция, США).',
  },
  {
    id: 'ielts_online',
    title: 'Онлайн-версии IELTS/TOEFL не принимаются',
    desc: 'NU и многие вузы не рассматривают IELTS Online / TOEFL Home Edition. Нужен очный тест в центре.',
    regions: ['kazakhstan', 'usa_canada', 'europe', 'asia'],
    fix: 'Записаться на очный IELTS Academic минимум за 2 месяца — слоты в Алматы/Астане разлетаются.',
  },
  {
    id: 'apostille',
    title: 'Апостиль и нотариальный перевод',
    desc: 'Аттестат, транскрипт и справки требуют апостиля (ЦОН, 5–10 рабочих дней) и присяжного перевода.',
    regions: ['europe', 'asia'],
    fix: 'Начать за 3 месяца до дедлайна; перевод делать у переводчика с печатью, признаваемой консульством.',
  },
  {
    id: 'financial_docs',
    title: 'Финансовые формы (CSS Profile, ISEE, Sperrkonto)',
    desc: 'Справки о доходах родителей, налоговые декларации, выписки — с переводом и иногда апостилем. CSS Profile платный ($25 + $16 за вуз).',
    regions: ['usa_canada', 'europe'],
    fix: 'Собрать справки с места работы, 2-НДФЛ/ИПН, выписки за 3 месяца заранее; оформить CSS Profile за месяц до дедлайна.',
  },
  {
    id: 'visa_delays',
    title: 'Визовые задержки и отказы (США 2025–2026)',
    desc: 'Очереди на собеседование F-1 до 3–6 месяцев, усиленная проверка соцсетей, отзывы SEVIS. Число новых иностранных студентов в США упало на 17–20%.',
    regions: ['usa_canada'],
    fix: 'Подавать DS-160 сразу после I-20; иметь план B (Канада, Азия, Европа).',
  },
  {
    id: 'grant_priorities',
    title: 'Ошибки в приоритетах на eGov (грант РК)',
    desc: 'Заявка на грант 13–20 июля: 4 приоритета вуз+программа. Неверная комбинация профильных предметов ЕНТ = исключение из конкурса.',
    regions: ['kazakhstan'],
    fix: 'Проверить, что профильные предметы ЕНТ соответствуют группе образовательных программ; первым ставить желаемый, последним — запасной.',
  },
  {
    id: 'recommendation_letters',
    title: 'Рекомендательные письма от учителей',
    desc: 'Учителя в РК редко пишут рекомендации на английском и не знакомы с форматом Common App (загрузка через систему по email-приглашению).',
    regions: ['usa_canada', 'asia', 'europe'],
    fix: 'Дать учителю шаблон-подсказку и «brag sheet» о себе; попросить за 2 месяца; убедиться, что у учителя рабочий email.',
  },
  {
    id: 'housing',
    title: 'Дефицит студенческого жилья',
    desc: 'Нидерланды, Мюнхен, Ванкувер, Дублин, Беркли — очереди на общежитие и аренда €800+.',
    regions: ['europe', 'usa_canada'],
    fix: 'Подавать на общежитие в день зачисления; рассматривать вузы с гарантированным жильём (кампусные).',
  },
  {
    id: 'deadline_confusion',
    title: 'Путаница с дедлайнами и часовыми поясами',
    desc: 'Дедлайн «1 ноября 23:59 ET» = 2 ноября 10:59 по Астане. Серверы Common App перегружены за 6 часов до закрытия.',
    regions: ['usa_canada'],
    fix: 'Подавать за 3–5 дней; ставить в календарь дедлайн на день раньше.',
  },
  {
    id: 'language_daily',
    title: 'Язык обучения ≠ язык быта',
    desc: 'Программа на английском, но общежитие, врачи, банк — на корейском/немецком/венгерском.',
    regions: ['europe', 'asia'],
    fix: 'Выучить базовый уровень (A2) языка страны за лето до отъезда.',
  },
  {
    id: 'ai_detection',
    title: 'Эссе, написанные ИИ',
    desc: 'Комиссии в 2025–2026 явно указывают: генеративный текст без личных деталей распознаётся и снижает оценку; некоторые вузы запрещают ИИ в эссе.',
    regions: ['usa_canada', 'europe', 'asia'],
    fix: 'Использовать ИИ только для структуры и проверки грамматики; истории, детали и выводы — только свои.',
  },
];

/**
 * Document checklist for the admission portfolio.
 * `regions` — where the document is typically required; `required` — whether the app treats it as mandatory.
 */
export const DOCUMENT_CHECKLIST = [
  { kind: 'passport', title: 'Паспорт / удостоверение личности', description: 'Скан первой страницы паспорта (для зарубежных вузов — срок действия минимум 6 месяцев после начала учёбы).', required: true, regions: ['kazakhstan', 'europe', 'asia', 'usa_canada'] },
  { kind: 'transcript', title: 'Транскрипт / табель за 9–11 классы', description: 'Официальная выписка оценок с печатью школы на двух языках (каз/рус + англ).', required: true, regions: ['kazakhstan', 'europe', 'asia', 'usa_canada'] },
  { kind: 'diploma', title: 'Аттестат об окончании школы', description: 'Или справка об обучении в 11 классе (predicted grades) до получения аттестата. Для ЕС — с апостилем.', required: true, regions: ['kazakhstan', 'europe', 'asia'] },
  { kind: 'ielts', title: 'Сертификат IELTS / TOEFL', description: 'Test Report Form (TRF). Действителен 2 года. Только очный формат для NU.', required: true, regions: ['kazakhstan', 'europe', 'asia', 'usa_canada'] },
  { kind: 'sat', title: 'Результаты SAT / ACT', description: 'Официальный score report из College Board (отправляется напрямую в вуз).', required: false, regions: ['usa_canada', 'asia', 'europe', 'kazakhstan'] },
  { kind: 'unt', title: 'Сертификат ЕНТ', description: 'Электронный сертификат с QR-кодом из НЦТ — для конкурса грантов РК и вузов Турции.', required: false, regions: ['kazakhstan', 'asia'] },
  { kind: 'recommendation', title: 'Рекомендательные письма (2)', description: 'От учителя профильного предмета и учителя английского / классного руководителя. На английском, на бланке школы.', required: true, regions: ['usa_canada', 'asia', 'europe'] },
  { kind: 'essay', title: 'Мотивационное эссе / Personal Statement', description: '650 слов Common App + дополнительные эссе конкретных вузов.', required: true, regions: ['usa_canada', 'asia', 'europe', 'kazakhstan'] },
  { kind: 'cv', title: 'CV / резюме', description: '1 страница: образование, достижения, проекты, волонтёрство, языки.', required: false, regions: ['europe', 'asia'] },
  { kind: 'portfolio', title: 'Портфолио (дизайн, медиа, архитектура)', description: 'PDF или ссылка: 10–20 работ с описанием процесса.', required: false, regions: ['usa_canada', 'europe', 'asia', 'kazakhstan'] },
  { kind: 'financial', title: 'Финансовые документы', description: 'Справки о доходах родителей, выписка из банка, CSS Profile / ISEE / Sperrkonto подтверждение.', required: false, regions: ['usa_canada', 'europe', 'asia'] },
  { kind: 'medical', title: 'Медицинская справка (075/У, 086/У) и прививки', description: 'Для вузов РК — обязательна при зачислении; для зарубежных — форма вуза + сертификат прививок.', required: false, regions: ['kazakhstan', 'asia', 'europe'] },
  { kind: 'photo', title: 'Фото 3×4', description: 'Цифровое фото на светлом фоне для личного дела и студенческого билета.', required: false, regions: ['kazakhstan', 'asia', 'europe'] },
];

/**
 * Exam preparation plans. Weeks are estimated from the gap between current and target level.
 * `gapBands` maps the size of the gap to weeks and weekly hours.
 */
export const PREP_PLANS = {
  IELTS: {
    exam: 'IELTS',
    bands: [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0],
    weeksPerHalfBand: 6,
    hoursPerWeek: 10,
    milestones: [
      'Диагностический mock-тест (Cambridge IELTS 18–19) — определить слабую секцию',
      'Listening: 20 минут ежедневно — подкасты BBC 6 Minute English, TED; тренировать написание чисел и имён',
      'Reading: 3 текста в день по таймеру (20 мин); стратегии skimming/scanning, True/False/Not Given',
      'Writing Task 1: 10 графиков за 2 недели; Task 2: 1 эссе в день с проверкой по критериям (TR, CC, LR, GRA)',
      'Speaking: ежедневно 15 минут с партнёром/ИИ; записывать себя, работать над fluency и лексикой',
      'Полный mock-тест каждые 2 недели; за неделю до экзамена — 2 полных теста',
    ],
    resources: [
      { title: 'IELTS Liz (бесплатно)', url: 'https://ieltsliz.com' },
      { title: 'Cambridge IELTS 15–19 (официальные тесты)', url: 'https://www.cambridge.org/elt/ielts' },
      { title: 'IELTS Advantage Writing', url: 'https://www.ieltsadvantage.com' },
      { title: 'British Council Take IELTS (регистрация в РК)', url: 'https://takeielts.britishcouncil.org/kazakhstan' },
    ],
  },
  SAT: {
    exam: 'SAT',
    bands: [1000, 1100, 1200, 1300, 1400, 1500, 1550],
    weeksPer100Points: 5,
    hoursPerWeek: 12,
    milestones: [
      'Диагностический Bluebook Practice Test 1 — определить баланс RW/Math',
      'Math: закрыть темы Algebra, Advanced Math, Problem Solving по Khan Academy; учить Desmos-трюки',
      'Reading & Writing: ежедневно 40 вопросов; грамматика (punctuation, transitions), vocabulary in context',
      'Полный практический тест каждую субботу (Bluebook 1–6) с разбором ошибок в error log',
      'За 3 недели: только официальные тесты и повтор слабых тем',
      'Регистрация на College Board за 5–7 недель до даты; центры в Алматы, Астане, Шымкенте',
    ],
    resources: [
      { title: 'Khan Academy Digital SAT (официально, бесплатно)', url: 'https://www.khanacademy.org/digital-sat' },
      { title: 'Bluebook — официальные практические тесты', url: 'https://bluebook.collegeboard.org' },
      { title: 'College Board — регистрация и даты', url: 'https://satsuite.collegeboard.org/sat/registration' },
      { title: 'r/SAT — сообщество и стратегии', url: 'https://www.reddit.com/r/Sat/' },
    ],
  },
  UNT: {
    exam: 'UNT',
    bands: [50, 65, 80, 95, 110, 125, 135],
    weeksPer15Points: 4,
    hoursPerWeek: 15,
    milestones: [
      'Пробное ЕНТ на testcenter.kz — определить баллы по 5 предметам (История РК, Мат. грамотность, Грамотность чтения, 2 профильных)',
      'История Казахстана: даты и персоналии по хронологическим таблицам; 30 минут ежедневно',
      'Математическая грамотность: 20 задач в день, разбор типовых (проценты, графики, логика)',
      'Профильные предметы: закрыть темы по спецификации НЦТ; решать сборники прошлых лет',
      'Полное пробное ЕНТ каждые 2 недели (240 минут по таймеру)',
      'Регистрация на основное ЕНТ (май–июнь) и пробные сессии (январь–апрель) через app.testcenter.kz',
    ],
    resources: [
      { title: 'Национальный центр тестирования — пробное ЕНТ', url: 'https://app.testcenter.kz' },
      { title: 'Daryn.online — курсы по предметам ЕНТ', url: 'https://daryn.online' },
      { title: 'iTest.kz — тренажёр ЕНТ', url: 'https://itest.kz' },
      { title: 'Univision — проходные баллы на гранты', url: 'https://univision.kz/grant/passing.html' },
    ],
  },
};

/** Global admissions calendar 2026/2027 — used by the roadmap generator and the task templates. */
export const ADMISSIONS_CALENDAR = [
  { date: '2026-10-01', label: 'Открытие регистрации на NUET (NU)', region: 'kazakhstan' },
  { date: '2026-11-01', label: 'Early Decision / Early Action США (большинство)', region: 'usa_canada' },
  { date: '2026-11-18', label: 'HKUST Early Round', region: 'asia' },
  { date: '2026-11-30', label: 'Дедлайн UC (Berkeley, UCLA)', region: 'usa_canada' },
  { date: '2027-01-01', label: 'Regular Decision США (Harvard, Princeton)', region: 'usa_canada' },
  { date: '2027-01-05', label: 'Regular Decision (MIT, Stanford, NYUAD)', region: 'usa_canada' },
  { date: '2027-01-12', label: 'KAIST Regular', region: 'asia' },
  { date: '2027-01-15', label: 'Stipendium Hungaricum, Toronto, UBC', region: 'europe' },
  { date: '2027-01-26', label: 'Bocconi Winter Session', region: 'europe' },
  { date: '2027-02-12', label: 'NU — загрузка IELTS/SAT', region: 'kazakhstan' },
  { date: '2027-03-30', label: 'SDU SPT олимпиада', region: 'kazakhstan' },
  { date: '2027-05-15', label: 'Основное ЕНТ (май–июнь)', region: 'kazakhstan' },
  { date: '2027-07-13', label: 'Старт приёма заявлений на грант РК (eGov)', region: 'kazakhstan' },
  { date: '2027-07-20', label: 'Закрытие приёма заявлений на грант РК', region: 'kazakhstan' },
  { date: '2027-08-25', label: 'Зачисление на платное обучение (вузы РК)', region: 'kazakhstan' },
];
