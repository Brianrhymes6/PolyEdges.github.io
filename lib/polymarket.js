const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const LOW_VOLUME_THRESHOLD = 5000;
const LARGE_GAP_THRESHOLD = 0.30;

/**
 * Polymarket's API returns individual binary (Yes/No) markets.
 * Multi-candidate events are expressed as multiple markets sharing the same
 * parent event ID, where each market's `groupItemTitle` is the candidate name
 * and outcomePrices[0] is the "Yes" (i.e. win) price for that candidate.
 *
 * Strategy:
 * 1. Fetch all active markets
 * 2. Group by parent event ID
 * 3. Only keep events with 3+ candidates
 * 4. Use each market's "Yes" outcomePrices[0] as the candidate's quoted price
 * 5. Validate, normalize, compute fair prices & gaps
 */

export async function fetchPolymarkets() {
  try {
    // Fetch a large batch; Gamma API default limit is low so we paginate
    const markets = await fetchAllMarkets();

    // Group individual markets by their parent event
    const eventMap = new Map();
    for (const m of markets) {
      const event = m.events?.[0];
      if (!event) continue;

      const eid = event.id;
      if (!eventMap.has(eid)) {
        eventMap.set(eid, {
          eventId: eid,
          title: event.title || event.slug || 'Unknown Event',
          slug: event.slug || null,
          url: event.slug ? `https://polymarket.com/event/${event.slug}` : null,
          volume24hr: parseFloat(event.volume24hr) || 0,
          volume: parseFloat(event.volume) || 0,
          updatedAt: event.updatedAt || null,
          markets: [],
        });
      }
      eventMap.get(eid).markets.push(m);
    }

    // Filter events with 3+ candidates and process them
    const processed = [];
    for (const ev of eventMap.values()) {
      if (ev.markets.length < 3) continue;
      const result = processEvent(ev);
      if (result) processed.push(result);
    }

    // Sort by 24h event volume (most liquid first)
    processed.sort((a, b) => b.volume24hr - a.volume24hr);

    return { markets: processed, error: null, fetchedAt: Date.now() };
  } catch (err) {
    console.error('[PolyEdge] Fetch error:', err.message);
    return { markets: [], error: err.message, fetchedAt: Date.now() };
  }
}

async function fetchAllMarkets() {
  // Fetch two pages to get a broad set — most multi-candidate events are popular
  const urls = [
    `${GAMMA_API_BASE}/markets?active=true&closed=false&limit=500&offset=0`,
    `${GAMMA_API_BASE}/markets?active=true&closed=false&limit=500&offset=500`,
  ];

  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    )
  );

  const allMarkets = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allMarkets.push(...r.value);
    }
  }

  if (allMarkets.length === 0) {
    throw new Error('No markets returned from Gamma API');
  }

  return allMarkets;
}

function processEvent(ev) {
  try {
    const candidates = [];

    for (const m of ev.markets) {
      // Candidate name: groupItemTitle is the per-candidate label
      const name = m.groupItemTitle?.trim() || m.question;
      if (!name) return null; // can't identify candidate, skip event

      // outcomePrices is a JSON-stringified array like ["0.65", "0.35"]
      // Index 0 = Yes (candidate wins), index 1 = No
      let prices;
      try {
        prices = JSON.parse(m.outcomePrices);
      } catch {
        return null; // malformed price data — exclude event
      }

      const yesPrice = parseFloat(prices?.[0]);

      // Strict validation: price must be a real positive number
      if (
        prices === null ||
        prices === undefined ||
        !Array.isArray(prices) ||
        prices.length < 1 ||
        isNaN(yesPrice) ||
        yesPrice <= 0 ||
        yesPrice > 1
      ) {
        // Any candidate with invalid price → exclude the whole event
        return null;
      }

      candidates.push({
        outcome: name,
        marketId: m.id,
        quotedPrice: yesPrice,
        volume24hr: parseFloat(m.volume24hr) || 0,
      });
    }

    if (candidates.length < 3) return null;

    // Sum of all Yes prices — this is the total (includes overround)
    const total = candidates.reduce((s, c) => s + c.quotedPrice, 0);
    if (total <= 0) return null;

    const overround = parseFloat(((total - 1) * 100).toFixed(2));

    // Compute fair prices & gaps
    const enriched = candidates
      .map((c) => {
        const fairPrice = c.quotedPrice / total;
        const gap = fairPrice - c.quotedPrice;
        return {
          ...c,
          quotedPct: parseFloat((c.quotedPrice * 100).toFixed(1)),
          fairPrice,
          fairPct: parseFloat((fairPrice * 100).toFixed(1)),
          gap,
          gapPct: parseFloat((gap * 100).toFixed(2)),
          hasLargeGap: Math.abs(gap) > LARGE_GAP_THRESHOLD,
        };
      })
      .sort((a, b) => b.quotedPrice - a.quotedPrice);

    return {
      id: ev.eventId,
      question: ev.title,
      slug: ev.slug,
      url: ev.url,
      volume: ev.volume,
      volume24hr: ev.volume24hr,
      overround,
      candidates: enriched,
      isLowVolume: ev.volume24hr < LOW_VOLUME_THRESHOLD,
      hasAnyLargeGap: enriched.some((c) => c.hasLargeGap),
      maxAbsGap: Math.max(...enriched.map((c) => Math.abs(c.gap))),
      updatedAt: ev.updatedAt,
    };
  } catch (err) {
    console.error('[PolyEdge] processEvent error:', err.message);
    return null;
  }
}
