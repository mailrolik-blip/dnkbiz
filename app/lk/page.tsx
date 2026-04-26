import { redirect } from 'next/navigation';

import DashboardClient from '@/components/dashboard-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { buildAuthHref } from '@/lib/auth-intent';
import { getCatalogCoursesForViewer } from '@/lib/course-access';

export default async function DashboardPage() {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect(buildAuthHref('login', '/lk'));
  }

  const catalogCourses = await getCatalogCoursesForViewer(user.id);

  const myCourses = catalogCourses.filter(
    (course) => (course.isOwned || course.isStarted) && !course.pendingOrder
  );
  const freeCourses = catalogCourses.filter(
    (course) => course.status === 'free' && !course.isStarted
  );
  const pendingCourses = catalogCourses.filter(
    (course) => course.status === 'paid' && Boolean(course.pendingOrder) && !course.isOwned
  );
  const paidCourses = catalogCourses.filter(
    (course) =>
      course.status === 'paid' &&
      !course.isOwned &&
      !course.pendingOrder &&
      !course.isStarted
  );

  return (
    <DashboardClient
      freeCourses={freeCourses}
      myCourses={myCourses}
      paidCourses={paidCourses}
      pendingCourses={pendingCourses}
      user={{
        email: user.email,
        name: user.name,
        role: user.role,
      }}
    />
  );
}
