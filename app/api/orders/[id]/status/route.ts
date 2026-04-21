import { getOptionalCurrentUser } from '@/lib/auth';
import { updateOrderStatus } from '@/lib/orders';

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
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return Response.json(
      { error: 'Маршрут доступен только администратору.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const orderId = Number(id);
  const body = (await request.json().catch(() => null)) as
    | { status?: unknown }
    | null;
  const status = normalizeStatus(body?.status);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json(
      { error: 'Некорректный идентификатор заказа.' },
      { status: 400 }
    );
  }

  if (!status) {
    return Response.json(
      { error: 'Статус должен быть PENDING, PAID или CANCELED.' },
      { status: 400 }
    );
  }

  const updatedOrder = await updateOrderStatus(orderId, status);

  if (!updatedOrder) {
    return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
  }

  return Response.json({ order: updatedOrder });
}
