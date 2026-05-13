import 'server-only';

import { getOrderCheckoutUrl } from './orders';
import { activeOrderStatuses } from './payments/constants';
import { expireStaleOrdersForUser } from './payments/service';
import prisma from './prisma';
import {
  getCatalogGroupById,
  getCatalogProfile,
  getCatalogProfileSlugs,
  getShowcaseCatalogFallback,
  sortCatalogCourses,
  type CatalogCourseCard,
} from './lms-catalog';

export type LessonViewerProgress = {
  completed: boolean;
  answer: string | null;
  lastViewedAt: string | null;
  updatedAt: string;
} | null;

export type CourseViewerLesson = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  homeworkTitle: string | null;
  homeworkPrompt: string | null;
  homeworkType: string | null;
  homeworkOptions: string[] | null;
  position: number;
  isPreview: boolean;
  isLocked: boolean;
  progress: LessonViewerProgress;
};

export type CourseViewerData = {
  title: string;
  slug: string;
  description: string | null;
  access: {
    productType: 'FREE' | 'PAID';
    accessMode: 'FULL' | 'PREVIEW';
    previewLessonsCount: number;
    pendingOrder: {
      id: number;
      checkoutUrl: string;
      status: 'PENDING' | 'PROCESSING';
    } | null;
    tariff: {
      id: number;
      title: string;
      price: number;
      interval: string | null;
    } | null;
  };
  lessons: CourseViewerLesson[];
};

function normalizeHomeworkOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const options = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );

  return options.length > 0 ? options : null;
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toActiveOrderStatus(value: string): 'PENDING' | 'PROCESSING' {
  return value === 'PROCESSING' ? 'PROCESSING' : 'PENDING';
}

function buildProgress(progress: {
  completed: boolean;
  answer: string | null;
  lastViewedAt: Date | null;
  updatedAt: Date;
} | null): LessonViewerProgress {
  if (!progress) {
    return null;
  }

  return {
    completed: progress.completed,
    answer: progress.answer,
    lastViewedAt: toIsoString(progress.lastViewedAt),
    updatedAt: progress.updatedAt.toISOString(),
  };
}

