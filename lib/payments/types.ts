import type { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';

export type PaymentProviderKey = 'test' | 'manual' | 'tbank';

export type ProviderCheckoutSession = {
  nextStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  provider: PaymentProviderKey;
  statusText: string;
  paymentReference?: string | null;
  providerPayload?: Prisma.InputJsonValue;
  redirectUrl?: string | null;
};

export type ProviderWebhookResult = {
  status: OrderStatus;
  paymentReference?: string | null;
  paymentFailureCode?: string | null;
  paymentFailureText?: string | null;
  statusText?: string | null;
  providerPayload?: Prisma.InputJsonValue;
};
