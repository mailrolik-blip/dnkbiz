import 'server-only';

import type { PaymentMethod, Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

import {
  activeOrderStatuses,
  isActiveOrderStatus,
  isRetryableOrderStatus,
} from './constants';
import { createManualCheckoutSession, mapManualProviderStatus } from './providers/manual';
import {
  createTbankCheckoutSession,
  getStoredTbankPayment,
  hasValidTbankToken,
  hasValidTbankTerminalKey,
  isTbankPaymentsEnabled,
  mapTbankProviderStatus,
} from './providers/tbank';
import { createTestCheckoutSession, mapTestProviderStatus } from './providers/test';
import type { PaymentProviderKey, ProviderWebhookResult } from './types';

const ORDER_TTL_HOURS = 24;

const managedOrderSelect = {
  id: true,
  userId: true,
  tariffId: true,
  status: true,
  paymentMethod: true,
  amount: true,
  paidAt: true,
  expiresAt: true,
  paymentReference: true,
  statusText: true,
  paymentFailureCode: true,
  paymentFailureText: true,
  providerPayload: true,
  createdAt: true,
  updatedAt: true,
  tariff: {
    select: {
      id: true,
      title: true,
      courseId: true,
      course: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

export type ManagedOrder = Prisma.OrderGetPayload<{
  select: typeof managedOrderSelect;
}>;

function buildExpiresAt(base = new Date()) {
  const expiresAt = new Date(base);
  expiresAt.setHours(expiresAt.getHours() + ORDER_TTL_HOURS);
  return expiresAt;
}

function getDefaultStatusText(status: ManagedOrder['status']) {
  if (status === 'PAID') {
    return 'Оплата подтверждена. Полный доступ к курсу открыт.';
  }

  if (status === 'PROCESSING') {
    return 'Платеж отправлен на ручную проверку. После ручной проверки оплаты полный доступ к курсу откроется.';
  }

  if (status === 'FAILED') {
    return 'Оплата не подтверждена.';
  }

  if (status === 'CANCELED') {
    return 'Оплата отменена.';
  }

  if (status === 'EXPIRED') {
    return 'Время на оплату истекло.';
  }

  return 'Заказ создан. Оплатите по QR СБП и нажмите «Я оплатил», чтобы отправить платеж на ручную проверку.';
}

function getProviderWebhookResult(
  provider: PaymentProviderKey,
  status: string
): ProviderWebhookResult | null {
  if (provider === 'test') {
    return mapTestProviderStatus(status);
  }

  if (provider === 'tbank') {
    return mapTbankProviderStatus(status);
  }

  return mapManualProviderStatus(status);
}

async function getManagedOrder(orderId: number) {
  return prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: managedOrderSelect,
  });
}

function cloneProviderPayload(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function getOrderRedirectUrl(
  order: Pick<ManagedOrder, 'paymentMethod' | 'providerPayload'>
) {
  if (order.paymentMethod !== 'TBANK') {
    return null;
  }

  return getStoredTbankPayment(order.providerPayload)?.paymentUrl ?? null;
}

export function getOrderCheckoutUrl(orderId: number) {
  return `/checkout?orderId=${orderId}`;
}

export function isTestPaymentsEnabled() {
  return process.env.ENABLE_TEST_PAYMENTS === 'true';
}

export { isTbankPaymentsEnabled };

export function getDefaultPaymentMethod(): PaymentMethod {
  return isTbankPaymentsEnabled() ? 'TBANK' : 'MANUAL';
}

export function isPaymentMethodAvailable(method: PaymentMethod) {
  if (method === 'TEST') {
    return isTestPaymentsEnabled();
  }

  if (method === 'TBANK') {
    return isTbankPaymentsEnabled();
  }

  return method === 'MANUAL';
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  return value === 'TEST' || value === 'TBANK' || value === 'MANUAL' ? value : null;
}

export async function expireStaleOrdersForUser(userId: number) {
  const now = new Date();

  await prisma.order.updateMany({
    where: {
      userId,
      status: {
        in: activeOrderStatuses,
      },
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: 'EXPIRED',
      statusText: getDefaultStatusText('EXPIRED'),
      paymentFailureCode: 'order_expired',
      paymentFailureText: 'Срок действия заказа истек.',
    },
  });
}

export async function expireOrderIfNeeded(orderId: number) {
  const now = new Date();

  await prisma.order.updateMany({
    where: {
      id: orderId,
      status: {
        in: activeOrderStatuses,
      },
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: 'EXPIRED',
      statusText: getDefaultStatusText('EXPIRED'),
      paymentFailureCode: 'order_expired',
      paymentFailureText: 'Срок действия заказа истек.',
    },
  });
}

export async function createOrderForTariff(params: {
  userId: number;
  tariffId: number;
  paymentMethod?: PaymentMethod | null;
}) {
  await expireStaleOrdersForUser(params.userId);

  const paymentMethod = params.paymentMethod ?? getDefaultPaymentMethod();

  const tariff = await prisma.tariff.findFirst({
    where: {
      id: params.tariffId,
      isActive: true,
      course: {
        isPublished: true,
      },
    },
    select: {
      id: true,
      price: true,
      title: true,
      courseId: true,
      course: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!tariff) {
    return {
      kind: 'missing_tariff' as const,
    };
  }

  const [existingEnrollment, existingActiveOrder] = await Promise.all([
    prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: params.userId,
          courseId: tariff.courseId,
        },
      },
    }),
    prisma.order.findFirst({
      where: {
        userId: params.userId,
        tariffId: tariff.id,
        status: {
          in: activeOrderStatuses,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: managedOrderSelect,
    }),
  ]);

  if (existingEnrollment) {
    return {
      kind: 'already_owned' as const,
      tariff,
    };
  }

  if (existingActiveOrder) {
    return {
      kind: 'existing_active_order' as const,
      order: existingActiveOrder,
      tariff,
    };
  }

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      tariffId: tariff.id,
      amount: tariff.price,
      status: 'PENDING',
      paymentMethod: isPaymentMethodAvailable(paymentMethod)
        ? paymentMethod
        : getDefaultPaymentMethod(),
      expiresAt: buildExpiresAt(),
      statusText: getDefaultStatusText('PENDING'),
    },
    select: managedOrderSelect,
  });

  return {
    kind: 'created' as const,
    order,
    tariff,
  };
}

