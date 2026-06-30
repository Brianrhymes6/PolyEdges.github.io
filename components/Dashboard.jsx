'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import MarketCard from './MarketCard';
import Paywall from './Paywall';
import AnalysisReport from './AnalysisReport';
import { getSubscription, clearSubscription, TIERS } from '@/lib/subscription';

const SORTS = [
  { key: 'volume24hr', label: '24h Volume' },
  { key: 'maxAbsGap', label: 'Max Gap' },
  { key: 'overround', label: 'Overround' },
];

function exportCSV(markets) {
  const rows = [['Event', 'Candidate', 'Quoted %', 'Fair %', 'Gap pp', 'Volume 24h']];
  for (const m of markets) {
    for (const c of m.candidates) {
      rows.push([`"${m.question}"`, `"${c.outcome}"`, c.quotedPct, c.fairPct, c.gapPct, m.volume24hr.toFixed(2)]);
    }
  }
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'polyedge_gaps.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard({ initialMarkets, fetchError, fetchedAt }) {
  const [sub, setSub] = useState(null);
  const [subLoaded, setSubLoaded] = useState(false);
  const [sortKey, setSortKey] = useState('volume24hr');
  const [hideLowVol, setHideLowVol] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markets, setMarkets] = useState(initialMarkets);
  const [error, setError] = useState(fetchError);
  const [lastFetch, setLastFetch] = useState(fetchedAt);
  const [fetchTime, setFetchTime] = useState(null);
  
  // Analysis State
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState(null);

  const autoRefreshRef = useRef(null);

  // Load subscription from localStorage (client-only)
  useEffect(() => {
    const s = getSubscription();
    setSub(s);
    setSubLoaded(true);
  }, []);

  // Format time client-only (hydration fix)
  useEffect(() => {
    if (lastFetch) {
      setFetchTime(
        new Date(lastFetch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }
  }, [lastFetch]);

  const tier = sub ? TIERS[sub.tier] : null;
  const limits = tier?.limits ?? null;

  // Auto-refresh for Elite
  useEffect(() => {
    if (limits?.autoRefresh) {
      autoRefreshRef.current = setInterval(handleRefresh, 30000);
    }
    return () => clearInterval(autoRefreshRef.current);
  }, [limits?.autoRefresh]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/markets');
      const data = await res.json();
      if (data.success) { setMarkets(data.markets); setError(null); setLastFetch(data.fetchedAt); }
      else setError(data.error);
    } catch (e) { setError(e.message); }
    finally { setRefreshing(false); }
  }, []);

  const sorted = useMemo(() => {
    if (!limits) return [];
    let list = hideLowVol && limits.filtering ? markets.filter((m) => !m.isLowVolume) : [...markets];
    if (limits.sorting) list.sort((a, b) => b[sortKey] - a[sortKey]);
    if (limits.maxMarkets !== Infinity) list = list.slice(0, limits.maxMarkets);
    return list;
  }, [markets, sortKey, hideLowVol, limits]);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!analysisUrl) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: analysisUrl })
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        setAnalysisUrl('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  // Not loaded yet — avoid flash
  if (!subLoaded) return null;

  // No subscription → show paywall
  if (!sub) return <Paywall onSubscribed={(newSub) => setSub(newSub)} />;

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            <div className="logo-icon">P</div>
            <span className="logo-name">Poly<span>Edge</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Tier badge */}
            <span className="sub-tier-badge" style={{ background: tier.accentColor, borderColor: tier.borderColor, color: tier.color }}>
              {tier.name}
              {sub.expiresAt && (
                <span style={{ opacity: 0.7, fontSize: '0.65rem', marginLeft: '0.3rem' }}>
                  · expires {new Date(sub.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              )}
            </span>
            {fetchTime && <span className="header-refresh">{refreshing ? '⟳ Refreshing…' : `Updated ${fetchTime}`}</span>}
            <button className="logout-btn" onClick={() => { clearSubscription(); setSub(null); }} title="Change plan">↩ Plans</button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1 className="hero-title">Prediction Market<br />Mispricing Dashboard</h1>
          <p className="hero-sub">Surfaces fair-price gaps across Polymarket&apos;s multi-candidate markets in real time.</p>

          <div className="explainer">
            <span className="explainer-icon">💡</span>
            <p className="explainer-text">
              <strong>Overround</strong> is what bookmakers keep — when all candidates&apos; prices sum past 100%, that excess is the house margin.{' '}
              <strong>Fair price</strong> is each candidate&apos;s share after stripping the overround so probabilities sum to exactly 100%.{' '}
              <strong>Gap</strong> = fair − quoted. Positive = potentially underpriced; negative = overpriced. Large gaps often signal thin liquidity.
            </p>
          </div>

          {tier.id === 'elite' && (
            <form className="analyze-form" onSubmit={handleAnalyze}>
              <div className="analyze-input-wrap">
                <span className="analyze-icon">🤖</span>
                <input
                  type="url"
                  placeholder="Paste a Polymarket event link for Deep AI Analysis..."
                  className="analyze-input"
                  value={analysisUrl}
                  onChange={(e) => setAnalysisUrl(e.target.value)}
                  disabled={analyzing}
                  required
                />
                <button type="submit" className="analyze-btn" disabled={analyzing || !analysisUrl}>
                  {analyzing ? 'Analyzing...' : 'Deep Analyze'}
                </button>
              </div>
            </form>
          )}
          
          <AnalysisReport report={report} onClose={() => setReport(null)} />

          <div className="controls">
            <span className="controls-label">Sort by</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                className={`sort-btn ${sortKey === s.key ? 'active' : ''} ${!limits.sorting ? 'sort-btn--locked' : ''}`}
                onClick={() => limits.sorting && setSortKey(s.key)}
                title={!limits.sorting ? 'Upgrade to Pro to sort' : undefined}
              >
                {s.label} {!limits.sorting && '🔒'}
              </button>
            ))}
            <button
              className={`filter-toggle ${hideLowVol ? 'active' : ''} ${!limits.filtering ? 'sort-btn--locked' : ''}`}
              onClick={() => limits.filtering && setHideLowVol((v) => !v)}
              title={!limits.filtering ? 'Upgrade to Pro to filter' : undefined}
            >
              {hideLowVol ? '✓' : ''} Hide low-volume {!limits.filtering && '🔒'}
            </button>
            <button className="sort-btn" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? '⟳' : '↻'} Refresh
            </button>
            {limits.csvExport && (
              <button className="sort-btn" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }} onClick={() => exportCSV(sorted)}>
                ⬇ CSV
              </button>
            )}
            {limits.autoRefresh && (
              <span style={{ fontSize: '0.75rem', color: 'var(--green)', marginLeft: '0.25rem' }}>● Auto-refresh on</span>
            )}
          </div>

          {limits.maxMarkets !== Infinity && (
            <div className="upgrade-banner">
              🔒 Starter plan: showing top {limits.maxMarkets} markets. <button className="upgrade-link" onClick={() => { clearSubscription(); setSub(null); }}>Upgrade to Pro →</button>
            </div>
          )}

          <p className="count-badge">{sorted.length} market{sorted.length !== 1 ? 's' : ''} shown</p>
        </section>

        {error && markets.length === 0 && (
          <div className="state-card" style={{ marginBottom: '2rem' }}>
            <div className="state-icon">⚠️</div>
            <p className="state-title">Couldn&apos;t load market data</p>
            <p className="state-sub">{error}</p>
            <button className="retry-btn" onClick={handleRefresh}>Try again</button>
          </div>
        )}

        {sorted.length === 0 && !error ? (
          <div className="state-card">
            <div className="state-icon">🔍</div>
            <p className="state-title">No markets match your filters</p>
            <p className="state-sub">Try disabling the low-volume filter or refreshing.</p>
          </div>
        ) : (
          <div className="market-grid">
            {sorted.map((market) => <MarketCard key={market.id} market={market} />)}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <p>⚠️ <strong>Disclaimer:</strong> This is informational, not financial advice. Gaps reflect pricing differences in the market&apos;s structure, not predictions of outcomes.</p>
          <p style={{ marginTop: '0.4rem' }}>
            Data from <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer">Polymarket</a> via the{' '}
            <a href="https://gamma-api.polymarket.com" target="_blank" rel="noopener noreferrer">Gamma API</a>. Refreshed every 60s.
          </p>
        </div>
      </footer>
    </>
  );
}
