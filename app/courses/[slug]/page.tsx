import { redirect } from 'next/navigation';

import CoursePlayer from '@/components/course-player';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { getCourseForViewer } from '@/lib/course-access';

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const initialLessonSlug = Array.isArray(resolvedSearchParams.lesson)
    ? resolvedSearchParams.lesson[0] ?? null
    : resolvedSearchParams.lesson ?? null;
  const user = await getOptionalCurrentUser();
  const courseHref = initialLessonSlug
    ? `/courses/${slug}?lesson=${encodeURIComponent(initialLessonSlug)}`
    : `/courses/${slug}`;

  if (!user) {
    redirect(buildAuthHref('login', courseHref));
  }

  const course = await getCourseForViewer(slug, user.id);

  if (!course) {
    redirect('/lk');
  }

  return <CoursePlayer course={course} initialLessonSlug={initialLessonSlug} />;
}
