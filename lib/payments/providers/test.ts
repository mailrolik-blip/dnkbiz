import type { ProviderCheckoutSession, ProviderWebhookResult } from '../types';

export function createTestCheckoutSession(): ProviderCheckoutSession {
  return {
    nextStatus: 'PENDING',
    paymentMethod: 'TEST',
    provider: 'test',
    statusText:
      'Заказ готов к подтверждению оплаты. В локальной среде этот шаг завершает dev/test fallback.',
  };
}

export function mapTestProviderStatus(status: string): ProviderWebhookResult | null {
  if (status === 'paid') {
    return {
      status: 'PAID',
      statusText: 'Оплата подтверждена.',
    };
  }

  if (status === 'failed') {
    return {
      status: 'FAILED',
      paymentFailureText: 'Платеж был отклонен в dev/test сценарии.',
      statusText: 'Не удалось подтвердить оплату.',
    };
  }

  if (status === 'canceled') {
    return {
      status: 'CANCELED',
      paymentFailureText: 'Пользователь отменил оплату в dev/test сценарии.',
      statusText: 'Оплата была отменена.',
    };
  }

  return null;
}