export async function applyOrderStatusTransition(
  orderId: number,
  status: ManagedOrder['status'],
  options?: {
    paymentMethod?: PaymentMethod;
    paymentReference?: string | null;
    statusText?: string | null;
    paymentFailureCode?: string | null;
    paymentFailureText?: string | null;
    providerPayload?: Prisma.InputJsonValue;
  }
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        userId: true,
        tariffId: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        paymentReference: true,
        statusText: true,
        tariff: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    if (order.status === 'PAID' && status !== 'PAID') {
      return getManagedOrder(orderId);
    }

    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
        paymentMethod: options?.paymentMethod ?? order.paymentMethod,
        paymentReference:
          options?.paymentReference !== undefined
            ? options.paymentReference
            : order.paymentReference,
        statusText:
          options?.statusText !== undefined
            ? options.statusText
            : getDefaultStatusText(status),
        paymentFailureCode:
          status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED'
            ? options?.paymentFailureCode ?? null
            : null,
        paymentFailureText:
          status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED'
            ? options?.paymentFailureText ?? null
            : null,
        providerPayload:
          options?.providerPayload !== undefined ? options.providerPayload : undefined,
        paidAt: status === 'PAID' ? order.paidAt ?? new Date() : null,
      },
    });

    if (status === 'PAID') {
      await tx.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: order.userId,
            courseId: order.tariff.courseId,
          },
        },
        update: {
          orderId,
        },
        create: {
          userId: order.userId,
          courseId: order.tariff.courseId,
          orderId,
        },
      });
    }

    return tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: managedOrderSelect,
    });
  });
}

export async function startOrderCheckout(params: {
  orderId: number;
  userId: number;
  paymentMethod: PaymentMethod;
}) {
  await expireOrderIfNeeded(params.orderId);

  const order = await getManagedOrder(params.orderId);

  if (!order || order.userId !== params.userId) {
    return null;
  }

  if (order.status === 'PAID') {
    return order;
  }

  if (order.status === 'PROCESSING') {
    return order;
  }

  if (isRetryableOrderStatus(order.status)) {
    return order;
  }

  if (!isPaymentMethodAvailable(params.paymentMethod)) {
    throw new Error('Выбранный способ оплаты сейчас недоступен.');
  }

  const session =
    params.paymentMethod === 'TEST'
      ? createTestCheckoutSession()
      : params.paymentMethod === 'TBANK'
      ? await createTbankCheckoutSession(order)
      : createManualCheckoutSession(order.id);

  return applyOrderStatusTransition(order.id, session.nextStatus, {
    paymentMethod: session.paymentMethod,
    paymentReference: session.paymentReference ?? null,
    statusText: session.statusText,
    providerPayload: session.providerPayload,
  });
}

