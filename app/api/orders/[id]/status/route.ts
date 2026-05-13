import { requireAdminRouteUser } from '@/lib/admin-guard';
import { revalidateAdminPaths } from '@/lib/admin-revalidate';
import { normalizePaymentMethod, updateOrderStatus } from '@/lib/orders';
import prisma from '@/lib/prisma';

type RouteParams = {
  params: Promise<{ id: string }>;
};

function normalizeStatus(value: unknown) {
  return value === 'PENDING' ||
    value === 'PROCESSING' ||
    value === 'PAID' ||
    value === 'FAILED' ||
    value === 'CANCELED' ||
    value === 'EXPIRED'
    ? value
    : null;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const adminGuard = await requireAdminRouteUser();

  if (!adminGuard.ok) {
    return adminGuard.response;
  }

  const { id } = await params;
  const orderId = Number(id);
  const body = (await request.json().catch(() => null)) as
    | {
        status?: unknown;
        paymentMethod?: unknown;
        statusText?: unknown;
        paymentFailureCode?: unknown;
        paymentFailureText?: unknown;
      }
    | null;
  const status = normalizeStatus(body?.status);
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор заказа.' }, { status: 400 });
  }

  if (!status) {
    return Response.json(
      {
        error: 'Статус должен быть PENDING, PROCESSING, PAID, FAILED, CANCELED или EXPIRED.',
      },
      { status: 400 }
    );
  }

  const orderBeforeUpdate = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      tariff: {
        select: {
          course: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  const updatedOrder = await updateOrderStatus(orderId, status, {
    paymentMethod: paymentMethod ?? undefined,
    statusText: typeof body?.statusText === 'string' ? body.statusText : undefined,
    paymentFailureCode:
      typeof body?.paymentFailureCode === 'string' ? body.paymentFailureCode : undefined,
    paymentFailureText:
      typeof body?.paymentFailureText === 'string' ? body.paymentFailureText : undefined,
  });

  if (!updatedOrder) {
    return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
  }

  revalidateAdminPaths(orderBeforeUpdate?.tariff.course.slug);

  return Response.json({ order: updatedOrder });
}
