import { useMemo } from 'react';

const WARN_THRESHOLD = 30; // percentage points

function WarningTooltip() {
  return (
    <span className="warn-icon" aria-label="Unusually large gap warning">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span className="warn-tip">
        Unusually large gap — may indicate thin liquidity or a data issue. Treat with caution.
      </span>
    </span>
  );
}

function GapBadge({ gapPct, hasLargeGap }) {
  const cls = Math.abs(gapPct) < 0.5 ? 'neutral' : gapPct > 0 ? 'positive' : 'negative';
  const sign = gapPct > 0 ? '+' : '';
  return (
    <span className={`gap-badge ${cls} ${hasLargeGap ? 'warn' : ''}`}>
      {hasLargeGap && <WarningTooltip />}
      {sign}{gapPct.toFixed(1)}pp
    </span>
  );
}

function formatVolume(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function formatDate(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function MarketCard({ market }) {
  const {
    question, url, volume24hr, volume, overround, candidates, isLowVolume, updatedAt,
  } = market;

  const dateStr = useMemo(() => formatDate(updatedAt), [updatedAt]);

  return (
    <article className={`market-card ${isLowVolume ? 'low-volume' : ''}`}>
      {/* ── Card Header ── */}
      <div className="card-header">
        <div className="card-header-left">
          <p className="card-question">{question}</p>
          <div className="card-meta">
            <span className={`vol-badge ${isLowVolume ? 'low' : 'high'}`}>
              {formatVolume(volume24hr)} 24h
            </span>
            {isLowVolume && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>⚠ Low volume</span>
            )}
            <span className="overround-badge">Overround {overround > 0 ? '+' : ''}{overround}pp</span>
            {dateStr && <span className="timestamp">Updated {dateStr}</span>}
          </div>
        </div>

        {url ? (
          <a className="card-link" href={url} target="_blank" rel="noopener noreferrer">
            View on Polymarket
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        ) : null}
      </div>

      {/* ── Candidates Table ── */}
      <table className="candidates-table">
        <thead>
          <tr>
            <th>Candidate / Outcome</th>
            <th className="right">Quoted</th>
            <th className="right">Fair</th>
            <th className="right">Gap ↑↓</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.outcome}>
              <td className="outcome-cell">{c.outcome}</td>
              <td className="price-cell">{c.quotedPct}%</td>
              <td className="price-cell">{c.fairPct}%</td>
              <td className="gap-cell">
                <GapBadge gapPct={c.gapPct} hasLargeGap={c.hasLargeGap} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
