import { NextResponse } from 'next/server';
import { fetchPolymarkets } from '@/lib/polymarket';

export const revalidate = 60;

export async function GET() {
  const { markets, error, fetchedAt } = await fetchPolymarkets();

  if (error && markets.length === 0) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  return NextResponse.json({ success: true, markets, fetchedAt });
}
