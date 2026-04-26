import CatalogPageClient from '@/components/catalog-page-client';
import { getOptionalCurrentUser } from '@/lib/auth';
import { getCatalogCoursesForViewer } from '@/lib/course-access';

export default async function CatalogPage() {
  const user = await getOptionalCurrentUser();
  const catalogCourses = await getCatalogCoursesForViewer(user?.id ?? null);

  return (
    <CatalogPageClient
      catalogCourses={catalogCourses}
      user={
        user
          ? {
              email: user.email,
              name: user.name,
            }
          : null
      }
    />
  );
}
