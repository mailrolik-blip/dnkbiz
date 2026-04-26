import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Условия использования | Бизнес школа ДНК',
  description: 'Короткие условия использования для MVP DNK Biz.',
};

const termsSections = [
  {
    title: 'Что такое сервис',
    body: 'DNK Biz — это self-serve LMS-платформа с бесплатными, платными и showcase-курсами. Пользовательский маршрут строится вокруг каталога, product page, checkout и обучения внутри кабинета.',
  },
  {
    title: 'Аккаунт пользователя',
    body: 'Пользователь отвечает за корректность email и за сохранность своих учетных данных. Передача аккаунта третьим лицам не допускается.',
  },
  {
    title: 'Доступ к курсам',
    body: 'Бесплатные курсы открываются сразу после входа. У платных курсов могут быть ознакомительные уроки, а полный доступ открывается после подтвержденной оплаты.',
  },
  {
    title: 'Статусы MVP',
    body: 'Платформа находится в MVP-стадии. Интерфейсы, описания и вспомогательные страницы могут обновляться без отдельного уведомления, если это не нарушает доступ к уже открытым курсам.',
  },
];

export default function TermsPage() {
  return (
    <main className="page-shell">
      <div className="top-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link href="/catalog" className="ghost-button">
            Каталог
          </Link>
          <Link href="/help" className="ghost-button">
            Помощь
          </Link>
          <Link href="/privacy" className="ghost-button">
            Privacy
          </Link>
        </div>
      </div>

      <section className="stack-grid utility-page">
        <article className="panel utility-page__hero">
          <span className="eyebrow">Terms</span>
          <h1>Условия использования MVP</h1>
          <p className="panel-copy">
            Ниже зафиксированы базовые правила использования текущей версии платформы.
          </p>
        </article>

        <div className="grid-two utility-grid">
          {termsSections.map((section) => (
            <article key={section.title} className="panel utility-card">
              <span className="eyebrow">Раздел</span>
              <h2>{section.title}</h2>
              <p className="panel-copy">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
