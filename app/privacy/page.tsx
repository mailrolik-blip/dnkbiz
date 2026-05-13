import type { Metadata } from 'next';

import { PublicPageShell } from '@/components/public-shell';
import { publicPrivacySections } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | Бизнес Школа ДНК',
  description: 'Краткая политика конфиденциальности для публичной части DNK Biz.',
};

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      <section className="dnk-section public-copy-page">
        <article className="panel public-copy-page__hero">
          <span className="eyebrow">Конфиденциальность</span>
          <h1>Какие данные использует платформа и зачем это нужно пользователю.</h1>
          <p className="panel-copy">
            Ниже описано, какие данные нужны для регистрации, покупки курсов, доступа к обучению
            и обращения в поддержку.
          </p>
        </article>

        <div className="public-copy-grid">
          {publicPrivacySections.map((section) => (
            <article key={section.title} className="panel public-copy-card">
              <h2>{section.title}</h2>
              <ul className="utility-list utility-list--bullets">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
