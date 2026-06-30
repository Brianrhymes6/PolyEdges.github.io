'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import MarketCard from './MarketCard';

const SORTS = [
  { key: 'volume24hr', label: '24h Volume' },
  { key: 'maxAbsGap', label: 'Max Gap' },
  { key: 'overround', label: 'Overround' },
];

export default function Dashboard({ initialMarkets, fetchError, fetchedAt }) {
  const [sortKey, setSortKey] = useState('volume24hr');
  const [hideLowVol, setHideLowVol] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markets, setMarkets] = useState(initialMarkets);
  const [error, setError] = useState(fetchError);
  const [lastFetch, setLastFetch] = useState(fetchedAt);
  // Client-only: avoids SSR/client hydration mismatch with toLocaleTimeString
  const [fetchTime, setFetchTime] = useState(null);

  useEffect(() => {
    if (lastFetch) {
      setFetchTime(
        new Date(lastFetch).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
      );
    }
  }, [lastFetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/markets');
      const data = await res.json();
      if (data.success) {
        setMarkets(data.markets);
        setError(null);
        setLastFetch(data.fetchedAt);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const sorted = useMemo(() => {
    let list = hideLowVol ? markets.filter((m) => !m.isLowVolume) : [...markets];
    list.sort((a, b) => b[sortKey] - a[sortKey]);
    return list;
  }, [markets, sortKey, hideLowVol]);

  return (
    <>
      {/* ── Header ── */}
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            <div className="logo-icon">P</div>
            <span className="logo-name">Poly<span>Edge</span></span>
          </div>
          {fetchTime && (
            <span className="header-refresh">
              {refreshing ? '⟳ Refreshing…' : `Updated ${fetchTime}`}
            </span>
          )}
        </div>
      </header>

      <main className="container">
        {/* ── Hero ── */}
        <section className="hero">
          <h1 className="hero-title">Prediction Market<br />Mispricing Dashboard</h1>
          <p className="hero-sub">
            Surfaces fair-price gaps across Polymarket&apos;s multi-candidate markets in real time.
          </p>

          {/* ── Explainer ── */}
          <div className="explainer">
            <span className="explainer-icon">💡</span>
            <p className="explainer-text">
              <strong>Overround</strong> is what bookmakers keep — when all candidates&apos; prices sum past 100%, that excess is the house margin.{' '}
              <strong>Fair price</strong> is each candidate&apos;s share after stripping out the overround, so the implied probabilities sum to exactly 100%.{' '}
              <strong>Gap</strong> = fair price − quoted price. A positive gap means the market may be underpricing that candidate relative to peers; negative means overpriced. Large gaps often signal thin liquidity, not real opportunity.
            </p>
          </div>

          {/* ── Controls ── */}
          <div className="controls">
            <span className="controls-label">Sort by</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                className={`sort-btn ${sortKey === s.key ? 'active' : ''}`}
                onClick={() => setSortKey(s.key)}
              >
                {s.label}
              </button>
            ))}
            <button
              className={`filter-toggle ${hideLowVol ? 'active' : ''}`}
              onClick={() => setHideLowVol((v) => !v)}
            >
              <span>{hideLowVol ? '✓' : ''}</span>
              Hide low-volume (&lt;$5k)
            </button>
            <button className="sort-btn" onClick={handleRefresh} disabled={refreshing} style={{ marginLeft: '0.25rem' }}>
              {refreshing ? '⟳' : '↻'} Refresh
            </button>
          </div>
          <p className="count-badge">{sorted.length} market{sorted.length !== 1 ? 's' : ''} shown</p>
        </section>

        {/* ── Error state ── */}
        {error && markets.length === 0 && (
          <div className="state-card" style={{ marginBottom: '2rem' }}>
            <div className="state-icon">⚠️</div>
            <p className="state-title">Couldn&apos;t load market data</p>
            <p className="state-sub">{error}</p>
            <button className="retry-btn" onClick={handleRefresh}>Try again</button>
          </div>
        )}

        {/* ── Partial error banner ── */}
        {error && markets.length > 0 && (
          <div style={{
            background: 'var(--amber-bg)', border: '1px solid var(--amber-border)',
            borderRadius: 'var(--radius-sm)', padding: '0.6rem 1rem',
            fontSize: '0.8rem', color: 'var(--amber)', marginBottom: '1rem'
          }}>
            ⚠️ Some data may be stale: {error}
          </div>
        )}

        {/* ── Market grid ── */}
        {sorted.length === 0 && !error ? (
          <div className="state-card">
            <div className="state-icon">🔍</div>
            <p className="state-title">No markets match your filters</p>
            <p className="state-sub">Try disabling the low-volume filter or refreshing the data.</p>
          </div>
        ) : (
          <div className="market-grid">
            {sorted.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <p>
            ⚠️ <strong>Disclaimer:</strong> This is informational, not financial advice. Gaps reflect pricing differences in the market&apos;s structure, not predictions of outcomes.
          </p>
          <p style={{ marginTop: '0.4rem' }}>
            Data sourced from <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer">Polymarket</a> via the{' '}
            <a href="https://gamma-api.polymarket.com" target="_blank" rel="noopener noreferrer">Gamma API</a>. Refreshed every 60 seconds.
          </p>
        </div>
      </footer>
    </>
  );
}
