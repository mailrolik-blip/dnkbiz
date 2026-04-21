import LandingClassic from '@/components/landing-classic';
import { getLandingPageData } from '@/lib/landing';

export default async function LandingClassicPage() {
  const landingData = await getLandingPageData();

  return <LandingClassic {...landingData} />;
}
