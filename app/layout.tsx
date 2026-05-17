import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';

import MobileBottomNav from '@/components/mobile-bottom-nav';

import './globals.css';

const sans = Manrope({
  variable: '--font-sans',
  subsets: ['cyrillic', 'latin'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Бизнес школа ДНК',
  description:
    'DNK Academy MVP: бесплатная регистрация, каталог курсов, бесплатные уроки и обучение в личном кабинете Бизнес школы ДНК.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
