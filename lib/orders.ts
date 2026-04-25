import type { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';

import {
  applyOrderStatusTransition,
  getDefaultPaymentMethod,
  getOrderCheckoutUrl,
  isPaymentMethodAvailable,
  isTestPaymentsEnabled,
  normalizePaymentMethod,
} from './payments/service';

export {
  getDefaultPaymentMethod,
  getOrderCheckoutUrl,
  isPaymentMethodAvailable,
  isTestPaymentsEnabled,
  normalizePaymentMethod,
};

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
  options?: {
    paymentMethod?: PaymentMethod;
    paymentReference?: string | null;
    statusText?: string | null;
    paymentFailureCode?: string | null;
    paymentFailureText?: string | null;
    providerPayload?: Prisma.InputJsonValue;
  }
) {
  return applyOrderStatusTransition(orderId, status, options);
}
