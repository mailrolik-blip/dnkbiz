import Link from 'next/link';
import { notFound } from 'next/navigation';

import ProgramRequestForm from '@/components/program-request-form';
import { getOptionalCurrentUser } from '@/lib/auth';
import {
  getProgramPageHref,
  getRelatedShowcasePrograms,
  getShowcaseProgramBySlug,
  showcasePrograms,
} from '@/lib/programs';

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

  return (
    <main className="page-shell">
      <header className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>БИЗНЕС ШКОЛА ДНК</span>
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
          <span className="eyebrow">Программа DNK Biz</span>
          <h1>{program.title}</h1>
          <p className="program-page__lead">{program.description}</p>

          <div className="badge-row">
            <span className="badge badge-complete">{program.category}</span>
            <span className={getStatusClass(program.status)}>
              {getStatusLabel(program.status)}
            </span>
            <span className="badge badge-complete">{program.format}</span>
          </div>

          <p className="panel-copy">{program.statusDescription}</p>

          <div className="row-actions">
            <a href="#program-request" className="primary-button">
              Оставить заявку
            </a>
            <a href="#program-request" className="secondary-button">
              Подобрать обучение для сотрудников
            </a>
          </div>
        </article>

        <aside className="panel program-page__aside">
          <span className="eyebrow">Следующий шаг</span>
          <div className="program-page__price-card">
            <span className="program-page__price-label">Стоимость</span>
            <strong>{formatMoney(program.price)}</strong>
            <p className="muted-text">
              {program.priceNote || 'Стоимость подтверждаем по выбранному формату.'}
            </p>
          </div>
          <div className="program-page__facts">
            <div>
              <span>Статус</span>
              <strong>{getStatusLabel(program.status)}</strong>
            </div>
            <div>
              <span>Формат</span>
              <strong>Онлайн через DNK Biz</strong>
            </div>
            <div>
              <span>Сценарий</span>
              <strong>Индивидуально или для команды</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="dnk-section program-page__grid">
        <article className="panel program-page__section">
          <span className="eyebrow">Кому подходит</span>
          <h2>Кому подойдет эта программа</h2>
          <ul className="funnel-list">
            {program.audience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel program-page__section">
          <span className="eyebrow">Что дает курс</span>
          <h2>Какие задачи закрывает программа</h2>
          <ul className="funnel-list">
            {program.tasks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel program-page__section">
          <span className="eyebrow">Формат</span>
          <h2>Как проходит обучение</h2>
          <p className="panel-copy">{program.format}</p>
          <ul className="funnel-list">
            {program.formatItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <ProgramRequestForm
          defaultEmail={user?.email ?? null}
          defaultName={user?.name ?? null}
          leadDescription={program.leadDescription}
          leadTitle={program.leadTitle}
          programSlug={program.slug}
          programTitle={program.title}
        />
      </section>

      {relatedPrograms.length > 0 ? (
        <section className="dnk-section">
          <div className="section-heading">
            <span className="section-heading__main">Каталог</span>
            <span className="section-heading__divider">/</span>
            <span className="section-heading__sub">Соседние программы</span>
          </div>

          <div className="program-page__related-grid">
            {relatedPrograms.map((item) => (
              <article key={item.slug} className="program-highlight-card program-page__related-card">
                <div className="badge-row" style={{ marginTop: 0 }}>
                  <span className="badge badge-complete">{item.category}</span>
                  <span className={getStatusClass(item.status)}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="showcase-course-card__footer">
                  <span className="showcase-course-card__price">
                    {formatMoney(item.price)}
                  </span>
                  <Link
                    className="secondary-button"
                    href={`${getProgramPageHref(item.slug)}#program-request`}
                  >
                    Оставить заявку
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
