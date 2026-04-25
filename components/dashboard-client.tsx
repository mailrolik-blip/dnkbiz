'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import type { CatalogCourseCard } from '@/lib/lms-catalog';
import {
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseNextStep,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  isStartedPreviewCourse,
} from '@/lib/purchase-ux';

type DashboardUser = {
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
};

type DashboardClientProps = {
  user: DashboardUser;
  myCourses: CatalogCourseCard[];
  freeCourses: CatalogCourseCard[];
  paidCourses: CatalogCourseCard[];
  pendingCourses: CatalogCourseCard[];
};

function CourseMeta({ course }: { course: CatalogCourseCard }) {
  return (
    <div className="badge-row">
      <span className="badge badge-complete">{course.category}</span>
      <span className={getCatalogCourseStatusClass(course)}>
        {getCatalogCourseStatusLabel(course)}
      </span>
      {course.lessonsCount ? (
        <span className="badge badge-pending">
          {formatLessonCount(course.lessonsCount)}
        </span>
      ) : null}
      {course.previewEnabled ? (
        <span className="badge badge-pending">
          {formatPreviewLessons(course.previewLessonsCount)}
        </span>
      ) : null}
    </div>
  );
}

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <div className="empty-card">
      <p className="muted-text">{children}</p>
    </div>
  );
}

