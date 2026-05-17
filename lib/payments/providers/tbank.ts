import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import type { ProviderCheckoutSession, ProviderWebhookResult } from '../types';

type TbankInitOrder = {
  id: number;
  amount: number;
  paymentReference: string | null;
  providerPayload?: Prisma.JsonValue | null;
  tariff: {
    title: string;
    course: {
      title: string;
    };
  };
};

type TbankConfig = {
  apiUrl: string;
  failUrl: string;
  notificationUrl: string;
  password: string;
  successUrl: string;
  terminalKey: string;
};

type TbankInitPayload = {
  Amount: number;
  Description: string;
  FailURL: string;
  NotificationURL: string;
  OrderId: string;
  Password?: string;
  PayType?: 'O';
  SuccessURL: string;
  TerminalKey: string;
  Token?: string;
  DATA?: {
    OperationInitiatorType: string;
  };
};

type TbankInitResponse = {
  Details?: string;
  ErrorCode?: string;
  Message?: string;
  OrderId?: string;
  PaymentId?: number | string;
  PaymentURL?: string;
  Status?: string;
  Success?: boolean;
  TerminalKey?: string;
};

type TbankStoredPayment = {
  amount: number;
  createdAt: string;
  orderId: number;
  paymentId: string;
  paymentUrl: string;
  provider: 'tbank';
  status: string | null;
};

function readEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getTbankConfig(): TbankConfig | null {
  const terminalKey = readEnvValue(process.env.TBANK_TERMINAL_KEY);
  const password = readEnvValue(process.env.TBANK_PASSWORD);
  const apiUrl = readEnvValue(process.env.TBANK_API_URL);
  const successUrl = readEnvValue(process.env.TBANK_SUCCESS_URL);
  const failUrl = readEnvValue(process.env.TBANK_FAIL_URL);
  const notificationUrl = readEnvValue(process.env.TBANK_NOTIFICATION_URL);

  if (
    !terminalKey ||
    !password ||
    !apiUrl ||
    !successUrl ||
    !failUrl ||
    !notificationUrl ||
    !isValidUrl(apiUrl) ||
    !isValidUrl(successUrl) ||
    !isValidUrl(failUrl) ||
    !isValidUrl(notificationUrl)
  ) {
    return null;
  }

  return {
    apiUrl,
    failUrl,
    notificationUrl,
    password,
    successUrl,
    terminalKey,
  };
}

function serializeTokenValue(value: string | number | boolean) {
  return String(value);
}

function getTokenBase(payload: Record<string, unknown>, password: string) {
  const data: Record<string, string> = {
    Password: password,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'Token' || value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object') {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      data[key] = serializeTokenValue(value);
    }
  }

  return Object.keys(data)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => data[key])
    .join('');
}

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function appendOrderId(url: string, orderId: number) {
  const target = new URL(url);
  target.searchParams.set('orderId', String(orderId));
  return target.toString();
}

function buildDescription(order: TbankInitOrder) {
  return `${order.tariff.course.title} / ${order.tariff.title} / заказ #${order.id}`;
}

function toPositiveKopecks(amount: number) {
  return Math.max(0, Math.round(amount * 100));
}

export function isTbankPaymentsEnabled() {
  return process.env.TBANK_ENABLED === 'true' && getTbankConfig() !== null;
}

export function generateTbankToken(payload: Record<string, unknown>, password: string) {
  return hashValue(getTokenBase(payload, password));
}

