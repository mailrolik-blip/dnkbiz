import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getOptionalCurrentUser } from '@/lib/auth';
import { getCourseCatalogHref } from '@/lib/lms-catalog';
import {
  getRelatedShowcasePrograms,
  getShowcaseProgramBySlug,
  showcasePrograms,
} from '@/lib/programs';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getStatusLabel(status: 'ACTIVE' | 'SHOWCASE' | 'SOON') {
  if (status === 'ACTIVE') {
    return 'Доступна';
  }

  if (status === 'SHOWCASE') {
    return 'В каталоге';
  }

  return 'Скоро';
}

function getStatusClass(status: 'ACTIVE' | 'SHOWCASE' | 'SOON') {
  if (status === 'ACTIVE') {
    return 'badge badge-paid';
  }

  if (status === 'SHOWCASE') {
    return 'badge badge-complete';
  }

  return 'badge badge-pending';
}

export function generateStaticParams() {
  return showcasePrograms.map((program) => ({
    slug: program.slug,
  }));
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getOptionalCurrentUser();
  const { slug } = await params;
  const program = getShowcaseProgramBySlug(slug);

  if (!program) {
    notFound();
  }

  const relatedPrograms = getRelatedShowcasePrograms(program);
  const catalogHref = getCourseCatalogHref(program.slug);

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>

        <div className="row-actions" style={{ marginTop: 0 }}>
          {user ? (
            <Link href="/lk" className="ghost-button">
              Личный кабинет
            </Link>
          ) : (
            <>
              <Link href="/login" className="ghost-button">
                Войти
              </Link>
              <Link href="/register" className="secondary-button">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="dnk-section program-page program-page__hero">
        <article className="panel program-page__main">
          <span className="eyebrow">Архивный маршрут</span>
          <h1>{program.title}</h1>
          <p className="program-page__lead">{program.description}</p>

          <div className="badge-row">
            <span className="badge badge-complete">{program.category}</span>
            <span className={getStatusClass(program.status)}>{getStatusLabel(program.status)}</span>
            <span className="badge badge-pending">Архивный маршрут</span>
          </div>

          <p className="panel-copy">
            Эта страница сохранена только как архивный маршрут. Для текущего MVP основной
            сценарий идет через LMS-каталог: страница курса, preview, покупка и обучение внутри
            кабинета.
          </p>

          <div className="row-actions catalog-product__actions">
            <Link href={catalogHref} className="primary-button">
              Открыть страницу курса
            </Link>
            <Link href="/#catalog" className="secondary-button">
              В каталог
            </Link>
          </div>
        </article>

        <aside className="panel program-page__aside">
          <span className="eyebrow">Статус маршрута</span>
          <div className="program-page__price-card">
            <span className="program-page__price-label">Стоимость</span>
            <strong>{formatMoney(program.price)}</strong>
            <p className="muted-text">
              Актуальная покупка и доступ оформляются только через LMS-страницу курса.
            </p>
          </div>
          <div className="program-page__facts">
            <div>
              <span>Маршрут</span>
              <strong>Архивный</strong>
            </div>
            <div>
              <span>Основной путь</span>
              <strong>/catalog/{program.slug}</strong>
            </div>
            <div>
              <span>Что дальше</span>
              <strong>Preview, покупка и обучение в LMS</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="dnk-section program-page__grid">
        <article className="panel program-page__section">
          <span className="eyebrow">Кому подходит</span>
          <h2>Для кого курс полезен</h2>
          <ul className="funnel-list">
            {program.audience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel program-page__section">
          <span className="eyebrow">Что внутри</span>
          <h2>Какие задачи закрывает курс</h2>
          <ul className="funnel-list">
            {program.tasks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel program-page__section">
          <span className="eyebrow">Куда идти дальше</span>
          <h2>Основной маршрут для MVP</h2>
          <ul className="funnel-list">
            <li>Откройте LMS-страницу курса, чтобы увидеть актуальный статус и формат доступа.</li>
            <li>Для платных курсов сначала доступны preview-уроки, затем обычная покупка курса.</li>
            <li>После оплаты курс открывается в кабинете и проходится внутри `/courses/:slug`.</li>
          </ul>
        </article>
      </section>

      {relatedPrograms.length > 0 ? (
        <section className="dnk-section">
          <div className="section-heading">
            <span className="section-heading__main">Архив</span>
            <span className="section-heading__divider">/</span>
            <span className="section-heading__sub">Соседние направления</span>
          </div>

          <div className="program-page__related-grid">
            {relatedPrograms.map((item) => (
              <article key={item.slug} className="program-highlight-card program-page__related-card">
                <div className="badge-row" style={{ marginTop: 0 }}>
                  <span className="badge badge-complete">{item.category}</span>
                  <span className={getStatusClass(item.status)}>{getStatusLabel(item.status)}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="showcase-course-card__footer">
                  <span className="showcase-course-card__price">{formatMoney(item.price)}</span>
                  <Link className="secondary-button" href={getCourseCatalogHref(item.slug)}>
                    Открыть страницу курса
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
