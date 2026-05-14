import 'server-only';

import type { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';

import prisma from '@/lib/prisma';
import {
  getCatalogGroupById,
  getCatalogProfile,
  sortCatalogCourses,
  type CatalogGroupId,
} from '@/lib/lms-catalog';
import {
  getAdminCourseSlugPolicy,
  getAdminTariffSlugPolicy,
} from '@/lib/admin-mutations';

type AdminCourseState = 'free' | 'paid' | 'showcase' | 'hidden';

function toIsoString(value: Date) {
  return value.toISOString();
}

export type AdminUserRow = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
  accessibleCoursesCount: number;
  ownedCoursesCount: number;
  hasPendingOrder: boolean;
};

export type AdminOrderRow = {
  id: number;
  userId: number;
  courseId: number;
  tariffId: number;
  courseTitle: string;
  courseSlug: string;
  tariffTitle: string;
  userName: string | null;
  userEmail: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
};

export type AdminEnrollmentRow = {
  id: number;
  userId: number;
  courseId: number;
  userEmail: string;
  courseTitle: string;
  courseSlug: string;
  source: 'order' | 'free';
  createdAt: string;
};

export type AdminLessonRow = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  position: number;
  isPreview: boolean;
  isPublished: boolean;
  updatedAt: string;
};

export type AdminTariffRow = {
  id: number;
  title: string;
  slug: string;
  price: number;
  interval: string | null;
  isActive: boolean;
  updatedAt: string;
  ordersCount: number;
};

export type AdminCourseRow = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  state: AdminCourseState;
  hasCatalogProfile: boolean;
  groupId: CatalogGroupId;
  groupTitle: string;
  groupDescription: string;
  statusNote: string;
  lessonsCount: number;
  publishedLessonsCount: number;
  previewLessonsCount: number;
  previewEnabled: boolean;
  hasActiveTariff: boolean;
  activeTariffTitle: string | null;
  courseSlugPolicy: string;
  tariffSlugPolicy: string;
  lessons: AdminLessonRow[];
  tariffs: AdminTariffRow[];
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
  orders: AdminOrderRow[];
  enrollments: AdminEnrollmentRow[];
  courses: AdminCourseRow[];
};

function getCourseStateLabel(course: {
  isPublished: boolean;
  hasCatalogProfile: boolean;
  hasActiveTariff: boolean;
}) {
  if (!course.isPublished) {
    return course.hasCatalogProfile ? 'showcase' : 'hidden';
  }

  return course.hasActiveTariff ? 'paid' : 'free';
}

function getCourseStatusNote(course: {
  isPublished: boolean;
  hasCatalogProfile: boolean;
  hasActiveTariff: boolean;
  previewLessonsCount: number;
}) {
  if (!course.isPublished) {
    return course.hasCatalogProfile
      ? 'Курс не опубликован в базе и пока виден только как витринная карточка из каталога.'
      : 'Курс не опубликован и скрыт из публичного каталога.'
  }

  if (course.hasActiveTariff) {
    return course.previewLessonsCount > 0
      ? 'Опубликован как платный курс. Новые покупки идут через активный тариф, а ознакомительный доступ управляется уроками.'
      : 'Опубликован как платный курс. Новые покупки идут через активный тариф.'
  }

  return 'Опубликован как бесплатный курс: активного тарифа нет, поэтому доступ открывается сразу после входа.';
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
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
        userId: true,
        tariffId: true,
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
                id: true,
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
        userId: true,
        orderId: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    }),
    prisma.course.findMany({
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isPublished: true,
        lessons: {
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            content: true,
            position: true,
            isPreview: true,
            isPublished: true,
            updatedAt: true,
          },
        },
        tariffs: {
          orderBy: [
            {
              isActive: 'desc',
            },
            {
              price: 'asc',
            },
            {
              id: 'asc',
            },
          ],
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            interval: true,
            isActive: true,
            updatedAt: true,
            _count: {
              select: {
                orders: true,
              },
            },
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
      createdAt: toIsoString(user.createdAt),
      accessibleCoursesCount: accessibleCourseIds.size,
      ownedCoursesCount: user.enrollments.length,
      hasPendingOrder: user.orders.length > 0,
    };
  });

  const orderRows: AdminOrderRow[] = orders.map((order) => ({
    id: order.id,
    userId: order.userId,
    courseId: order.tariff.course.id,
    tariffId: order.tariffId,
    courseTitle: order.tariff.course.title,
    courseSlug: order.tariff.course.slug,
    tariffTitle: order.tariff.title,
    userName: order.user.name,
    userEmail: order.user.email,
    amount: order.amount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: toIsoString(order.createdAt),
    updatedAt: toIsoString(order.updatedAt),
  }));

  const enrollmentRows: AdminEnrollmentRow[] = enrollments.map((enrollment) => ({
    id: enrollment.id,
    userId: enrollment.userId,
    courseId: enrollment.course.id,
    userEmail: enrollment.user.email,
    courseTitle: enrollment.course.title,
    courseSlug: enrollment.course.slug,
    source: enrollment.orderId ? 'order' : 'free',
    createdAt: toIsoString(enrollment.createdAt),
  }));

  const courseRows = sortCatalogCourses(
    courses.map<AdminCourseRow>((course) => {
      const profile = getCatalogProfile(course.slug);
      const group = getCatalogGroupById(profile?.groupId ?? 'management-growth');
      const activeTariff = course.tariffs.find((tariff) => tariff.isActive) ?? null;
      const publishedLessons = course.lessons.filter((lesson) => lesson.isPublished);
      const previewLessonsCount = publishedLessons.filter((lesson) => lesson.isPreview).length;
      const hasCatalogProfile = Boolean(profile);
      const state = getCourseStateLabel({
        isPublished: course.isPublished,
        hasCatalogProfile,
        hasActiveTariff: Boolean(activeTariff),
      });

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        isPublished: course.isPublished,
        state,
        hasCatalogProfile,
        groupId: group.id,
        groupTitle: group.title,
        groupDescription: group.description,
        statusNote: getCourseStatusNote({
          isPublished: course.isPublished,
          hasCatalogProfile,
          hasActiveTariff: Boolean(activeTariff),
          previewLessonsCount,
        }),
        lessonsCount: course.lessons.length,
        publishedLessonsCount: publishedLessons.length,
        previewLessonsCount,
        previewEnabled: previewLessonsCount > 0,
        hasActiveTariff: Boolean(activeTariff),
        activeTariffTitle: activeTariff?.title ?? null,
        courseSlugPolicy: getAdminCourseSlugPolicy(course.slug),
        tariffSlugPolicy: getAdminTariffSlugPolicy(),
        lessons: course.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          content: lesson.content,
          position: lesson.position,
          isPreview: lesson.isPreview,
          isPublished: lesson.isPublished,
          updatedAt: toIsoString(lesson.updatedAt),
        })),
        tariffs: course.tariffs.map((tariff) => ({
          id: tariff.id,
          title: tariff.title,
          slug: tariff.slug,
          price: tariff.price,
          interval: tariff.interval,
          isActive: tariff.isActive,
          updatedAt: toIsoString(tariff.updatedAt),
          ordersCount: tariff._count.orders,
        })),
      };
    })
  );

  return {
    totals: {
      users: userRows.length,
      orders: orderRows.length,
      enrollments: enrollmentRows.length,
      liveCourses: courseRows.filter((course) => course.state === 'free' || course.state === 'paid')
        .length,
      showcaseCourses: courseRows.filter((course) => course.state === 'showcase').length,
    },
    users: userRows,
    orders: orderRows,
    enrollments: enrollmentRows,
    courses: courseRows,
  };
}
