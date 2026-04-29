'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CourseProductPageData } from '@/lib/course-product';
import {
  buildAuthHref,
  getCheckoutIntentPath,
  getCourseIntentPath,
} from '@/lib/auth-intent';
import { getCourseCatalogHref } from '@/lib/lms-catalog';
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

type CourseProductPageProps = CourseProductPageData;

function ProductSection({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: string[];
}) {
  return (
    <article className="panel program-page__section">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <ul className="funnel-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function CourseProductPage({
  user,
  course,
  meta,
  outline,
  productFacts,
}: CourseProductPageProps) {
  const router = useRouter();
  const [buyingTariffId, setBuyingTariffId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const startedPreview = isStartedPreviewCourse(course);
  const productPageHref = getCourseCatalogHref(course.slug);
  const courseIntentHref = getCourseIntentPath(course.slug);
  const checkoutIntentHref = course.tariffId
    ? getCheckoutIntentPath(course.tariffId)
    : productPageHref;

  async function handleCreateOrder() {
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
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось открыть оплату.');
    } finally {
      setBuyingTariffId(null);
    }
  }

  function renderPrimaryAction() {
    if (course.status === 'showcase') {
      return <span className="ghost-button landing-card-disabled">Скоро</span>;
    }

    if (!user) {
      if (course.status === 'free') {
        return (
          <Link href={buildAuthHref('register', courseIntentHref)} className="primary-button">
            Начать бесплатно
          </Link>
        );
      }

      if (course.previewEnabled && course.previewLessonsCount > 0) {
        return (
          <Link href={buildAuthHref('register', courseIntentHref)} className="primary-button">
            Открыть ознакомительные уроки
          </Link>
        );
      }

      return (
        <Link href={buildAuthHref('register', checkoutIntentHref)} className="primary-button">
          Купить курс
        </Link>
      );
    }

    if (course.status === 'free') {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {course.isStarted ? 'Открыть курс' : 'Начать бесплатно'}
        </Link>
      );
    }

    if (course.pendingOrder) {
      return (
        <Link href={course.pendingOrder.checkoutUrl} className="primary-button">
          {getActiveOrderActionLabel(course.pendingOrder.status)}
        </Link>
      );
    }

    if (startedPreview) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {course.progressPercent > 0 ? 'Продолжить обучение' : 'Открыть курс'}
        </Link>
      );
    }

    if (course.isOwned) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {course.progressPercent > 0 ? 'Продолжить обучение' : 'Открыть курс'}
        </Link>
      );
    }

    if (canOpenCourseRoute(course)) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          Открыть ознакомительные уроки
        </Link>
      );
    }

    if (course.status === 'paid') {
      return (
        <button
          className="primary-button"
          disabled={buyingTariffId === course.tariffId}
          onClick={handleCreateOrder}
          type="button"
        >
          {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Купить курс'}
        </button>
      );
    }

    return null;
  }

  function renderSecondaryAction() {
    if (course.status === 'showcase') {
      return (
        <Link href="/catalog" className="secondary-button">
          В каталог
        </Link>
      );
    }

    if (!user) {
      if (course.status === 'free') {
        return (
          <Link href={buildAuthHref('login', courseIntentHref)} className="secondary-button">
            Войти
          </Link>
        );
      }

      if (course.previewEnabled && course.previewLessonsCount > 0) {
        return (
          <Link href={buildAuthHref('register', checkoutIntentHref)} className="secondary-button">
            Купить курс
          </Link>
        );
      }

      return (
        <Link href={buildAuthHref('login', checkoutIntentHref)} className="secondary-button">
          Войти
        </Link>
      );
    }

    if (startedPreview && course.tariffId) {
      return (
        <button
          className="secondary-button"
          disabled={buyingTariffId === course.tariffId}
          onClick={handleCreateOrder}
          type="button"
        >
          {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Купить курс'}
        </button>
      );
    }

    if (course.pendingOrder && canOpenCourseRoute(course)) {
      return (
        <Link href={`/courses/${course.slug}`} className="secondary-button">
          Открыть курс
        </Link>
      );
    }

    if (course.isOwned) {
      return (
        <Link href="/lk" className="secondary-button">
          В кабинет
        </Link>
      );
    }

    return (
      <Link href="/catalog" className="secondary-button">
        В каталог
      </Link>
    );
  }

  const previewCopy =
    course.status === 'paid'
      ? course.previewEnabled && course.previewLessonsCount > 0
        ? `До покупки доступны ${formatPreviewLessons(course.previewLessonsCount)}.`
        : 'Доступ к урокам откроется после оплаты.'
      : 'Курс доступен сразу после входа.';

  const afterAccessCopy =
    course.status === 'paid'
      ? 'После оплаты откроются все уроки, практика и полный маршрут обучения внутри LMS.'
      : 'Все уроки курса доступны сразу, без paywall и без ожидания оплаты.';

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/catalog" className="ghost-button">
            Каталог
          </Link>
          {user ? (
            <Link href="/lk" className="ghost-button">
              Личный кабинет
            </Link>
          ) : (
            <>
              <Link href={buildAuthHref('login', productPageHref)} className="ghost-button">
                Войти
              </Link>
              <Link
                href={buildAuthHref('register', productPageHref)}
                className="secondary-button"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="dnk-section program-page program-page__hero">
        <article className={`panel program-page__main ${getCatalogCourseToneClass(course)}`}>
          <span className="eyebrow">Страница курса</span>
          <h1>{course.title}</h1>
          <p className="program-page__lead">{course.description}</p>

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

          <p className="panel-copy">{getCatalogCourseNextStep(course, Boolean(user))}</p>

          <div className="row-actions catalog-product__actions">
            {renderPrimaryAction()}
            {renderSecondaryAction()}
          </div>

          {feedback ? <p className="feedback feedback-error">{feedback}</p> : null}
        </article>

        <aside className="panel program-page__aside">
          <span className="eyebrow">Что важно знать</span>
          <div className="program-page__price-card">
            <span className="program-page__price-label">Стоимость</span>
            <strong>{formatCoursePrice(course.price)}</strong>
            <p className="muted-text">
              {course.status === 'showcase'
                ? 'Направление остается в каталоге как витрина и пока не открыто для самостоятельной покупки.'
                : course.status === 'free'
                ? 'Курс открывается сразу после входа в кабинет.'
                : 'Покупка проходит внутри LMS, а доступ открывается автоматически.'}
            </p>
          </div>

          <div className="program-page__facts">
            {productFacts.map((fact) => (
              <div key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="dnk-section program-page__grid">
        <ProductSection
          eyebrow="Кому подходит"
          title="Для кого этот курс"
          items={meta.audience}
        />

        <ProductSection
          eyebrow="Что внутри"
          title="Что вы получите внутри курса"
          items={meta.includes}
        />

        <article className="panel program-page__section">
          <span className="eyebrow">Доступ</span>
          <h2>Как открывается курс</h2>
          <ul className="funnel-list">
            <li>{previewCopy}</li>
            <li>{afterAccessCopy}</li>
            {course.pendingOrder ? (
              <li>
                Активный заказ уже создан. Можно вернуться на экран покупки и завершить оплату.
              </li>
            ) : null}
            {course.isOwned ? (
              <li>Курс уже открыт в кабинете и готов к прохождению.</li>
            ) : null}
          </ul>
        </article>

        <article className="panel program-page__section">
          <span className="eyebrow">Программа</span>
          <h2>Что внутри по модулям</h2>
          {outline.length > 0 ? (
            <div className="lessons-list">
              {outline.slice(0, 6).map((lesson) => (
                <div key={lesson.id} className="lesson-btn">
                  <span className="lesson-btn__body">
                    <span className="lesson-btn__title">
                      {lesson.position}. {lesson.title}
                    </span>
                    <span className="lesson-btn__meta">
                      {lesson.isPreview
                        ? 'Доступно до покупки'
                        : 'Открывается в полном доступе'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-copy">
              Полная программа еще не опубликована. Направление остается в каталоге как витрина
              будущего курса.
            </p>
          )}
        </article>
      </section>

      <section className="dnk-section">
        <article className="panel funnel-final-cta">
          <span className="eyebrow">Следующий шаг</span>
          <h2>{meta.title}</h2>
          <p className="panel-copy">
            Маршрут простой: каталог {'->'} страница курса {'->'} ознакомительные уроки
            или покупка {'->'} обучение внутри LMS без заявок и ручного сопровождения.
          </p>

          <div className="row-actions catalog-product__actions">
            {renderPrimaryAction()}
            <Link href="/catalog" className="ghost-button">
              В каталог
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
