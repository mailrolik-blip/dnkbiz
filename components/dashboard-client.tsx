'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import InlineInfo from '@/components/inline-info';
import LearnerActivity from '@/components/learner-activity';
import type { LearnerActivitySnapshot } from '@/lib/learner-activity';
import { getCourseCatalogHref, type CatalogCourseCard } from '@/lib/lms-catalog';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  canOpenCourseRoute,
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
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
  activity: LearnerActivitySnapshot;
  freeCourses: CatalogCourseCard[];
  myCourses: CatalogCourseCard[];
  paidCourses: CatalogCourseCard[];
  pendingCourses: CatalogCourseCard[];
  user: DashboardUser;
};

type DashboardCardMode = 'free' | 'my' | 'paid' | 'pending';

type SectionIntroProps = {
  description: string;
  eyebrow: string;
  title: string;
};

type EmptyCardProps = {
  children: ReactNode;
};

type DashboardCourseCardProps = {
  course: CatalogCourseCard;
  mode: DashboardCardMode;
  renderBuyAction: (course: CatalogCourseCard, className?: string) => ReactNode;
};

type DashboardFeedback = {
  message: string;
  tone: 'error' | 'success';
} | null;

type DashboardProfileCardProps = {
  feedback: DashboardFeedback;
  user: DashboardUser;
};

type DashboardQuickActionsProps = {
  note: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  tertiaryAction?: ReactNode;
  title: string;
};

type DashboardPriorityCardProps = {
  actions: ReactNode;
  badges?: ReactNode;
  eyebrow: string;
  note: string;
  title: string;
};

