import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';

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
  title: 'Бизнес Школа ДНК',
  description:
    'Платформа Бизнес Школы ДНК: регистрация, вход, личный кабинет, оформление тарифа и доступ к закрытому курсу с сохранением прогресса.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
