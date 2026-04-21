export type ProgramItem = {
  title: string;
  price: number;
};

export const dnkSectionLinks = [
  { id: 'education', label: 'Обучение' },
  { id: 'checklists', label: 'Чек-листы' },
  { id: 'automation', label: 'Автоматизация' },
  { id: 'programs', label: 'Программы' },
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
