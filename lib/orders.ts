import type { OrderStatus } from '@prisma/client';

import prisma from './prisma';

export function getOrderCheckoutUrl(orderId: number) {
  return `/checkout/test?orderId=${orderId}`;
}

export function isTestPaymentsEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_TEST_PAYMENTS === 'true'
  );
}

export async function updateOrderStatus(orderId: number, status: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        tariff: {
          select: {
            courseId: true,
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
    });

    if (!order) {
      return null;
    }

    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
        paidAt: status === 'PAID' ? order.paidAt ?? new Date() : null,
      },
    });

    if (status === 'PAID') {
      await tx.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: order.userId,
            courseId: order.tariff.courseId,
          },
        },
        update: {
          orderId: order.id,
        },
        create: {
          userId: order.userId,
          courseId: order.tariff.courseId,
          orderId: order.id,
        },
      });
    } else {
      await tx.enrollment.deleteMany({
        where: {
          orderId: order.id,
        },
      });
    }

    return tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
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
    });
  });
}
