'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import type { CatalogCourseCard } from '@/lib/lms-catalog';

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

function formatMoney(value: number | null) {
  if (value === null) {
    return 'Бесплатно';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

function isStartedPreview(course: CatalogCourseCard) {
  return course.status === 'paid' && !course.isOwned;
}

function getStatusBadge(course: CatalogCourseCard) {
  if (course.status === 'free') {
    return <span className="badge badge-complete">Бесплатный курс</span>;
  }

  if (course.pendingOrder) {
    return <span className="badge badge-pending">Ожидает оплаты</span>;
  }

  if (course.isOwned) {
    return <span className="badge badge-paid">Курс куплен</span>;
  }

  return <span className="badge badge-paid">Платный курс</span>;
}

function CourseMeta({ course }: { course: CatalogCourseCard }) {
  return (
    <div className="badge-row">
      <span className="badge badge-complete">{course.category}</span>
      {getStatusBadge(course)}
      {course.lessonsCount ? (
        <span className="badge badge-pending">{course.lessonsCount} уроков</span>
      ) : null}
      {course.previewEnabled ? (
        <span className="badge badge-pending">
          {course.previewLessonsCount} preview-урока
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
        throw new Error(payload?.error || 'Не удалось создать заказ.');
      }
    } catch (orderError) {
      setFeedback({
        tone: 'error',
        message:
          orderError instanceof Error
            ? orderError.message
            : 'Не удалось создать заказ.',
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
        {buyingTariffId === course.tariffId ? 'Создаем заказ...' : 'Купить курс'}
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
                Один кабинет для бесплатных курсов, preview платных программ и
                полного доступа после оплаты.
              </p>
            </div>
            <div className="badge-row" style={{ marginTop: 0 }}>
              <span className="badge badge-paid">{myCourses.length} моих курсов</span>
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
            <span className="eyebrow">Продолжить оплату</span>
            <h2 style={{ marginTop: '0.9rem' }}>Ожидающие заказы</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Заказ уже создан. Откройте checkout и завершите оплату, чтобы получить
              полный доступ ко всем урокам курса.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {pendingCourses.map((course) => (
                <article key={course.slug} className="course-card">
                  <CourseMeta course={course} />
                  <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                  <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                    {course.description}
                  </p>
                  <div className="badge-row">
                    <span className="badge badge-pending">{formatMoney(course.price)}</span>
                    {course.pendingOrder ? (
                      <span className="badge badge-pending">
                        Заказ #{course.pendingOrder.id}
                      </span>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <Link className="primary-button" href={course.pendingOrder!.checkoutUrl}>
                      Продолжить оплату
                    </Link>
                    <Link className="secondary-button" href={`/courses/${course.slug}`}>
                      {course.isStarted ? 'Вернуться к preview' : 'Открыть preview'}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <span className="eyebrow">Мои курсы</span>
          <h2 style={{ marginTop: '0.9rem' }}>То, что уже открыто</h2>
          <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
            Здесь собраны купленные программы, начатые бесплатные курсы и платные
            курсы, в которых вы уже начали preview.
          </p>

          <div className="course-grid" style={{ marginTop: '1rem' }}>
            {myCourses.length === 0 ? (
              <EmptyCard>
                Пока здесь пусто. Начните с бесплатного курса ниже или откройте
                preview платной программы.
              </EmptyCard>
            ) : (
              myCourses.map((course) => (
                <article key={course.slug} className="course-card">
                  <CourseMeta course={course} />
                  <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                  <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                    {course.description}
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
                      : 'Все доступные уроки пройдены, можно вернуться к материалам в любой момент.'}
                  </p>
                  <div className="badge-row">
                    <span className="badge badge-paid">
                      {course.completedLessonsCount}/{course.lessonsCount ?? 0} завершено
                    </span>
                    {isStartedPreview(course) ? (
                      <span className="badge badge-pending">Доступно как preview</span>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    <Link className="primary-button" href={`/courses/${course.slug}`}>
                      {isStartedPreview(course) ? 'Продолжить preview' : 'Продолжить обучение'}
                    </Link>
                    {isStartedPreview(course) ? renderBuyAction(course, 'secondary-button') : null}
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
              Доступ открывается сразу после регистрации. Без оплаты и ожидания.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {freeCourses.length === 0 ? (
                <EmptyCard>
                  Все бесплатные курсы уже начаты. Возвращайтесь в блок «Мои курсы».
                </EmptyCard>
              ) : (
                freeCourses.map((course) => (
                  <article key={course.slug} className="course-card">
                    <CourseMeta course={course} />
                    <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                    <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                      {course.description}
                    </p>
                    <div className="badge-row">
                      <span className="badge badge-complete">Бесплатно</span>
                      {course.lessonsCount ? (
                        <span className="badge badge-pending">{course.lessonsCount} уроков</span>
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
            <h2 style={{ marginTop: '0.9rem' }}>Можно купить самостоятельно</h2>
            <p className="panel-copy" style={{ marginTop: '0.75rem' }}>
              Платный курс можно открыть через checkout. До покупки доступны preview-уроки.
            </p>

            <div className="course-grid" style={{ marginTop: '1rem' }}>
              {paidCourses.length === 0 ? (
                <EmptyCard>
                  Все активные платные курсы уже куплены, начаты в preview или находятся
                  в ожидающей оплате.
                </EmptyCard>
              ) : (
                paidCourses.map((course) => (
                  <article key={course.slug} className="course-card">
                    <CourseMeta course={course} />
                    <h2 style={{ marginTop: '0.8rem' }}>{course.title}</h2>
                    <p className="muted-text" style={{ marginTop: '0.65rem' }}>
                      {course.description}
                    </p>
                    <div className="badge-row">
                      <span className="badge badge-paid">{formatMoney(course.price)}</span>
                      {course.previewEnabled ? (
                        <span className="badge badge-pending">
                          {course.previewLessonsCount} урока можно открыть до покупки
                        </span>
                      ) : null}
                    </div>
                    <div className="row-actions">
                      {renderBuyAction(course)}
                      {course.previewEnabled ? (
                        <Link className="secondary-button" href={`/courses/${course.slug}`}>
                          Открыть preview
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
