import LandingClient from '@/components/landing-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { getOrderCheckoutUrl } from '@/lib/orders';
import prisma from '@/lib/prisma';

export default async function Home() {
  const user = await getOptionalCurrentUser();

  const [featuredCourse, tariffs, enrollments, pendingOrders] = await Promise.all([
    prisma.course.findFirst({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: 'asc',
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
            status: 'PENDING',
          },
          select: {
            id: true,
            tariffId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const ownedCourseIds = new Set(enrollments.map((item) => item.courseId));
  const pendingOrdersByTariffId = new Map(
    pendingOrders.map((item) => [
      item.tariffId,
      {
        id: item.id,
        checkoutUrl: getOrderCheckoutUrl(item.id),
      },
    ])
  );

  return (
    <LandingClient
      featuredCourse={
        featuredCourse
          ? {
              title: featuredCourse.title,
              slug: featuredCourse.slug,
              description: featuredCourse.description,
              lessonsCount: featuredCourse.lessons.length,
              lessons: featuredCourse.lessons,
            }
          : null
      }
      tariffs={tariffs.map((tariff) => ({
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
      }))}
      user={
        user
          ? {
              email: user.email,
              name: user.name,
            }
          : null
      }
    />
  );
}
