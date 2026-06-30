'use client';
import { useState } from 'react';
import { TIERS, saveSubscription } from '@/lib/subscription';
import PaymentModal from './PaymentModal';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Paywall({ onSubscribed }) {
  const [selectedTier, setSelectedTier] = useState(null);

  function handleTierClick(tierId) {
    if (tierId === 'starter') {
      const sub = saveSubscription({ tier: 'starter', txHash: null });
      onSubscribed(sub);
    } else {
      setSelectedTier(tierId);
    }
  }

  return (
    <>
      <div className="paywall-root">
        <header className="header">
          <div className="container header-inner">
            <div className="logo">
              <div className="logo-icon">P</div>
              <span className="logo-name">Poly<span>Edge</span></span>
            </div>
          </div>
        </header>

        <main className="container paywall-main">
          <div className="paywall-hero">
            <h1 className="hero-title">Unlock Prediction Market<br />Intelligence</h1>
            <p className="hero-sub">
              Surface real-time mispricing across Polymarket&apos;s multi-candidate events. Choose the plan that fits you.
            </p>
          </div>

          {/* Tier cards */}
          <div className="tier-grid">
            {Object.values(TIERS).map((tier) => (
              <div
                key={tier.id}
                className={`tier-card ${tier.id === 'pro' ? 'tier-card--featured' : ''}`}
                style={{ '--tier-color': tier.color, '--tier-bg': tier.accentColor, '--tier-border': tier.borderColor }}
              >
                {tier.id === 'pro' && <div className="tier-popular-badge">Most Popular</div>}

                <div className="tier-header">
                  <h3 className="tier-name" style={{ color: tier.color }}>{tier.name}</h3>
                  <div className="tier-price">
                    {tier.price === 0 ? (
                      <span className="tier-price-amount" style={{ fontSize: '1.6rem' }}>Free</span>
                    ) : (
                      <>
                        <span className="tier-price-amount">${tier.price}</span>
                        <span className="tier-price-period">USDT / {tier.period}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="tier-features">
                  {tier.features.map((f) => (
                    <li key={f} className="tier-feature">
                      <span className="tier-check" style={{ color: tier.color }}><CheckIcon /></span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className="tier-btn"
                  style={{
                    background: tier.id === 'pro' ? `linear-gradient(135deg, ${tier.color}, #2563eb)` : 'transparent',
                    borderColor: tier.borderColor,
                    color: tier.id === 'pro' ? '#fff' : tier.color,
                  }}
                  onClick={() => handleTierClick(tier.id)}
                >
                  {tier.id === 'starter' ? '🚀 Start for Free' : tier.id === 'pro' ? '⚡ Go Pro — $15/mo' : '👑 Go Elite — $49/mo'}
                </button>
              </div>
            ))}
          </div>

          {/* Trust row */}
          <div className="trust-row">
            <span>🔐 On-chain payment</span>
            <span>⚡ Instant access</span>
            <span>🔗 Polygon USDT</span>
            <span>🦊 MetaMask required</span>
          </div>

          <p className="paywall-disclaimer">
            ⚠ This is informational, not financial advice. Gaps reflect market structure, not predictions of outcomes.
          </p>
        </main>
      </div>

      {selectedTier && (
        <PaymentModal
          tier={selectedTier}
          onSuccess={onSubscribed}
          onClose={() => setSelectedTier(null)}
        />
      )}
    </>
  );
}
