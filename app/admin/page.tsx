import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import AdminDashboardClient from '@/components/admin-dashboard-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { getAdminDashboardData } from '@/lib/admin-dashboard';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Админка | Бизнес школа ДНК',
  robots: {
    index: false,
    follow: false,
  },
};

type AdminMutationResult = {
  ok: boolean;
  message: string;
};

async function requireAdminSession() {
  const currentUser = await getOptionalCurrentUser();

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return null;
  }

  return currentUser;
}

export default async function AdminPage() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', '/admin'));
  }

  if (user.role !== 'ADMIN') {
    redirect('/lk');
  }

  const data = await getAdminDashboardData();

  async function setUserRoleAction(input: {
    userId: number;
    role: 'ADMIN' | 'USER';
  }): Promise<AdminMutationResult> {
    'use server';

    const currentUser = await requireAdminSession();

    if (!currentUser) {
      return {
        ok: false,
        message: 'Недостаточно прав для изменения роли пользователя.',
      };
    }

    if (!Number.isInteger(input.userId) || !['ADMIN', 'USER'].includes(input.role)) {
      return {
        ok: false,
        message: 'Некорректные параметры изменения роли.',
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return {
        ok: false,
        message: 'Пользователь не найден.',
      };
    }

    if (targetUser.role === input.role) {
      return {
        ok: true,
        message:
          input.role === 'ADMIN'
            ? `Роль администратора уже выдана: ${targetUser.email}.`
            : `Роль администратора уже снята: ${targetUser.email}.`,
      };
    }

    if (input.role === 'USER') {
      if (targetUser.id === currentUser.id) {
        return {
          ok: false,
          message: 'Нельзя снять роль администратора у текущей учётной записи.',
        };
      }

      const adminCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
        },
      });

      if (targetUser.role === 'ADMIN' && adminCount <= 1) {
        return {
          ok: false,
          message: 'В системе должен остаться хотя бы один администратор.',
        };
      }
    }

    await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        role: input.role,
      },
    });

    revalidatePath('/admin');

    return {
      ok: true,
      message:
        input.role === 'ADMIN'
          ? `Роль администратора выдана: ${targetUser.email}.`
          : `Роль администратора снята: ${targetUser.email}.`,
    };
  }

  async function deleteUserAction(input: {
    userId: number;
  }): Promise<AdminMutationResult> {
    'use server';

    const currentUser = await requireAdminSession();

    if (!currentUser) {
      return {
        ok: false,
        message: 'Недостаточно прав для удаления пользователя.',
      };
    }

    if (!Number.isInteger(input.userId)) {
      return {
        ok: false,
        message: 'Некорректный идентификатор пользователя.',
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: {
            enrollments: true,
            lessonActivityEvents: true,
            lessonProgress: true,
            orders: true,
          },
        },
      },
    });

    if (!targetUser) {
      return {
        ok: false,
        message: 'Пользователь уже удалён или не найден.',
      };
    }

    if (targetUser.id === currentUser.id) {
      return {
        ok: false,
        message: 'Нельзя удалить текущую учётную запись администратора.',
      };
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        return {
          ok: false,
          message: 'Нельзя удалить последнего администратора.',
        };
      }
    }

    const relatedEntitiesCount =
      targetUser._count.orders +
      targetUser._count.enrollments +
      targetUser._count.lessonActivityEvents +
      targetUser._count.lessonProgress;

    if (relatedEntitiesCount > 0) {
      return {
        ok: false,
        message: `Удаление запрещено: есть связанные данные (заказы: ${targetUser._count.orders}, доступы: ${targetUser._count.enrollments}, прогресс: ${targetUser._count.lessonProgress}, события: ${targetUser._count.lessonActivityEvents}).`,
      };
    }

    await prisma.user.delete({
      where: {
        id: targetUser.id,
      },
    });

    revalidatePath('/admin');

    return {
      ok: true,
      message: `Пользователь ${targetUser.email} удалён.`,
    };
  }

  async function grantCourseAccessAction(input: {
    userId: number;
    courseId: number;
  }): Promise<AdminMutationResult> {
    'use server';

    const currentUser = await requireAdminSession();

    if (!currentUser) {
      return {
        ok: false,
        message: 'Недостаточно прав для выдачи доступа.',
      };
    }

    if (!Number.isInteger(input.userId) || !Number.isInteger(input.courseId)) {
      return {
        ok: false,
        message: 'Некорректные параметры выдачи доступа.',
      };
    }

    const [targetUser, targetCourse, existingEnrollment] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          id: true,
          email: true,
        },
      }),
      prisma.course.findUnique({
        where: {
          id: input.courseId,
        },
        select: {
          id: true,
          title: true,
        },
      }),
      prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: input.userId,
            courseId: input.courseId,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!targetUser || !targetCourse) {
      return {
        ok: false,
        message: 'Пользователь или курс не найдены.',
      };
    }

    if (existingEnrollment) {
      return {
        ok: true,
        message: `Доступ уже есть: ${targetUser.email} → ${targetCourse.title}.`,
      };
    }

    await prisma.enrollment.create({
      data: {
        userId: targetUser.id,
        courseId: targetCourse.id,
      },
    });

    revalidatePath('/admin');

    return {
      ok: true,
      message: `Доступ выдан: ${targetUser.email} → ${targetCourse.title}.`,
    };
  }

  async function revokeCourseAccessAction(input: {
    enrollmentId: number;
  }): Promise<AdminMutationResult> {
    'use server';

    const currentUser = await requireAdminSession();

    if (!currentUser) {
      return {
        ok: false,
        message: 'Недостаточно прав для отзыва доступа.',
      };
    }

    if (!Number.isInteger(input.enrollmentId)) {
      return {
        ok: false,
        message: 'Некорректный идентификатор доступа.',
      };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        id: input.enrollmentId,
      },
      select: {
        id: true,
        orderId: true,
        user: {
          select: {
            email: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!enrollment) {
      return {
        ok: false,
        message: 'Доступ уже удалён или не найден.',
      };
    }

    if (enrollment.orderId) {
      return {
        ok: false,
        message: 'Доступ из оплаченного заказа нельзя отзывать без изменения логики оплат и доступов.',
      };
    }

    await prisma.enrollment.delete({
      where: {
        id: enrollment.id,
      },
    });

    revalidatePath('/admin');

    return {
      ok: true,
      message: `Доступ отозван: ${enrollment.user.email} → ${enrollment.course.title}.`,
    };
  }

  return (
    <main className="page-shell admin-page-shell">
      <AdminDashboardClient
        adminActions={{
          deleteUserAction,
          grantCourseAccessAction,
          revokeCourseAccessAction,
          setUserRoleAction,
        }}
        adminEmail={user.email}
        adminUserId={user.id}
        initialData={data}
      />
    </main>
  );
}