export default function DashboardClient({
  user,
  myCourses,
  freeCourses,
  paidCourses,
  pendingCourses,
}: DashboardClientProps) {
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success';
    message: string;
  } | null>(null);

  async function handleLogout() {
    setFeedback(null);
    setLogoutPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || 'Не удалось завершить сессию.');
      }

      router.push('/login');
      router.refresh();
    } catch (logoutError) {
      setFeedback({
        tone: 'error',
        message:
          logoutError instanceof Error
            ? logoutError.message
            : 'Не удалось завершить сессию.',
      });
    } finally {
      setLogoutPending(false);
    }
  }

  async function handleCreateOrder(course: CatalogCourseCard) {
    if (!course.tariffId) {
      return;
    }

    setFeedback(null);
    setBuyingTariffId(course.tariffId);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tariffId: course.tariffId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            checkoutUrl?: string;
          }
        | null;

      if (payload?.checkoutUrl) {
        router.push(payload.checkoutUrl);
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось открыть оплату.');
      }
    } catch (orderError) {
      setFeedback({
        tone: 'error',
        message:
          orderError instanceof Error
            ? orderError.message
            : 'Не удалось открыть оплату.',
      });
    } finally {
      setBuyingTariffId(null);
    }
  }

  function renderBuyAction(course: CatalogCourseCard, className = 'primary-button') {
    if (course.pendingOrder) {
      return (
        <Link className={className} href={course.pendingOrder.checkoutUrl}>
          Продолжить оплату
        </Link>
      );
    }

    return (
      <button
        className={className}
        disabled={buyingTariffId === course.tariffId}
        onClick={() => handleCreateOrder(course)}
        type="button"
      >
        {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Купить курс'}
      </button>
    );
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button
            className="ghost-button"
            disabled={logoutPending}
            onClick={handleLogout}
            type="button"
          >
            {logoutPending ? 'Выходим...' : 'Выйти'}
          </button>
        </div>
      </div>

      <section className="stack-grid">
        <article className="panel">
          <span className="eyebrow">Личный кабинет</span>
          <div className="panel-head" style={{ marginTop: '0.9rem' }}>
            <div>
              <h1>{user.name || user.email}</h1>
              <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
                Здесь собраны все ваши курсы: бесплатные программы, купленные курсы и покупки,
                которые еще ждут завершения оплаты.
              </p>
            </div>
            <div className="badge-row" style={{ marginTop: 0 }}>
              <span className="badge badge-paid">{myCourses.length} в моих курсах</span>
              <span className="badge badge-complete">
                {freeCourses.length + myCourses.filter((course) => course.status === 'free').length}{' '}
                бесплатных
              </span>
              <span className="badge badge-pending">
                {paidCourses.length + pendingCourses.length} платных
              </span>
            </div>
          </div>

          {feedback ? (
            <p
              className={`feedback ${
                feedback.tone === 'success' ? 'feedback-success' : 'feedback-error'
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </article>

        {pendingCourses.length > 0 ? (
          <section className="panel">
            <span className="eyebrow">Pending payment</span>
            <h2 style={{ marginTop: '0.9rem' }}>Продолжить оплату</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Покупка уже начата. Вернитесь на экран оплаты, чтобы открыть полный доступ к курсу.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {pendingCourses.map((course) => (
                <article key={course.slug} className="course-card">
                  <CourseMeta course={course} />
                  <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                  <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                    {getCatalogCourseNextStep(course, true)}
                  </p>
                  <div className="badge-row">
                    <span className="badge badge-paid">{formatCoursePrice(course.price)}</span>
                    {course.pendingOrder ? (
                      <span className="badge badge-pending">Заказ #{course.pendingOrder.id}</span>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <Link className="primary-button" href={course.pendingOrder!.checkoutUrl}>
                      Продолжить оплату
                    </Link>
                    <Link className="secondary-button" href={`/courses/${course.slug}`}>
                      {course.isStarted ? 'Вернуться к курсу' : 'Открыть курс'}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <span className="eyebrow">Мои курсы</span>
          <h2 style={{ marginTop: '0.9rem' }}>Курсы с доступом и начатым обучением</h2>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            Здесь находятся купленные курсы, бесплатные курсы, которые вы уже начали, и платные
            курсы с уже открытыми первыми уроками.
          </p>

          <div className="course-grid" style={{ marginTop: '1rem' }}>
            {myCourses.length === 0 ? (
              <EmptyCard>
                Пока здесь пусто. Начните с бесплатного курса или откройте первые уроки любого
                платного курса ниже.
              </EmptyCard>
            ) : (
              myCourses.map((course) => (
                <article key={course.slug} className="course-card">
                  <CourseMeta course={course} />
                  <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                  <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                    {getCatalogCourseNextStep(course, true)}
                  </p>
                  <div
                    className="progress-box"
                    style={{ marginTop: '1rem', paddingBottom: 0, borderBottom: 'none' }}
                  >
                    <div className="progress-info" style={{ marginBottom: '0.55rem' }}>
                      <span>Прогресс по курсу</span>
                      <span>{course.progressPercent}%</span>
                    </div>
                    <div className="progress-line">
                      <div
                        className="progress-fill"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="muted-text" style={{ marginTop: '0.9rem' }}>
                    {course.nextLessonTitle
                      ? `Следующий урок: ${course.nextLessonTitle}.`
                      : 'Все доступные уроки уже завершены. Можно вернуться к материалам в любой момент.'}
                  </p>
                  <div className="badge-row">
                    <span className="badge badge-paid">
                      {course.completedLessonsCount}/{course.lessonsCount ?? 0} завершено
                    </span>
                    {isStartedPreviewCourse(course) ? (
                      <span className="badge badge-pending">Открыты первые уроки</span>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <Link className="primary-button" href={`/courses/${course.slug}`}>
                      {course.isOwned ? 'Продолжить обучение' : 'Открыть курс'}
                    </Link>
                    {isStartedPreviewCourse(course) ? renderBuyAction(course, 'secondary-button') : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="grid-two">
          <section className="panel">
            <span className="eyebrow">Бесплатные курсы</span>
            <h2 style={{ marginTop: '0.9rem' }}>Можно начать сразу</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Доступ открывается сразу после входа. Никакой оплаты и ожидания.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {freeCourses.length === 0 ? (
                <EmptyCard>
                  Все бесплатные курсы уже начаты. Продолжить их можно в блоке «Мои курсы».
                </EmptyCard>
              ) : (
                freeCourses.map((course) => (
                  <article key={course.slug} className="course-card">
                    <CourseMeta course={course} />
                    <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                    <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                      {getCatalogCourseNextStep(course, true)}
                    </p>
                    <div className="badge-row">
                      <span className="badge badge-complete">Бесплатно</span>
                      {course.lessonsCount ? (
                        <span className="badge badge-pending">
                          {formatLessonCount(course.lessonsCount)}
                        </span>
                      ) : null}
                    </div>
                    <div className="row-actions">
                      <Link className="primary-button" href={`/courses/${course.slug}`}>
                        Начать бесплатно
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Платные курсы</span>
            <h2 style={{ marginTop: '0.9rem' }}>Можно начать с первых уроков</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              У платных курсов можно открыть первые уроки, а затем оформить полный доступ через
              экран покупки.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {paidCourses.length === 0 ? (
                <EmptyCard>
                  Все активные платные курсы уже куплены, начаты с первых уроков или находятся в
                  ожидании оплаты.
                </EmptyCard>
              ) : (
                paidCourses.map((course) => (
                  <article key={course.slug} className="course-card">
                    <CourseMeta course={course} />
                    <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                    <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                      {getCatalogCourseNextStep(course, true)}
                    </p>
                    <div className="badge-row">
                      <span className="badge badge-paid">{formatCoursePrice(course.price)}</span>
                      {course.previewEnabled ? (
                        <span className="badge badge-pending">
                          {formatPreviewLessons(course.previewLessonsCount)}
                        </span>
                      ) : null}
                    </div>
                    <div className="row-actions">
                      {renderBuyAction(course)}
                      {course.previewEnabled ? (
                        <Link className="secondary-button" href={`/courses/${course.slug}`}>
                          Открыть первые уроки
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
