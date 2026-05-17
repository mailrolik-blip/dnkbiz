'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PublicPageShell } from '@/components/public-shell';
import type { CourseProductPageData } from '@/lib/course-product';
import { accountingCoursePublicProfile } from '@/lib/course-content/1c-accounting-83.js';
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

function getContinueLabel(course: CourseProductPageData['course']) {
  return course.isStarted || course.progressPercent > 0 || course.completedLessonsCount > 0
    ? 'Продолжить обучение'
    : 'Открыть курс';
}

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

function buildCourseModules(outline: CourseProductPageData['outline'], slug: string) {
  if (slug !== accountingCoursePublicProfile.slug) {
    return null;
  }

  return accountingCoursePublicProfile.moduleOutline
    .map((module) => ({
      ...module,
      lessons: outline.filter(
        (lesson) =>
          lesson.position >= module.startLesson && lesson.position <= module.endLesson
      ),
    }))
    .filter((module) => module.lessons.length > 0);
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
  const continueLabel = getContinueLabel(course);
  const courseModules = buildCourseModules(outline, course.slug);

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
      return (
        <Link
          href={buildAuthHref(
            'register',
            course.previewEnabled && course.previewLessonsCount > 0
              ? courseIntentHref
              : checkoutIntentHref
          )}
          className="primary-button"
        >
          Зарегистрироваться
        </Link>
      );
    }

    if (course.status === 'free') {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {course.isStarted ? continueLabel : 'Начать бесплатно'}
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

    if (startedPreview || course.isOwned) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          {continueLabel}
        </Link>
      );
    }

    if (canOpenCourseRoute(course)) {
      return (
        <Link href={`/courses/${course.slug}`} className="primary-button">
          Смотреть бесплатные уроки
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
          {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Получить доступ'}
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
      return (
        <Link
          href={buildAuthHref(
            'login',
            course.previewEnabled && course.previewLessonsCount > 0
              ? courseIntentHref
              : checkoutIntentHref
          )}
          className="secondary-button"
        >
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
          {buyingTariffId === course.tariffId ? 'Открываем оплату...' : 'Получить доступ'}
        </button>
      );
    }

    if (course.pendingOrder && canOpenCourseRoute(course)) {
      return (
        <Link href={`/courses/${course.slug}`} className="secondary-button">
          Смотреть бесплатные уроки
        </Link>
      );
    }

    if (course.isOwned) {
      return (
        <Link href="/lk" className="secondary-button">
          Личный кабинет
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
    course.slug === accountingCoursePublicProfile.slug
      ? `Бесплатно доступны первые 2 урока: «${accountingCoursePublicProfile.previewLessonTitles[0]}» и «${accountingCoursePublicProfile.previewLessonTitles[1]}».`
      : course.status === 'paid'
      ? course.previewEnabled && course.previewLessonsCount > 0
        ? `Бесплатно доступны ${formatPreviewLessons(course.previewLessonsCount)}, чтобы познакомиться с курсом до получения полного доступа.`
        : 'Доступ к урокам откроется после подтверждения оплаты.'
      : 'Курс доступен сразу после входа.';

  const afterAccessCopy =
    course.slug === accountingCoursePublicProfile.slug
      ? 'После подтверждения оплаты откроются уроки 3–10, практические задания, чек-листы самопроверки, финальный чек-лист внедрения и 7-дневный план применения.'
      : course.status === 'paid'
      ? 'После подтверждения оплаты откроются все уроки, домашние задания и полный маршрут обучения в личном кабинете.'
      : 'Все уроки курса доступны сразу, без ожидания оплаты.';

  return (
    <PublicPageShell user={user}>
      <section className="dnk-section program-page program-page__hero">
        <article className={`panel program-page__main ${getCatalogCourseToneClass(course)}`}>
          <span className="eyebrow">Курс DNK Academy</span>
          <h1>{course.title}</h1>
          <p className="program-page__lead">{course.description}</p>

          <div className="program-page__meta-head">
            <span className="program-page__category">{course.category}</span>
            <span className={getCatalogCourseStatusClass(course)}>
              {getCatalogCourseStatusLabel(course)}
            </span>
          </div>

          <div className="program-page__meta-row">
            {course.lessonsCount ? <span>{formatLessonCount(course.lessonsCount)}</span> : null}
            {course.previewEnabled && course.previewLessonsCount > 0 ? (
              <span>{formatPreviewLessons(course.previewLessonsCount)}</span>
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
          <div className="program-page__price-card">
            <span className="program-page__price-label">Стоимость</span>
            <strong>{formatCoursePrice(course.price)}</strong>
            <p className="muted-text">
              {course.status === 'showcase'
                ? 'Направление пока остается в каталоге как витрина и еще не открыто для самостоятельной покупки.'
                : course.status === 'free'
                  ? 'Курс открывается сразу после входа в кабинет.'
                  : 'Основной сценарий оплаты ведет на защищенную страницу оплаты. После подтверждения оплаты курс открывается в полном доступе.'}
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
        <ProductSection eyebrow="Для кого" title="Кому подойдет этот курс" items={meta.audience} />

        <ProductSection
          eyebrow="Результат"
          title="Что вы получите после прохождения"
          items={meta.outcomes}
        />

        <ProductSection
          eyebrow="Что внутри"
          title="Что входит в курс"
          items={meta.includes}
        />

        <article className="panel program-page__section">
          <span className="eyebrow">Доступ</span>
          <h2>Как получить доступ</h2>
          <ul className="funnel-list">
            <li>{previewCopy}</li>
            <li>{afterAccessCopy}</li>
            {course.pendingOrder ? (
              <li>
                Активный заказ уже создан. Вернитесь на экран оплаты, чтобы завершить покупку или
                проверить статус подтверждения оплаты.
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
            courseModules ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {courseModules.map((module) => (
                  <div key={module.id} style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gap: '0.25rem' }}>
                      <span className="eyebrow">{module.title}</span>
                      <h3 style={{ margin: 0 }}>{module.lessonsLabel}</h3>
                      <p className="panel-copy" style={{ margin: 0 }}>
                        {module.summary}
                      </p>
                    </div>

                    <div className="lessons-list">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="lesson-btn">
                          <span className="lesson-btn__body">
                            <span className="lesson-btn__title">
                              {lesson.position}. {lesson.title}
                            </span>
                            <span className="lesson-btn__meta">
                              {lesson.isPreview
                                ? 'Доступно бесплатно'
                                : 'Открывается после полного доступа'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lessons-list">
                {outline.map((lesson) => (
                  <div key={lesson.id} className="lesson-btn">
                    <span className="lesson-btn__body">
                      <span className="lesson-btn__title">
                        {lesson.position}. {lesson.title}
                      </span>
                      <span className="lesson-btn__meta">
                        {lesson.isPreview
                          ? 'Доступно бесплатно'
                          : 'Открывается после полного доступа'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )
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
            Посмотрите страницу курса, откройте бесплатные уроки, если они доступны, и переходите
            к оплате, когда будете готовы получить полный доступ.
          </p>

          <div className="row-actions catalog-product__actions">
            {renderPrimaryAction()}
            <Link href="/catalog" className="ghost-button">
              В каталог
            </Link>
          </div>
        </article>
      </section>
    </PublicPageShell>
  );
}