export function hasValidTbankToken(payload: Record<string, unknown>) {
  const config = getTbankConfig();
  const token = typeof payload.Token === 'string' ? payload.Token.trim().toLowerCase() : null;

  if (!config || !token) {
    return false;
  }

  const expectedToken = generateTbankToken(payload, config.password).toLowerCase();
  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(token);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export function hasValidTbankTerminalKey(value: unknown) {
  const config = getTbankConfig();

  return (
    config !== null &&
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim() === config.terminalKey
  );
}

export function getStoredTbankPayment(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;

  if (
    data.provider !== 'tbank' ||
    typeof data.paymentId !== 'string' ||
    typeof data.paymentUrl !== 'string'
  ) {
    return null;
  }

  return {
    amount: typeof data.amount === 'number' ? data.amount : 0,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString(),
    orderId: typeof data.orderId === 'number' ? data.orderId : 0,
    paymentId: data.paymentId,
    paymentUrl: data.paymentUrl,
    provider: 'tbank',
    status: typeof data.status === 'string' ? data.status : null,
  } satisfies TbankStoredPayment;
}

export async function createTbankCheckoutSession(
  order: TbankInitOrder
): Promise<ProviderCheckoutSession> {
  const config = getTbankConfig();

  if (!config) {
    throw new Error('Оплата через T-Bank сейчас недоступна. Можно перейти к ручной оплате.');
  }

  const existingPayment = getStoredTbankPayment(order.providerPayload);

  if (existingPayment?.paymentUrl) {
    return {
      nextStatus: 'PENDING',
      paymentMethod: 'TBANK',
      provider: 'tbank',
      paymentReference: existingPayment.paymentId,
      providerPayload: existingPayment,
      redirectUrl: existingPayment.paymentUrl,
      statusText:
        'Платеж уже создан. Перейдите в T-Bank, чтобы подтвердить оплату. После подтверждения оплаты доступ к курсу откроется автоматически.',
    };
  }

  const requestPayload: TbankInitPayload = {
    TerminalKey: config.terminalKey,
    Amount: toPositiveKopecks(order.amount),
    OrderId: String(order.id),
    Description: buildDescription(order),
    SuccessURL: appendOrderId(config.successUrl, order.id),
    FailURL: appendOrderId(config.failUrl, order.id),
    NotificationURL: config.notificationUrl,
    PayType: 'O',
    DATA: {
      OperationInitiatorType: '0',
    },
  };

  const token = generateTbankToken(requestPayload, config.password);
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...requestPayload,
      Token: token,
    }),
  });

  const payload = (await response.json().catch(() => null)) as TbankInitResponse | null;
  const paymentId =
    payload?.PaymentId !== undefined && payload.PaymentId !== null
      ? String(payload.PaymentId)
      : null;
  const paymentUrl =
    typeof payload?.PaymentURL === 'string' && payload.PaymentURL.trim().length > 0
      ? payload.PaymentURL
      : null;

  if (!response.ok || payload?.Success !== true || !paymentId || !paymentUrl) {
    const failureMessage =
      payload?.Message?.trim() ||
      payload?.Details?.trim() ||
      'Не удалось открыть оплату через T-Bank. Можно перейти к ручной оплате.';
    throw new Error(failureMessage);
  }

  const providerPayload = {
    amount: requestPayload.Amount,
    createdAt: new Date().toISOString(),
    orderId: order.id,
    paymentId,
    paymentUrl,
    provider: 'tbank',
    status: payload?.Status?.trim() ?? null,
  } satisfies TbankStoredPayment;

  return {
    nextStatus: 'PENDING',
    paymentMethod: 'TBANK',
    provider: 'tbank',
    paymentReference: paymentId,
    providerPayload,
    redirectUrl: paymentUrl,
    statusText:
      'Платеж создан. Перейдите в T-Bank, чтобы подтвердить оплату. После подтверждения оплаты доступ к курсу откроется автоматически.',
  };
}

export function mapTbankProviderStatus(status: string): ProviderWebhookResult | null {
  const normalizedStatus = status.trim().toUpperCase();

  if (normalizedStatus === 'AUTHORIZED' || normalizedStatus === 'CONFIRMED') {
    return {
      status: 'PAID',
      statusText: 'Оплата подтверждена. Полный доступ к курсу открыт.',
    };
  }

  if (
    normalizedStatus === 'NEW' ||
    normalizedStatus === 'FORM_SHOWED' ||
    normalizedStatus === 'AUTHORIZING' ||
    normalizedStatus === '3DS_CHECKING' ||
    normalizedStatus === '3DS_CHECKED' ||
    normalizedStatus === 'CONFIRMING'
  ) {
    return {
      status: 'PENDING',
      statusText:
        'Платеж создан. Перейдите в T-Bank, чтобы подтвердить оплату. После подтверждения оплаты доступ к курсу откроется автоматически.',
    };
  }

  if (normalizedStatus === 'REJECTED' || normalizedStatus === 'AUTH_FAIL') {
    return {
      status: 'FAILED',
      paymentFailureCode: normalizedStatus.toLowerCase(),
      paymentFailureText: 'T-Bank не подтвердил оплату по этому заказу.',
      statusText: 'Оплата не подтверждена.',
    };
  }

  if (normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED') {
    return {
      status: 'CANCELED',
      paymentFailureCode: 'tbank_canceled',
      paymentFailureText: 'Оплата была отменена в T-Bank.',
      statusText: 'Оплата отменена.',
    };
  }

  if (normalizedStatus === 'DEADLINE_EXPIRED') {
    return {
      status: 'EXPIRED',
      paymentFailureCode: 'tbank_deadline_expired',
      paymentFailureText: 'Истек срок действия платежной ссылки T-Bank.',
      statusText: 'Время на оплату истекло.',
    };
  }

  return null;
}
