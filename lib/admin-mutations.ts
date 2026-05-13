import 'server-only';

import prisma from '@/lib/prisma';
import { getCatalogProfile } from '@/lib/lms-catalog';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeText(value: unknown, field: string, options?: { maxLength?: number }) {
  if (typeof value !== 'string') {
    throw new Error(`Поле «${field}» должно быть строкой.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Поле «${field}» не может быть пустым.`);
  }

  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new Error(`Поле «${field}» слишком длинное.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown, options?: { maxLength?: number }) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new Error('Текстовое поле слишком длинное.');
  }

  return normalized;
}

function normalizeBoolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Поле «${field}» должно быть true или false.`);
  }

  return value;
}

function normalizeSlug(value: unknown, field: string) {
  const slug = normalizeText(value, field, { maxLength: 120 }).toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Поле «${field}» должно содержать только латиницу, цифры и дефисы без пробелов.`
    );
  }

  return slug;
}

function normalizePrice(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('Цена должна быть целым числом 0 или больше.');
  }

  return value;
}

function normalizeId(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Некорректный идентификатор: ${field}.`);
  }

  return value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function buildUniqueLessonSlug(courseId: number, title: string) {
  const baseSlug = slugify(title) || `lesson-${Date.now()}`;
  const existingLessons = await prisma.lesson.findMany({
    where: {
      courseId,
    },
    select: {
      slug: true,
    },
  });

  const existingSlugs = new Set(existingLessons.map((lesson) => lesson.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

async function getCourseSummary(courseId: number) {
  const course = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      isPublished: true,
    },
  });

  if (!course) {
    throw new Error('Курс не найден.');
  }

  return course;
}

