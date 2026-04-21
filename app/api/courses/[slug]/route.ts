import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteParams = {
  params: Promise<{ slug: string }>;
};

function normalizeHomeworkOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const options = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );

  return options.length > 0 ? options : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    return Response.json({ error: 'Требуется авторизация.' }, { status: 401 });
  }

  const { slug } = await params;

  const course = await prisma.course.findFirst({
    where: {
      slug,
      isPublished: true,
      enrollments: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      lessons: {
        where: {
          isPublished: true,
        },
        orderBy: {
          position: 'asc',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          content: true,
          videoUrl: true,
          videoProvider: true,
          homeworkTitle: true,
          homeworkPrompt: true,
          homeworkType: true,
          homeworkOptions: true,
          position: true,
          progress: {
            where: {
              userId: user.id,
            },
            select: {
              completed: true,
              answer: true,
              lastViewedAt: true,
              updatedAt: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!course) {
    return Response.json(
      { error: 'Доступ к этому курсу не открыт.' },
      { status: 403 }
    );
  }

  return Response.json({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      lessons: course.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        videoProvider: lesson.videoProvider,
        homeworkTitle: lesson.homeworkTitle,
        homeworkPrompt: lesson.homeworkPrompt,
        homeworkType: lesson.homeworkType,
        homeworkOptions: normalizeHomeworkOptions(lesson.homeworkOptions),
        position: lesson.position,
        progress: lesson.progress[0]
          ? {
              completed: lesson.progress[0].completed,
              answer: lesson.progress[0].answer,
              lastViewedAt: lesson.progress[0].lastViewedAt?.toISOString() ?? null,
              updatedAt: lesson.progress[0].updatedAt.toISOString(),
            }
          : null,
      })),
    },
  });
}
