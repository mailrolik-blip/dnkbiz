import 'server-only';

import { getOptionalCurrentUser } from '@/lib/auth';
import { getCatalogCoursesForViewer } from '@/lib/course-access';
import type { CatalogCourseCard } from '@/lib/lms-catalog';
import { activeOrderStatuses } from '@/lib/payments/constants';
import { expireStaleOrdersForUser } from '@/lib/payments/service';
import { getOrderCheckoutUrl } from '@/lib/orders';
import prisma from '@/lib/prisma';

export type LandingUser = {
  email: string;
  name: string | null;
} | null;

export type FeaturedCourse = {
  title: string;
  slug: string;
  description: string | null;
  lessonsCount: number;
  lessons: Array<{
    id: number;
    title: string;
    position: number;
  }>;
} | null;

export type LandingTariff = {
  id: number;
  title: string;
  price: number;
  interval: string | null;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string | null;
  lessonsCount: number;
  isOwned: boolean;
  pendingOrder: {
    id: number;
    checkoutUrl: string;
    status: 'PENDING' | 'PROCESSING';
  } | null;
};

export type LandingPageData = {
  user: LandingUser;
  featuredCourse: FeaturedCourse;
  tariffs: LandingTariff[];
  catalogCourses: CatalogCourseCard[];
};

function toActiveOrderStatus(value: string): 'PENDING' | 'PROCESSING' {
  return value === 'PROCESSING' ? 'PROCESSING' : 'PENDING';
}

export async function getLandingPageData(): Promise<LandingPageData> {
  const user = await getOptionalCurrentUser();

  if (user) {
    await expireStaleOrdersForUser(user.id);
  }

  const [featuredCourse, tariffs, enrollments, pendingOrders, catalogCourses] =
    await Promise.all([
    prisma.course.findFirst({
      where: {
        slug: 'practical-course',
        isPublished: true,
      },
      select: {
        title: true,
        slug: true,
        description: true,
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
          },
        },
      },
    }),
    prisma.tariff.findMany({
      where: {
        isActive: true,
        course: {
          isPublished: true,
        },
      },
      orderBy: {
        price: 'asc',
      },
      select: {
        id: true,
        title: true,
        price: true,
        interval: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            lessons: {
              where: {
                isPublished: true,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
    user
      ? prisma.enrollment.findMany({
          where: {
            userId: user.id,
          },
          select: {
            courseId: true,
          },
        })
      : Promise.resolve([]),
    user
      ? prisma.order.findMany({
        where: {
          userId: user.id,
          status: {
            in: activeOrderStatuses,
          },
        },
        select: {
          id: true,
          tariffId: true,
          status: true,
        },
      })
      : Promise.resolve([]),
    getCatalogCoursesForViewer(user?.id ?? null),
  ]);

  const ownedCourseIds = new Set(enrollments.map((item) => item.courseId));
  const pendingOrdersByTariffId = new Map(
    pendingOrders.map((item) => [
      item.tariffId,
      {
        id: item.id,
        checkoutUrl: getOrderCheckoutUrl(item.id),
        status: toActiveOrderStatus(item.status),
      },
    ])
  );

  return {
    featuredCourse: featuredCourse
      ? {
          title: featuredCourse.title,
          slug: featuredCourse.slug,
          description: featuredCourse.description,
          lessonsCount: featuredCourse.lessons.length,
          lessons: featuredCourse.lessons,
        }
      : null,
    tariffs: tariffs.map((tariff) => ({
      id: tariff.id,
      title: tariff.title,
      price: tariff.price,
      interval: tariff.interval,
      courseTitle: tariff.course.title,
      courseSlug: tariff.course.slug,
      courseDescription: tariff.course.description,
      lessonsCount: tariff.course.lessons.length,
      isOwned: ownedCourseIds.has(tariff.course.id),
      pendingOrder: pendingOrdersByTariffId.get(tariff.id) ?? null,
    })),
    catalogCourses,
    user: user
      ? {
          email: user.email,
          name: user.name,
        }
      : null,
  };
}
