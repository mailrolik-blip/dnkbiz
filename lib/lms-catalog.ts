export type CatalogGroupId =
  | 'office-accounting'
  | 'safety'
  | 'management-growth';

export type CatalogCourseStatus = 'free' | 'paid' | 'showcase';

type CatalogCourseDefinition = {
  slug: string;
  title: string;
  description: string;
  price: number | null;
  groupId: CatalogGroupId;
  order: number;
  audience: string[];
  outcomes: string[];
  includes: string[];
};

export type CatalogCourseMeta = {
  slug: string;
  title: string;
  description: string;
  category: string;
  groupId: CatalogGroupId;
  price: number | null;
  audience: string[];
  outcomes: string[];
  includes: string[];
};

export type CatalogCourseCard = {
  slug: string;
  title: string;
  description: string;
  category: string;
  groupId: CatalogGroupId;
  status: CatalogCourseStatus;
  lessonsCount: number | null;
  previewLessonsCount: number;
  previewEnabled: boolean;
  price: number | null;
  tariffId: number | null;
  isOwned: boolean;
  isStarted: boolean;
  completedLessonsCount: number;
  progressPercent: number;
  nextLessonTitle: string | null;
  pendingOrder: {
    id: number;
    checkoutUrl: string;
    status: 'PENDING' | 'PROCESSING';
  } | null;
};

export const lmsCatalogGroups: Array<{
  id: CatalogGroupId;
  title: string;
  description: string;
}> = [
  {
    id: 'office-accounting',
    title: 'Офис и учет',
    description:
      '1С, Excel и Word для рабочих задач, бухгалтерии, кадров и офисного контура.',
  },
  {
    id: 'safety',
    title: 'Безопасность',
    description:
      'Обязательное обучение по охране труда, пожарной и электрической безопасности.',
  },
  {
    id: 'management-growth',
    title: 'Управление и развитие',
    description:
      'Программы для роли руководителя, роста управленческой функции и системной работы.',
  },
];

