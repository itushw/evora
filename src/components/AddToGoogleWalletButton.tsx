import { useState } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { createGoogleWalletPass, type GoogleWalletPassResponse } from '../lib/api.ts';
import type { IssuedTicketPass, TicketOrder } from '../types/ticketing.ts';

interface AddToGoogleWalletButtonProps {
  order: TicketOrder;
  pass: IssuedTicketPass;
  compact?: boolean;
}

function GoogleWalletIcon() {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 24 18"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="22" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M1 5.5H23" stroke="currentColor" strokeWidth="1.6" />
      <path d="M1 9H23" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      <path
        d="M8.5 11.5C9.5 12.8 11 13.5 12 13.5C13 13.5 14.5 12.8 15.5 11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AddToGoogleWalletButton({
  order,
  pass,
  compact = false,
}: AddToGoogleWalletButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [walletResponse, setWalletResponse] = useState<GoogleWalletPassResponse | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const result = await createGoogleWalletPass(order, pass.ticketId);
      setWalletResponse(result);

      if (result.ready && result.saveUrl) {
        const anchor = document.createElement('a');
        anchor.href = result.saveUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      }
    } catch (err: unknown) {
      setErrorText(
        err instanceof Error ? err.message : 'Unable to prepare Google Wallet pass.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWalletJson = () => {
    if (!walletResponse) return;
    const blob = new Blob([JSON.stringify(walletResponse.passPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pass.ticketId}-google-wallet-pass.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={compact ? 'inline-flex flex-col items-end gap-2' : 'space-y-3'}>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#000000] bg-[#000000] active:bg-[#282828] disabled:opacity-50 text-[#ffffff] font-medium whitespace-nowrap ${
          compact ? 'px-3.5 py-2 text-xs' : 'px-4 py-2.5 text-xs'
        }`}
      >
        <GoogleWalletIcon />
        <span>
          {loading
            ? 'Preparing...'
            : compact
              ? 'Google Wallet'
              : 'Add to Google Wallet'}
        </span>
      </button>

      {errorText ? (
        <p role="alert" className="text-xs text-[#b42318]">
          {errorText}
        </p>
      ) : null}

      {walletResponse?.ready && walletResponse.saveUrl ? (
        <div className="border border-[#166534]/40 glass-light rounded-xl px-4 py-3 text-xs text-[#000000] flex flex-wrap items-center justify-between gap-3">
          <span>Google Wallet pass link ready for {pass.ticketId}.</span>
          <a
            href={walletResponse.saveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-[#166534] underline whitespace-nowrap"
          >
            <span>Open in Google Wallet</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      ) : null}

      {walletResponse && !walletResponse.ready ? (
        <div className="border border-[#e2e2e2] bg-[#f3f3f3] rounded-xl p-4 text-xs text-[#000000] space-y-3 max-w-md text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#000000]">
                Google Wallet pass prepared ({pass.ticketId})
              </p>
              <p className="mt-1 text-[#5e5e5e] leading-relaxed">
                Live one-tap saving activates once the server has Google Wallet Issuer credentials configured (
                <span className="font-mono-tabular text-[#000000]">
                  {(walletResponse.missingEnvVars || []).join(', ')}
                </span>
                ).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWalletResponse(null)}
              aria-label="Close Google Wallet notice"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#e2e2e2] bg-[#ffffff] text-[#000000]"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadWalletJson}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-1.5 text-xs font-medium text-[#000000]"
            >
              <Download size={12} aria-hidden="true" />
              <span>Download Wallet Pass JSON</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
