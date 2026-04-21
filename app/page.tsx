import LandingClient from '@/components/landing-client';
import { getLandingPageData } from '@/lib/landing';

export default async function Home() {
  const landingData = await getLandingPageData();

  return <LandingClient {...landingData} />;
}
