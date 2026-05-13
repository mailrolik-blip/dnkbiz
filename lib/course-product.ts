import 'server-only';

import { getOptionalCurrentUser } from '@/lib/auth';
import { getCatalogCoursesForViewer } from '@/lib/course-access';
import {
  getCatalogCourseMeta,
  getCatalogGroupById,
  type CatalogCourseCard,
} from '@/lib/lms-catalog';
import { formatPreviewLessons } from '@/lib/purchase-ux';
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

function buildFallbackCourseMeta(course: CatalogCourseCard) {
  const group = getCatalogGroupById(course.groupId);

  return {
    slug: course.slug,
    title: course.title,
    description:
      course.description ||
      'Программа доступна внутри DNK Biz и открывается в личном кабинете после публикации и настройки доступа.',
    category: group.title,
    groupId: group.id,
    price: course.price,
    audience: [
      'Тем, кому нужен отдельный курс внутри DNK Biz без привязки к seed-файлу.',
      'Командам, которые управляют программой через админку и обновляют контент прямо в базе.',
    ],
    includes: [
      'Уроки, которые публикуются и редактируются через админку.',
      'Preview-доступ по урокам и тарифы, настроенные на стороне MVP-admin.',
    ],
  };
}

export async function getCourseProductPageData(
  slug: string
): Promise<CourseProductPageData | null> {
  const user = await getOptionalCurrentUser();
  const catalogCourses = await getCatalogCoursesForViewer(user?.id ?? null);
  const course = catalogCourses.find((item) => item.slug === slug);
  const meta = course ? getCatalogCourseMeta(slug) ?? buildFallbackCourseMeta(course) : null;

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
      label: 'Ознакомительный доступ',
      value:
        course.previewEnabled && course.previewLessonsCount > 0
          ? `${formatPreviewLessons(course.previewLessonsCount)} до покупки`
          : course.status === 'paid'
          ? 'Откроется после подтверждения оплаты'
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
