import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url || !url.includes('polymarket.com')) {
      return NextResponse.json({ success: false, error: 'Invalid Polymarket URL.' }, { status: 400 });
    }

    // ── MOCK AI DELAY ──
    // Simulating the time it takes an LLM to scrape the web and generate a report
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Extract slug for context
    const slugMatch = url.match(/event\/([^/]+)/);
    const slug = slugMatch ? slugMatch[1].replace(/-/g, ' ') : 'Unknown Event';

    // ── SIMULATED AI RESPONSE ──
    // In production, you would pass the URL to OpenAI/Gemini here.
    const mockReport = {
      marketTitle: slug.toUpperCase(),
      math: {
        impliedProb: 42.5,
        fairValue: 38.0,
        ev: -4.5,
        summary: "The market is currently pricing this event at 42.5%, but adjusting for the 4% overround and historical baseline rates, the true fair value sits closer to 38%. This indicates slight overpricing, making 'NO' the mathematically favorable EV play at current odds.",
      },
      technical: {
        trend: 'Bearish',
        support: 35,
        resistance: 45,
        summary: "Price has rejected the 45c resistance level three times in the past two weeks. Short-term momentum indicators suggest a bearish drift toward the 35c support floor unless new catalysts emerge.",
      },
      fundamental: {
        drivers: [
          "Upcoming regulatory announcements expected next Tuesday.",
          "Recent polling data showing a 2% decline in target demographic support.",
          "Broader macro weakness causing liquidity drains in high-risk prediction markets."
        ],
        summary: "Fundamentally, the narrative is waiting on the upcoming Tuesday announcement. Without a strong positive catalyst, the underlying mechanics do not support a sustained breakout above 50c.",
      },
      social: {
        bullishPct: 30,
        bearishPct: 70,
        keywords: ["Dump", "Overvalued", "WaitingOnNews", "Tuesday"],
        summary: "Sentiment analysis across Crypto Twitter and Reddit shows a predominantly bearish narrative (70%). Most high-engagement posts are questioning the current valuation, though a vocal minority believes the upcoming news is already priced in."
      }
    };

    return NextResponse.json({ success: true, report: mockReport });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
