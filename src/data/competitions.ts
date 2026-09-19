// Comprehensive database of academic olympiads, scientific project competitions,
// coding hackathons, robotics tournaments, and essay contests for high school applicants.

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  category: 'olympiad' | 'science_project' | 'hackathon' | 'robotics' | 'essay' | 'debates';
  subjects: string[];
  organizer: string;
  level: 'republican' | 'international' | 'university';
  targetGrades: string[];
  season: string;
  impact: string;
  officialUrl: string;
  description: string;
  tips: string;
}

export const COMPETITIONS_DATABASE: Competition[] = [
  {
    id: 'daryn-republican-olympiad',
    name: 'Республиканская олимпиада школьников по общеобразовательным предметам (Дарын)',
    shortName: 'Республиканская олимпиада (Дарын)',
    category: 'olympiad',
    subjects: ['Математика', 'Физика', 'Информатика', 'Химия', 'Биология', 'Английский язык'],
    organizer: 'РНПЦ «Дарын» МП РК',
    level: 'republican',
    targetGrades: ['9', '10', '11'],
    season: 'Ноябрь (школьный этап) — Март (заключительный этап)',
    impact: 'Диплом I, II, III степени дает 100% государственный грант в любой вуз РК вне конкурса и колоссальный приоритет в Nazarbayev University.',
    officialUrl: 'https://daryn.kz',
    description: 'Главная государственная олимпиада Казахстана. Проводится в 4 этапа: школьный, районный, областной и республиканский.',
    tips: 'Решайте архивы заданий прошлых лет на daryn.kz, готовьтесь по углубленной программе олимпиадных кружков РФМШ и БИЛ.',
  },
  {
    id: 'izho',
    name: 'Международная Жаутыковская олимпиада по математике, физике и информатике (IZhO)',
    shortName: 'Жаутыковская олимпиада (IZhO)',
    category: 'olympiad',
    subjects: ['Математика', 'Физика', 'Информатика'],
    organizer: 'РФМШ (Республиканская физико-математическая школа)',
    level: 'international',
    targetGrades: ['10', '11'],
    season: 'Январь ежегодно',
    impact: 'Одна из самых престижных международных олимпиад в СНГ и Азии. Медаль IZhO — сильное преимущество при поступлении и отборе на стипендии в ведущие университеты (KAIST, HKUST, NU, МФТИ).',
    officialUrl: 'https://izho.kz',
    description: 'Ежегодное соревнование сильнейших команд специализированных школ из 20+ стран мира.',
    tips: 'Уровень сложности приближен к Международным олимпиадам (IMO/IPhO/IOI). Требуется многолетняя олимпиадная подготовка.',
  },
  {
    id: 'daryn-science-projects',
    name: 'Республиканский конкурс научных проектов школьников (РКНП)',
    shortName: 'Конкурс научных проектов «Дарын»',
    category: 'science_project',
    subjects: ['Информатика и IT', 'Математическое моделирование', 'Физика и космос', 'Биология и экология', 'Химия'],
    organizer: 'РНПЦ «Дарын»',
    level: 'republican',
    targetGrades: ['9', '10', '11'],
    season: 'Сентябрь — Февраль ежегодно',
    impact: 'Победители получают преимущественное право на государственные гранты РК, а также отбор на международные научные ярмарки (ISEF в США).',
    officialUrl: 'https://daryn.kz',
    description: 'Защита собственного научного исследования перед комиссией ученых Национальной академии наук РК.',
    tips: 'Найдите научного руководителя в университете, сосредоточьтесь на практической новизне и реальном прототипе/исследовании.',
  },
  {
    id: 'astana-hub-hackathons',
    name: 'Хакатоны и конкурсы стартапов Astana Hub',
    shortName: 'Astana Hub Hackathons',
    category: 'hackathon',
    subjects: ['IT', 'Искусственный интеллект', 'Web3', 'Мобильная разработка', 'Стартапы'],
    organizer: 'Международный технопарк IT-стартапов «Astana Hub»',
    level: 'republican',
    targetGrades: ['10', '11', 'Студенты'],
    season: 'Круглый год (ежеквартально)',
    impact: 'Денежные призовые фонды (до 5–10 млн тенге), признание в портфолио для зарубежных вузов, инвестиции и менторство.',
    officialUrl: 'https://astanahub.com',
    description: 'Интенсивные 48-часовые IT-соревнования по созданию инновационных продуктов с использованием AI, FinTech и EdTech.',
    tips: 'Соберите сбалансированную команду: разработчик (Frontend/Backend), AI-инженер, дизайнер и питчер.',
  },
  {
    id: 'nfactorial-incubator',
    name: 'nFactorial School & Hackathons',
    shortName: 'nFactorial Incubator',
    category: 'hackathon',
    subjects: ['Computer Science', 'iOS / Web разработка', 'AI инженерия'],
    organizer: 'nFactorial School',
    level: 'republican',
    targetGrades: ['10', '11', 'Студенты'],
    season: 'Весна — Лето ежегодно',
    impact: 'Выпускники запускают приложения в App Store и поступают в Stanford, Harvard, NU, а также стажируются в Google и Meta.',
    officialUrl: 'https://nfactorial.school',
    description: 'Ведущий инкубатор мобильных разработчиков в Центральной Азии. Включает хакатоны и интенсивную программу создания продуктов.',
    tips: 'Изучите основы JavaScript/Swift или Python, подготовьте концепт приложения, решающего реальную проблему.',
  },
  {
    id: 'nu-olympiads',
    name: 'Олимпиады и конкурсы Nazarbayev University (NU Math & STEM)',
    shortName: 'NU STEM & Math Competitions',
    category: 'olympiad',
    subjects: ['Математика', 'Физика', 'Информатика', 'Робототехника'],
    organizer: 'Nazarbayev University',
    level: 'university',
    targetGrades: ['10', '11'],
    season: 'Октябрь — Апрель',
    impact: 'Прямой контакт с приемной комиссией NU, сертификаты победителей усиливают заявку при отборе на грант NU.',
    officialUrl: 'https://nu.edu.kz',
    description: 'Серия открытых олимпиад, хакатонов и дней науки, организуемых школами SEDS и SSH Назарбаев Университета.',
    tips: 'Следите за анонсами на портале nu.edu.kz и в соцсетях студенческих клубов NU (ACM, IEEE, Robotics).',
  },
  {
    id: 'first-robotics',
    name: 'FIRST Robotics Competition & FIRST Tech Challenge Kazakhstan',
    shortName: 'FIRST Robotics Kazakhstan',
    category: 'robotics',
    subjects: ['Робототехника', 'Мехатроника', 'Программирование C++/Java', 'Инженерия'],
    organizer: 'FIRST & USTEM Foundation',
    level: 'international',
    targetGrades: ['8', '9', '10', '11'],
    season: 'Сентябрь — Март (Национальный финал и поездка на World Championship в США)',
    impact: 'Главный турнир по робототехнике в мире. Доступ к стипендиальному фонду FIRST ($80+ млн) для вузов США (MIT, WPI, Carnegie Mellon).',
    officialUrl: 'https://firstinspires.org',
    description: 'Командное проектирование, сборка и программирование 50-килограммовых промышленных роботов для решения соревновательных задач.',
    tips: 'Присоединитесь к школьной команде FTC/FRC или создайте свою при поддержке фонда USTEM Robotics.',
  },
  {
    id: 'john-locke-essay',
    name: 'John Locke Institute Global Essay Prize',
    shortName: 'John Locke Essay Competition',
    category: 'essay',
    subjects: ['Философия', 'Политика', 'Экономика', 'История', 'Право'],
    organizer: 'John Locke Institute (Оксфорд / Принстон)',
    level: 'international',
    targetGrades: ['9', '10', '11'],
    season: 'Февраль (объявление тем) — Июнь (дедлайн сдачи)',
    impact: 'Топ-1 признание академического эссе в мире. Победа или статус Shortlisted резко повышают шансы в Оксбридж и Лигу Плюща.',
    officialUrl: 'https://johnlockeinstitute.com',
    description: 'Престижнейший международный конкурс эссе на английском языке по сложным междисциплинарным вопросам общества и науки.',
    tips: 'Пишите строго аргументированное эссе (до 2000 слов), критикуйте контрдоводы и опирайтесь на научные источники.',
  },
  {
    id: 'crimson-essay',
    name: 'Harvard Crimson Global Essay Competition (HCGEC)',
    shortName: 'Crimson Global Essay Competition',
    category: 'essay',
    subjects: ['Творческое эссе', 'Журналистика', 'Академическое эссе'],
    organizer: 'The Harvard Crimson',
    level: 'international',
    targetGrades: ['9', '10', '11'],
    season: 'Декабрь — Март',
    impact: 'Публикация в изданиях The Harvard Crimson, международное признание и весомый плюс к портфолио в США и UK.',
    officialUrl: 'https://essaycomp.org',
    description: 'Глобальный конкурс эссе для старшеклассников, организованный студенческой газетой Гарвардского университета.',
    tips: 'Развивайте индивидуальный авторский голос, покажите эмоциональную глубину и социальную осознанность.',
  },
  {
    id: 'infomatrix-asia',
    name: 'Международный конкурс компьютерных проектов Infomatrix-Asia',
    shortName: 'Infomatrix-Asia',
    category: 'science_project',
    subjects: ['IT', 'Программирование', 'Робототехника', 'Короткометражный фильм', 'Компьютерная графика'],
    organizer: 'Международный фонд KATEV / БИЛ',
    level: 'international',
    targetGrades: ['9', '10', '11'],
    season: 'Февраль — Апрель',
    impact: 'Гранты и скидки на обучение в университете Сулеймана Демиреля (SDU), МУИТ, AITU и зарубежных партнерских вузах.',
    officialUrl: 'https://infomatrix.asia',
    description: 'Масштабный международный смотр IT-проектов школьников из 15+ стран мира в нескольких прикладных категориях.',
    tips: 'Сделайте упор на рабочий демо-прототип и качество презентации перед международным жюри на английском языке.',
  },
  {
    id: 'codeforces-olympiads',
    name: 'Олимпиады по спортивному программированию (Codeforces / ICPC School)',
    shortName: 'Спортивное программирование (Codeforces)',
    category: 'olympiad',
    subjects: ['Алгоритмы и структуры данных', 'C++', 'Python', 'Java'],
    organizer: 'Codeforces & IT Сообщество',
    level: 'international',
    targetGrades: ['8', '9', '10', '11'],
    season: 'Круглый год (раунды каждые 3–5 дней)',
    impact: 'Рейтинг Candidate Master (1900+) на Codeforces открывает двери в топ-IT компании (Google, Meta, Kaspi) и дает офферы в университеты без собеседований.',
    officialUrl: 'https://codeforces.com',
    description: 'Глобальная соревновательная платформа, где соревнуются сильнейшие программисты планеты в решении алгоритмических задач.',
    tips: 'Регулярно участвуйте в Div. 2 и Div. 3 раундах, изучите классические алгоритмы: динамическое программирование, графы, бинарный поиск.',
  },
];

export function findRelevantCompetitions(query: string, limit = 4): Competition[] {
  const q = query.toLowerCase();
  const matched = COMPETITIONS_DATABASE.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.subjects.some((s) => s.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q) ||
      c.impact.toLowerCase().includes(q),
  );
  if (matched.length > 0) return matched.slice(0, limit);
  return COMPETITIONS_DATABASE.slice(0, limit);
}
