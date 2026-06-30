import { fetchPolymarkets } from '@/lib/polymarket';
import Dashboard from '@/components/Dashboard';

export const revalidate = 60;

export default async function Home() {
  const { markets, error, fetchedAt } = await fetchPolymarkets();
  return <Dashboard initialMarkets={markets} fetchError={error} fetchedAt={fetchedAt} />;
}
