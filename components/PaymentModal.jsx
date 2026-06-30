'use client';
import { useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { saveSubscription, TIERS } from '@/lib/subscription';

const POLYGON_CHAIN_ID = 137;
const POLYGON_CHAIN_ID_HEX = '0x89';
// USDT (Tether) on Polygon PoS — 6 decimals
const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const RECIPIENT = '0x9A2597ca42AE3bE91751E39EaC8D1d6bE362503D';
const USDT_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

const S = { idle: 'idle', connecting: 'connecting', switching: 'switching', sending: 'sending', confirming: 'confirming', done: 'done', error: 'error' };

export default function PaymentModal({ tier: tierId, onSuccess, onClose }) {
  const tier = TIERS[tierId];
  const [step, setStep] = useState(S.idle);
  const [txHash, setTxHash] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const busy = [S.connecting, S.switching, S.sending, S.confirming].includes(step);

  async function handlePay() {
    setErrMsg('');
    try {
      // ── 1. Check MetaMask ──
      if (typeof window === 'undefined' || !window.ethereum) {
        setErrMsg('MetaMask not detected. Please install it from metamask.io and refresh.');
        setStep(S.error);
        return;
      }

      // ── 2. Request wallet access ──
      setStep(S.connecting);
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // ── 3. Ensure Polygon network ──
      setStep(S.switching);
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== POLYGON_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
          });
        } catch (e) {
          if (e.code === 4902) {
            // Polygon not added yet — add it
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: POLYGON_CHAIN_ID_HEX,
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              }],
            });
          } else {
            throw new Error('Please switch to the Polygon network in MetaMask and try again.');
          }
        }
      }

      // ── 4. Get signer (re-init provider AFTER chain switch) ──
      setStep(S.sending);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Sanity-check we're on Polygon
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== POLYGON_CHAIN_ID) {
        throw new Error('Wallet is not on Polygon. Please switch and try again.');
      }

      // ── 5. Send USDT transfer ──
      const usdt = new Contract(USDT_CONTRACT, USDT_ABI, signer);
      const amount = parseUnits(tier.price.toString(), 6); // USDT = 6 decimals on Polygon
      const tx = await usdt.transfer(RECIPIENT, amount);

      setTxHash(tx.hash);
      setStep(S.confirming);

      // ── 6. Wait for 1 block confirmation ──
      await tx.wait(1);

      // ── 7. Save & unlock ──
      const sub = saveSubscription({ tier: tierId, txHash: tx.hash });
      setStep(S.done);
      setTimeout(() => onSuccess(sub), 1200);

    } catch (err) {
      console.error('[PolyEdge payment]', err);
      // User rejected
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setErrMsg('Transaction cancelled. No funds were sent.');
      } else {
        const msg = err?.reason || err?.shortMessage || err?.message || 'Something went wrong.';
        setErrMsg(msg.length > 140 ? msg.slice(0, 140) + '…' : msg);
      }
      setStep(S.error);
    }
  }

  const stepLabel = {
    [S.connecting]: '🔌 Connecting wallet…',
    [S.switching]: '🔄 Switching to Polygon…',
    [S.sending]: `💸 Sending ${tier.price} USDT…`,
    [S.confirming]: '⏳ Waiting for 1 confirmation…',
    [S.done]: '✅ Payment confirmed!',
  }[step] || null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} disabled={busy}>✕</button>

        <div className="modal-tier-badge" style={{ background: tier.accentColor, borderColor: tier.borderColor, color: tier.color }}>
          {tier.name}
        </div>

        <h2 className="modal-title">Complete Payment</h2>
        <p className="modal-sub">
          Pay <strong style={{ color: tier.color }}>{tier.price} USDT</strong> ({tier.period}) on Polygon via MetaMask
        </p>

        {/* Payment details */}
        <div className="modal-details">
          <div className="modal-detail-row"><span>Network</span><span>Polygon Mainnet</span></div>
          <div className="modal-detail-row"><span>Token</span><span>USDT (6 decimals)</span></div>
          <div className="modal-detail-row"><span>Amount</span><span style={{ color: tier.color, fontWeight: 700 }}>{tier.price} USDT</span></div>
          <div className="modal-detail-row">
            <span>Recipient</span>
            <span className="modal-addr" title={RECIPIENT}>{RECIPIENT.slice(0, 10)}…{RECIPIENT.slice(-8)}</span>
          </div>
        </div>

        {/* Step status */}
        {stepLabel && (
          <div className="modal-status">
            {step !== S.done && <span className="modal-spinner" />}
            {stepLabel}
          </div>
        )}

        {/* TX link */}
        {txHash && (
          <a className="modal-tx-link" href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            🔍 View transaction on PolygonScan ↗
          </a>
        )}

        {/* Error */}
        {step === S.error && errMsg && (
          <div className="modal-error">⚠ {errMsg}</div>
        )}

        {/* Success */}
        {step === S.done && (
          <div className="modal-success">🎉 Access granted! Opening your dashboard…</div>
        )}

        {/* Pay button */}
        {step !== S.done && (
          <button
            className="modal-pay-btn"
            style={{ background: `linear-gradient(135deg, ${tier.color}cc, ${tier.color}88)` }}
            onClick={handlePay}
            disabled={busy}
          >
            {busy ? 'Processing…' : `Pay ${tier.price} USDT with MetaMask`}
          </button>
        )}

        <p className="modal-note">
          Payments are on-chain and verifiable on PolygonScan. Access is stored in your browser. No account needed.
        </p>
      </div>
    </div>
  );
}
