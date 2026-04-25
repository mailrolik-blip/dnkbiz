import { processPaymentWebhook } from '@/lib/payments/service';

type RouteParams = {
  params: Promise<{ provider: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { provider } = await params;

  if (provider !== 'manual' && provider !== 'test') {
    return Response.json(
      { error: 'Неизвестный платежный провайдер.' },
      { status: 404 }
    );
  }

  const payload = await request.json().catch(() => null);
  const result = await processPaymentWebhook({
    provider,
    payload,
  });

  if (result.kind === 'invalid_payload') {
    return Response.json(
      { error: 'Webhook payload должен содержать orderId и status.' },
      { status: 400 }
    );
  }

  if (result.kind === 'invalid_status') {
    return Response.json(
      { error: 'Неподдерживаемый статус платежного провайдера.' },
      { status: 400 }
    );
  }

  if (result.kind === 'missing_order') {
    return Response.json({ error: 'Заказ не найден.' }, { status: 404 });
  }

  return Response.json({
    received: true,
    order: result.order,
  });
}
