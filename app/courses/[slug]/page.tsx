import { redirect } from 'next/navigation';

import CoursePlayer from '@/components/course-player';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { getCourseForViewer } from '@/lib/course-access';

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', `/courses/${slug}`));
  }

  const course = await getCourseForViewer(slug, user.id);

  if (!course) {
    redirect('/lk');
  }

  return <CoursePlayer course={course} />;
}