function getDashboardCourseHint(course: CatalogCourseCard) {
  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Платеж на ручной проверке. Это может занять немного времени.'
      : 'Заказ уже создан. Откройте экран оплаты, чтобы завершить покупку.';
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

  return 'Полный доступ откроется после подтверждения оплаты.';
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

function getDashboardCourseMetaBadges(course: CatalogCourseCard, mode: DashboardCardMode) {
  const badges: ReactNode[] = [
    <span className="badge badge-complete" key="category">
      {course.category}
    </span>,
    <span className={getCatalogCourseStatusClass(course)} key="status">
      {getCatalogCourseStatusLabel(course)}
    </span>,
  ];

  if (mode !== 'my' && course.lessonsCount) {
    badges.push(
      <span className="badge badge-pending" key="lessons">
        {formatLessonCount(course.lessonsCount)}
      </span>
    );
  }

  if (mode === 'paid' && course.previewEnabled) {
    badges.push(
      <span className="badge badge-pending" key="preview">
        {formatPreviewLessons(course.previewLessonsCount)}
      </span>
    );
  }

  return badges;
}

function getDashboardCourseSupportCopy(course: CatalogCourseCard, mode: DashboardCardMode) {
  if (mode === 'pending') {
    return null;
  }

  if (mode === 'free') {
    return course.isStarted
      ? 'Курс уже открыт в кабинете.'
      : 'Можно начать сразу без оплаты.';
  }

  if (mode === 'paid') {
    return course.previewEnabled && course.previewLessonsCount > 0
      ? `Открыто ${formatPreviewLessons(course.previewLessonsCount)} до покупки.`
      : 'Полный доступ откроется после подтверждения оплаты.';
  }

  if (course.isOwned) {
    return 'Полный доступ открыт.';
  }

  if (isStartedPreviewCourse(course)) {
    return 'Открыты первые уроки.';
  }

  return 'Прогресс сохраняется в кабинете.';
}

function getDashboardCourseNextCopy(course: CatalogCourseCard) {
  if (course.lessonsCount && course.completedLessonsCount >= course.lessonsCount) {
    return 'Курс завершен. Можно вернуться к пройденным урокам.';
  }

  if (course.nextLessonTitle) {
    return `Следующий урок: ${course.nextLessonTitle}.`;
  }

  return null;
}

function CourseMeta({
  course,
  mode,
}: {
  course: CatalogCourseCard;
  mode: DashboardCardMode;
}) {
  return (
    <div className="badge-row">
      {getDashboardCourseMetaBadges(course, mode)}
    </div>
  );
}

function SectionIntro({ description, eyebrow, title }: SectionIntroProps) {
  return (
    <div className="dashboard-section__head">
      <div className="dashboard-section__title-row">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>

        <InlineInfo align="end" label={`Пояснение: ${title}`}>
          {description}
        </InlineInfo>
      </div>
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

function getDashboardRoleLabel(role: DashboardUser['role']) {
  return role === 'ADMIN' ? 'Доступ администратора' : 'Ученик';
}

function getUserInitials(user: DashboardUser) {
  const source = user.name?.trim() || user.email.trim();
  const words = source
    .split(/[\s@._-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return 'ДН';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function DashboardProfileCard({ feedback, user }: DashboardProfileCardProps) {
  const displayName = user.name?.trim() || user.email;
  const showEmail = Boolean(user.name?.trim()) && user.email !== displayName;

  return (
    <article className="panel dashboard-profile">
      <div className="dashboard-profile__head">
        <div aria-hidden="true" className="dashboard-profile__avatar">
          {getUserInitials(user)}
        </div>

        <div className="dashboard-profile__identity">
          <div className="dashboard-profile__identity-top">
            <span className="badge dashboard-role-badge">{getDashboardRoleLabel(user.role)}</span>
          </div>
          <h2>{displayName}</h2>
          {showEmail ? <p className="dashboard-profile__email">{user.email}</p> : null}
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
  );
}

function DashboardQuickActions({
  note,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  title,
}: DashboardQuickActionsProps) {
  return (
    <article className="panel dashboard-quick-actions">
      <div className="dashboard-quick-actions__copy">
        <span className="eyebrow">Быстрые действия</span>
        <h2>{title}</h2>
        <p className="dashboard-quick-actions__note">{note}</p>
      </div>

      <div className="dashboard-quick-actions__actions">
        {primaryAction}
        {secondaryAction ?? null}
        {tertiaryAction ?? null}
      </div>
    </article>
  );
}

function DashboardPriorityCard({
  actions,
  badges,
  eyebrow,
  note,
  title,
}: DashboardPriorityCardProps) {
  return (
    <article className="panel dashboard-priority-card">
      <div className="dashboard-priority-card__head">
        <span className="eyebrow">{eyebrow}</span>
        {badges ? <div className="badge-row">{badges}</div> : null}
      </div>
      <div className="dashboard-priority-card__copy">
        <h2>{title}</h2>
        <p className="panel-copy">{note}</p>
      </div>
      <div className="dashboard-priority-card__actions">{actions}</div>
    </article>
  );
}

function DashboardCourseCard({
  course,
  mode,
  renderBuyAction,
}: DashboardCourseCardProps) {
  const hintCopy = getDashboardCourseSupportCopy(course, mode) ?? getDashboardCourseHint(course);
  const nextStepCopy = mode === 'my' ? getDashboardCourseNextCopy(course) : null;
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
          Смотреть бесплатные уроки
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
        <CourseMeta course={course} mode={mode} />
        {mode !== 'my' ? <span className="dashboard-card__hint">{hintCopy}</span> : null}
      </div>

      <div className="dashboard-card__body">
        <h3>
          <Link href={courseHref}>{course.title}</Link>
        </h3>
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
              ? 'Платеж отправлен на ручную проверку. Если статус долго не меняется, напишите нам через контакты.'
              : 'Вернитесь на экран оплаты, чтобы завершить покупку или открыть запасной способ оплаты.'}
          </p>
        </div>
      ) : null}

      {nextStepCopy ? <p className="dashboard-card__next">{nextStepCopy}</p> : null}

      <div className="dashboard-card__footer">
        {mode !== 'my' ? (
          <div className="badge-row">
            {course.price !== null ? (
              <span className="badge badge-paid">{formatCoursePrice(course.price)}</span>
            ) : null}
            {mode === 'free' ? <span className="badge badge-complete">Без оплаты</span> : null}
          </div>
        ) : null}

        <div className="row-actions dashboard-card__actions">
          {renderPrimaryAction()}
          {renderSecondaryAction()}
        </div>
      </div>
    </article>
  );
}

export default function DashboardClient({
  activity,
  freeCourses,
  myCourses,
  paidCourses,
  pendingCourses,
  user,
}: DashboardClientProps) {
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [feedback, setFeedback] = useState<DashboardFeedback>(null);
  const pendingPriorityCourse = pendingCourses[0] ?? null;
  const activeFreeCourse = myCourses.find((course) => course.status === 'free') ?? null;
  const activePreviewCourse =
    myCourses.find((course) => isStartedPreviewCourse(course)) ?? null;
  const activeOwnedCourse = myCourses.find((course) => course.isOwned) ?? null;
  const freeStarterCourse =
    freeCourses[0] ?? myCourses.find((course) => course.status === 'free') ?? null;
  const previewStarterCourse =
    paidCourses.find((course) => course.previewEnabled && course.previewLessonsCount > 0) ??
    myCourses.find((course) => isStartedPreviewCourse(course)) ??
    null;
  const isNewUser = myCourses.length === 0 && pendingCourses.length === 0;
  const recentActivityCourse = activity.lastActiveLesson
    ? myCourses.find((course) => course.slug === activity.lastActiveLesson?.courseSlug) ?? null
    : activity.lastActiveCourse
      ? myCourses.find((course) => course.slug === activity.lastActiveCourse?.slug) ?? null
      : null;
  const activityFallbackCourse =
    recentActivityCourse ??
    activePreviewCourse ??
    activeFreeCourse ??
    activeOwnedCourse ??
    myCourses[0] ??
    null;
  const activityPrimaryAction = activity.lastActiveLesson
    ? {
        href: `/courses/${activity.lastActiveLesson.courseSlug}?lesson=${encodeURIComponent(
          activity.lastActiveLesson.lessonSlug
        )}`,
        label: activity.lastActiveLesson.completed ? 'Открыть урок' : 'Продолжить обучение',
      }
    : activityFallbackCourse
      ? {
          href: `/courses/${activityFallbackCourse.slug}`,
          label:
            activityFallbackCourse.isStarted ||
            activityFallbackCourse.progressPercent > 0 ||
            activityFallbackCourse.completedLessonsCount > 0
              ? 'Продолжить обучение'
              : 'Открыть курс',
        }
      : freeStarterCourse
        ? {
            href: `/courses/${freeStarterCourse.slug}`,
            label: 'Начать бесплатный курс',
          }
        : {
            href: '/catalog',
            label: 'Открыть каталог',
          };
  const emptyStateAction = freeStarterCourse
    ? {
        href: `/courses/${freeStarterCourse.slug}`,
        label: 'Начать бесплатный курс',
      }
    : {
        href: '/catalog',
        label: 'Открыть каталог',
      };

  async function handleLogout() {
    setFeedback(null);
    setLogoutPending(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Не удалось завершить сессию.');
      }

      router.push('/login');
      router.refresh();
    } catch (logoutError) {
      setFeedback({
        message:
          logoutError instanceof Error
            ? logoutError.message
            : 'Не удалось завершить сессию.',
        tone: 'error',
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
        body: JSON.stringify({
          tariffId: course.tariffId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            checkoutUrl?: string;
            error?: string;
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
        message:
          orderError instanceof Error ? orderError.message : 'Не удалось открыть оплату.',
        tone: 'error',
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
        {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Получить доступ'}
      </button>
    );
  }

  let quickActionsTitle = activity.hasActivity
    ? 'Продолжить обучение'
    : 'Открыть стартовый курс';
  let quickActionsNote = activity.lastActiveLesson
    ? `Последний урок: «${activity.lastActiveLesson.lessonTitle}».`
    : 'После первого сохранения прогресса activity block начнет заполняться автоматически.';
  let quickActionsPrimaryAction: ReactNode = (
    <Link className="primary-button" href={activityPrimaryAction.href}>
      {activityPrimaryAction.label}
    </Link>
  );
  let quickActionsSecondaryAction: ReactNode | undefined = (
    <Link className="secondary-button" href="/catalog">
      Каталог
    </Link>
  );

  if (pendingPriorityCourse?.pendingOrder) {
    quickActionsTitle = `Завершить оплату «${pendingPriorityCourse.title}»`;
    quickActionsNote =
      pendingPriorityCourse.pendingOrder.status === 'PROCESSING'
        ? 'Платеж уже отправлен на ручную проверку.'
        : 'Откройте экран оплаты и завершите покупку.';
    quickActionsPrimaryAction = (
      <Link className="primary-button" href={pendingPriorityCourse.pendingOrder.checkoutUrl}>
        {getActiveOrderActionLabel(pendingPriorityCourse.pendingOrder.status)}
      </Link>
    );
    quickActionsSecondaryAction = (
      <Link
        className="secondary-button"
        href={
          canOpenCourseRoute(pendingPriorityCourse)
            ? `/courses/${pendingPriorityCourse.slug}`
            : getCourseCatalogHref(pendingPriorityCourse.slug)
        }
      >
        {canOpenCourseRoute(pendingPriorityCourse) ? 'Открыть курс' : 'Страница курса'}
      </Link>
    );
  } else if (isNewUser && freeStarterCourse) {
    quickActionsTitle = 'Начать с бесплатного курса';
    quickActionsNote = previewStarterCourse
      ? 'Бесплатный старт и ознакомительные уроки уже доступны.'
      : 'После первого урока прогресс сразу появится в годовой активности.';
    quickActionsPrimaryAction = (
      <Link className="primary-button" href={`/courses/${freeStarterCourse.slug}`}>
        Начать бесплатный курс
      </Link>
    );
    quickActionsSecondaryAction = previewStarterCourse ? (
      <Link className="secondary-button" href={`/courses/${previewStarterCourse.slug}`}>
        Ознакомительные уроки
      </Link>
    ) : (
      <Link className="secondary-button" href="/catalog">
        Каталог
      </Link>
    );
  } else if (activePreviewCourse) {
    quickActionsTitle = `Продолжить «${activePreviewCourse.title}»`;
    quickActionsNote = 'Можно вернуться к первым урокам или открыть полный доступ.';
    quickActionsPrimaryAction = (
      <Link className="primary-button" href={`/courses/${activePreviewCourse.slug}`}>
        Продолжить обучение
      </Link>
    );
    quickActionsSecondaryAction = renderBuyAction(activePreviewCourse, 'secondary-button');
  } else if (activeFreeCourse) {
    quickActionsTitle = `Продолжить «${activeFreeCourse.title}»`;
    quickActionsNote = 'Прогресс сохраняется автоматически и виден в activity block.';
    quickActionsPrimaryAction = (
      <Link className="primary-button" href={`/courses/${activeFreeCourse.slug}`}>
        Продолжить обучение
      </Link>
    );
    quickActionsSecondaryAction =
      previewStarterCourse && previewStarterCourse.slug !== activeFreeCourse.slug ? (
        <Link className="secondary-button" href={`/courses/${previewStarterCourse.slug}`}>
          Ознакомительные уроки
        </Link>
      ) : (
        <Link className="secondary-button" href="/catalog">
          Каталог
        </Link>
      );
  } else if (activeOwnedCourse) {
    quickActionsTitle = `Вернуться в «${activeOwnedCourse.title}»`;
    quickActionsNote = 'Полный доступ уже открыт.';
    quickActionsPrimaryAction = (
      <Link className="primary-button" href={`/courses/${activeOwnedCourse.slug}`}>
        {getDashboardCoursePrimaryLabel(activeOwnedCourse, 'my')}
      </Link>
    );
  } else if (!activity.hasActivity) {
    quickActionsNote = 'Выберите стартовый курс и начните с первого урока.';
  }

  const mobileContinueCourse =
    activityFallbackCourse ?? freeStarterCourse ?? previewStarterCourse ?? pendingPriorityCourse ?? null;
  const mobileContinueBadges = mobileContinueCourse ? (
    <>
      <span className={getCatalogCourseStatusClass(mobileContinueCourse)}>
        {getCatalogCourseStatusLabel(mobileContinueCourse)}
      </span>
      {mobileContinueCourse.lessonsCount ? (
        <span className="badge badge-complete">
          {mobileContinueCourse.completedLessonsCount}/{mobileContinueCourse.lessonsCount} завершено
        </span>
      ) : null}
    </>
  ) : null;
  const mobileContinueTitle = mobileContinueCourse?.title ?? quickActionsTitle;
  const mobileContinueNote = activity.lastActiveLesson
    ? `Последний урок: «${activity.lastActiveLesson.lessonTitle}».`
    : mobileContinueCourse?.nextLessonTitle
      ? `Следующий урок: ${mobileContinueCourse.nextLessonTitle}.`
      : quickActionsNote;

  return (
    <main className="page-shell dashboard-page">
      <div className="top-nav">
        <Link className="brand" href="/">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/catalog">
            Каталог
          </Link>
          <Link className="ghost-button" href="/profile">
            Профиль
          </Link>
          <Link className="ghost-button" href="/help">
            Помощь
          </Link>
          {user.role === 'ADMIN' ? (
            <Link className="ghost-button" href="/admin">
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
        <header className="dashboard-page__heading">
          <h1 className="dashboard-page__title">Личный кабинет</h1>
        </header>

        <section className="dashboard-mobile-only dashboard-mobile-priority">
          <DashboardPriorityCard
            actions={
              <>
                <Link className="primary-button" href={activityPrimaryAction.href}>
                  {activityPrimaryAction.label}
                </Link>
                {mobileContinueCourse && isStartedPreviewCourse(mobileContinueCourse) ? (
                  renderBuyAction(mobileContinueCourse, 'secondary-button')
                ) : (
                  <Link className="ghost-button" href="/catalog">
                    Каталог
                  </Link>
                )}
              </>
            }
            badges={mobileContinueBadges}
            eyebrow="Продолжить обучение"
            note={mobileContinueNote}
            title={mobileContinueTitle}
          />

          {pendingCourses.length > 0 ? (
            <article className="panel dashboard-priority-card" id="pending-payments">
              <div className="dashboard-priority-card__head">
                <span className="eyebrow">Оплата / заказы</span>
                <div className="badge-row">
                  <span className="badge badge-pending">
                    {pendingCourses.length} {pendingCourses.length === 1 ? 'заказ' : 'заказа'} в работе
                  </span>
                </div>
              </div>
              <div className="dashboard-pending-compact">
                {pendingCourses.map((course) => (
                  <article className="dashboard-pending-compact__item" key={course.slug}>
                    <div className="dashboard-pending-compact__copy">
                      <strong>{course.title}</strong>
                      <p>{getDashboardCourseHint(course)}</p>
                    </div>
                    <div className="dashboard-pending-compact__actions">
                      <Link className="primary-button" href={course.pendingOrder!.checkoutUrl}>
                        {getActiveOrderActionLabel(course.pendingOrder!.status)}
                      </Link>
                      <Link
                        className="secondary-button"
                        href={
                          canOpenCourseRoute(course)
                            ? `/courses/${course.slug}`
                            : getCourseCatalogHref(course.slug)
                        }
                      >
                        {canOpenCourseRoute(course) ? 'К курсу' : 'Страница курса'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </section>

        <section className="dashboard-overview">
          <DashboardProfileCard feedback={feedback} user={user} />
          <div className="dashboard-desktop-only">
            <DashboardQuickActions
              note={quickActionsNote}
              primaryAction={quickActionsPrimaryAction}
              secondaryAction={quickActionsSecondaryAction}
              tertiaryAction={
                <Link className="ghost-button" href="/help">
                  Помощь
                </Link>
              }
              title={quickActionsTitle}
            />
          </div>
        </section>

        <section className="dashboard-activity-shell">
          <LearnerActivity
            activity={activity}
            emptyStateActionHref={emptyStateAction.href}
            emptyStateActionLabel={emptyStateAction.label}
          />
        </section>

        {pendingCourses.length > 0 ? (
          <section className="panel dashboard-section dashboard-desktop-only">
            <SectionIntro
              description="Здесь лежат заказы, которые еще не оплачены по QR СБП или уже отправлены на ручную проверку."
              eyebrow="Продолжить оплату"
              title="Покупки на подтверждении"
            />

            <div className="course-grid dashboard-grid">
              {pendingCourses.map((course) => (
                <DashboardCourseCard
                  course={course}
                  key={course.slug}
                  mode="pending"
                  renderBuyAction={renderBuyAction}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel dashboard-section">
          <SectionIntro
            description={
              isNewUser
                ? 'После первого бесплатного урока или ознакомительного доступа курс сразу появится здесь вместе с прогрессом.'
                : 'Здесь собраны купленные курсы, бесплатные курсы с прогрессом и программы, где уже открыты первые уроки.'
            }
            eyebrow="Мои курсы"
            title="Мои курсы"
          />

          <div className="course-grid dashboard-grid">
            {myCourses.length === 0 ? (
              <EmptyCard>
                Пока здесь нет начатых курсов. После первого урока этот блок станет вашим
                основным хабом обучения.
              </EmptyCard>
            ) : (
              myCourses.map((course) => (
                <DashboardCourseCard
                  course={course}
                  key={course.slug}
                  mode="my"
                  renderBuyAction={renderBuyAction}
                />
              ))
            )}
          </div>
        </section>

        <section className="panel dashboard-section">
          <SectionIntro
            description="Эти курсы доступны сразу после входа без оплаты и без ожидания подтверждения."
            eyebrow="Бесплатные курсы"
            title="Бесплатные курсы"
          />

          <div className="course-grid dashboard-grid">
            {freeCourses.length === 0 ? (
              <EmptyCard>
                Все бесплатные курсы уже начаты. Продолжить их можно в блоке «Мои курсы».
              </EmptyCard>
            ) : (
              freeCourses.map((course) => (
                <DashboardCourseCard
                  course={course}
                  key={course.slug}
                  mode="free"
                  renderBuyAction={renderBuyAction}
                />
              ))
            )}
          </div>
        </section>

        <section className="panel dashboard-section">
          <SectionIntro
            description="У платных программ доступны бесплатные уроки. Полный доступ открывается после подтверждения оплаты."
            eyebrow="Платные курсы"
            title="Ознакомительный доступ"
          />

          <div className="course-grid dashboard-grid">
            {paidCourses.length === 0 ? (
              <EmptyCard>
                Активные платные курсы уже куплены, начаты с ознакомительного доступа или ждут
                завершения оплаты.
              </EmptyCard>
            ) : (
              paidCourses.map((course) => (
                <DashboardCourseCard
                  course={course}
                  key={course.slug}
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
