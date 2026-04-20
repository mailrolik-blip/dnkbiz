import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteParams = {
  params: Promise<{ id: string }>;
};

function normalizeStatus(value: unknown) {
  return value === 'PENDING' || value === 'PAID' || value === 'CANCELED'
    ? value
    : null;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const orderId = Number(id);
  const body = (await request.json().catch(() => null)) as
    | { status?: unknown }
    | null;
  const status = normalizeStatus(body?.status);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: 'Invalid order id.' }, { status: 400 });
  }

  if (!status) {
    return Response.json(
      { error: 'Status must be PENDING, PAID, or CANCELED.' },
      { status: 400 }
    );
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
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

  if (!updatedOrder) {
    return Response.json({ error: 'Order not found.' }, { status: 404 });
  }

  return Response.json({ order: updatedOrder });
}
