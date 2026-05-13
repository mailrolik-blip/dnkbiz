import type { Metadata } from 'next';

import { PublicPageShell } from '@/components/public-shell';
import { publicTermsSections } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Оферта и условия | Бизнес Школа ДНК',
  description: 'Публичные условия использования курсов и платформы DNK Biz.',
};

export default function TermsPage() {
  return (
    <PublicPageShell>
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
