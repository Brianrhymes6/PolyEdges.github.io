'use client';

export default function AnalysisReport({ report, onClose }) {
  if (!report) return null;

  return (
    <div className="analysis-report">
      <div className="report-header">
        <div>
          <h2 className="report-title">Deep Market Analysis</h2>
          <p className="report-subtitle">Event: {report.marketTitle}</p>
        </div>
        <button className="report-close" onClick={onClose}>✕</button>
      </div>

      <div className="report-grid">
        {/* Math & Quant */}
        <div className="report-card">
          <div className="report-card-header">
            <span className="report-icon">📐</span>
            <h3>Math &amp; Quantitative</h3>
          </div>
          <div className="report-card-content">
            <div className="metric-row">
              <span>Implied Probability</span>
              <span className="metric-value">{report.math.impliedProb}%</span>
            </div>
            <div className="metric-row">
              <span>Fair Value Estimate</span>
              <span className="metric-value">{report.math.fairValue}%</span>
            </div>
            <div className="metric-row">
              <span>Expected Value (EV)</span>
              <span className="metric-value" style={{ color: report.math.ev > 0 ? 'var(--green)' : 'var(--red)' }}>
                {report.math.ev > 0 ? '+' : ''}{report.math.ev}%
              </span>
            </div>
            <p className="report-text">{report.math.summary}</p>
          </div>
        </div>

        {/* Technical */}
        <div className="report-card">
          <div className="report-card-header">
            <span className="report-icon">📈</span>
            <h3>Technical Setup</h3>
          </div>
          <div className="report-card-content">
            <div className="metric-row">
              <span>Trend (7d)</span>
              <span className="metric-value" style={{ color: report.technical.trend === 'Bullish' ? 'var(--green)' : 'var(--red)' }}>
                {report.technical.trend}
              </span>
            </div>
            <div className="metric-row">
              <span>Support / Resistance</span>
              <span className="metric-value">{report.technical.support}% / {report.technical.resistance}%</span>
            </div>
            <p className="report-text">{report.technical.summary}</p>
          </div>
        </div>

        {/* Fundamental */}
        <div className="report-card report-card-full">
          <div className="report-card-header">
            <span className="report-icon">📰</span>
            <h3>Fundamental Drivers</h3>
          </div>
          <div className="report-card-content">
            <ul className="driver-list">
              {report.fundamental.drivers.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="report-text" style={{ marginTop: '0.75rem' }}>{report.fundamental.summary}</p>
          </div>
        </div>

        {/* Social Media */}
        <div className="report-card report-card-full">
          <div className="report-card-header">
            <span className="report-icon">🌐</span>
            <h3>Social Media Trends (X / Reddit)</h3>
          </div>
          <div className="report-card-content">
            <div className="sentiment-bar">
              <div className="sentiment-fill bullish" style={{ width: `${report.social.bullishPct}%` }}>{report.social.bullishPct}% Bull</div>
              <div className="sentiment-fill bearish" style={{ width: `${report.social.bearishPct}%` }}>{report.social.bearishPct}% Bear</div>
            </div>
            <div className="social-keywords">
              {report.social.keywords.map(kw => <span key={kw} className="keyword-tag">#{kw}</span>)}
            </div>
            <p className="report-text">{report.social.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
