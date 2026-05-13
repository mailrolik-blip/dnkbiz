import type { Metadata } from 'next';

import { PublicPageShell } from '@/components/public-shell';
import { publicPaymentSections } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Оплата и возврат | Бизнес Школа ДНК',
  description: 'Как проходит оплата курсов в DNK Biz и куда обращаться по вопросам возврата.',
};

export default function PaymentAndRefundPage() {
  return (
    <PublicPageShell>
      <section className="dnk-section public-copy-page">
        <article className="panel public-copy-page__hero">
          <span className="eyebrow">Оплата и возврат</span>
          <h1>Как проходит оплата и когда открывается доступ к курсу.</h1>
          <p className="panel-copy">
            Если курс оплачивается по QR СБП, после перевода нужно подтвердить оплату. Полный
            доступ открывается после ручной проверки заказа.
          </p>
        </article>

        <div className="public-copy-grid">
          {publicPaymentSections.map((section) => (
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
