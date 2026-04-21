import { getOptionalCurrentUser } from '@/lib/auth';
import { isTestPaymentsEnabled, updateOrderStatus } from '@/lib/orders';
import prisma from '@/lib/prisma';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  if (!isTestPaymentsEnabled()) {
    return Response.json({ error: 'Тестовая оплата недоступна.' }, { status: 404 });
  }

  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json(
      { error: 'Некорректный идентификатор заказа.' },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order) {
    return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
  }

  if (order.status !== 'PENDING') {
    return Response.json(
      { error: 'Тестово можно оплатить только заказ со статусом PENDING.' },
      { status: 409 }
    );
  }

  const updatedOrder = await updateOrderStatus(order.id, 'PAID');

  if (!updatedOrder) {
    return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
  }

  return Response.json({
    order: updatedOrder,
    courseSlug: updatedOrder.tariff.course.slug,
  });
}
