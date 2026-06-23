import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { consumeRateLimit, getRequestClientIp } from '@/lib/security/rate-limit';

const FIELD_LIMITS = {
  businessType: 160,
  comment: 1200,
  contact: 160,
  name: 120,
  pain: 180,
} as const;

const ARRAY_ITEM_LIMIT = 120;
const ARRAY_MAX_ITEMS = 16;

type AssistantInterestPayload = {
  businessType: string;
  channels: string[];
  comment: string | null;
  contact: string;
  contactOverride: string | null;
  name: string;
  pain: string;
  tasks: string[];
};

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item, ARRAY_ITEM_LIMIT))
    .filter(Boolean)
    .slice(0, ARRAY_MAX_ITEMS);
}

function buildPayload(body: Record<string, unknown> | null): AssistantInterestPayload {
  return {
    businessType: normalizeText(body?.businessType, FIELD_LIMITS.businessType),
    channels: normalizeStringArray(body?.channels),
    comment: normalizeOptionalText(body?.comment, FIELD_LIMITS.comment),
    contact: normalizeText(body?.contact, FIELD_LIMITS.contact),
    contactOverride: normalizeOptionalText(body?.contactOverride, FIELD_LIMITS.contact),
    name: normalizeText(body?.name, FIELD_LIMITS.name),
    pain: normalizeText(body?.pain, FIELD_LIMITS.pain),
    tasks: normalizeStringArray(body?.tasks),
  };
}

function hasRequiredFields(payload: AssistantInterestPayload, hasUser: boolean) {
  const hasContact = hasUser || Boolean(payload.name && payload.contact);

  return Boolean(
    hasContact &&
      payload.businessType &&
      payload.pain &&
      payload.tasks.length > 0 &&
      payload.channels.length > 0
  );
}

async function readWebhookResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  return text ? { text: text.slice(0, 4000) } : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const payload = buildPayload(body);

  const rateLimit = consumeRateLimit({
    bucket: 'ai-assistant-interest',
    key: `${getRequestClientIp(request)}:${payload.contact || 'unknown'}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Слишком много заявок. Повторите позже или напишите нам в Telegram.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const currentUser = await getOptionalCurrentUser();

  if (!hasRequiredFields(payload, Boolean(currentUser))) {
    return Response.json(
      { error: 'Заполните тип бизнеса, боль, функции, каналы и контакт.' },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_ASSISTANT_WEBHOOK_URL?.trim();
  const requestName = currentUser?.name?.trim() || currentUser?.email || payload.name;
  const requestContact = payload.contactOverride || payload.contact || currentUser?.email || '';
  const requestPayload = {
    businessType: payload.businessType,
    channels: payload.channels,
    comment: payload.comment,
    contact: requestContact,
    contactOverride: payload.contactOverride,
    name: requestName,
    pain: payload.pain,
    source: 'dnk-ai-assistant-pilot',
    submittedAt: new Date().toISOString(),
    tasks: payload.tasks,
    userId: currentUser?.id ?? null,
    userEmail: currentUser?.email ?? null,
    userName: currentUser?.name ?? null,
    user: currentUser
      ? {
          email: currentUser.email,
          id: currentUser.id,
          name: currentUser.name,
        }
      : null,
  };

  const aiRequest = await prisma.aiAssistantRequest.create({
    data: {
      businessType: payload.businessType,
      channels: payload.channels,
      comment: payload.comment,
      contact: requestContact,
      name: requestName,
      pain: payload.pain,
      payload: requestPayload,
      tasks: payload.tasks,
      userId: currentUser?.id ?? null,
      n8nStatus: webhookUrl ? 'PENDING' : 'NOT_CONFIGURED',
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!webhookUrl) {
    return Response.json(
      {
        id: aiRequest.id,
        message:
          'Мы получили заявку. Дальше можно уточнять задачу в чате AI-помощника.',
        mode: 'saved',
        status: aiRequest.status,
        summary: {
          ...payload,
          contact: requestContact,
          name: requestName,
          requestId: aiRequest.id,
          status: aiRequest.status,
          user: requestPayload.user,
        },
      },
      { status: 201 }
    );
  }

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...requestPayload,
        requestId: aiRequest.id,
      }),
    });
    const n8nResponse = await readWebhookResponse(webhookResponse);

    await prisma.aiAssistantRequest.update({
      where: {
        id: aiRequest.id,
      },
      data: {
        n8nResponse: n8nResponse ?? undefined,
        n8nStatus: webhookResponse.ok ? 'SENT' : `FAILED_${webhookResponse.status}`,
      },
    });

    return Response.json(
      {
        id: aiRequest.id,
        message:
          'Мы получили заявку. Дальше можно уточнять задачу в чате AI-помощника.',
        mode: webhookResponse.ok ? 'webhook' : 'saved_webhook_failed',
        status: aiRequest.status,
        summary: {
          ...payload,
          contact: requestContact,
          name: requestName,
          requestId: aiRequest.id,
          status: aiRequest.status,
          user: requestPayload.user,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('AI assistant webhook failed', error);

    await prisma.aiAssistantRequest.update({
      where: {
        id: aiRequest.id,
      },
      data: {
        n8nResponse: {
          error: error instanceof Error ? error.message : 'Unknown webhook error',
        },
        n8nStatus: 'FAILED',
      },
    });

    return Response.json(
      {
        id: aiRequest.id,
        message:
          'Мы получили заявку. n8n сейчас не ответил, но заявка сохранена и видна администратору.',
        mode: 'saved_webhook_failed',
        status: aiRequest.status,
        summary: {
          ...payload,
          contact: requestContact,
          name: requestName,
          requestId: aiRequest.id,
          status: aiRequest.status,
          user: requestPayload.user,
        },
      },
      { status: 201 }
    );
  }
}