export async function confirmTestPayment(params: {
  orderId: number;
  userId: number;
}) {
  if (!isTestPaymentsEnabled()) {
    throw new Error('Dev/test подтверждение оплаты недоступно.');
  }

  await expireOrderIfNeeded(params.orderId);

  const order = await getManagedOrder(params.orderId);

  if (!order || order.userId !== params.userId) {
    return null;
  }

  if (!isActiveOrderStatus(order.status)) {
    return order;
  }

  if (order.paymentMethod !== 'TEST') {
    await startOrderCheckout({
      orderId: order.id,
      userId: params.userId,
      paymentMethod: 'TEST',
    });
  }

  return applyOrderStatusTransition(order.id, 'PAID', {
    paymentMethod: 'TEST',
    statusText: getDefaultStatusText('PAID'),
  });
}

export async function processPaymentWebhook(params: {
  provider: PaymentProviderKey;
  payload: unknown;
}) {
  if (params.provider === 'tbank') {
    const data =
      params.payload && typeof params.payload === 'object'
        ? (params.payload as Record<string, unknown>)
        : null;

    const orderId = Number(data?.OrderId);
    const providerStatus =
      typeof data?.Status === 'string' ? data.Status.trim().toUpperCase() : null;
    const paymentId =
      data?.PaymentId !== undefined && data.PaymentId !== null
        ? String(data.PaymentId)
        : null;
    const amount = Number(data?.Amount);

    if (!data || !Number.isInteger(orderId) || orderId <= 0 || !providerStatus || !paymentId) {
      return {
        kind: 'invalid_payload' as const,
      };
    }

    if (!hasValidTbankTerminalKey(data.TerminalKey) || !hasValidTbankToken(data)) {
      return {
        kind: 'invalid_signature' as const,
      };
    }

    const result = getProviderWebhookResult(params.provider, providerStatus);

    if (!result) {
      return {
        kind: 'invalid_status' as const,
      };
    }

    const existingOrder = await getManagedOrder(orderId);

    if (!existingOrder) {
      return {
        kind: 'missing_order' as const,
      };
    }

    if (!Number.isFinite(amount) || amount !== Math.round(existingOrder.amount * 100)) {
      return {
        kind: 'amount_mismatch' as const,
      };
    }

    const storedTbankPayment = getStoredTbankPayment(existingOrder.providerPayload);

    if (
      storedTbankPayment?.paymentId &&
      paymentId &&
      storedTbankPayment.paymentId !== paymentId
    ) {
      return {
        kind: 'payment_mismatch' as const,
      };
    }

    if (existingOrder.paymentMethod === 'MANUAL' && existingOrder.status === 'PROCESSING') {
      if (result.status !== 'PAID') {
        return {
          kind: 'processed' as const,
          order: existingOrder,
        };
      }
    }

    const providerPayload = storedTbankPayment
      ? cloneProviderPayload({
          ...storedTbankPayment,
          lastWebhookAt: new Date().toISOString(),
          raw: data,
          status: providerStatus,
          success: data.Success === true,
        })
      : cloneProviderPayload({
          ...data,
          provider: 'tbank',
        });

    const updatedOrder = await applyOrderStatusTransition(orderId, result.status, {
      paymentMethod: 'TBANK',
      paymentReference: paymentId,
      paymentFailureCode: result.paymentFailureCode ?? null,
      paymentFailureText: result.paymentFailureText ?? null,
      statusText: result.statusText ?? null,
      providerPayload,
    });

    if (!updatedOrder) {
      return {
        kind: 'missing_order' as const,
      };
    }

    return {
      kind: 'processed' as const,
      order: updatedOrder,
    };
  }

  const data =
    params.payload && typeof params.payload === 'object'
      ? (params.payload as Record<string, unknown>)
      : null;

  const orderId = Number(data?.orderId);
  const providerStatus =
    typeof data?.status === 'string' ? data.status.trim().toLowerCase() : null;

  if (!Number.isInteger(orderId) || orderId <= 0 || !providerStatus) {
    return {
      kind: 'invalid_payload' as const,
    };
  }

  const result = getProviderWebhookResult(params.provider, providerStatus);

  if (!result) {
    return {
      kind: 'invalid_status' as const,
    };
  }

  const updatedOrder = await applyOrderStatusTransition(orderId, result.status, {
    paymentReference:
      typeof data?.paymentReference === 'string' ? data.paymentReference : null,
    paymentFailureCode: result.paymentFailureCode ?? null,
    paymentFailureText: result.paymentFailureText ?? null,
    statusText: result.statusText ?? null,
    providerPayload:
      data && Object.keys(data).length > 0
        ? cloneProviderPayload(data)
        : undefined,
  });

  if (!updatedOrder) {
    return {
      kind: 'missing_order' as const,
    };
  }

  return {
    kind: 'processed' as const,
    order: updatedOrder,
  };
}
