import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { consumeRateLimit, getRequestClientIp } from '@/lib/security/rate-limit';

const FIELD_LIMITS = {
  businessType: 160,
  message: 1200,
  pain: 180,
  sessionId: 160,
} as const;

const ARRAY_ITEM_LIMIT = 120;
const ARRAY_MAX_ITEMS = 16;
const MOCK_REPLY =
  'Пилотный помощник еще не подключен к n8n. Мы сохранили контекст и покажем тестовый ответ без падения сайта.';

type AssistantChatPayload = {
  businessType: string;
  channels: string[];
  message: string;
  pain: string;
  requestId: number | null;
  sessionId: string;
  tasks: string[];
};

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
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

function normalizeRequestId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildPayload(body: Record<string, unknown> | null): AssistantChatPayload {
  return {
    businessType: normalizeText(body?.businessType, FIELD_LIMITS.businessType),
    channels: normalizeStringArray(body?.channels),
    message: normalizeText(body?.message, FIELD_LIMITS.message),
    pain: normalizeText(body?.pain, FIELD_LIMITS.pain),
    requestId: normalizeRequestId(body?.requestId),
    sessionId: normalizeText(body?.sessionId, FIELD_LIMITS.sessionId),
    tasks: normalizeStringArray(body?.tasks),
  };
}

async function readWebhookResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  return text ? { text: text.slice(0, 4000) } : null;
}

function extractReply(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidates = [record.reply, record.message, record.answer, record.text, record.output];
  const reply = candidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
  );

  return reply?.trim() ?? null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const payload = buildPayload(body);

  if (!payload.message) {
    return Response.json({ error: 'Введите сообщение для помощника.' }, { status: 400 });
  }

  const rateLimit = consumeRateLimit({
    bucket: 'ai-assistant-chat',
    key: `${getRequestClientIp(request)}:${payload.sessionId || payload.requestId || 'guest'}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Слишком много сообщений. Повторите позже.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const currentUser = await getOptionalCurrentUser();
  const aiRequest = payload.requestId
    ? await prisma.aiAssistantRequest.findUnique({
        where: {
          id: payload.requestId,
        },
        select: {
          businessType: true,
          channels: true,
          contact: true,
          id: true,
          name: true,
          pain: true,
          tasks: true,
          user: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
          userId: true,
        },
      })
    : null;

  if (aiRequest?.userId && aiRequest.userId !== currentUser?.id) {
    return Response.json({ error: 'Недостаточно прав для этой заявки.' }, { status: 403 });
  }

  const tasks = aiRequest && Array.isArray(aiRequest.tasks)
    ? aiRequest.tasks.filter((item): item is string => typeof item === 'string')
    : payload.tasks;
  const channels = aiRequest && Array.isArray(aiRequest.channels)
    ? aiRequest.channels.filter((item): item is string => typeof item === 'string')
    : payload.channels;
  const requestPayload = {
    businessType: aiRequest?.businessType ?? payload.businessType,
    channels,
    message: payload.message,
    pain: aiRequest?.pain ?? payload.pain,
    requestId: aiRequest?.id ?? payload.requestId,
    sessionId: payload.sessionId,
    source: 'dnk-ai-assistant-chat',
    tasks,
    userEmail: currentUser?.email ?? aiRequest?.user?.email ?? null,
    userId: currentUser?.id ?? aiRequest?.userId ?? null,
    userName: currentUser?.name ?? aiRequest?.user?.name ?? null,
  };
  const webhookUrl = process.env.N8N_ASSISTANT_CHAT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return Response.json({
      mode: 'mock',
      reply: MOCK_REPLY,
    });
  }

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });
    const webhookPayload = await readWebhookResponse(webhookResponse);

    if (!webhookResponse.ok) {
      return Response.json({
        mode: 'webhook_failed',
        reply: MOCK_REPLY,
      });
    }

    return Response.json({
      mode: 'webhook',
      reply: extractReply(webhookPayload) ?? MOCK_REPLY,
    });
  } catch (error) {
    console.error('AI assistant chat webhook failed', error);

    return Response.json({
      mode: 'webhook_failed',
      reply: MOCK_REPLY,
    });
  }
}

