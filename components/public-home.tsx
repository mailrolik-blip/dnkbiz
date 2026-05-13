import Link from 'next/link';

import { PublicPageShell } from '@/components/public-shell';
import {
  buildAuthHref,
  getCheckoutIntentPath,
  getCourseIntentPath,
} from '@/lib/auth-intent';
import { getCourseCatalogHref, groupCatalogCourses } from '@/lib/lms-catalog';
import type { LandingPageData } from '@/lib/landing';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  publicContact,
  publicLearningFlow,
  publicTrustReasons,
} from '@/lib/public-site';
import {
  canOpenCourseRoute,
  getCatalogCourseActionHint,
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  isStartedPreviewCourse,
} from '@/lib/purchase-ux';

type PublicHomeProps = LandingPageData;

function formatCourseCount(count: number) {
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

function getHomeCourseAction(
  course: LandingPageData['catalogCourses'][number],
  hasUser: boolean
) {
  const progressLabel =
    course.progressPercent > 0 || course.completedLessonsCount > 0
      ? 'Продолжить обучение'
      : 'Открыть курс';

  if (course.pendingOrder) {
    return {
      href: course.pendingOrder.checkoutUrl,
      label: getActiveOrderActionLabel(course.pendingOrder.status),
    };
  }

  if (course.isOwned) {
    return {
      href: `/courses/${course.slug}`,
      label: progressLabel,
    };
  }

  if (course.status === 'free') {
    return {
      href: hasUser
        ? `/courses/${course.slug}`
        : buildAuthHref('register', getCourseIntentPath(course.slug)),
      label:
        hasUser && (course.isStarted || course.progressPercent > 0)
          ? 'Продолжить обучение'
          : 'Начать бесплатно',
    };
  }

  if (isStartedPreviewCourse(course)) {
    return {
      href: `/courses/${course.slug}`,
      label: progressLabel,
    };
  }

  if (hasUser && canOpenCourseRoute(course)) {
    return {
      href: `/courses/${course.slug}`,
      label: 'Открыть ознакомительные уроки',
    };
  }

  if (!hasUser) {
    return course.previewEnabled && course.previewLessonsCount > 0
      ? {
          href: buildAuthHref('register', getCourseIntentPath(course.slug)),
          label: 'Открыть ознакомительные уроки',
        }
      : {
          href: buildAuthHref('register', getCheckoutIntentPath(course.tariffId!)),
          label: 'Купить курс',
        };
  }

  return {
    href: course.tariffId
      ? getCheckoutIntentPath(course.tariffId)
      : getCourseCatalogHref(course.slug),
    label: 'Купить курс',
  };
}

export default function PublicHome({ user, catalogCourses }: PublicHomeProps) {
  const hasUser = Boolean(user);
  const liveCourses = catalogCourses.filter((course) => course.status !== 'showcase');
  const priorityCourse =
    liveCourses.find((course) => course.slug === 'marketing-sales-management') ??
    liveCourses.find((course) => course.status === 'paid') ??
    liveCourses[0] ??
    null;
  const directionGroups = groupCatalogCourses(liveCourses)
    .filter((group) => group.courses.length > 0)
    .slice(0, 3);
  const popularCourses = [
    ...(priorityCourse ? [priorityCourse] : []),
    ...liveCourses.filter((course) => course.slug !== priorityCourse?.slug),
  ].slice(0, 4);

  return (
    <PublicPageShell user={user}>
      <section className="dnk-section public-hero">
        <article className="panel public-hero__main public-hero__main--funnel">
          <span className="eyebrow">Обучение для бизнеса и команды</span>
          <h1>Выберите курс и начните обучение без лишних шагов.</h1>
          <p className="panel-copy public-hero__copy">
            Откройте каталог, посмотрите программу курса и переходите к обучению в личном
            кабинете. Для платных курсов доступ открывается после подтверждения оплаты.
          </p>

          <div className="row-actions">
            <Link href="/catalog" className="primary-button">
              Перейти в каталог
            </Link>
            <Link href={user ? '/lk' : '/register'} className="secondary-button">
              {user ? 'Открыть личный кабинет' : 'Создать аккаунт'}
            </Link>
          </div>

          <p className="public-hero__meta">
            Понятные страницы курсов. Ознакомительные уроки там, где они доступны. Обучение и
            прогресс в одном кабинете.
          </p>
        </article>
      </section>

      <section id="catalog" className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Направления и курсы</span>
          <h2>Сначала выберите направление, затем откройте подходящую программу.</h2>
          <p className="panel-copy">
            На главной собраны только основные входы. Для деталей по формату и содержанию
            переходите на страницу конкретного курса.
          </p>
        </div>

        {directionGroups.length > 0 ? (
          <div className="public-grid public-grid--three">
            {directionGroups.map((group) => (
              <article key={group.id} className="panel public-card public-direction-card">
                <p className="public-direction-card__eyebrow">Направление</p>
                <h3>{group.title}</h3>
                <p className="panel-copy public-direction-card__description">{group.description}</p>
                <ul className="public-direction-card__list">
                  {group.courses.slice(0, 3).map((course) => (
                    <li key={course.slug}>
                      <Link href={getCourseCatalogHref(course.slug)}>{course.title}</Link>
                    </li>
                  ))}
                </ul>
                <p className="public-direction-card__count">{formatCourseCount(group.courses.length)}</p>
              </article>
            ))}
          </div>
        ) : null}

        {popularCourses.length > 0 ? (
          <div className="public-grid public-grid--courses public-grid--course-highlights">
            {popularCourses.map((course, index) => {
              const action = getHomeCourseAction(course, hasUser);

              return (
                <article
                  key={course.slug}
                  className={`panel public-card public-course-card ${
                    index === 0 ? 'public-course-card--featured' : ''
                  }`}
                >
                  <Link
                    aria-label={`Открыть страницу курса ${course.title}`}
                    className="public-course-card__cover"
                    href={getCourseCatalogHref(course.slug)}
                  />

                  <div className="public-course-card__head">
                    <span className={getCatalogCourseStatusClass(course)}>
                      {getCatalogCourseStatusLabel(course)}
                    </span>
                    <span className="public-course-card__price">
                      {formatCoursePrice(course.price)}
                    </span>
                  </div>

                  <div className="public-course-card__body">
                    <h3>{course.title}</h3>
                    <p className="panel-copy">{course.description}</p>
                  </div>

                  <div className="public-course-card__meta">
                    {course.lessonsCount ? <span>{formatLessonCount(course.lessonsCount)}</span> : null}
                    {course.previewEnabled ? (
                      <span>{formatPreviewLessons(course.previewLessonsCount)}</span>
                    ) : null}
                  </div>

                  <p className="public-course-card__support">
                    {getCatalogCourseActionHint(course, hasUser)}
                  </p>

                  <div className="row-actions">
                    <Link href={action.href} className="primary-button">
                      {action.label}
                    </Link>
                    <Link href={getCourseCatalogHref(course.slug)} className="ghost-button">
                      О программе
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="panel public-card">
            <h3>Курсы скоро появятся в этой витрине.</h3>
            <p className="panel-copy">
              Пока можно перейти в каталог и проверить доступные программы или связаться с нами по
              вопросам подбора обучения.
            </p>
            <div className="row-actions">
              <Link href="/catalog" className="primary-button">
                Открыть каталог
              </Link>
              <Link href="/contacts" className="secondary-button">
                Связаться
              </Link>
            </div>
          </article>
        )}
      </section>

      <section id="how-it-works" className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Как проходит обучение</span>
          <h2>Путь к курсу короткий и понятный.</h2>
          <p className="panel-copy">
            Без лишних переходов: от выбора программы и оплаты до доступа к урокам в личном
            кабинете.
          </p>
        </div>

        <div className="public-learning-flow">
          {publicLearningFlow.map((step) => (
            <article key={step.step} className="panel public-learning-step">
              <span className="public-learning-step__index">{step.step}</span>
              <h3>{step.title}</h3>
              <p className="panel-copy">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="trust" className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Почему нам можно доверять</span>
          <h2>Только то, что пользователь действительно видит до и после покупки.</h2>
          <p className="panel-copy">
            Здесь нет вымышленных цифр, искусственных отзывов и обещаний мгновенного результата.
            Только понятный путь к обучению.
          </p>
        </div>

        <div className="public-grid public-grid--three public-trust-grid">
          {publicTrustReasons.map((reason) => (
            <article key={reason.title} className="panel public-card public-trust-card">
              <h3>{reason.title}</h3>
              <p className="panel-copy">{reason.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contacts" className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Контакты</span>
          <h2>Если нужно выбрать курс или уточнить оплату, с нами можно связаться напрямую.</h2>
          <p className="panel-copy">
            Используйте удобный канал связи. Если вопрос связан с оплатой, подготовьте номер
            заказа и название курса.
          </p>
        </div>

        <div className="public-grid public-grid--split public-contact-grid">
          <article className="panel public-card public-contact-card">
            <h3>Телефон и мессенджеры</h3>
            <div className="public-contact-list">
              <a href={publicContact.phoneHref}>{publicContact.phoneLabel}</a>
              <a href={publicContact.telegramHref} rel="noreferrer" target="_blank">
                Telegram {publicContact.telegramLabel}
              </a>
              <a href={publicContact.instagramHref} rel="noreferrer" target="_blank">
                Instagram {publicContact.instagramLabel}
              </a>
            </div>
          </article>

          <article className="panel public-card public-contact-card">
            <h3>{publicContact.address[1]}</h3>
            <ul className="utility-list utility-list--bullets">
              {publicContact.address.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="row-actions">
              <Link href="/contacts" className="secondary-button">
                Все контакты
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="dnk-section">
        <article className="panel public-final-cta">
          <span className="eyebrow">Следующий шаг</span>
          <h2>Откройте каталог и выберите курс, с которого хотите начать.</h2>
          <p className="panel-copy">
            Дальше путь уже понятен: страница курса, оплата при необходимости и обучение в личном
            кабинете.
          </p>
          <div className="row-actions">
            <Link href="/catalog" className="primary-button">
              Перейти в каталог
            </Link>
            <Link href={user ? '/lk' : '/register'} className="secondary-button">
              {user ? 'Открыть кабинет' : 'Создать аккаунт'}
            </Link>
          </div>
        </article>
      </section>
    </PublicPageShell>
  );
}
