import LandingSales from '@/components/landing-sales';
import { getLandingPageData } from '@/lib/landing';

export default async function LandingSalesPage() {
  const landingData = await getLandingPageData();

  return <LandingSales {...landingData} />;
}