const catalogCourseDefinitions: CatalogCourseDefinition[] = [
  {
    slug: 'practical-course',
    title: 'ДНК: стартовый курс',
    description:
      'Практический курс о том, как собрать понятную учебную программу внутри компании: маршрут ученика, структура уроков, доступ и обучение в личном кабинете.',
    price: 14900,
    groupId: 'management-growth',
    order: 10,
    audience: [
      'Руководителям, которые собирают понятную программу обучения для команды',
      'Тем, кто хочет выстроить единый путь ученика: выбор курса, доступ и обучение',
      'Командам, которым нужен наглядный пример аккуратно собранного учебного маршрута',
    ],
    outcomes: [
      'Поймете, как выглядит понятный путь ученика от выбора программы до прохождения курса',
      'Соберете логику доступа, уроков и прогресса без перегруженного сценария для пользователя',
      'Сможете использовать курс как образец для внутренней учебной программы или запуска нового направления',
    ],
    includes: [
      'Полный путь ученика от витрины курса до продолжения обучения в кабинете',
      'Разбор ознакомительного доступа к первым урокам и открытия полного доступа после подтверждения оплаты',
      'Практику по сборке понятного сценария обучения без лишнего ручного сопровождения',
    ],
  },
  {
    slug: 'marketing-sales-management',
    title: 'Маркетинг и управление продажами',
    description:
      'Прикладной курс по маркетингу и продажам: рынок, целевая аудитория, планирование, цена, сбыт и рабочая коммуникация с клиентом.',
    price: 4900,
    groupId: 'management-growth',
    order: 15,
    audience: [
      'Собственникам и руководителям, которым нужно выстроить маркетинг и продажи как систему, а не как набор кампаний',
      'Маркетологам и коммерческим менеджерам, которые отвечают за спрос, упаковку продукта и результат по выручке',
      'Командам малого и среднего бизнеса, которым нужен общий язык между маркетингом, продажами и управлением',
    ],
    outcomes: [
      'Соберете базовую систему маркетинга и продаж без разрозненных действий',
      'Поймете, как анализировать аудиторию, предложение, цену и каналы продвижения',
      'Получите рабочую основу для самостоятельного развития спроса и продаж',
    ],
    includes: [
      '12 уроков с краткими выводами, ключевыми тезисами и вопросами для самопроверки',
      '2 первых урока бесплатно и полный доступ после подтверждения оплаты',
      'Практическую рамку по исследованиям, ценообразованию, сбыту, продажам и коммуникациям',
    ],
  },
  {
    slug: 'microsoft-excel-basic',
    title: 'Microsoft Excel. Основы работы с программой. Базовый уровень',
    description:
      'Бесплатный стартовый курс по Excel: логика таблиц, базовые формулы, фильтры и первый рабочий мини-отчет.',
    price: null,
    groupId: 'office-accounting',
    order: 20,
    audience: [
      'Тем, кто работает с таблицами каждый день, но хочет меньше ручной рутины',
      'Офисным сотрудникам, начинающим специалистам и администраторам',
      'Тем, кому нужен быстрый базовый вход в Excel без лишней теории',
    ],
    outcomes: [
      'Научитесь уверенно работать с простыми таблицами и формулами',
      'Сможете быстрее собирать и проверять рабочие данные',
      'Получите понятную базу для дальнейшего развития навыков в Excel',
    ],
    includes: [
      'Структуру таблиц, базовые формулы и сортировку данных',
      'Работу с фильтрами, форматированием и простыми отчетами',
      'Мини-практику, которую можно сразу применить в рабочих задачах',
    ],
  },
  {
    slug: '1c-accounting-83',
    title: '1С: Бухгалтерия 8.3',
    description:
      'Курс по бухгалтерскому учету, проводкам и повседневной работе в 1С для специалистов и руководителей небольших команд.',
    price: 12000,
    groupId: 'office-accounting',
    order: 30,
    audience: [
      'Бухгалтерам и помощникам бухгалтера',
      'Офисным специалистам, которым нужно уверенно работать в 1С',
      'Тем, кто хочет быстрее освоить типовые операции и документы',
    ],
    outcomes: [
      'Разберетесь в типовых операциях и документах 1С: Бухгалтерия 8.3',
      'Сможете увереннее работать с учетом, проводками и базовой отчетностью',
      'Снизите количество ошибок в повседневных сценариях работы в 1С',
    ],
    includes: [
      'Типовые документы и ежедневные сценарии работы в 1С',
      'Понимание проводок, отчетности и логики учета в системе',
      'Практические задания по основным операциям без отрыва от реальной работы',
    ],
  },
  {
    slug: '1c-payroll-and-hr',
    title: '1С: Зарплата и кадры',
    description:
      'Программа по кадровым документам, начислениям и базовым рабочим сценариям в контуре 1С: Зарплата и кадры.',
    price: 12000,
    groupId: 'office-accounting',
    order: 40,
    audience: [
      'Кадровым специалистам и бухгалтерам по зарплате',
      'Тем, кому нужно выстроить кадровый контур в 1С',
      'Командам, которые готовят курс к запуску для учеников',
    ],
    outcomes: [
      'Поймете базовую логику кадрового контура и начислений в 1С',
      'Сможете увереннее работать с кадровыми документами, графиками и выплатами',
      'Получите опору для регулярной работы с кадровыми процессами внутри компании',
    ],
    includes: [
      'Кадровые документы, начисления и базовые расчеты',
      'Сценарии работы с сотрудниками, графиками и выплатами',
      'Подготовку к полноценному запуску курса для обучения сотрудников',
    ],
  },
  {
    slug: 'microsoft-word-basic',
    title: 'Microsoft Word (базовый курс)',
    description:
      'Базовая программа по подготовке документов, форматированию и аккуратной работе с деловыми текстами.',
    price: null,
    groupId: 'office-accounting',
    order: 50,
    audience: [
      'Офисным сотрудникам и администраторам',
      'Тем, кто регулярно готовит документы, инструкции и шаблоны',
      'Тем, кому нужен быстрый базовый вход в Word для работы',
    ],
    outcomes: [
      'Сможете быстро готовить аккуратные документы без хаоса в форматировании',
      'Разберетесь со стилями, таблицами, списками и шаблонами',
      'Получите рабочую базу для деловых текстов и внутренних документов',
    ],
    includes: [
      'Создание и оформление документов без хаоса в форматировании',
      'Работу со стилями, списками, таблицами и шаблонами',
      'Базовые рабочие приемы для деловых текстов и внутренних документов',
    ],
  },
  {
    slug: 'occupational-safety',
    title: 'Охрана труда',
    description:
      'Прикладная программа по обязательным требованиям, внутренним регламентам и снижению рабочих рисков на местах.',
    price: 5000,
    groupId: 'safety',
    order: 60,
    audience: [
      'Руководителям и ответственным за обучение сотрудников',
      'Специалистам по охране труда и внутренним инструктажам',
      'Компаниям, которым нужен понятный маршрут обязательного обучения',
    ],
    outcomes: [
      'Поймете ключевые требования по охране труда и роли ответственных лиц',
      'Сможете аккуратнее организовать инструктажи, документы и базовые проверки',
      'Получите понятный маршрут обязательного обучения для рабочей практики',
    ],
    includes: [
      'Ключевые требования по охране труда и роли ответственных лиц',
      'Рабочие сценарии по документам, инструктажам и проверкам',
      'Пошаговую структуру обучения, которую можно пройти в личном кабинете',
    ],
  },
  {
    slug: 'fire-safety',
    title: 'Пожарная безопасность',
    description:
      'Курс по инструктажам, документации и устойчивой подготовке сотрудников к проверкам по пожарной безопасности.',
    price: 14000,
    groupId: 'safety',
    order: 70,
    audience: [
      'Компаниям, которым важно собрать обязательное обучение в одном кабинете',
      'Ответственным за пожарную безопасность и внутренние проверки',
      'Тем, кто готовит направление к следующему запуску',
    ],
    outcomes: [
      'Соберете базовое понимание инструктажей и обязательных требований',
      'Сможете увереннее работать с документами и внутренней подготовкой к проверкам',
      'Получите понятный маршрут по теме пожарной безопасности для сотрудников и ответственных лиц',
    ],
    includes: [
      'Сценарии инструктажа и подготовки сотрудников',
      'Работу с документами и обязательными требованиями',
      'Структуру курса, которую можно оценить до открытия полного состава материалов',
    ],
  },
  {
    slug: 'electrical-safety',
    title: 'Электробезопасность',
    description:
      'Короткая прикладная программа по допускам, правилам эксплуатации и безопасной работе с электроустановками.',
    price: 3000,
    groupId: 'safety',
    order: 80,
    audience: [
      'Сотрудникам, которым нужен понятный базовый вход в требования по электробезопасности',
      'Компаниям, которые готовят обязательное обучение для сотрудников',
      'Тем, кто хочет видеть курс как продукт, а не разрозненный набор файлов',
    ],
    outcomes: [
      'Поймете базовые правила допуска и безопасной работы с электроустановками',
      'Сможете ориентироваться в ключевых требованиях без лишней теории',
      'Получите компактную основу для обязательного обучения по электробезопасности',
    ],
    includes: [
      'Основы допуска, эксплуатации и безопасного поведения',
      'Краткую прикладную структуру без перегруженного теоретического блока',
      'Направление, которое можно оценить как программу обучения в каталоге',
    ],
  },
  {
    slug: 'it-management',
    title: 'IT менеджмент',
    description:
      'Курс о роли IT-менеджера: процессы, команда, приоритеты и взаимодействие IT с бизнесом.',
    price: 25000,
    groupId: 'management-growth',
    order: 90,
    audience: [
      'Руководителям и тимлидам, которые растут в управленческую роль',
      'Тем, кто отвечает за процессы и взаимодействие IT с бизнесом',
      'Командам, которым нужен продуктовый подход к управленческому обучению',
    ],
    outcomes: [
      'Разберетесь в роли IT-менеджера и ключевых управленческих зонах ответственности',
      'Сможете лучше работать с приоритетами, процессами и коммуникацией между IT и бизнесом',
      'Получите основу для системного роста из технической роли в управленческую',
    ],
    includes: [
      'Работу с приоритетами, процессами и зоной ответственности руководителя',
      'Основы системной коммуникации между IT и бизнесом',
      'Структуру курса, которую можно оценить до открытия следующего запуска',
    ],
  },
];

