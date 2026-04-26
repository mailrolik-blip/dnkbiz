'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  buildAuthHref,
  getCheckoutIntentPath,
  getCourseIntentPath,
} from '@/lib/auth-intent';
import {
  getCourseCatalogHref,
  lmsCatalogGroups,
  type CatalogCourseCard,
  type CatalogGroupId,
} from '@/lib/lms-catalog';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseActionHint,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  getCatalogCourseToneClass,
  isStartedPreviewCourse,
} from '@/lib/purchase-ux';

type CatalogPageClientProps = {
  user: {
    email: string;
    name: string | null;
  } | null;
  catalogCourses: CatalogCourseCard[];
};

type StatusFilter = 'all' | 'free' | 'paid' | 'showcase';
type GroupFilter = 'all' | CatalogGroupId;

const statusFilterOptions: Array<{
  id: StatusFilter;
  label: string;
}> = [
  { id: 'all', label: 'Все' },
  { id: 'free', label: 'Бесплатные' },
  { id: 'paid', label: 'Платные' },
  { id: 'showcase', label: 'Скоро' },
];

function getCatalogCourseValueLabel(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'Статус';
  }

  if (course.pendingOrder) {
    return 'Заказ';
  }

  if (course.isOwned || course.status === 'free') {
    return 'Доступ';
  }

  return 'Стоимость';
}

function getCatalogCourseValue(course: CatalogCourseCard) {
  if (course.status === 'showcase') {
    return 'Скоро в каталоге';
  }

  if (course.pendingOrder) {
    return course.pendingOrder.status === 'PROCESSING'
      ? 'Оплата в обработке'
      : 'Продолжить оплату';
  }

  if (course.isOwned) {
    return 'Полный доступ открыт';
  }

  if (course.status === 'free') {
    return 'Открывается сразу';
  }

  return formatCoursePrice(course.price);
}

function getCatalogCoursesCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} курс`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} курса`;
  }

  return `${count} курсов`;
}

