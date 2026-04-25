import { redirect } from 'next/navigation';

import CoursePlayer from '@/components/course-player';
import { getOptionalCurrentUser } from '@/lib/auth';
import { getCourseForViewer } from '@/lib/course-access';

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
  const course = await getCourseForViewer(slug, user.id);

  if (!course) {
    redirect('/lk');
  }

  return <CoursePlayer course={course} />;
}