const catalogDefinitionMap = new Map(
  catalogCourseDefinitions.map((definition) => [definition.slug, definition])
);

export function getCourseCatalogHref(slug: string) {
  return `/catalog/${slug}`;
}

export function getCatalogProfile(slug: string) {
  return catalogDefinitionMap.get(slug) ?? null;
}

export function getCatalogCourseMeta(slug: string): CatalogCourseMeta | null {
  const definition = getCatalogProfile(slug);

  if (!definition) {
    return null;
  }

  const group = getCatalogGroupById(definition.groupId);

  return {
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    category: group.title,
    groupId: definition.groupId,
    price: definition.price,
    audience: definition.audience,
    outcomes: definition.outcomes,
    includes: definition.includes,
  };
}

export function getCatalogProfileSlugs() {
  return catalogCourseDefinitions.map((definition) => definition.slug);
}

export function getCatalogGroupById(groupId: CatalogGroupId) {
  return lmsCatalogGroups.find((group) => group.id === groupId) ?? lmsCatalogGroups[0];
}

export function sortCatalogCourses<T extends { slug: string }>(courses: T[]) {
  return [...courses].sort((left, right) => {
    const leftProfile = getCatalogProfile(left.slug);
    const rightProfile = getCatalogProfile(right.slug);

    const leftOrder = leftProfile?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = rightProfile?.order ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.slug.localeCompare(right.slug, 'ru-RU');
  });
}

export function groupCatalogCourses(courses: CatalogCourseCard[]) {
  return lmsCatalogGroups.map((group) => ({
    ...group,
    courses: sortCatalogCourses(courses.filter((course) => course.groupId === group.id)),
  }));
}

export function getShowcaseCatalogFallback(slug: string) {
  const definition = getCatalogProfile(slug);

  if (!definition) {
    return null;
  }

  const group = getCatalogGroupById(definition.groupId);

  return {
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    category: group.title,
    groupId: definition.groupId,
    status: 'showcase' as const,
    lessonsCount: null,
    previewLessonsCount: 0,
    previewEnabled: false,
    price: definition.price,
    tariffId: null,
    isOwned: false,
    isStarted: false,
    completedLessonsCount: 0,
    progressPercent: 0,
    nextLessonTitle: null,
    pendingOrder: null,
  };
}
