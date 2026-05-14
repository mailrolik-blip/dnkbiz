import type { ProviderCheckoutSession, ProviderWebhookResult } from '../types';

export function createManualCheckoutSession(orderId: number): ProviderCheckoutSession {
  return {
    nextStatus: 'PROCESSING',
    paymentMethod: 'MANUAL',
    provider: 'manual',
    paymentReference: `sbp-manual-${orderId}`,
    statusText:
      'Платеж отправлен на ручную проверку. После ручной проверки оплаты полный доступ к курсу откроется.',
  };
}

export function mapManualProviderStatus(status: string): ProviderWebhookResult | null {
  if (status === 'pending') {
    return {
      status: 'PENDING',
      statusText:
        'Заказ создан. Оплатите по QR СБП и нажмите «Я оплатил», чтобы отправить платеж на проверку.',
    };
  }

  if (status === 'processing') {
    return {
      status: 'PROCESSING',
      statusText:
        'Платеж отправлен на ручную проверку. После ручной проверки оплаты полный доступ к курсу откроется.',
    };
  }

  if (status === 'paid') {
    return {
      status: 'PAID',
      statusText: 'Оплата подтверждена. Полный доступ к курсу открыт.',
    };
  }

  if (status === 'failed') {
    return {
      status: 'FAILED',
      paymentFailureCode: 'manual_review_failed',
      paymentFailureText: 'Поступление оплаты по этому заказу не удалось подтвердить.',
      statusText:
        'Оплата не подтверждена. Проверьте перевод и создайте новый заказ при необходимости.',
    };
  }

  if (status === 'canceled') {
    return {
      status: 'CANCELED',
      paymentFailureCode: 'manual_review_canceled',
      paymentFailureText: 'Заказ отменен до подтверждения ручной проверки.',
      statusText: 'Оплата отменена.',
    };
  }

  if (status === 'expired') {
    return {
      status: 'EXPIRED',
      paymentFailureCode: 'manual_review_expired',
      paymentFailureText: 'Истек срок ожидания оплаты по QR СБП.',
      statusText: 'Время на оплату истекло.',
    };
  }

  return null;
}