export async function getCatalogCoursesForViewer(
  userId: number | null
): Promise<CatalogCourseCard[]> {
  if (userId) {
    await expireStaleOrdersForUser(userId);
  }

  const viewerId = userId ?? -1;
  const profileSlugs = getCatalogProfileSlugs();

  const publishedCourses = await prisma.course.findMany({
    where: {
      isPublished: true,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      enrollments: {
        where: {
          userId: viewerId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
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
          isPreview: true,
          progress: {
            where: {
              userId: viewerId,
            },
            select: {
              completed: true,
            },
            take: 1,
          },
        },
      },
      tariffs: {
        where: {
          isActive: true,
        },
        orderBy: {
          price: 'asc',
        },
        take: 1,
        select: {
          id: true,
          title: true,
          price: true,
          interval: true,
          orders: {
            where: {
              userId: viewerId,
              status: {
                in: activeOrderStatuses,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const publishedCards = publishedCourses.map((course) => {
    const profile = getCatalogProfile(course.slug);
    const group = getCatalogGroupById(profile?.groupId ?? 'management-growth');
    const activeTariff = course.tariffs[0] ?? null;
    const status = activeTariff ? 'paid' : 'free';
    const lessonsCount = course.lessons.length;
    const completedLessonsCount = course.lessons.filter(
      (lesson) => lesson.progress[0]?.completed
    ).length;
    const nextLessonTitle =
      course.lessons.find((lesson) => !lesson.progress[0]?.completed)?.title ??
      course.lessons[0]?.title ??
      null;
    const pendingOrder = activeTariff?.orders[0]
        ? {
            id: activeTariff.orders[0].id,
            checkoutUrl: getOrderCheckoutUrl(activeTariff.orders[0].id),
            status: toActiveOrderStatus(activeTariff.orders[0].status),
          }
      : null;

    return {
      slug: course.slug,
      title: course.title,
      description:
        course.description ||
        'Онлайн-курс в личном кабинете Бизнес школы ДНК с доступом к урокам и сохранением прогресса.',
      category: group.title,
      groupId: group.id,
      status,
      lessonsCount,
      previewLessonsCount: activeTariff
        ? course.lessons.filter((lesson) => lesson.isPreview).length
        : 0,
      previewEnabled: activeTariff
        ? course.lessons.some((lesson) => lesson.isPreview)
        : false,
      price: activeTariff?.price ?? null,
      tariffId: activeTariff?.id ?? null,
      isOwned: course.enrollments.length > 0,
      isStarted: course.lessons.some((lesson) => Boolean(lesson.progress[0])),
      completedLessonsCount,
      progressPercent:
        lessonsCount > 0 ? Math.round((completedLessonsCount / lessonsCount) * 100) : 0,
      nextLessonTitle,
      pendingOrder,
    } satisfies CatalogCourseCard;
  });

  const knownPublishedSlugs = new Set(publishedCards.map((course) => course.slug));
  const showcaseCards = profileSlugs
    .filter((slug) => !knownPublishedSlugs.has(slug))
    .map((slug) => getShowcaseCatalogFallback(slug))
    .filter(
      (
        course
      ): course is NonNullable<ReturnType<typeof getShowcaseCatalogFallback>> =>
        Boolean(course)
    );

  return sortCatalogCourses([...publishedCards, ...showcaseCards]);
}

export async function getCourseForViewer(
  slug: string,
  userId: number
): Promise<CourseViewerData | null> {
  await expireStaleOrdersForUser(userId);

  const course = await prisma.course.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      title: true,
      slug: true,
      description: true,
      enrollments: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      tariffs: {
        where: {
          isActive: true,
        },
        orderBy: {
          price: 'asc',
        },
        take: 1,
        select: {
          id: true,
          title: true,
          price: true,
          interval: true,
          orders: {
            where: {
              userId,
              status: {
                in: activeOrderStatuses,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
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
          slug: true,
          description: true,
          content: true,
          videoUrl: true,
          videoProvider: true,
          homeworkTitle: true,
          homeworkPrompt: true,
          homeworkType: true,
          homeworkOptions: true,
          position: true,
          isPreview: true,
          progress: {
            where: {
              userId,
            },
            select: {
              completed: true,
              answer: true,
              lastViewedAt: true,
              updatedAt: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  const tariff = course.tariffs[0] ?? null;
  const isOwned = course.enrollments.length > 0;
  const previewLessonsCount = tariff
    ? course.lessons.filter((lesson) => lesson.isPreview).length
    : 0;
  const hasFullAccess = !tariff || isOwned;
  const hasPreviewAccess = tariff ? previewLessonsCount > 0 : false;

  if (!hasFullAccess && !hasPreviewAccess) {
    return null;
  }

  const pendingOrder = tariff?.orders[0]
    ? {
        id: tariff.orders[0].id,
        checkoutUrl: getOrderCheckoutUrl(tariff.orders[0].id),
        status: toActiveOrderStatus(tariff.orders[0].status),
      }
    : null;

  return {
    title: course.title,
    slug: course.slug,
    description: course.description,
    access: {
      productType: tariff ? 'PAID' : 'FREE',
      accessMode: hasFullAccess ? 'FULL' : 'PREVIEW',
      previewLessonsCount,
      pendingOrder,
      tariff: tariff
        ? {
            id: tariff.id,
            title: tariff.title,
            price: tariff.price,
            interval: tariff.interval,
          }
        : null,
    },
    lessons: course.lessons.map((lesson) => {
      const isLocked = !hasFullAccess && !lesson.isPreview;

      return {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        content: isLocked ? null : lesson.content,
        videoUrl: isLocked ? null : lesson.videoUrl,
        videoProvider: isLocked ? null : lesson.videoProvider,
        homeworkTitle: isLocked ? null : lesson.homeworkTitle,
        homeworkPrompt: isLocked ? null : lesson.homeworkPrompt,
        homeworkType: isLocked ? null : lesson.homeworkType,
        homeworkOptions: isLocked ? null : normalizeHomeworkOptions(lesson.homeworkOptions),
        position: lesson.position,
        isPreview: lesson.isPreview,
        isLocked,
        progress: buildProgress(lesson.progress[0] ?? null),
      };
    }),
  } satisfies CourseViewerData;
}

export async function getLessonAccessForUser(lessonId: number, userId: number) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      isPublished: true,
      course: {
        isPublished: true,
      },
    },
    select: {
      id: true,
      isPreview: true,
      course: {
        select: {
          slug: true,
          enrollments: {
            where: {
              userId,
            },
            select: {
              id: true,
            },
            take: 1,
          },
          tariffs: {
            where: {
              isActive: true,
            },
            orderBy: {
              price: 'asc',
            },
            take: 1,
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    return null;
  }

  const tariff = lesson.course.tariffs[0] ?? null;
  const isOwned = lesson.course.enrollments.length > 0;
  const productType = tariff ? 'PAID' : 'FREE';
  const canAccess = productType === 'FREE' || isOwned || lesson.isPreview;

  return {
    lessonId: lesson.id,
    courseSlug: lesson.course.slug,
    isPreview: lesson.isPreview,
    isOwned,
    productType,
    canAccess,
  };
}