function CatalogDirectoryCard({
  course,
  buyingTariffId,
  hasUser,
  onCreateOrder,
}: {
  course: CatalogCourseCard;
  buyingTariffId: number | null;
  hasUser: boolean;
  onCreateOrder: (course: CatalogCourseCard) => void;
}) {
  const startedPreview = isStartedPreviewCourse(course);
  const courseHref = getCourseCatalogHref(course.slug);
  const progressLabel =
    course.progressPercent > 0 || course.completedLessonsCount > 0
      ? 'Продолжить обучение'
      : 'Открыть курс';

  function renderPrimaryAction() {
    if (course.status === 'showcase') {
      return <span className="ghost-button landing-card-disabled">Скоро</span>;
    }

    if (course.pendingOrder) {
      return (
        <Link href={course.pendingOrder.checkoutUrl} className="primary-button">
          {getActiveOrderActionLabel(course.pendingOrder.status)}
        </Link>
      );
    }

    if (course.isOwned) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {progressLabel}
        </Link>
      );
    }

    if (course.status === 'free') {
      return (
        <Link
          href={
            hasUser
              ? `/courses/${course.slug}`
              : buildAuthHref('register', getCourseIntentPath(course.slug))
          }
          className="primary-button"
        >
          {hasUser
            ? course.isStarted || course.progressPercent > 0
              ? 'Продолжить обучение'
              : 'Начать бесплатно'
            : 'Начать бесплатно'}
        </Link>
      );
    }

    if (startedPreview) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {progressLabel}
        </Link>
      );
    }

    if (!hasUser) {
      return (
        <Link
          href={buildAuthHref('register', getCheckoutIntentPath(course.tariffId!))}
          className="primary-button"
        >
          Купить курс
        </Link>
      );
    }

    return (
      <button
        className="primary-button"
        disabled={buyingTariffId === course.tariffId}
        onClick={() => onCreateOrder(course)}
        type="button"
      >
        {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Купить курс'}
      </button>
    );
  }

  function renderSecondaryAction() {
    if (startedPreview && hasUser && course.tariffId) {
      return (
        <button
          className="secondary-button"
          disabled={buyingTariffId === course.tariffId}
          onClick={() => onCreateOrder(course)}
          type="button"
        >
          {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Купить курс'}
        </button>
      );
    }

    if (course.pendingOrder && course.isStarted) {
      return (
        <Link href={`/courses/${course.slug}`} className="secondary-button">
          Открыть курс
        </Link>
      );
    }

    return (
      <Link href={courseHref} className="secondary-button">
        Подробнее
      </Link>
    );
  }

  return (
    <article className={`course-card catalog-directory-card ${getCatalogCourseToneClass(course)}`}>
      <div className="catalog-directory-card__head">
        <div className="badge-row">
          <span className="badge badge-complete">{course.category}</span>
          <span className={getCatalogCourseStatusClass(course)}>
            {getCatalogCourseStatusLabel(course)}
          </span>
        </div>
        {course.lessonsCount ? (
          <span className="catalog-directory-card__meta">
            {formatLessonCount(course.lessonsCount)}
          </span>
        ) : null}
      </div>

      <div className="catalog-directory-card__body">
        <h2>
          <Link href={courseHref}>{course.title}</Link>
        </h2>
        <p className="catalog-directory-card__description">{course.description}</p>
      </div>

      <div className="catalog-directory-card__details">
        <div className="catalog-directory-card__pricing">
          <span className="catalog-directory-card__label">
            {getCatalogCourseValueLabel(course)}
          </span>
          <strong className="catalog-directory-card__value">{getCatalogCourseValue(course)}</strong>
        </div>

        <div className="badge-row catalog-directory-card__badges">
          {course.previewEnabled && course.previewLessonsCount > 0 ? (
            <span className="badge badge-pending">
              {formatPreviewLessons(course.previewLessonsCount)}
            </span>
          ) : null}
          {course.status === 'free' ? (
            <span className="badge badge-complete">Доступен сразу</span>
          ) : null}
          {course.isOwned ? <span className="badge badge-paid">Уже открыт</span> : null}
        </div>

        <p className="catalog-directory-card__hint">
          {getCatalogCourseActionHint(course, hasUser)}
        </p>
      </div>

      <div className="catalog-directory-card__footer">
        <div className="row-actions catalog-directory-card__actions">
          {renderPrimaryAction()}
          {renderSecondaryAction()}
        </div>
      </div>
    </article>
  );
}

