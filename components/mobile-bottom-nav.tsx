'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type MobileNavItem = {
  disabled?: boolean;
  href: string;
  icon: ReactNode;
  isActive: boolean;
  label: string;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13V10.5" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
    </svg>
  );
}

function LearnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 6v12" />
      <path d="M6 9.5V18h12V9.5" />
      <path d="M4 8.5 12 4l8 4.5-8 4L4 8.5Z" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v6A2.5 2.5 0 0 1 17.5 16H11l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5v-6Z" />
      <path d="M8.5 9.5h7" />
      <path d="M8.5 12.5H13" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c1.35-3 3.82-4.5 6.5-4.5s5.15 1.5 6.5 4.5" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 7.5h12l-1.1 9.2A2 2 0 0 1 14.91 18H9.09a2 2 0 0 1-1.99-1.3L6 7.5Z" />
      <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}

function AccessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function shouldHideMobileBottomNav(pathname: string) {
  return pathname === '/login' || pathname === '/register';
}

function isAdminHashActive(hash: string, section: 'overview' | 'courses' | 'orders' | 'accesses') {
  if (section === 'overview') {
    return hash === '' || hash === '#admin-overview';
  }

  if (section === 'courses') {
    return (
      hash === '#admin-courses' ||
      hash.startsWith('#admin-course') ||
      hash === '#admin-lessons' ||
      hash === '#admin-tariffs'
    );
  }

  if (section === 'orders') {
    return hash === '#manual-review' || hash === '#admin-orders';
  }

  return hash === '#admin-accesses' || hash === '#admin-users';
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? '/';
  const [hash, setHash] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);

    return () => {
      window.removeEventListener('hashchange', syncHash);
    };
  }, [pathname]);

  if (shouldHideMobileBottomNav(pathname)) {
    return null;
  }

  const isAdminRoute = pathname.startsWith('/admin');

  const items: MobileNavItem[] = isAdminRoute
    ? [
        {
          href: '/admin#admin-overview',
          icon: <HomeIcon />,
          isActive: pathname === '/admin' && isAdminHashActive(hash, 'overview'),
          label: 'Обзор',
        },
        {
          href: '/admin#admin-courses',
          icon: <CoursesIcon />,
          isActive: pathname === '/admin' && isAdminHashActive(hash, 'courses'),
          label: 'Курсы',
        },
        {
          href: '/admin#manual-review',
          icon: <OrdersIcon />,
          isActive: pathname === '/admin' && isAdminHashActive(hash, 'orders'),
          label: 'Заказы',
        },
        {
          href: '/admin#admin-accesses',
          icon: <AccessIcon />,
          isActive: pathname === '/admin' && isAdminHashActive(hash, 'accesses'),
          label: 'Доступы',
        },
        {
          href: '/admin/help',
          icon: <MoreIcon />,
          isActive: pathname === '/admin/help',
          label: 'Ещё',
        },
      ]
    : [
        {
          href: '/',
          icon: <HomeIcon />,
          isActive: pathname === '/',
          label: 'Главная',
        },
        {
          href: '/catalog',
          icon: <CoursesIcon />,
          isActive:
            pathname === '/catalog' ||
            pathname.startsWith('/catalog/') ||
            pathname === '/checkout' ||
            pathname.startsWith('/checkout/'),
          label: 'Курсы',
        },
        {
          href: '/lk',
          icon: <LearnIcon />,
          isActive: pathname === '/lk' || pathname.startsWith('/courses/'),
          label: 'Мои курсы',
        },
        {
          disabled: true,
          href: '#',
          icon: <TeacherIcon />,
          isActive: false,
          label: 'AI учитель',
        },
        {
          href: '/profile',
          icon: <ProfileIcon />,
          isActive: pathname === '/profile',
          label: 'Настройки',
        },
      ];

  return (
    <nav
      aria-label={
        isAdminRoute
          ? 'Нижняя навигация админки'
          : 'Нижняя мобильная навигация'
      }
      className={`mobile-bottom-nav ${isAdminRoute ? 'mobile-bottom-nav--admin' : ''}`}
    >
      <div className="mobile-bottom-nav__list">
        {items.map((item) =>
          item.disabled ? (
            <button
              key={item.label}
              aria-disabled="true"
              className="mobile-bottom-nav__item mobile-bottom-nav__item--placeholder"
              type="button"
            >
              <span className="mobile-bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.label}
              aria-current={item.isActive ? 'page' : undefined}
              className={`mobile-bottom-nav__item ${
                item.isActive ? 'mobile-bottom-nav__item--active' : ''
              }`}
              href={item.href}
            >
              <span className="mobile-bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
