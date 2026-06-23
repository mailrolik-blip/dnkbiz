import type { AiAssistantRequestStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const allowedStatuses = new Set<AiAssistantRequestStatus>([
  'NEW',
  'REVIEWED',
  'IN_PROGRESS',
  'READY',
  'CLOSED',
]);

const TEXT_LIMITS = {
  adminNote: 2000,
  n8nStatus: 120,
} as const;

function toPositiveInt(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/ai-assistant-requests/[id]'>) {
  const currentUser = await getOptionalCurrentUser();

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return Response.json({ error: 'Недостаточно прав.' }, { status: 403 });
  }

  const { id } = await context.params;
  const requestId = toPositiveInt(id);

  if (!requestId) {
    return Response.json({ error: 'Некорректный идентификатор заявки.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    adminNote?: unknown;
    n8nStatus?: unknown;
    status?: unknown;
  } | null;
  const status = typeof body?.status === 'string' ? body.status : '';

  if (!allowedStatuses.has(status as AiAssistantRequestStatus)) {
    return Response.json({ error: 'Некорректный статус заявки.' }, { status: 400 });
  }

  const adminNote = normalizeOptionalText(body?.adminNote, TEXT_LIMITS.adminNote);
  const n8nStatus = normalizeOptionalText(body?.n8nStatus, TEXT_LIMITS.n8nStatus);

  const updated = await prisma.aiAssistantRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: status as AiAssistantRequestStatus,
      ...(adminNote !== undefined ? { adminNote } : {}),
      ...(n8nStatus !== undefined ? { n8nStatus } : {}),
    },
    select: {
      adminNote: true,
      id: true,
      n8nStatus: true,
      status: true,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/lk');

  return Response.json({
    request: updated,
  });
}
