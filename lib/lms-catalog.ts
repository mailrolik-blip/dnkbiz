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
      'Практический курс о том, как собрать понятную учебную программу: каталог, первые уроки, покупка, домашние задания и прогресс в личном кабинете.',
    price: 14900,
    groupId: 'management-growth',
    order: 10,
    audience: [
      'Руководителям, которые собирают обучение как понятную программу внутри компании',
      'Командам, которым нужен единый путь: каталог, выбор курса, оплата и обучение',
      'Тем, кто хочет увидеть, как устроен курс с понятным доступом и пошаговым обучением',
    ],
    includes: [
      'Полный путь ученика от каталога до прохождения курса',
      'Разбор ознакомительного доступа к первым урокам и открытия полного доступа после подтверждения оплаты',
      'Практику по сборке понятного сценария обучения без ручного сопровождения на каждом шаге',
    ],
  },
  {
    slug: 'marketing-sales-management',
    title: 'Маркетинг и управление продажами',
    description:
      'Компактный прикладной курс по маркетингу и продажам: исследование рынка, целевая аудитория, планирование, цена, сбыт, прогноз и коммуникации.',
    price: 4900,
    groupId: 'management-growth',
    order: 15,
    audience: [
      'Собственникам и руководителям, которым нужно выстроить маркетинг и продажи как систему, а не как набор кампаний',
      'Маркетологам и коммерческим менеджерам, которые отвечают за спрос, упаковку продукта и результат по выручке',
      'Командам малого и среднего бизнеса, которым нужен общий язык между маркетингом, продажами и управлением',
    ],
    includes: [
      '12 уроков с короткими summaries, ключевыми тезисами и вопросами для самопроверки',
      '2 первых урока до оплаты и полный доступ после подтверждения заказа',
      'Практическую рамку по маркетинговым исследованиям, ценообразованию, сбыту, продажам и коммуникациям',
    ],
  },
  {
    slug: 'microsoft-excel-basic',
    title: 'Microsoft Excel. Основы работы с программой. Базовый уровень',
    description:
      'Бесплатный стартовый курс по Excel: базовая логика таблиц, формулы, фильтры и первый рабочий мини-отчет.',
    price: null,
    groupId: 'office-accounting',
    order: 20,
    audience: [
      'Тем, кто работает с таблицами каждый день, но хочет меньше ручной рутины',
      'Офисным сотрудникам, начинающим специалистам и администраторам',
      'Тем, кому нужен быстрый базовый вход в Excel без лишней теории',
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
      'Программа по кадровым документам, начислениям и базовым рабочим сценариям в контуре 1С: ЗУП.',
    price: 12000,
    groupId: 'office-accounting',
    order: 40,
    audience: [
      'Кадровым специалистам и бухгалтерам по зарплате',
      'Тем, кому нужно выстроить кадровый контур в 1С',
      'Командам, которые готовят курс к запуску для учеников',
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
      'Прикладная программа по обязательным требованиям, внутренним регламентам и снижению операционных рисков на рабочих местах.',
    price: 5000,
    groupId: 'safety',
    order: 60,
    audience: [
      'Руководителям и ответственным за обучение сотрудников',
      'Специалистам по охране труда и внутренним инструктажам',
      'Компаниям, которым нужен понятный маршрут обязательного обучения',
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
    includes: [
      'Сценарии инструктажа и подготовки сотрудников',
      'Работу с документами и обязательными требованиями',
      'Витрину направления до запуска полного курса',
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
    includes: [
      'Основы допуска, эксплуатации и безопасного поведения',
      'Контур будущего курса в общем каталоге',
      'Краткое направление, готовое к следующему этапу запуска',
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
    includes: [
      'Работу с приоритетами, процессами и зоной ответственности руководителя',
      'Основы системной коммуникации между IT и бизнесом',
      'Витринное направление для следующего живого курса платформы',
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
