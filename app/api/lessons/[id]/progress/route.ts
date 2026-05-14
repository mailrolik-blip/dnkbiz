import { Prisma } from '@prisma/client';

import { getOptionalCurrentUser } from '@/lib/auth';
import { getLessonAccessForUser } from '@/lib/course-access';
import prisma from '@/lib/prisma';
import {
  isValidLessonAnswer,
  normalizeLessonAnswer,
  securityInputLimits,
} from '@/lib/security/input';

type RouteParams = {
  params: Promise<{ id: string }>;
};

function isMissingLessonActivityEventTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2010' &&
    error.meta?.code === '42P01'
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const { id } = await params;
  const lessonId = Number(id);

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return Response.json(
      { error: 'Некорректный идентификатор урока.' },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { completed?: unknown; answer?: unknown }
    | null;
  const hasCompleted = Boolean(body && Object.hasOwn(body, 'completed'));
  const hasAnswer = Boolean(body && Object.hasOwn(body, 'answer'));

  if (hasCompleted && typeof body?.completed !== 'boolean') {
    return Response.json(
      { error: 'Поле completed должно быть логическим значением.' },
      { status: 400 }
    );
  }

  if (hasAnswer && body?.answer !== null && typeof body?.answer !== 'string') {
    return Response.json(
      { error: 'Поле answer должно быть строкой или null.' },
      { status: 400 }
    );
  }

  const completed =
    typeof body?.completed === 'boolean' ? body.completed : undefined;
  const answer = normalizeLessonAnswer(body?.answer);

  if (!isValidLessonAnswer(answer)) {
    return Response.json(
      {
        error: `Ответ слишком длинный. Максимум ${securityInputLimits.lessonAnswerMaxLength} символов.`,
      },
      { status: 400 }
    );
  }

  const access = await getLessonAccessForUser(lessonId, user.id);

  if (!access?.canAccess) {
    return Response.json({ error: 'Доступ к этому уроку не открыт.' }, { status: 403 });
  }

  const activityAt = new Date();
  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId,
      },
    },
    update: {
      ...(completed !== undefined ? { completed } : {}),
      ...(answer !== undefined ? { answer } : {}),
      lastViewedAt: activityAt,
    },
    create: {
      userId: user.id,
      lessonId,
      completed: completed ?? false,
      answer: answer ?? null,
      lastViewedAt: activityAt,
    },
    select: {
      completed: true,
      answer: true,
      lastViewedAt: true,
      updatedAt: true,
    },
  });

  try {
    await prisma.$executeRaw`
      INSERT INTO "LessonActivityEvent" ("userId", "lessonId", "completed", "createdAt")
      VALUES (${user.id}, ${lessonId}, ${progress.completed}, ${activityAt})
    `;
  } catch (activityError) {
    if (!isMissingLessonActivityEventTableError(activityError)) {
      throw activityError;
    }
  }

  return Response.json({
    progress: {
      completed: progress.completed,
      answer: progress.answer,
      lastViewedAt: progress.lastViewedAt?.toISOString() ?? null,
      updatedAt: progress.updatedAt.toISOString(),
    },
  });
}
