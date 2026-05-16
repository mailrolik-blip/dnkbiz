import Image from 'next/image';
import Link from 'next/link';

import { PublicPageShell } from '@/components/public-shell';
import {
  buildAuthHref,
  getCheckoutIntentPath,
  getCourseIntentPath,
} from '@/lib/auth-intent';
import { getCourseCatalogHref } from '@/lib/lms-catalog';
import type { LandingPageData } from '@/lib/landing';
import { getActiveOrderActionLabel } from '@/lib/payments/constants';
import {
  publicAudienceGroups,
  publicContact,
  publicHomeReviewPlaceholder,
  publicLearningFlow,
  publicTeamLead,
  publicTeamMembers,
  publicTrustReasons,
} from '@/lib/public-site';
import {
  canOpenCourseRoute,
  formatCoursePrice,
  formatLessonCount,
  formatPreviewLessons,
  getCatalogCourseStatusClass,
  getCatalogCourseStatusLabel,
  isStartedPreviewCourse,
} from '@/lib/purchase-ux';

type PublicHomeProps = LandingPageData;
type HomeCourse = LandingPageData['catalogCourses'][number];

function getHomeCourseAction(course: HomeCourse, hasUser: boolean) {
  if (course.status === 'showcase') {
    return {
      href: getCourseCatalogHref(course.slug),
      label: 'Посмотреть курс',
    };
  }

  if (course.pendingOrder) {
    return {
      href: course.pendingOrder.checkoutUrl,
      label: getActiveOrderActionLabel(course.pendingOrder.status),
    };
  }

  if (course.isOwned) {
    return {
      href: `/courses/${course.slug}`,
      label: 'Продолжить обучение',
    };
  }

  if (course.status === 'free') {
    return {
      href: hasUser
        ? `/courses/${course.slug}`
        : buildAuthHref('register', getCourseIntentPath(course.slug)),
      label: hasUser && (course.isStarted || course.progressPercent > 0)
        ? 'Продолжить обучение'
        : hasUser
        ? 'Начать бесплатно'
        : 'Зарегистрироваться',
    };
  }

  if (isStartedPreviewCourse(course)) {
    return {
      href: `/courses/${course.slug}`,
      label: 'Продолжить обучение',
    };
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return {
      href: hasUser
        ? canOpenCourseRoute(course)
          ? `/courses/${course.slug}`
          : getCheckoutIntentPath(course.tariffId!)
        : buildAuthHref('register', getCourseIntentPath(course.slug)),
      label: hasUser ? 'Смотреть бесплатные уроки' : 'Зарегистрироваться',
    };
  }

  if (!hasUser) {
    return {
      href: buildAuthHref('register', getCheckoutIntentPath(course.tariffId!)),
      label: 'Получить доступ',
    };
  }

  return {
    href: course.tariffId
      ? getCheckoutIntentPath(course.tariffId)
      : getCourseCatalogHref(course.slug),
    label: 'Получить доступ',
  };
}

function getHomeCourseSupport(course: HomeCourse, hasUser: boolean) {
  if (course.status === 'showcase') {
    return 'Страница курса уже доступна: можно посмотреть описание, понять формат и дождаться открытия полного доступа.';
  }

  if (course.pendingOrder) {
    return 'Заказ уже создан. Можно вернуться к оплате по QR СБП и проверить, подтверждена ли оплата.';
  }

  if (course.isOwned) {
    return 'Курс уже открыт в личном кабинете. Можно продолжить обучение с сохраненного места.';
  }

  if (course.status === 'free') {
    return hasUser
      ? 'Доступ открывается сразу: переходите в курс и начинайте обучение.'
      : 'После бесплатной регистрации курс откроется сразу, без покупки.';
  }

  if (course.previewEnabled && course.previewLessonsCount > 0) {
    return `${formatPreviewLessons(course.previewLessonsCount)} можно посмотреть бесплатно до получения полного доступа.`;
  }

  return 'Полный доступ к урокам открывается после подтверждения оплаты.';
}

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

