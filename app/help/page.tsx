import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicPageShell } from '@/components/public-shell';
import { getOptionalCurrentUser } from '@/lib/auth';
import { publicContact, publicHelpSections } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Помощь | Бизнес школа ДНК',
  description:
    'Как выбрать курс, посмотреть первые уроки и получить доступ к обучению в Бизнес школе ДНК.',
};

export default async function HelpPage() {
  const currentUser = await getOptionalCurrentUser();
  const user = currentUser
    ? {
        email: currentUser.email,
        name: currentUser.name,
      }
    : null;

  return (
    <PublicPageShell user={user}>
      <section className="dnk-section public-copy-page">
        <article className="panel public-copy-page__hero">
          <span className="eyebrow">Помощь</span>
          <h1>Как выбрать курс и начать обучение.</h1>
          <p className="panel-copy">
            Здесь собраны короткие ответы на вопросы до покупки: как подобрать программу, где
            посмотреть ознакомительные уроки, как проходит оплата и когда открывается доступ.
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

        <div className="public-copy-grid">
          {publicHelpSections.map((section) => (
            <article key={section.title} className="panel public-copy-card">
              <h2>{section.title}</h2>
              <p className="panel-copy">{section.body}</p>
            </article>
          ))}
        </div>

        <article className="panel public-copy-card public-copy-card--accent">
          <span className="eyebrow">Поддержка</span>
          <h2>Если вопрос связан с оплатой, подготовьте номер заказа и название курса.</h2>
          <p className="panel-copy">
            По вопросам до покупки и после подтверждения оплаты удобнее всего использовать
            страницу контактов, Telegram или телефон.
          </p>
          <div className="public-contact-list">
            <a href={publicContact.phoneHref}>{publicContact.phoneLabel}</a>
            <a href={publicContact.telegramHref} rel="noreferrer" target="_blank">
              Telegram {publicContact.telegramLabel}
            </a>
          </div>
        </article>
      </section>
    </PublicPageShell>
  );
}
