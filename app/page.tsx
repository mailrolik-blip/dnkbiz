import PublicHome from '@/components/public-home';
import { getLandingPageData } from '@/lib/landing';

export default async function Home() {
  const landingData = await getLandingPageData();

  return <PublicHome {...landingData} />;
}