export default function PublicHome({ user, catalogCourses }: PublicHomeProps) {
  const hasUser = Boolean(user);
  const heroProofPoints = [
    'Бесплатная регистрация',
    'Preview-уроки до покупки',
    'Прогресс сохраняется в личном кабинете',
  ] as const;
  const homeOverviewItems = [
    {
      title: 'DNK сейчас — это онлайн-курсы',
      body: 'В каталоге собраны практические программы для работы, бизнеса и повышения квалификации без лишнего позиционирования вокруг будущих функций.',
    },
    {
      title: 'Есть регистрация и бесплатные материалы',
      body: 'После регистрации можно начать с бесплатных курсов, а у части платных программ сначала открыть preview-уроки и спокойно оценить формат.',
    },
    {
      title: 'Обучение идет через личный кабинет',
      body: 'Курсы, уроки и прогресс собраны в одном месте, поэтому пользователь возвращается к материалам без ручного поиска и потери контекста.',
    },
    {
      title: 'Платный доступ открывается после подтверждения оплаты',
      body: 'Если курс платный, оплата проходит по QR СБП, а полный доступ к материалам открывается после подтверждения оплаты.',
    },
  ] as const;
  const homepageCourses = catalogCourses.filter((course) => course.slug !== 'practical-course');
  const freeCourses = homepageCourses.filter((course) => course.status === 'free').slice(0, 2);
  const paidCourses = homepageCourses.filter((course) => course.status === 'paid').slice(0, 4);
  const showcaseCourses = homepageCourses
    .filter((course) => course.status === 'showcase')
    .slice(0, 2);

  const catalogShelves = [
    {
      id: 'free',
      title: 'Бесплатные курсы',
      description: 'Для первого входа в платформу и знакомства с форматом обучения.',
      courses: freeCourses,
    },
    {
      id: 'paid',
      title: 'Платные программы',
      description:
        'У части программ сначала доступны бесплатные уроки, а полный доступ открывается после подтверждения оплаты.',
      courses: paidCourses,
    },
    {
      id: 'showcase',
      title: 'Готовятся к следующему запуску',
      description: 'Страницы этих программ уже можно посмотреть, чтобы понять тему, формат и структуру курса.',
      courses: showcaseCourses,
    },
  ].filter((shelf) => shelf.courses.length > 0);

  return (
    <PublicPageShell user={user}>
      <section className="dnk-section home-hero">
        <article className="home-hero__panel">
          <span className="eyebrow">Онлайн-обучение для работы и бизнеса</span>

          <div className="home-hero__copy">
            <h1 className="home-hero__title">Онлайн-курсы для работы, бизнеса и повышения квалификации</h1>
            <p className="panel-copy home-hero__lead">
              DNK Academy — это платформа с практическими курсами, личным кабинетом и доступом к
              урокам после регистрации. Начните с бесплатных материалов, изучите preview-уроки
              платных курсов и выберите программу под свою задачу.
            </p>
          </div>

          <div className="row-actions">
            <Link href={hasUser ? '/lk' : '/register'} className="primary-button">
              Начать бесплатно
            </Link>
            <Link href="/catalog" className="secondary-button">
              Смотреть каталог курсов
            </Link>
          </div>

          <ul className="home-hero__proof">
            {heroProofPoints.map((item) => (
              <li key={item}>
                <strong>{item}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Что есть в DNK сейчас</span>
          <h2>DNK сейчас — это онлайн-курсы с регистрацией, бесплатными материалами, preview-уроками и личным кабинетом.</h2>
          <p className="panel-copy">
            На главной странице пользователь сразу понимает, что можно начать бесплатно, что
            доступно до покупки и когда полный доступ к платным курсам открывается после
            подтверждения оплаты.
          </p>
        </div>

        <div className="home-results-grid">
          {homeOverviewItems.map((item) => (
            <article key={item.title} className="home-outcome-card">
              <h3>{item.title}</h3>
              <p className="panel-copy">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Для кого</span>
          <h2>Платформа подходит тем, кому важно быстро выбрать курс, посмотреть материалы и продолжать обучение в личном кабинете.</h2>
          <p className="panel-copy">
            Это онлайн-курсы для работы, бизнеса и повышения квалификации: с бесплатным входом,
            preview-уроками у части платных программ и понятным доступом после подтверждения
            оплаты.
          </p>
        </div>

        <div className="home-role-grid">
          {publicAudienceGroups.map((item) => (
            <article key={item.title} className="home-role-card">
              <h3>{item.title}</h3>
              <p className="panel-copy">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Как это работает</span>
          <h2>Путь от выбора курса до обучения в кабинете состоит из нескольких понятных шагов.</h2>
          <p className="panel-copy">
            Пользователь выбирает курс, регистрируется, смотрит бесплатные уроки, а при покупке
            получает полный доступ после подтверждения оплаты и продолжает обучение в кабинете.
          </p>
        </div>

        <ol className="home-steps-grid" aria-label="Механика обучения">
          {publicLearningFlow.map((step) => (
            <li key={step.step} className="home-step-card">
              <span className="home-step-card__index">{step.step}</span>
              <h3>{step.title}</h3>
              <p className="panel-copy">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Почему можно начать спокойно</span>
          <h2>Пользователь сразу понимает, что доступно бесплатно, когда нужен платеж и где искать поддержку.</h2>
          <p className="panel-copy">
            У платформы есть понятный вход, живые контакты и честные правила доступа. Это важно
            для первого запуска не меньше, чем сами курсы.
          </p>
        </div>

        <div className="home-results-grid">
          {publicTrustReasons.map((reason) => (
            <article key={reason.title} className="home-outcome-card">
              <h3>{reason.title}</h3>
              <p className="panel-copy">{reason.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="catalog" className="dnk-section">
        <div className="public-section-head home-catalog-head">
          <div>
            <span className="eyebrow">Каталог курсов</span>
            <h2>На старте здесь только launch-курсы: бесплатные, платные и готовящиеся к следующему запуску.</h2>
            <p className="panel-copy">
              В каталоге видно, какие программы можно открыть сразу, где доступны бесплатные
              уроки и как получить полный доступ к платному курсу.
            </p>
          </div>

          <Link href="/catalog" className="primary-button">
            Открыть весь каталог
          </Link>
        </div>

        <div className="home-catalog-shelves">
          {catalogShelves.length > 0 ? (
            catalogShelves.map((shelf) => (
              <section key={shelf.id} className="home-catalog-shelf">
                <div className="home-catalog-shelf__head">
                  <div>
                    <span className="eyebrow">{shelf.title}</span>
                    <p className="panel-copy">{shelf.description}</p>
                  </div>
                  <span className="home-catalog-shelf__meta">{formatCourseCount(shelf.courses.length)}</span>
                </div>

                <div className="home-catalog-grid">
                  {shelf.courses.map((course) => {
                    const action = getHomeCourseAction(course, hasUser);

                    return (
                      <article
                        key={course.slug}
                        className="panel public-card public-course-card home-course-card"
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
                          {course.lessonsCount ? (
                            <span>{formatLessonCount(course.lessonsCount)}</span>
                          ) : null}
                          {course.previewEnabled && course.previewLessonsCount > 0 ? (
                            <span>{formatPreviewLessons(course.previewLessonsCount)}</span>
                          ) : null}
                        </div>

                        <p className="public-course-card__support">
                          {getHomeCourseSupport(course, hasUser)}
                        </p>

                        <div className="row-actions">
                          <Link
                            href={action.href}
                            className={
                              course.status === 'showcase' ? 'secondary-button' : 'primary-button'
                            }
                          >
                            {action.label}
                          </Link>
                          <Link href={getCourseCatalogHref(course.slug)} className="ghost-button">
                            Посмотреть курс
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <article className="home-review-card">
              <span className="eyebrow">Каталог</span>
              <h2>Карточки курсов появятся здесь, когда будут доступны опубликованные программы.</h2>
              <p className="panel-copy">
                Главная страница остается доступной для визуальной проверки, а каталог снова
                покажет бесплатные, платные и готовящиеся программы, как только они будут
                доступны для публикации.
              </p>
            </article>
          )}
        </div>
      </section>

      <section className="dnk-section">
        <article className="home-review-card home-review-card--accent">
          <span className="eyebrow">Первые отзывы</span>
          <h2>{publicHomeReviewPlaceholder.title}</h2>
          <p className="panel-copy">{publicHomeReviewPlaceholder.body}</p>
          <p className="panel-copy home-review-card__support">
            {publicHomeReviewPlaceholder.support}
          </p>
          <div className="row-actions">
            <Link href="/catalog" className="primary-button">
              Открыть каталог
            </Link>
            <Link href="/contacts" className="secondary-button">
              Связаться с нами
            </Link>
          </div>
        </article>
      </section>

      <section className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Команда</span>
          <h2>Команда, которая отвечает за программы и поддержку обучения.</h2>
          <p className="panel-copy">
            Здесь собраны руководитель школы, эксперты и преподаватели, которые развивают
            программы и поддерживают прикладной формат обучения.
          </p>
        </div>

        <div className="home-team-layout">
          <div className="home-team-sidebar">
            <article className="home-team-intro">
              <h3>{publicTeamLead.title}</h3>
              <p className="panel-copy">{publicTeamLead.body}</p>
            </article>

            <div className="home-team-proof">
              {publicTrustReasons.map((reason) => (
                <article key={reason.title} className="home-team-proof-item">
                  <h3>{reason.title}</h3>
                  <p className="panel-copy">{reason.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="home-team-grid">
            {publicTeamMembers.map((member) => (
              <article key={member.name} className="home-team-card">
                <div className="home-team-card__media">
                  <Image
                    src={member.imageSrc}
                    alt={`${member.name}, ${member.role}`}
                    fill
                    sizes="(max-width: 743px) 100vw, (max-width: 959px) 50vw, 33vw"
                    className="home-team-card__image"
                  />
                </div>

                <div className="home-team-card__body">
                  <span className="eyebrow">{member.role}</span>
                  <h3>{member.name}</h3>
                  <p className="panel-copy">{member.direction}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacts" className="dnk-section">
        <div className="public-section-head">
          <span className="eyebrow">Контакты</span>
          <h2>Связаться по выбору курса, доступу и оплате.</h2>
          <p className="panel-copy">
            Используйте любой удобный канал связи. Если вопрос связан с оплатой, подготовьте
            название курса и номер заказа, чтобы быстрее сверить статус и доступ.
          </p>
        </div>

        <div className="home-contact-grid">
          <article className="home-contact-card">
            <span className="eyebrow">Телефон и мессенджеры</span>
            <h3>Быстрый канал для вопросов по выбору курса и доступу.</h3>
            <p className="panel-copy">
              Для короткого вопроса удобнее позвонить. Если нужно уточнить оплату или доступ,
              быстрее написать в Telegram.
            </p>

            <div className="public-contact-list home-contact-list">
              <a href={publicContact.phoneHref}>{publicContact.phoneLabel}</a>
              <a href={publicContact.telegramHref} rel="noreferrer" target="_blank">
                Telegram {publicContact.telegramLabel}
              </a>
              <a href={publicContact.instagramHref} rel="noreferrer" target="_blank">
                Instagram {publicContact.instagramLabel}
              </a>
            </div>

            <div className="row-actions">
              <Link href="/contacts" className="secondary-button">
                Все контакты
              </Link>
            </div>
          </article>

          <article className="home-contact-card home-contact-card--accent">
            <span className="eyebrow">Адрес</span>
            <h3>{publicContact.locationLabel}</h3>
            <p className="panel-copy">
              Если вы только присматриваетесь к программам, начните с каталога. Если вопрос уже по
              конкретному курсу или заказу, переходите к контактам и укажите нужное направление.
            </p>

            <ul className="utility-list utility-list--bullets">
              {publicContact.address.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <div className="row-actions">
              <Link href="/catalog" className="primary-button">
                Открыть каталог
              </Link>
              <Link href="/contacts" className="secondary-button">
                Страница контактов
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicPageShell>
  );
}
