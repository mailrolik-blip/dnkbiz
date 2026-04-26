import 'server-only';

import type { PaymentMethod, Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

import {
  activeOrderStatuses,
  isActiveOrderStatus,
  isRetryableOrderStatus,
} from './constants';
import { createManualCheckoutSession, mapManualProviderStatus } from './providers/manual';
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
    return 'Оплата подтверждена. Доступ к курсу уже открыт.';
  }

  if (status === 'PROCESSING') {
    return 'Платеж создан и ожидает подтверждения провайдера.';
  }

  if (status === 'FAILED') {
    return 'Не удалось подтвердить оплату.';
  }

  if (status === 'CANCELED') {
    return 'Оплата была отменена.';
  }

  if (status === 'EXPIRED') {
    return 'Время на оплату истекло.';
  }

  return 'Заказ создан. Завершите оплату, чтобы открыть курс.';
}

function getProviderWebhookResult(
  provider: PaymentProviderKey,
  status: string
): ProviderWebhookResult | null {
  if (provider === 'test') {
    return mapTestProviderStatus(status);
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

export function getOrderCheckoutUrl(orderId: number) {
  return `/checkout/test?orderId=${orderId}`;
}

export function isTestPaymentsEnabled() {
  return process.env.ENABLE_TEST_PAYMENTS === 'true';
}

export function getDefaultPaymentMethod(): PaymentMethod {
  return isTestPaymentsEnabled() ? 'TEST' : 'MANUAL';
}

export function isPaymentMethodAvailable(method: PaymentMethod) {
  if (method === 'TEST') {
    return isTestPaymentsEnabled();
  }

  return true;
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  return value === 'TEST' || value === 'MANUAL' ? value : null;
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

  if (isRetryableOrderStatus(order.status)) {
    return order;
  }

  if (!isPaymentMethodAvailable(params.paymentMethod)) {
    throw new Error('Выбранный способ оплаты сейчас недоступен.');
  }

  const session =
    params.paymentMethod === 'TEST'
      ? createTestCheckoutSession()
      : createManualCheckoutSession(order.id);

  return applyOrderStatusTransition(order.id, session.nextStatus, {
    paymentMethod: session.paymentMethod,
    paymentReference: session.paymentReference ?? null,
    statusText: session.statusText,
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
        ? (JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue)
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
