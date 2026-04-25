import type { OrderStatus, PaymentMethod } from '@prisma/client';

export const activeOrderStatuses: OrderStatus[] = ['PENDING', 'PROCESSING'];
export const retryableOrderStatuses: OrderStatus[] = ['FAILED', 'CANCELED', 'EXPIRED'];

export function isActiveOrderStatus(status: OrderStatus) {
  return activeOrderStatuses.includes(status);
}

export function isRetryableOrderStatus(status: OrderStatus) {
  return retryableOrderStatuses.includes(status);
}

export function getOrderStatusLabel(status: OrderStatus) {
  if (status === 'PAID') {
    return 'Доступ открыт';
  }

  if (status === 'PROCESSING') {
    return 'Платеж обрабатывается';
  }

  if (status === 'FAILED') {
    return 'Ошибка оплаты';
  }

  if (status === 'CANCELED') {
    return 'Оплата отменена';
  }

  if (status === 'EXPIRED') {
    return 'Заказ истек';
  }

  return 'Ожидает оплаты';
}

export function getOrderStatusBadgeClass(status: OrderStatus) {
  if (status === 'PAID') {
    return 'badge badge-paid';
  }

  if (status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED') {
    return 'badge badge-canceled';
  }

  return 'badge badge-pending';
}

export function getActiveOrderActionLabel(status: OrderStatus) {
  return status === 'PROCESSING' ? 'Проверить статус' : 'Продолжить оплату';
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  if (method === 'TEST') {
    return 'Локальная проверка';
  }

  return 'Онлайн-оплата';
}
