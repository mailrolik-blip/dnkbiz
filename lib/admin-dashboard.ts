import 'server-only';

import type { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';

import {
  getCatalogCourseMeta,
  getCatalogProfileSlugs,
  sortCatalogCourses,
} from '@/lib/lms-catalog';
import prisma from '@/lib/prisma';

export type AdminUserRow = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: Date;
  accessibleCoursesCount: number;
  ownedCoursesCount: number;
  hasPendingOrder: boolean;
};

export type AdminOrderRow = {
  id: number;
  courseTitle: string;
  courseSlug: string;
  tariffTitle: string;
  userName: string | null;
  userEmail: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminManualReviewOrderRow = {
  id: number;
  userName: string | null;
  userEmail: string;
  courseTitle: string;
  courseSlug: string;
  tariffTitle: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
};

export type AdminEnrollmentRow = {
  id: number;
  userEmail: string;
  courseTitle: string;
  courseSlug: string;
  source: 'order' | 'free';
  createdAt: Date;
};

export type AdminCourseRow = {
  slug: string;
  title: string;
  status: 'free' | 'paid' | 'showcase';
  previewEnabled: boolean;
  lessonsCount: number;
  hasActiveTariff: boolean;
  activeTariffTitle: string | null;
};

export type AdminDashboardData = {
  totals: {
    users: number;
    orders: number;
    enrollments: number;
    liveCourses: number;
    showcaseCourses: number;
  };
  users: AdminUserRow[];
  manualReviewOrders: AdminManualReviewOrderRow[];
  orders: AdminOrderRow[];
  enrollments: AdminEnrollmentRow[];
  courses: AdminCourseRow[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const catalogSlugs = getCatalogProfileSlugs();

  const [freeCourses, users, orders, enrollments, courses] = await Promise.all([
    prisma.course.findMany({
      where: {
        isPublished: true,
        tariffs: {
          none: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        enrollments: {
          select: {
            courseId: true,
          },
        },
        orders: {
          where: {
            status: {
              in: ['PENDING', 'PROCESSING'],
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    }),
    prisma.order.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        tariff: {
          select: {
            title: true,
            course: {
              select: {
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        orderId: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
        course: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.course.findMany({
      where: {
        slug: {
          in: catalogSlugs,
        },
      },
      select: {
        slug: true,
        title: true,
        isPublished: true,
        lessons: {
          where: {
            isPublished: true,
          },
          select: {
            isPreview: true,
          },
        },
        tariffs: {
          where: {
            isActive: true,
          },
          orderBy: {
            id: 'asc',
          },
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const freeCourseIds = new Set(freeCourses.map((course) => course.id));

  const userRows: AdminUserRow[] = users.map((user) => {
    const accessibleCourseIds = new Set<number>(freeCourseIds);

    for (const enrollment of user.enrollments) {
      accessibleCourseIds.add(enrollment.courseId);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      accessibleCoursesCount: accessibleCourseIds.size,
      ownedCoursesCount: user.enrollments.length,
      hasPendingOrder: user.orders.length > 0,
    };
  });

  const orderRows: AdminOrderRow[] = orders.map((order) => ({
    id: order.id,
    courseTitle: order.tariff.course.title,
    courseSlug: order.tariff.course.slug,
    tariffTitle: order.tariff.title,
    userName: order.user.name,
    userEmail: order.user.email,
    amount: order.amount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));

  const manualReviewOrders: AdminManualReviewOrderRow[] = orderRows
    .filter((order) => order.paymentMethod === 'MANUAL' && order.status === 'PROCESSING')
    .map((order) => ({
      id: order.id,
      userName: order.userName,
      userEmail: order.userEmail,
      courseTitle: order.courseTitle,
      courseSlug: order.courseSlug,
      tariffTitle: order.tariffTitle,
      amount: order.amount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
    }));

  const enrollmentRows: AdminEnrollmentRow[] = enrollments.map((enrollment) => ({
    id: enrollment.id,
    userEmail: enrollment.user.email,
    courseTitle: enrollment.course.title,
    courseSlug: enrollment.course.slug,
    source: enrollment.orderId ? 'order' : 'free',
    createdAt: enrollment.createdAt,
  }));

  const courseMap = new Map(courses.map((course) => [course.slug, course]));

  const courseRows = sortCatalogCourses(
    catalogSlugs.flatMap<AdminCourseRow>((slug) => {
      const meta = getCatalogCourseMeta(slug);

      if (!meta) {
        return [];
      }

      const course = courseMap.get(slug);

      if (!course || !course.isPublished) {
        return [
          {
            slug,
            title: meta.title,
            status: 'showcase' as const,
            previewEnabled: false,
            lessonsCount: 0,
            hasActiveTariff: false,
            activeTariffTitle: null,
          },
        ];
      }

      const activeTariff = course.tariffs[0] ?? null;

      return [
        {
          slug,
          title: course.title,
          status: activeTariff ? ('paid' as const) : ('free' as const),
          previewEnabled: course.lessons.some((lesson) => lesson.isPreview),
          lessonsCount: course.lessons.length,
          hasActiveTariff: Boolean(activeTariff),
          activeTariffTitle: activeTariff?.title ?? null,
        },
      ];
    })
  );

  return {
    totals: {
      users: userRows.length,
      orders: orderRows.length,
      enrollments: enrollmentRows.length,
      liveCourses: courseRows.filter((course) => course.status !== 'showcase').length,
      showcaseCourses: courseRows.filter((course) => course.status === 'showcase').length,
    },
    users: userRows,
    manualReviewOrders,
    orders: orderRows,
    enrollments: enrollmentRows,
    courses: courseRows,
  };
}
