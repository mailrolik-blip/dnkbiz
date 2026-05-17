import { getOptionalCurrentUser } from '@/lib/auth';
import {
  getOrderCheckoutUrl,
  getOrderRedirectUrl,
  normalizePaymentMethod,
  startOrderCheckout,
} from '@/lib/payments/service';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const { id } = await params;
  const orderId = Number(id);
  const body = (await request.json().catch(() => null)) as
    | { paymentMethod?: unknown }
    | null;
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор заказа.' }, { status: 400 });
  }

  if (!paymentMethod) {
    return Response.json({ error: 'Нужно выбрать способ оплаты.' }, { status: 400 });
  }

  try {
    const order = await startOrderCheckout({
      orderId,
      userId: user.id,
      paymentMethod,
    });

    if (!order) {
      return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
    }

    return Response.json({
      order: {
        id: order.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        statusText: order.statusText,
        expiresAt: order.expiresAt,
      },
      checkoutUrl: getOrderCheckoutUrl(order.id),
      courseSlug: order.tariff.course.slug,
      paymentUrl: getOrderRedirectUrl(order),
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось открыть оплату или отправить платеж на ручную проверку. Попробуйте еще раз.',
      },
      { status: 409 }
    );
  }
}
