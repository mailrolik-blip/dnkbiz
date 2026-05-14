'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import {
  getCourseCatalogHref,
  type CatalogCourseCard,
} from '@/lib/lms-catalog';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  canOpenCourseRoute,
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
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
type DashboardFocusTone = 'start' | 'pending' | 'progress' | 'owned';

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

type DashboardFocusProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone: DashboardFocusTone;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
};

function getDashboardCourseHint(course: CatalogCourseCard) {
  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Платеж на ручной проверке. Это может занять некоторое время.'
      : 'Оплатите по QR СБП и нажмите «Я оплатил».';
  }

  if (course.isOwned) {
    return 'Полный доступ уже открыт.';
  }

  if (course.status === 'free') {
    return course.isStarted
      ? 'Курс уже открыт и сохраняет прогресс.'
      : 'Доступен сразу после входа.';
  }

  if (isStartedPreviewCourse(course)) {
    return `Уже открыто: ${formatPreviewLessons(course.previewLessonsCount)}.`;
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `Можно посмотреть ${formatPreviewLessons(course.previewLessonsCount)} до покупки.`;
  }

  return 'Полный доступ откроется после оплаты по QR СБП и ручной проверки.';
}

function getDashboardCoursePrimaryLabel(course: CatalogCourseCard, mode: DashboardCardMode) {
  if (mode === 'free') {
    return course.isStarted || course.progressPercent > 0
      ? 'Продолжить обучение'
      : 'Начать бесплатно';
  }

  if (mode === 'my') {
    return course.isStarted || course.progressPercent > 0 || course.completedLessonsCount > 0
      ? 'Продолжить обучение'
      : 'Открыть курс';
  }

  return 'Открыть курс';
}

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

function DashboardFocus({
  eyebrow,
  title,
  description,
  tone,
  primaryAction,
  secondaryAction,
}: DashboardFocusProps) {
  return (
    <article className={`panel dashboard-focus dashboard-focus--${tone}`}>
      <div className="dashboard-focus__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p className="panel-copy">{description}</p>
      </div>

      <div className="dashboard-focus__actions">
        {primaryAction}
        {secondaryAction ?? null}
      </div>
    </article>
  );
}

