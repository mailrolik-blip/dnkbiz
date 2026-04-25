import type { OrderStatus, PaymentMethod } from '@prisma/client';

export type PaymentProviderKey = 'test' | 'manual';

export type ProviderCheckoutSession = {
  nextStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  provider: PaymentProviderKey;
  statusText: string;
  paymentReference?: string | null;
};

export type ProviderWebhookResult = {
  status: OrderStatus;
  paymentReference?: string | null;
  paymentFailureCode?: string | null;
  paymentFailureText?: string | null;
  statusText?: string | null;
};
