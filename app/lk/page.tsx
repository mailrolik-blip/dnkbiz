import { redirect } from 'next/navigation';

import DashboardClient from '@/components/dashboard-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { getOrderCheckoutUrl } from '@/lib/orders';
import prisma from '@/lib/prisma';

export default async function DashboardPage() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [courses, tariffs, orders] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId: user.id,
        course: {
          isPublished: true,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
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
    prisma.tariff.findMany({
      where: {
        isActive: true,
        course: {
          isPublished: true,
        },
      },
      orderBy: [
        {
          course: {
            title: 'asc',
          },
        },
        {
          price: 'asc',
        },
      ],
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
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        tariffId: true,
        status: true,
        amount: true,
        createdAt: true,
        paidAt: true,
        tariff: {
          select: {
            title: true,
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const ownedCourseIds = new Set(courses.map((item) => item.course.id));
  const pendingOrdersByTariffId = new Map(
    orders
      .filter((order) => order.status === 'PENDING')
      .map((order) => [
        order.tariffId,
        {
          id: order.id,
          checkoutUrl: getOrderCheckoutUrl(order.id),
        },
      ])
  );

  return (
    <DashboardClient
      courses={courses.map((item) => ({
        id: item.course.id,
        title: item.course.title,
        slug: item.course.slug,
        description: item.course.description,
        lessonsCount: item.course.lessons.length,
        enrolledAt: item.createdAt.toISOString(),
      }))}
      orders={orders.map((order) => ({
        id: order.id,
        status: order.status,
        amount: order.amount,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() ?? null,
        checkoutUrl:
          order.status === 'PENDING' ? getOrderCheckoutUrl(order.id) : null,
        tariffTitle: order.tariff.title,
        courseTitle: order.tariff.course.title,
      }))}
      tariffs={tariffs.map((tariff) => ({
        id: tariff.id,
        title: tariff.title,
        price: tariff.price,
        interval: tariff.interval,
        courseTitle: tariff.course.title,
        courseSlug: tariff.course.slug,
        courseDescription: tariff.course.description,
        isOwned: ownedCourseIds.has(tariff.course.id),
        pendingOrder: pendingOrdersByTariffId.get(tariff.id) ?? null,
      }))}
      user={{
        email: user.email,
        name: user.name,
        role: user.role,
      }}
    />
  );
}
