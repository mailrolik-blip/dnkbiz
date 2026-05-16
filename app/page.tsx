import type { Metadata } from 'next';

import PublicHome from '@/components/public-home';
import { getLandingPageData } from '@/lib/landing';

export const metadata: Metadata = {
  title: 'DNK Academy MVP | Бизнес школа ДНК',
  description:
    'Зарегистрируйтесь бесплатно, посмотрите доступные курсы DNK Academy, откройте бесплатные уроки и продолжайте обучение в личном кабинете.',
};

export default async function Home() {
  const landingData = await getLandingPageData();

  return <PublicHome {...landingData} />;
}
