'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PublicPageShell } from '@/components/public-shell';
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
  canOpenCourseRoute,
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
] as const;

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

    if (hasUser && canOpenCourseRoute(course)) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          Открыть ознакомительные уроки
        </Link>
      );
    }

    if (!hasUser) {
      return (
        <Link
          href={
            course.previewEnabled && course.previewLessonsCount > 0
              ? buildAuthHref('register', getCourseIntentPath(course.slug))
              : buildAuthHref('register', getCheckoutIntentPath(course.tariffId!))
          }
          className="primary-button"
        >
          {course.previewEnabled && course.previewLessonsCount > 0
            ? 'Открыть ознакомительные уроки'
            : 'Купить курс'}
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

    if (course.pendingOrder && canOpenCourseRoute(course)) {
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
      <Link
        aria-label={`Открыть страницу курса ${course.title}`}
        className="catalog-directory-card__cover"
        href={courseHref}
      />

      <div className="catalog-directory-card__head">
        <span className="catalog-directory-card__category">{course.category}</span>
        <span className={getCatalogCourseStatusClass(course)}>
          {getCatalogCourseStatusLabel(course)}
        </span>
      </div>

      <div className="catalog-directory-card__body">
        <h2>{course.title}</h2>
        <p className="catalog-directory-card__description">{course.description}</p>
      </div>

      <div className="catalog-directory-card__details">
        <div className="catalog-directory-card__pricing">
          <span className="catalog-directory-card__label">
            {getCatalogCourseValueLabel(course)}
          </span>
          <strong className="catalog-directory-card__value">{getCatalogCourseValue(course)}</strong>
        </div>

        <div className="catalog-directory-card__secondary">
          <div className="catalog-directory-card__meta-row">
            {course.lessonsCount ? <span>{formatLessonCount(course.lessonsCount)}</span> : null}
            {course.previewEnabled && course.previewLessonsCount > 0 ? (
              <span>{formatPreviewLessons(course.previewLessonsCount)}</span>
            ) : null}
          </div>

          <p className="catalog-directory-card__hint">
            {getCatalogCourseActionHint(course, hasUser)}
          </p>
        </div>
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
    <PublicPageShell user={user}>
      <section className="dnk-section catalog-directory">
        <article className="panel catalog-directory__hero">
          <div className="catalog-directory__copy">
            <span className="eyebrow">Общий каталог</span>
            <h1>Все курсы Бизнес школы ДНК в одном каталоге.</h1>
            <p className="panel-copy">
              Здесь собраны все опубликованные программы. Выберите направление, откройте страницу
              курса и перейдите к ознакомительным урокам или покупке.
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
    </PublicPageShell>
  );
}
