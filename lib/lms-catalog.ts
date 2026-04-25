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
      'Обязательное обучение по охране труда, пожарной безопасности и электробезопасности.',
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
    title: 'Платформа ДНК: стартовый курс',
    description:
      'Практический курс о том, как превратить курс и кабинет в рабочий продукт с уроками, видео и управляемым пользовательским маршрутом.',
    price: 14900,
    groupId: 'management-growth',
    order: 10,
  },
  {
    slug: 'microsoft-excel-basic',
    title: 'Microsoft Excel. Основы работы с программой. Базовый уровень',
    description:
      'Бесплатный стартовый курс по Excel: базовая логика таблиц, формулы, фильтры и первый рабочий мини-отчет.',
    price: null,
    groupId: 'office-accounting',
    order: 20,
  },
  {
    slug: '1c-accounting-83',
    title: '1С: Бухгалтерия 8.3',
    description:
      'Курс по бухгалтерскому учету, проводкам и повседневной работе в 1С для специалистов и руководителей небольших команд.',
    price: 12000,
    groupId: 'office-accounting',
    order: 30,
  },
  {
    slug: '1c-payroll-and-hr',
    title: '1С: Зарплата и кадры',
    description:
      'Программа по кадровым документам, начислениям и базовым рабочим сценариям в контуре 1С: ЗУП.',
    price: 12000,
    groupId: 'office-accounting',
    order: 40,
  },
  {
    slug: 'microsoft-word-basic',
    title: 'Microsoft Word (базовый курс)',
    description:
      'Базовая программа по подготовке документов, форматированию и аккуратной работе с деловыми текстами.',
    price: null,
    groupId: 'office-accounting',
    order: 50,
  },
  {
    slug: 'occupational-safety',
    title: 'Охрана труда',
    description:
      'Прикладная программа по обязательным требованиям, внутренним регламентам и снижению операционных рисков на рабочих местах.',
    price: 5000,
    groupId: 'safety',
    order: 60,
  },
  {
    slug: 'fire-safety',
    title: 'Пожарная безопасность',
    description:
      'Курс по инструктажам, документации и устойчивой подготовке сотрудников к проверкам по пожарной безопасности.',
    price: 14000,
    groupId: 'safety',
    order: 70,
  },
  {
    slug: 'electrical-safety',
    title: 'Электробезопасность',
    description:
      'Короткая прикладная программа по допускам, правилам эксплуатации и безопасной работе с электроустановками.',
    price: 3000,
    groupId: 'safety',
    order: 80,
  },
  {
    slug: 'it-management',
    title: 'IT менеджмент',
    description:
      'Курс о роли IT-менеджера: процессы, команда, приоритеты и взаимодействие IT с бизнесом.',
    price: 25000,
    groupId: 'management-growth',
    order: 90,
  },
];

const catalogDefinitionMap = new Map(
  catalogCourseDefinitions.map((definition) => [definition.slug, definition])
);

export function getCatalogProfile(slug: string) {
  return catalogDefinitionMap.get(slug) ?? null;
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
    courses: sortCatalogCourses(
      courses.filter((course) => course.groupId === group.id)
    ),
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
