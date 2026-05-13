import type { Metadata } from 'next';

import PublicHome from '@/components/public-home';
import { getLandingPageData } from '@/lib/landing';

export const metadata: Metadata = {
  title: 'Курсы 1С, Excel, маркетинга и охраны труда | DNK Biz',
  description:
    'Зарегистрируйтесь бесплатно и получите доступ к стартовым курсам и первым урокам платных программ DNK Biz для работы и повышения квалификации.',
};

export default async function Home() {
  const landingData = await getLandingPageData();

  return <PublicHome {...landingData} />;
}