function DashboardCourseCard({
  course,
  mode,
  renderBuyAction,
}: DashboardCourseCardProps) {
  const hintCopy = getDashboardCourseHint(course);
  const nextStepCopy =
    mode === 'my' && course.nextLessonTitle
      ? `Следующий урок: ${course.nextLessonTitle}.`
      : getCatalogCourseNextStep(course, true);
  const courseHref = canOpenCourseRoute(course)
    ? `/courses/${course.slug}`
    : getCourseCatalogHref(course.slug);

  function renderPrimaryAction() {
    if (mode === 'free') {
      return (
        <Link className="primary-button" href={`/courses/${course.slug}`}>
          {getDashboardCoursePrimaryLabel(course, mode)}
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
        {getDashboardCoursePrimaryLabel(course, mode)}
      </Link>
    );
  }

  function renderSecondaryAction() {
    if (mode === 'my' && isStartedPreviewCourse(course)) {
      return renderBuyAction(course, 'secondary-button');
    }

    if (mode === 'paid' && course.previewEnabled) {
      return (
        <Link className="secondary-button" href={courseHref}>
          Открыть ознакомительные уроки
        </Link>
      );
    }

    if (mode === 'pending') {
      return (
        <Link className="secondary-button" href={courseHref}>
          {canOpenCourseRoute(course)
            ? course.isStarted
              ? 'Вернуться к курсу'
              : 'Открыть курс'
            : 'Открыть страницу курса'}
        </Link>
      );
    }

    return null;
  }

  return (
    <article className={`course-card dashboard-card ${getCatalogCourseToneClass(course)}`}>
      <div className="dashboard-card__head">
        <CourseMeta course={course} />
        <span className="dashboard-card__hint">{hintCopy}</span>
      </div>

      <div className="dashboard-card__body">
        <h3>
          <Link href={courseHref}>{course.title}</Link>
        </h3>
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
              ? 'Платеж отправлен на ручную проверку. Это может занять некоторое время. Если статус долго не меняется, напишите нам через контакты.'
              : 'Оплатите курс по QR СБП и нажмите «Я оплатил», чтобы отправить платеж на ручную проверку.'}
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
  const pendingPriorityCourse = pendingCourses[0] ?? null;
  const activeFreeCourse =
    myCourses.find((course) => course.status === 'free') ?? null;
  const activePreviewCourse =
    myCourses.find((course) => isStartedPreviewCourse(course)) ?? null;
  const activeOwnedCourse =
    myCourses.find((course) => course.isOwned) ?? null;
  const freeStarterCourse =
    freeCourses[0] ??
    myCourses.find((course) => course.status === 'free') ??
    null;
  const previewStarterCourse =
    paidCourses.find((course) => course.previewEnabled && course.previewLessonsCount > 0) ??
    myCourses.find((course) => isStartedPreviewCourse(course)) ??
    null;
  const isNewUser = myCourses.length === 0 && pendingCourses.length === 0;

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

  let dashboardFocus: DashboardFocusProps | null = null;

  if (pendingPriorityCourse?.pendingOrder) {
    dashboardFocus = {
      eyebrow: 'Следующий шаг',
      title: `Продолжите оплату курса «${pendingPriorityCourse.title}».`,
      description:
        pendingPriorityCourse.pendingOrder.status === 'PROCESSING'
          ? 'Платеж уже отправлен на ручную проверку. Повторно оплачивать заказ не нужно. Проверка может занять некоторое время; если статус долго не меняется, напишите нам через контакты.'
          : 'Откройте экран оплаты, оплатите курс по QR СБП и нажмите «Я оплатил». После этого заказ уйдет на ручную проверку.',
      tone: 'pending',
      primaryAction: (
        <Link className="primary-button" href={pendingPriorityCourse.pendingOrder.checkoutUrl}>
          {getActiveOrderActionLabel(pendingPriorityCourse.pendingOrder.status)}
        </Link>
      ),
      secondaryAction: (
        <Link
          className="secondary-button"
          href={
            canOpenCourseRoute(pendingPriorityCourse)
              ? `/courses/${pendingPriorityCourse.slug}`
              : getCourseCatalogHref(pendingPriorityCourse.slug)
          }
        >
          {canOpenCourseRoute(pendingPriorityCourse)
            ? 'Открыть курс'
            : 'Открыть страницу курса'}
        </Link>
      ),
    };
  } else if (isNewUser && freeStarterCourse) {
    dashboardFocus = {
      eyebrow: 'Старт в обучении',
      title: 'Начните с бесплатного курса, а затем откройте ознакомительные уроки платного.',
      description:
        'Самый быстрый вход в платформу — начать бесплатный курс без оплаты. Вторым шагом можно посмотреть первые уроки платного курса и решить, нужен ли полный доступ.',
      tone: 'start',
      primaryAction: (
        <Link className="primary-button" href={`/courses/${freeStarterCourse.slug}`}>
          Начать бесплатный курс
        </Link>
      ),
      secondaryAction: previewStarterCourse ? (
        <Link className="secondary-button" href={`/courses/${previewStarterCourse.slug}`}>
          Открыть ознакомительные уроки
        </Link>
      ) : undefined,
    };
  } else if (activePreviewCourse) {
    dashboardFocus = {
      eyebrow: 'Ознакомительный доступ уже открыт',
      title: `У вас уже открыты первые уроки курса «${activePreviewCourse.title}».`,
      description:
        'Продолжайте ознакомительный доступ с того места, где остановились, или завершите покупку, чтобы открыть курс полностью внутри кабинета.',
      tone: 'progress',
      primaryAction: (
        <Link className="primary-button" href={`/courses/${activePreviewCourse.slug}`}>
          Продолжить обучение
        </Link>
      ),
      secondaryAction: renderBuyAction(activePreviewCourse, 'secondary-button'),
    };
  } else if (activeFreeCourse) {
    dashboardFocus = {
      eyebrow: 'Бесплатный курс уже начат',
      title: `Продолжайте курс «${activeFreeCourse.title}».`,
      description:
        'Прогресс уже сохраняется в кабинете. Когда будете готовы к следующему шагу, откройте платный курс с ознакомительными уроками.',
      tone: 'progress',
      primaryAction: (
        <Link className="primary-button" href={`/courses/${activeFreeCourse.slug}`}>
          Продолжить обучение
        </Link>
      ),
      secondaryAction:
        previewStarterCourse && previewStarterCourse.slug !== activeFreeCourse.slug ? (
          <Link className="secondary-button" href={`/courses/${previewStarterCourse.slug}`}>
            Открыть ознакомительные уроки
          </Link>
        ) : undefined,
    };
  } else if (activeOwnedCourse) {
    dashboardFocus = {
      eyebrow: 'Полный доступ открыт',
      title: `Курс «${activeOwnedCourse.title}» уже доступен полностью.`,
      description:
        'Возвращайтесь к обучению с сохраненного места. Купленный курс остается в кабинете и всегда доступен для продолжения.',
      tone: 'owned',
      primaryAction: (
        <Link className="primary-button" href={`/courses/${activeOwnedCourse.slug}`}>
          {getDashboardCoursePrimaryLabel(activeOwnedCourse, 'my')}
        </Link>
      ),
    };
  }

  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/catalog" className="ghost-button">
            Каталог
          </Link>
          <Link href="/profile" className="ghost-button">
            Профиль
          </Link>
          <Link href="/help" className="ghost-button">
            Помощь
          </Link>
          {user.role === 'ADMIN' ? (
            <Link href="/admin" className="ghost-button">
              Админ
            </Link>
          ) : null}
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
              следующий шаг по каждому курсу.
            </p>
            <div className="row-actions">
              <Link href="/catalog" className="secondary-button">
                Перейти в каталог
              </Link>
              <Link href="/help" className="ghost-button">
                Как это работает
              </Link>
            </div>
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

        {dashboardFocus ? (
          <DashboardFocus
            description={dashboardFocus.description}
            eyebrow={dashboardFocus.eyebrow}
            primaryAction={dashboardFocus.primaryAction}
            secondaryAction={dashboardFocus.secondaryAction}
            title={dashboardFocus.title}
            tone={dashboardFocus.tone}
          />
        ) : null}

        {pendingCourses.length > 0 ? (
          <section className="panel dashboard-section">
            <SectionIntro
              eyebrow="Продолжить оплату"
              title="Покупки, которые ждут завершения"
              description="Здесь лежат заказы, которые еще не оплачены по QR СБП или уже отправлены на ручную проверку. Если проверка затянулась, подготовьте номер заказа и напишите нам через контакты."
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
            description={
              isNewUser
                ? 'После первого старта бесплатного курса или ознакомительных уроков платного он сразу появится здесь вместе с прогрессом.'
                : 'Здесь лежат купленные курсы, бесплатные курсы с сохраненным прогрессом и платные программы, в которых уже открыты первые уроки.'
            }
          />

          <div className="course-grid dashboard-grid">
            {myCourses.length === 0 ? (
              <EmptyCard>
                Пока здесь нет начатых курсов. После первого бесплатного урока или
                ознакомительного доступа этот блок превратится в ваш основной хаб обучения.
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
            description="У платных курсов доступны ознакомительные уроки. Полный доступ открывается после оплаты по QR СБП и ручной проверки."
          />

          <div className="course-grid dashboard-grid">
            {paidCourses.length === 0 ? (
              <EmptyCard>
                Все активные платные курсы уже куплены, начаты с ознакомительного доступа
                или ждут завершения оплаты.
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
      </section>
    </main>
  );
}
