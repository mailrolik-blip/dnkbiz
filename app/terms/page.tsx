import type { Metadata } from 'next';

import { PublicPageShell } from '@/components/public-shell';
import { getOptionalCurrentUser } from '@/lib/auth';
import { publicTermsSections } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Оферта и условия | Бизнес школа ДНК',
  description: 'Публичные условия использования курсов и материалов Бизнес школы ДНК.',
};

export default async function TermsPage() {
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
          <span className="eyebrow">Условия</span>
          <h1>Базовые правила доступа к курсам, аккаунту и учебным материалам.</h1>
          <p className="panel-copy">
            Это короткая публичная версия условий использования платформы до и после покупки
            курса.
          </p>
        </article>

        <div className="public-copy-grid">
          {publicTermsSections.map((section) => (
            <article key={section.title} className="panel public-copy-card">
              <h2>{section.title}</h2>
              <p className="panel-copy">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
