'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import type { CatalogCourseCard } from '@/lib/lms-catalog';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseActionHint,
  getCatalogCourseNextStep,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  getCatalogCourseToneClass,
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

type DashboardCardMode = 'my' | 'free' | 'paid' | 'pending';

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

type EmptyCardProps = {
  children: ReactNode;
};

type DashboardCourseCardProps = {
  course: CatalogCourseCard;
  mode: DashboardCardMode;
  renderBuyAction: (course: CatalogCourseCard, className?: string) => ReactNode;
};

function CourseMeta({ course }: { course: CatalogCourseCard }) {
  return (
    <div className="badge-row">
      <span className="badge badge-complete">{course.category}</span>
      <span className={getCatalogCourseStatusClass(course)}>
        {getCatalogCourseStatusLabel(course)}
      </span>
      {course.lessonsCount ? (
        <span className="badge badge-pending">{formatLessonCount(course.lessonsCount)}</span>
      ) : null}
      {course.previewEnabled ? (
        <span className="badge badge-pending">
          {formatPreviewLessons(course.previewLessonsCount)}
        </span>
      ) : null}
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: SectionIntroProps) {
  return (
    <div className="dashboard-section__head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <p className="panel-copy">{description}</p>
    </div>
  );
}

function EmptyCard({ children }: EmptyCardProps) {
  return (
    <div className="empty-card dashboard-empty-card">
      <p className="muted-text">{children}</p>
    </div>
  );
}

function DashboardCourseCard({
  course,
  mode,
  renderBuyAction,
}: DashboardCourseCardProps) {
  const actionHint = getCatalogCourseActionHint(course, true);
  const nextStepCopy =
    mode === 'my' && course.nextLessonTitle
      ? `Следующий урок: ${course.nextLessonTitle}.`
      : getCatalogCourseNextStep(course, true);

  function renderPrimaryAction() {
    if (mode === 'free') {
      return (
        <Link className="primary-button" href={`/courses/${course.slug}`}>
          {course.isStarted ? 'Открыть курс' : 'Начать бесплатно'}
        </Link>
      );
    }

    if (mode === 'pending') {
      return (
        <Link className="primary-button" href={course.pendingOrder!.checkoutUrl}>
          {getActiveOrderActionLabel(course.pendingOrder!.status)}
        </Link>
      );
    }

    if (mode === 'paid') {
      return renderBuyAction(course);
    }

    return (
      <Link className="primary-button" href={`/courses/${course.slug}`}>
        {course.isOwned ? 'Продолжить обучение' : 'Открыть курс'}
      </Link>
    );
  }

  function renderSecondaryAction() {
    if (mode === 'my' && isStartedPreviewCourse(course)) {
      return renderBuyAction(course, 'secondary-button');
    }

    if (mode === 'paid' && course.previewEnabled) {
      return (
        <Link className="secondary-button" href={`/courses/${course.slug}`}>
          {course.isStarted ? 'Продолжить preview' : 'Открыть первые уроки'}
        </Link>
      );
    }

    if (mode === 'pending') {
      return (
        <Link className="secondary-button" href={`/courses/${course.slug}`}>
          {course.isStarted ? 'Вернуться к курсу' : 'Открыть курс'}
        </Link>
      );
    }

    return null;
  }

  return (
    <article className={`course-card dashboard-card ${getCatalogCourseToneClass(course)}`}>
      <div className="dashboard-card__head">
        <CourseMeta course={course} />
        <span className="dashboard-card__hint">{actionHint}</span>
      </div>

      <div className="dashboard-card__body">
        <h3>{course.title}</h3>
        <p className="dashboard-card__description">{course.description}</p>
      </div>

      {mode === 'my' ? (
        <div className="dashboard-card__progress">
          <div className="progress-info">
            <span>Прогресс по курсу</span>
            <span>{course.progressPercent}%</span>
          </div>
          <div className="progress-line">
            <div className="progress-fill" style={{ width: `${course.progressPercent}%` }} />
          </div>
          <div className="badge-row">
            <span className="badge badge-paid">
              {course.completedLessonsCount}/{course.lessonsCount ?? 0} завершено
            </span>
            {isStartedPreviewCourse(course) ? (
              <span className="badge badge-pending">Открыты первые уроки</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === 'pending' && course.pendingOrder ? (
        <div className="status-card dashboard-card__status">
          <strong>Заказ #{course.pendingOrder.id}</strong>
          <p>
            {course.pendingOrder.status === 'PROCESSING'
              ? 'Платеж уже запущен и сейчас находится в обработке.'
              : 'Оплата еще не завершена. Можно вернуться на экран покупки и продолжить ее.'}
          </p>
        </div>
      ) : null}

      <p className="dashboard-card__next">{nextStepCopy}</p>

      <div className="dashboard-card__footer">
        <div className="badge-row">
          {course.price !== null ? (
            <span className="badge badge-paid">{formatCoursePrice(course.price)}</span>
          ) : null}
          {mode === 'free' ? <span className="badge badge-complete">Без оплаты</span> : null}
        </div>
        <div className="row-actions dashboard-card__actions">
          {renderPrimaryAction()}
          {renderSecondaryAction()}
        </div>
      </div>
    </article>
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

  const stats = {
    my: myCourses.length,
    free: freeCourses.length + myCourses.filter((course) => course.status === 'free').length,
    paid:
      paidCourses.length +
      pendingCourses.length +
      myCourses.filter((course) => course.status === 'paid').length,
    pending: pendingCourses.length,
  };

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
          {getActiveOrderActionLabel(course.pendingOrder.status)}
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
        <article className="panel dashboard-hero">
          <div className="dashboard-hero__copy">
            <span className="eyebrow">Личный кабинет</span>
            <h1>{user.name || user.email}</h1>
            <p className="panel-copy">
              Здесь собраны ваши доступные курсы, бесплатные старты, покупки в процессе и
              следующий шаг по каждому маршруту внутри LMS.
            </p>
          </div>

          <div className="dashboard-hero__stats">
            <div className="dashboard-stat">
              <span>Мои курсы</span>
              <strong>{stats.my}</strong>
            </div>
            <div className="dashboard-stat">
              <span>Бесплатные</span>
              <strong>{stats.free}</strong>
            </div>
            <div className="dashboard-stat">
              <span>Платные</span>
              <strong>{stats.paid}</strong>
            </div>
            <div className="dashboard-stat">
              <span>Оплата</span>
              <strong>{stats.pending}</strong>
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
          <section className="panel dashboard-section">
            <SectionIntro
              eyebrow="Продолжить оплату"
              title="Покупки, которые ждут завершения"
              description="Если оплата уже начата, вернитесь на экран покупки, чтобы завершить ее или проверить текущий статус заказа."
            />

            <div className="course-grid dashboard-grid">
              {pendingCourses.map((course) => (
                <DashboardCourseCard
                  key={course.slug}
                  course={course}
                  mode="pending"
                  renderBuyAction={renderBuyAction}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel dashboard-section">
          <SectionIntro
            eyebrow="Мои курсы"
            title="Все, что уже начато или доступно полностью"
            description="Здесь лежат купленные курсы, бесплатные курсы с сохраненным прогрессом и платные программы, в которых уже открыты первые уроки."
          />

          <div className="course-grid dashboard-grid">
            {myCourses.length === 0 ? (
              <EmptyCard>
                Пока здесь пусто. Начните с бесплатного курса или откройте первые уроки любого
                платного курса ниже.
              </EmptyCard>
            ) : (
              myCourses.map((course) => (
                <DashboardCourseCard
                  key={course.slug}
                  course={course}
                  mode="my"
                  renderBuyAction={renderBuyAction}
                />
              ))
            )}
          </div>
        </section>

        <div className="grid-two dashboard-split">
          <section className="panel dashboard-section">
            <SectionIntro
              eyebrow="Бесплатные курсы"
              title="Можно начать сразу"
              description="Доступ к этим курсам открывается после входа без оплаты и без ожидания подтверждения."
            />

            <div className="course-grid dashboard-grid">
              {freeCourses.length === 0 ? (
                <EmptyCard>
                  Все бесплатные курсы уже начаты. Продолжить их можно в блоке «Мои курсы».
                </EmptyCard>
              ) : (
                freeCourses.map((course) => (
                  <DashboardCourseCard
                    key={course.slug}
                    course={course}
                    mode="free"
                    renderBuyAction={renderBuyAction}
                  />
                ))
              )}
            </div>
          </section>

          <section className="panel dashboard-section">
            <SectionIntro
              eyebrow="Платные курсы"
              title="Можно начать с первых уроков"
              description="У платных курсов доступны ознакомительные уроки. Полный доступ открывается после покупки и сразу появляется в кабинете."
            />

            <div className="course-grid dashboard-grid">
              {paidCourses.length === 0 ? (
                <EmptyCard>
                  Все активные платные курсы уже куплены, начаты с preview или ждут завершения
                  оплаты.
                </EmptyCard>
              ) : (
                paidCourses.map((course) => (
                  <DashboardCourseCard
                    key={course.slug}
                    course={course}
                    mode="paid"
                    renderBuyAction={renderBuyAction}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
