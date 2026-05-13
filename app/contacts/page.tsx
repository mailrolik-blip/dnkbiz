import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicPageShell } from '@/components/public-shell';
import { publicContact } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Контакты | Бизнес Школа ДНК',
  description: 'Контакты DNK Biz: адрес, телефон и мессенджеры для вопросов по курсам и оплате.',
};

export default function ContactsPage() {
  return (
    <PublicPageShell>
      <section className="dnk-section public-copy-page">
        <article className="panel public-copy-page__hero">
          <span className="eyebrow">Контакты</span>
          <h1>Связь по выбору курса, оплате и доступу к обучению.</h1>
          <p className="panel-copy">
            Если вам нужно подобрать программу, уточнить формат оплаты или проверить статус
            заказа, используйте удобный канал связи ниже.
          </p>
        </article>

        <div className="public-grid public-grid--split public-contact-page-grid">
          <article className="panel public-copy-card public-contact-sheet">
            <h2>Каналы связи</h2>
            <p className="panel-copy">
              Для быстрых вопросов по выбору курса подойдет телефон. Если нужно прислать номер
              заказа или уточнить оплату, удобнее написать в Telegram.
            </p>

            <div className="public-contact-sheet__list">
              <a href={publicContact.phoneHref} className="public-contact-sheet__item">
                <span>Телефон</span>
                <strong>{publicContact.phoneLabel}</strong>
                <small>Быстрые вопросы по курсам и доступу</small>
              </a>

              <a
                href={publicContact.telegramHref}
                className="public-contact-sheet__item"
                rel="noreferrer"
                target="_blank"
              >
                <span>Telegram</span>
                <strong>{publicContact.telegramLabel}</strong>
                <small>Уточнение оплаты, номера заказа и следующего шага</small>
              </a>

              <a
                href={publicContact.instagramHref}
                className="public-contact-sheet__item"
                rel="noreferrer"
                target="_blank"
              >
                <span>Instagram</span>
                <strong>{publicContact.instagramLabel}</strong>
                <small>Дополнительный публичный канал связи</small>
              </a>
            </div>
          </article>

          <article className="panel public-copy-card">
            <h2>{publicContact.address[1]}</h2>
            <p className="panel-copy">
              Если вопрос связан с оплатой, подготовьте номер заказа и название курса, чтобы
              быстрее сверить статус.
            </p>
            <ul className="utility-list utility-list--bullets">
              {publicContact.address.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="panel public-copy-card public-copy-card--accent public-contact-next">
          <h2>Если вы только выбираете курс, начните с каталога.</h2>
          <p className="panel-copy">
            Так проще понять, какое направление вам подходит и есть ли у курса ознакомительные
            уроки до оплаты.
          </p>
          <div className="row-actions">
            <Link href="/catalog" className="primary-button">
              Открыть каталог
            </Link>
            <Link href="/payment-and-refund" className="secondary-button">
              Оплата и возврат
            </Link>
          </div>
        </article>
      </section>
    </PublicPageShell>
  );
}
