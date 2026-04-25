import { getOptionalCurrentUser } from '@/lib/auth';
import { confirmTestPayment, isTestPaymentsEnabled } from '@/lib/payments/service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  if (!isTestPaymentsEnabled()) {
    return Response.json(
      { error: 'Dev/test подтверждение оплаты недоступно.' },
      { status: 404 }
    );
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

  try {
    const updatedOrder = await confirmTestPayment({
      orderId,
      userId: user.id,
    });

    if (!updatedOrder) {
      return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
    }

    if (updatedOrder.status !== 'PAID') {
      return Response.json(
        { error: 'Dev/test подтверждение доступно только для активного заказа.' },
        { status: 409 }
      );
    }

    return Response.json({
      order: updatedOrder,
      courseSlug: updatedOrder.tariff.course.slug,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось подтвердить оплату.',
      },
      { status: 409 }
    );
  }
}
