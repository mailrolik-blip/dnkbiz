import { notFound } from 'next/navigation';

import CourseProductPage from '@/components/course-product-page';
import { getCourseProductPageData } from '@/lib/course-product';
import { getCatalogProfileSlugs } from '@/lib/lms-catalog';

export function generateStaticParams() {
  return getCatalogProfileSlugs().map((slug) => ({
    slug,
  }));
}

export default async function CatalogCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pageData = await getCourseProductPageData(slug);

  if (!pageData) {
    notFound();
  }

  return <CourseProductPage {...pageData} />;
}