export default function CatalogPageClient({
  user,
  catalogCourses,
}: CatalogPageClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const hasUser = Boolean(user?.email);

  const freeCoursesCount = catalogCourses.filter((course) => course.status === 'free').length;
  const paidCoursesCount = catalogCourses.filter((course) => course.status === 'paid').length;
  const showcaseCoursesCount = catalogCourses.filter(
    (course) => course.status === 'showcase'
  ).length;
  const filteredCourses = catalogCourses.filter((course) => {
    const matchesStatus = statusFilter === 'all' ? true : course.status === statusFilter;
    const matchesGroup = groupFilter === 'all' ? true : course.groupId === groupFilter;

    return matchesStatus && matchesGroup;
  });

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
      setFeedback(orderError instanceof Error ? orderError.message : 'Не удалось открыть оплату.');
    } finally {
      setBuyingTariffId(null);
    }
  }

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          {user ? (
            <>
              <Link href="/lk" className="ghost-button">
                Личный кабинет
              </Link>
              <Link href="/" className="secondary-button">
                На главную
              </Link>
            </>
          ) : (
            <>
              <Link href={buildAuthHref('login', '/catalog')} className="ghost-button">
                Войти
              </Link>
              <Link href={buildAuthHref('register', '/catalog')} className="secondary-button">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="dnk-section catalog-directory">
        <article className="panel catalog-directory__hero">
          <div className="catalog-directory__copy">
            <span className="eyebrow">Общий каталог</span>
            <h1>Все курсы платформы DNK Biz в одном self-serve каталоге.</h1>
            <p className="panel-copy">
              Здесь собраны бесплатные, платные и showcase-курсы платформы. Маршрут простой:
              выбрать курс, открыть его product page, начать бесплатно или перейти к покупке, а
              затем пройти обучение внутри LMS.
            </p>

            <div className="row-actions">
              {user ? (
                <Link href="/lk" className="primary-button">
                  Открыть кабинет
                </Link>
              ) : (
                <Link href={buildAuthHref('register', '/catalog')} className="primary-button">
                  Зарегистрироваться бесплатно
                </Link>
              )}
              <Link href="/" className="secondary-button">
                Вернуться на главную
              </Link>
            </div>

            {feedback ? <p className="feedback feedback-error">{feedback}</p> : null}
          </div>

          <div className="catalog-directory__stats">
            <div className="catalog-directory__stat">
              <span>Всего в каталоге</span>
              <strong>{catalogCourses.length}</strong>
            </div>
            <div className="catalog-directory__stat">
              <span>Бесплатные</span>
              <strong>{freeCoursesCount}</strong>
            </div>
            <div className="catalog-directory__stat">
              <span>Платные</span>
              <strong>{paidCoursesCount}</strong>
            </div>
            <div className="catalog-directory__stat">
              <span>Скоро</span>
              <strong>{showcaseCoursesCount}</strong>
            </div>
          </div>
        </article>

        <article className="panel catalog-directory__filters">
          <div className="catalog-directory__filter-group">
            <span className="eyebrow">Фильтр по доступу</span>
            <div className="catalog-directory__filter-row">
              {statusFilterOptions.map((option) => (
                <button
                  key={option.id}
                  aria-pressed={statusFilter === option.id}
                  className={`catalog-directory__filter-pill ${
                    statusFilter === option.id ? 'catalog-directory__filter-pill--active' : ''
                  }`}
                  onClick={() => setStatusFilter(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-directory__filter-group">
            <span className="eyebrow">Тема курса</span>
            <div className="catalog-directory__filter-row">
              <button
                aria-pressed={groupFilter === 'all'}
                className={`catalog-directory__filter-pill ${
                  groupFilter === 'all' ? 'catalog-directory__filter-pill--active' : ''
                }`}
                onClick={() => setGroupFilter('all')}
                type="button"
              >
                Все темы
              </button>
              {lmsCatalogGroups.map((group) => (
                <button
                  key={group.id}
                  aria-pressed={groupFilter === group.id}
                  className={`catalog-directory__filter-pill ${
                    groupFilter === group.id ? 'catalog-directory__filter-pill--active' : ''
                  }`}
                  onClick={() => setGroupFilter(group.id)}
                  type="button"
                >
                  {group.title}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-directory__filter-summary">
            <p className="panel-copy">
              Показано {getCatalogCoursesCountLabel(filteredCourses.length)}. Все карточки ведут в
              product page курса на <span className="mono">/catalog/[slug]</span>.
            </p>
          </div>
        </article>

        {filteredCourses.length > 0 ? (
          <div className="catalog-directory__grid">
            {filteredCourses.map((course) => (
              <CatalogDirectoryCard
                key={course.slug}
                buyingTariffId={buyingTariffId}
                course={course}
                hasUser={hasUser}
                onCreateOrder={handleCreateOrder}
              />
            ))}
          </div>
        ) : (
          <article className="empty-card catalog-directory__empty">
            <h2>По текущему фильтру курсов пока нет.</h2>
            <p className="panel-copy">
              Сбросьте фильтр по доступу или теме, чтобы снова увидеть все направления каталога.
            </p>
            <div className="row-actions">
              <button
                className="primary-button"
                onClick={() => {
                  setStatusFilter('all');
                  setGroupFilter('all');
                }}
                type="button"
              >
                Показать все курсы
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
