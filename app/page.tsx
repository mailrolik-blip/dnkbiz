import Link from 'next/link';

import prisma from '@/lib/prisma';

function formatMoney(value: number) {
  return `${value.toLocaleString('en-US')} RUB`;
}

export default async function Home() {
  const course = await prisma.course.findFirst({
    where: {
      isPublished: true,
    },
    select: {
      title: true,
      slug: true,
      description: true,
      lessons: {
        where: {
          isPublished: true,
        },
        select: {
          id: true,
        },
      },
      tariffs: {
        where: {
          isActive: true,
        },
        orderBy: {
          price: 'asc',
        },
        select: {
          title: true,
          price: true,
          interval: true,
        },
      },
    },
  });

  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Course access MVP</span>
          <h1>Sell one course, protect access, and track lesson progress.</h1>
          <p className="hero-text">
            This baseline includes email auth, tariff orders, manual payment confirmation,
            enrollments, a protected course page, and per-lesson progress storage.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="primary-button">
              Create account
            </Link>
            <Link href="/login" className="secondary-button">
              Sign in
            </Link>
          </div>
        </div>

        <article className="feature-card">
          <span className="eyebrow">Published offer</span>
          {course ? (
            <>
              <h2>{course.title}</h2>
              <p>{course.description || 'A published course is available in the seed data.'}</p>
              <dl className="stat-list">
                <div>
                  <dt>Lessons</dt>
                  <dd>{course.lessons.length}</dd>
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd>{course.slug}</dd>
                </div>
                <div>
                  <dt>Tariff</dt>
                  <dd>
                    {course.tariffs[0]
                      ? `${course.tariffs[0].title} / ${formatMoney(course.tariffs[0].price)}`
                      : 'No active tariff'}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <h2>No published course yet</h2>
              <p>Run the seed to create the initial course, lessons, and tariff.</p>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
