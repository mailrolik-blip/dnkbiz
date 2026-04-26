import { timingSafeEqual } from 'node:crypto';

import { isTestPaymentsEnabled, processPaymentWebhook } from '@/lib/payments/service';

type RouteParams = {
  params: Promise<{ provider: string }>;
};

function getWebhookSecret() {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function hasValidWebhookSecret(request: Request, secret: string) {
  const providedSecret = request.headers.get('x-webhook-secret')?.trim();

  if (!providedSecret) {
    return false;
  }

  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(providedSecret);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const { provider } = await params;

  if (provider !== 'manual' && provider !== 'test') {
    return Response.json(
      { error: 'Неизвестный платежный провайдер.' },
      { status: 404 }
    );
  }

  if (provider === 'test' && !isTestPaymentsEnabled()) {
    return Response.json({ error: 'Webhook недоступен.' }, { status: 404 });
  }

  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    return Response.json({ error: 'Webhook не настроен.' }, { status: 503 });
  }

  if (!hasValidWebhookSecret(request, webhookSecret)) {
    return Response.json({ error: 'Недопустимый webhook secret.' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (!contentType.includes('application/json')) {
    return Response.json(
      { error: 'Webhook payload должен быть в формате JSON.' },
      { status: 415 }
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
