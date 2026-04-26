import 'server-only';

import { getOptionalCurrentUser } from '@/lib/auth';
import { getCatalogCoursesForViewer } from '@/lib/course-access';
import {
  getCatalogCourseMeta,
  getCatalogGroupById,
  type CatalogCourseCard,
} from '@/lib/lms-catalog';
import prisma from '@/lib/prisma';

export type CourseProductPageData = {
  user: {
    email: string;
    name: string | null;
  } | null;
  course: CatalogCourseCard;
  meta: NonNullable<ReturnType<typeof getCatalogCourseMeta>>;
  outline: Array<{
    id: number;
    title: string;
    position: number;
    isPreview: boolean;
  }>;
  productFacts: Array<{
    label: string;
    value: string;
  }>;
};

export async function getCourseProductPageData(
  slug: string
): Promise<CourseProductPageData | null> {
  const user = await getOptionalCurrentUser();
  const catalogCourses = await getCatalogCoursesForViewer(user?.id ?? null);
  const course = catalogCourses.find((item) => item.slug === slug);
  const meta = getCatalogCourseMeta(slug);

  if (!course || !meta) {
    return null;
  }

  const group = getCatalogGroupById(course.groupId);
  const liveCourse = await prisma.course.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      lessons: {
        where: {
          isPublished: true,
        },
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
          title: true,
          position: true,
          isPreview: true,
        },
      },
    },
  });

  const productFacts = [
    {
      label: 'Статус',
      value:
        course.status === 'free'
          ? 'Бесплатный курс'
          : course.status === 'paid'
          ? 'Платный курс'
          : 'Скоро в каталоге',
    },
    {
      label: 'Направление',
      value: group.title,
    },
    {
      label: 'Уроков',
      value:
        course.lessonsCount !== null ? String(course.lessonsCount) : 'Готовится к публикации',
    },
    {
      label: 'Preview',
      value:
        course.previewEnabled && course.previewLessonsCount > 0
          ? `${course.previewLessonsCount} до покупки`
          : course.status === 'paid'
          ? 'Откроется после оплаты'
          : 'Не нужен',
    },
  ];

  return {
    user: user
      ? {
          email: user.email,
          name: user.name,
        }
      : null,
    course,
    meta,
    outline: liveCourse?.lessons ?? [],
    productFacts,
  };
}
