import { redirect } from 'next/navigation';

import CoursePlayer from '@/components/course-player';
import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect('/login');
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
    redirect('/lk');
  }

  return (
    <CoursePlayer
      course={{
        title: course.title,
        slug: course.slug,
        description: course.description,
        lessons: course.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          content: lesson.content,
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
      }}
    />
  );
}
