'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buildAuthHref } from '@/lib/auth-intent';
import {
  publicBrandLead,
  publicBrandName,
  publicContact,
  publicFooterGroups,
  publicPrimaryNav,
} from '@/lib/public-site';

type PublicUser = {
  email: string;
  name: string | null;
} | null;

export function PublicHeader({ user }: { user: PublicUser }) {
  const pathname = usePathname() ?? '/';
  const loginHref = buildAuthHref('login', pathname);
  const registerHref = buildAuthHref('register', pathname);

  return (
    <header className="top-nav public-top-nav">
      <Link href="/" className="brand">
        <span className="brand-mark" />
        <span>{publicBrandName}</span>
      </Link>

      <div className="public-top-nav__cluster">
        <nav aria-label="Публичная навигация" className="public-top-nav__links">
          {publicPrimaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'page' : undefined
              }
              className="public-top-nav__link"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="public-top-nav__actions">
          {user ? (
            <Link href="/lk" className="secondary-button">
              Личный кабинет
            </Link>
          ) : pathname === '/login' ? (
            <Link href={registerHref} className="secondary-button">
              Регистрация
            </Link>
          ) : pathname === '/register' ? (
            <Link href={loginHref} className="ghost-button">
              Войти
            </Link>
          ) : (
            <>
              <Link href={loginHref} className="ghost-button">
                Войти
              </Link>
              <Link href={registerHref} className="secondary-button">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer public-footer">
      <div className="public-footer__lead-block">
        <div className="public-footer__brand">
          <span className="eyebrow">Бизнес-школа ДНК</span>
          <h2>{publicBrandName}</h2>
          <p className="site-footer__lead">{publicBrandLead}</p>
        </div>

        <div className="public-footer__contact-card">
          <strong>Контакты</strong>
          <div className="public-contact-list public-contact-list--stack">
            <a href={publicContact.phoneHref}>{publicContact.phoneLabel}</a>
            <a href={publicContact.telegramHref} rel="noreferrer" target="_blank">
              Telegram {publicContact.telegramLabel}
            </a>
            <a href={publicContact.instagramHref} rel="noreferrer" target="_blank">
              Instagram {publicContact.instagramLabel}
            </a>
          </div>
          <p>{publicContact.locationLabel}</p>
        </div>
      </div>

      <div className="site-footer__cols public-footer__cols">
        {publicFooterGroups.map((group) => (
          <section key={group.title}>
            <strong>{group.title}</strong>
            <div className="public-footer__links">
              {group.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="footer-note public-footer__bottom">
        <span>© 2026 {publicBrandName}. Все права защищены.</span>
        <div className="footer-note__links">
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/terms">Оферта и условия</Link>
          <Link href="/payment-and-refund">Оплата и возврат</Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicPageShell({
  children,
  user = null,
}: {
  children: ReactNode;
  user?: PublicUser;
}) {
  return (
    <main className="page-shell public-page-shell">
      <PublicHeader user={user} />
      <div className="public-page-shell__body">{children}</div>
      <PublicFooter />
    </main>
  );
}