export async function createAdminCourse(input: {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  isPublished?: unknown;
}) {
  const title = normalizeText(input.title, 'Название курса', { maxLength: 160 });
  const slug = normalizeSlug(input.slug, 'Slug курса');
  const description = normalizeOptionalText(input.description, { maxLength: 600 });
  const isPublished = normalizeBoolean(input.isPublished, 'Публикация курса');

  const existingCourse = await prisma.course.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  if (existingCourse) {
    throw new Error('Курс с таким slug уже существует.');
  }

  return prisma.course.create({
    data: {
      title,
      slug,
      description,
      isPublished,
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

export async function updateAdminCourse(
  courseId: number,
  input: {
    title?: unknown;
    description?: unknown;
    isPublished?: unknown;
  }
) {
  normalizeId(courseId, 'courseId');

  const title = normalizeText(input.title, 'Название курса', { maxLength: 160 });
  const description = normalizeOptionalText(input.description, { maxLength: 600 });
  const isPublished = normalizeBoolean(input.isPublished, 'Публикация курса');

  return prisma.course.update({
    where: {
      id: courseId,
    },
    data: {
      title,
      description,
      isPublished,
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

export async function createAdminLesson(
  courseId: number,
  input: {
    title?: unknown;
    description?: unknown;
    content?: unknown;
    isPreview?: unknown;
    isPublished?: unknown;
  }
) {
  normalizeId(courseId, 'courseId');

  const title = normalizeText(input.title, 'Название урока', { maxLength: 160 });
  const description = normalizeOptionalText(input.description, { maxLength: 600 });
  const content = normalizeOptionalText(input.content);
  const isPreview = normalizeBoolean(input.isPreview, 'Preview урока');
  const isPublished = normalizeBoolean(input.isPublished, 'Публикация урока');

  const [course, slug, lastLesson] = await Promise.all([
    getCourseSummary(courseId),
    buildUniqueLessonSlug(courseId, title),
    prisma.lesson.findFirst({
      where: {
        courseId,
      },
      orderBy: {
        position: 'desc',
      },
      select: {
        position: true,
      },
    }),
  ]);

  const lesson = await prisma.lesson.create({
    data: {
      courseId: course.id,
      title,
      slug,
      description,
      content,
      isPreview,
      isPublished,
      position: (lastLesson?.position ?? 0) + 1,
    },
    select: {
      id: true,
    },
  });

  return {
    lessonId: lesson.id,
    courseSlug: course.slug,
  };
}

export async function updateAdminLesson(
  lessonId: number,
  input: {
    title?: unknown;
    description?: unknown;
    content?: unknown;
    isPreview?: unknown;
    isPublished?: unknown;
  }
) {
  normalizeId(lessonId, 'lessonId');

  const title = normalizeText(input.title, 'Название урока', { maxLength: 160 });
  const description = normalizeOptionalText(input.description, { maxLength: 600 });
  const content = normalizeOptionalText(input.content);
  const isPreview = normalizeBoolean(input.isPreview, 'Preview урока');
  const isPublished = normalizeBoolean(input.isPublished, 'Публикация урока');

  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },
    select: {
      id: true,
      course: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new Error('Урок не найден.');
  }

  await prisma.lesson.update({
    where: {
      id: lessonId,
    },
    data: {
      title,
      description,
      content,
      isPreview,
      isPublished,
    },
  });

  return {
    lessonId: lesson.id,
    courseSlug: lesson.course.slug,
  };
}

export async function reorderAdminLessons(courseId: number, lessonIds: unknown) {
  normalizeId(courseId, 'courseId');

  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    throw new Error('Нужно передать порядок уроков.');
  }

  const normalizedLessonIds = lessonIds.map((value) => normalizeId(value, 'lessonId'));
  const uniqueLessonIds = new Set(normalizedLessonIds);

  if (uniqueLessonIds.size !== normalizedLessonIds.length) {
    throw new Error('В порядке уроков есть дубликаты.');
  }

  const course = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
    select: {
      slug: true,
      lessons: {
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!course) {
    throw new Error('Курс не найден.');
  }

  if (course.lessons.length !== normalizedLessonIds.length) {
    throw new Error('Передан неполный список уроков для перестановки.');
  }

  const courseLessonIds = new Set(course.lessons.map((lesson) => lesson.id));

  for (const lessonId of normalizedLessonIds) {
    if (!courseLessonIds.has(lessonId)) {
      throw new Error('Один из уроков не принадлежит выбранному курсу.');
    }
  }

  await prisma.$transaction(
    normalizedLessonIds.map((lessonId, index) =>
      prisma.lesson.update({
        where: {
          id: lessonId,
        },
        data: {
          position: index + 1,
        },
      })
    )
  );

  return {
    courseSlug: course.slug,
  };
}

export async function deleteAdminLesson(lessonId: number) {
  normalizeId(lessonId, 'lessonId');

  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },
    select: {
      id: true,
      courseId: true,
      course: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new Error('Урок не найден.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({
      where: {
        id: lesson.id,
      },
    });

    const remainingLessons = await tx.lesson.findMany({
      where: {
        courseId: lesson.courseId,
      },
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
      },
    });

    for (const [index, item] of remainingLessons.entries()) {
      await tx.lesson.update({
        where: {
          id: item.id,
        },
        data: {
          position: index + 1,
        },
      });
    }
  });

  return {
    courseSlug: lesson.course.slug,
  };
}

export async function createAdminTariff(input: {
  courseId?: unknown;
  title?: unknown;
  slug?: unknown;
  price?: unknown;
  interval?: unknown;
  isActive?: unknown;
}) {
  const courseId = normalizeId(input.courseId, 'courseId');
  const title = normalizeText(input.title, 'Название тарифа', { maxLength: 160 });
  const slug = normalizeSlug(input.slug, 'Slug тарифа');
  const price = normalizePrice(input.price);
  const interval = normalizeOptionalText(input.interval, { maxLength: 80 });
  const isActive = normalizeBoolean(input.isActive, 'Активность тарифа');

  const [course, existingTariff] = await Promise.all([
    getCourseSummary(courseId),
    prisma.tariff.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingTariff) {
    throw new Error('Тариф с таким slug уже существует.');
  }

  const tariff = await prisma.tariff.create({
    data: {
      courseId: course.id,
      title,
      slug,
      price,
      interval,
      isActive,
    },
    select: {
      id: true,
    },
  });

  return {
    tariffId: tariff.id,
    courseSlug: course.slug,
  };
}

export async function updateAdminTariff(
  tariffId: number,
  input: {
    title?: unknown;
    price?: unknown;
    interval?: unknown;
    isActive?: unknown;
  }
) {
  normalizeId(tariffId, 'tariffId');

  const title = normalizeText(input.title, 'Название тарифа', { maxLength: 160 });
  const price = normalizePrice(input.price);
  const interval = normalizeOptionalText(input.interval, { maxLength: 80 });
  const isActive = normalizeBoolean(input.isActive, 'Активность тарифа');

  const tariff = await prisma.tariff.findUnique({
    where: {
      id: tariffId,
    },
    select: {
      id: true,
      course: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!tariff) {
    throw new Error('Тариф не найден.');
  }

  await prisma.tariff.update({
    where: {
      id: tariffId,
    },
    data: {
      title,
      price,
      interval,
      isActive,
    },
  });

  return {
    tariffId: tariff.id,
    courseSlug: tariff.course.slug,
  };
}

export function getAdminCourseSlugPolicy(slug: string) {
  if (getCatalogProfile(slug)) {
    return 'Slug связан с кодовой витриной и пока не редактируется из админки.';
  }

  return 'Slug можно задать при создании курса. Для уже созданных курсов он зафиксирован, чтобы не ломать ссылки.';
}

export function getAdminTariffSlugPolicy() {
  return 'Slug тарифа задается при создании и дальше остается read-only, чтобы не ломать внешние ссылки и историю заказов.';
}
