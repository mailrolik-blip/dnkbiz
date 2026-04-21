import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const { id } = await params;
  const lessonId = Number(id);

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return Response.json({ error: 'Некорректный идентификатор урока.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { completed?: unknown; answer?: unknown }
    | null;

  const completed =
    typeof body?.completed === 'boolean' ? body.completed : undefined;
  const answer =
    typeof body?.answer === 'string'
      ? body.answer.trim().length > 0
        ? body.answer.trim()
        : null
      : undefined;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      isPublished: true,
      course: {
        isPublished: true,
        enrollments: {
          some: {
            userId: user.id,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!lesson) {
    return Response.json(
      { error: 'Доступ к этому уроку не открыт.' },
      { status: 403 }
    );
  }

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId: lesson.id,
      },
    },
    update: {
      ...(completed !== undefined ? { completed } : {}),
      ...(answer !== undefined ? { answer } : {}),
      lastViewedAt: new Date(),
    },
    create: {
      userId: user.id,
      lessonId: lesson.id,
      completed: completed ?? false,
      answer: answer ?? null,
      lastViewedAt: new Date(),
    },
    select: {
      completed: true,
      answer: true,
      lastViewedAt: true,
      updatedAt: true,
    },
  });

  return Response.json({
    progress: {
      completed: progress.completed,
      answer: progress.answer,
      lastViewedAt: progress.lastViewedAt?.toISOString() ?? null,
      updatedAt: progress.updatedAt.toISOString(),
    },
  });
}
