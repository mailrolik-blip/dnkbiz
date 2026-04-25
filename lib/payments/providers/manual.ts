import type { ProviderCheckoutSession, ProviderWebhookResult } from '../types';

export function createManualCheckoutSession(orderId: number): ProviderCheckoutSession {
  return {
    nextStatus: 'PROCESSING',
    paymentMethod: 'MANUAL',
    provider: 'manual',
    paymentReference: `manual-${orderId}`,
    statusText:
      'Платеж создан и ожидает подтверждения платежного провайдера. После подключения реальной интеграции этот статус будет обновляться автоматически.',
  };
}

export function mapManualProviderStatus(status: string): ProviderWebhookResult | null {
  if (status === 'pending') {
    return {
      status: 'PENDING',
      statusText: 'Заказ создан и ожидает оплаты.',
    };
  }

  if (status === 'processing') {
    return {
      status: 'PROCESSING',
      statusText: 'Платеж обрабатывается платежным провайдером.',
    };
  }

  if (status === 'paid') {
    return {
      status: 'PAID',
      statusText: 'Оплата подтверждена платежным провайдером.',
    };
  }

  if (status === 'failed') {
    return {
      status: 'FAILED',
      paymentFailureCode: 'provider_failed',
      paymentFailureText: 'Платежный провайдер вернул ошибку оплаты.',
      statusText: 'Не удалось подтвердить оплату.',
    };
  }

  if (status === 'canceled') {
    return {
      status: 'CANCELED',
      paymentFailureCode: 'provider_canceled',
      paymentFailureText: 'Платеж был отменен до подтверждения.',
      statusText: 'Оплата была отменена.',
    };
  }

  if (status === 'expired') {
    return {
      status: 'EXPIRED',
      paymentFailureCode: 'provider_expired',
      paymentFailureText: 'Истек срок жизни платежной сессии.',
      statusText: 'Время на оплату истекло.',
    };
  }

  return null;
}
