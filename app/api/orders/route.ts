import { getOptionalCurrentUser } from '@/lib/auth';
import {
  createOrderForTariff,
  getOrderCheckoutUrl,
  normalizePaymentMethod,
} from '@/lib/payments/service';
import { consumeRateLimit, getRequestClientIp } from '@/lib/security/rate-limit';

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const rateLimit = consumeRateLimit({
    bucket: 'orders-create',
    key: `${user.id}:${getRequestClientIp(request)}`,
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Слишком много попыток создать заказ. Повторите позже.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { tariffId?: unknown; paymentMethod?: unknown }
    | null;
  const tariffId = toPositiveInt(body?.tariffId);
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

  if (!tariffId) {
    return Response.json(
      { error: 'Поле tariffId должно быть положительным целым числом.' },
      { status: 400 }
    );
  }

  if (body && 'paymentMethod' in body && !paymentMethod) {
    return Response.json(
      { error: 'Указан неподдерживаемый способ оплаты.' },
      { status: 400 }
    );
  }

  const result = await createOrderForTariff({
    userId: user.id,
    tariffId,
    paymentMethod,
  });

  if (result.kind === 'missing_tariff') {
    return Response.json({ error: 'Тариф не найден.' }, { status: 404 });
  }

  if (result.kind === 'already_owned') {
    return Response.json(
      { error: 'Курс уже открыт для этого пользователя.' },
      { status: 409 }
    );
  }

  if (result.kind === 'existing_active_order') {
    return Response.json(
      {
        error: `Заказ #${result.order.id} уже создан и ожидает завершения оплаты.`,
        orderId: result.order.id,
        orderStatus: result.order.status,
        checkoutUrl: getOrderCheckoutUrl(result.order.id),
      },
      { status: 409 }
    );
  }

  return Response.json(
    {
      order: {
        id: result.order.id,
        status: result.order.status,
        paymentMethod: result.order.paymentMethod,
        amount: result.order.amount,
        createdAt: result.order.createdAt,
        expiresAt: result.order.expiresAt,
      },
      checkoutUrl: getOrderCheckoutUrl(result.order.id),
      tariff: {
        title: result.tariff.title,
        courseTitle: result.tariff.course.title,
        courseSlug: result.tariff.course.slug,
      },
    },
    { status: 201 }
  );
}
