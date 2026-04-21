export type ProgramItem = {
  title: string;
  price: number;
};

export type ShowcaseCourseStatus = 'ACTIVE' | 'SHOWCASE' | 'SOON';

export type ShowcaseCourse = {
  title: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  status: ShowcaseCourseStatus;
};

export const dnkSectionLinks = [
  { id: 'education', label: 'Обучение' },
  { id: 'checklists', label: 'Чек-листы' },
  { id: 'automation', label: 'Автоматизация' },
  { id: 'programs', label: 'Программы' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'pricing', label: 'Тарифы' },
  { id: 'about', label: 'О нас' },
  { id: 'contacts', label: 'Контакты' },
] as const;

export const dnkProgramCatalog: Array<{
  category: string;
  description: string;
  items: ProgramItem[];
}> = [
  {
    category: 'Профпереподготовка',
    description:
      'Программы из загруженного перечня DNK: управленческие, строительные, IT и офисные направления.',
    items: [
      { title: '1С: Бухгалтерия 8.3', price: 12000 },
      { title: '1С: Зарплата и кадры', price: 12000 },
      { title: 'IT менеджмент', price: 25000 },
      {
        title:
          'Бухгалтерский учет. Профессиональная переподготовка по профстандарту «Бухгалтер»',
        price: 25000,
      },
      { title: 'Государственное и муниципальное управление', price: 15000 },
      { title: 'Дизайн интерьера и жилых помещений', price: 30000 },
    ],
  },
  {
    category: 'Курсы по безопасности',
    description:
      'Блок реальных программ по безопасности, охране труда и строительным нормативам.',
    items: [
      { title: 'Охрана труда', price: 5000 },
      { title: 'Охрана труда при работе на высоте', price: 5000 },
      { title: 'Пожарная безопасность', price: 14000 },
      { title: 'Электробезопасность', price: 3000 },
      { title: 'Правила земляных работ', price: 7500 },
      { title: 'Техносферная безопасность', price: 5000 },
    ],
  },
];

export const dnkFeaturedPrograms: ProgramItem[] = [
  { title: 'IT менеджмент', price: 25000 },
  { title: '1С: Бухгалтерия 8.3', price: 12000 },
  { title: 'Пожарная безопасность', price: 14000 },
  { title: 'Охрана труда', price: 5000 },
];

export const dnkShowcaseCourses: ShowcaseCourse[] = [
  {
    title: '1С: Бухгалтерия 8.3',
    slug: '1c-accounting-83',
    description:
      'Практический курс по учёту, проводкам, операциям и базовой работе в 1С для специалистов и руководителей небольших команд.',
    price: 12000,
    category: '1С и бухгалтерия',
    status: 'SHOWCASE',
  },
  {
    title: '1С: Зарплата и кадры',
    slug: '1c-payroll-and-hr',
    description:
      'Программа по кадровым документам, начислениям, отпускным и типовым сценариям расчёта зарплаты в 1С.',
    price: 12000,
    category: '1С и бухгалтерия',
    status: 'SHOWCASE',
  },
  {
    title: 'Microsoft Excel. Основы работы с программой. Базовый уровень',
    slug: 'microsoft-excel-basic',
    description:
      'Стартовый курс по таблицам, формулам, структуре данных и ежедневной работе в Excel без перегруза сложными сценариями.',
    price: 9000,
    category: 'Офисные программы',
    status: 'SHOWCASE',
  },
  {
    title: 'Microsoft Word (базовый курс)',
    slug: 'microsoft-word-basic',
    description:
      'Базовая программа по подготовке документов, форматированию, шаблонам и аккуратной работе с деловыми текстами.',
    price: 8000,
    category: 'Офисные программы',
    status: 'SOON',
  },
  {
    title: 'IT менеджмент',
    slug: 'it-management',
    description:
      'Курс о роли IT-менеджера: процессы, команда, приоритеты, взаимодействие с бизнесом и управление внедрением цифровых изменений.',
    price: 25000,
    category: 'Управление',
    status: 'SHOWCASE',
  },
  {
    title: 'Охрана труда',
    slug: 'occupational-safety',
    description:
      'Прикладная программа по обязательным требованиям, внутренним регламентам и снижению операционных рисков на рабочих местах.',
    price: 5000,
    category: 'Безопасность',
    status: 'SHOWCASE',
  },
  {
    title: 'Пожарная безопасность',
    slug: 'fire-safety',
    description:
      'Курс по требованиям пожарной безопасности, инструктажам, документации и устойчивой подготовке сотрудников к проверкам.',
    price: 14000,
    category: 'Безопасность',
    status: 'SOON',
  },
  {
    title: 'Электробезопасность',
    slug: 'electrical-safety',
    description:
      'Короткая прикладная программа по допускам, правилам эксплуатации и базовым процедурам безопасной работы с электроустановками.',
    price: 3000,
    category: 'Безопасность',
    status: 'SOON',
  },
] as const;

export const dnkTeamMembers = [
  {
    role: 'Генеральный директор',
    name: 'Бердникова Ирина',
    direction: 'Стратегия',
  },
  {
    role: 'Эксперт БШ ДНК',
    name: 'Гордеева Юлия',
    direction: 'Методология',
  },
  {
    role: 'Преподаватель',
    name: 'Ольга Туркина',
    direction: 'Обучение',
  },
  {
    role: 'AI-помощник',
    name: 'BLACK Cat',
    direction: 'Код и дизайн',
  },
] as const;

export const dnkTeamStats = [
  '500+ внедренных систем',
  '10 000 часов экономии',
  '+40% средний рост прибыли',
  '1 200 студентов в сообществе',
] as const;

export const dnkTestimonials = [
  {
    initials: 'AK',
    name: 'Алексей К.',
    company: 'Студия звукозаписи',
    text:
      'Внедрили CRM за неделю. Потерянных лидов стало 0, а выручка выросла уже в первый месяц.',
  },
  {
    initials: 'MP',
    name: 'Мария П.',
    company: 'Онлайн-школа',
    text:
      'Чат-бот снял с менеджеров рутину. Команда занялась продажами и перестала тонуть в повторяющихся вопросах.',
  },
  {
    initials: 'DS',
    name: 'Дмитрий С.',
    company: 'Строительство',
    text:
      'Наконец-то увидели реальные цифры по процессам и деньгам. Поняли, где теряли ресурсы годами.',
  },
  {
    initials: 'EL',
    name: 'Елена Л.',
    company: 'Салон красоты',
    text:
      'Автоматическая запись клиентов освободила администратора. Сервис стал быстрее, а ошибок стало заметно меньше.',
  },
] as const;
