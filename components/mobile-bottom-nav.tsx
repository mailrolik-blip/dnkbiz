'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

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

function shouldHideMobileBottomNav(pathname: string) {
  return pathname.startsWith('/admin') || pathname === '/login' || pathname === '/register';
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? '/';

  if (shouldHideMobileBottomNav(pathname)) {
    return null;
  }

  const items: MobileNavItem[] = [
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
    <nav aria-label="Нижняя мобильная навигация" className="mobile-bottom-nav">
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
