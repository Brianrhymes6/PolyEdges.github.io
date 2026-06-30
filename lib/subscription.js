export const TIERS = {
  starter: {
    id: 'starter',
    name: 'Free',
    price: 0,
    period: 'forever',
    usdtAmount: null,
    color: '#64748b',
    accentColor: 'rgba(100,116,139,0.15)',
    borderColor: 'rgba(100,116,139,0.3)',
    features: [
      'Top 5 markets (by volume)',
      'Quoted vs fair price view',
      'Gap & overround display',
      'Polymarket links',
    ],
    limits: { maxMarkets: 5, sorting: false, filtering: false, autoRefresh: false, csvExport: false },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 15,
    period: 'month',
    usdtAmount: '15000000', // 15 USDT (6 decimals)
    color: '#7c3aed',
    accentColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(124,58,237,0.4)',
    features: [
      'All multi-candidate markets',
      'Sort by volume / gap / overround',
      'Filter low-volume markets',
      'Real-time gap analysis',
      'Warning flags on suspicious gaps',
    ],
    limits: { maxMarkets: Infinity, sorting: true, filtering: true, autoRefresh: false, csvExport: false },
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 49,
    period: 'month',
    usdtAmount: '49000000', // 49 USDT (6 decimals)
    color: '#f59e0b',
    accentColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.4)',
    features: [
      'Everything in Pro',
      'Auto-refresh every 30 seconds',
      'CSV export of all gap data',
      'Priority data fetch (2 pages)',
      'Early access to new features',
    ],
    limits: { maxMarkets: Infinity, sorting: true, filtering: true, autoRefresh: true, csvExport: true },
  },
};

const KEY = 'polyedge_sub';

export function getSubscription() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const sub = JSON.parse(raw);
    // Check expiry for monthly tiers
    if (sub.expiresAt && Date.now() > sub.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return sub;
  } catch {
    return null;
  }
}

export function saveSubscription({ tier, txHash }) {
  const isMonthly = tier === 'pro' || tier === 'elite';
  const sub = {
    tier,
    txHash,
    paidAt: Date.now(),
    expiresAt: isMonthly ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
  };
  localStorage.setItem(KEY, JSON.stringify(sub));
  return sub;
}

export function clearSubscription() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function getTierLimits(tierId) {
  return TIERS[tierId]?.limits || TIERS.starter.limits;
}
