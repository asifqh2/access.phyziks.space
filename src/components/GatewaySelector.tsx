'use client';

// src/components/GatewaySelector.tsx
//
// Payment gateway selector shown inside the PaymentButton flow.
// Lets the user choose between Razorpay and Cashfree before checkout.

import Image from 'next/image';

export type PaymentGateway = 'razorpay' | 'cashfree';

interface GatewaySelectorProps {
  selected:  PaymentGateway;
  onChange:  (gateway: PaymentGateway) => void;
  disabled?: boolean;
}

const GATEWAYS: { id: PaymentGateway; label: string; description: string }[] = [
  {
    id:          'razorpay',
    label:       'Razorpay',
    description: 'Cards, UPI, Net Banking, Wallets',
  },
  {
    id:          'cashfree',
    label:       'Cashfree',
    description: 'UPI, Cards, Net Banking, EMI',
  },
];

export default function GatewaySelector({ selected, onChange, disabled }: GatewaySelectorProps) {
  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
        Pay via
      </p>
      <div className="flex gap-2">
        {GATEWAYS.map((gw) => {
          const isSelected = selected === gw.id;
          return (
            <button
              key={gw.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(gw.id)}
              className={[
                'flex flex-1 flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              aria-pressed={isSelected}
              aria-label={`Pay with ${gw.label}`}
            >
              <GatewayIcon id={gw.id} />
              <span
                className={[
                  'mt-1.5 text-sm font-semibold',
                  isSelected ? 'text-indigo-700' : 'text-slate-700',
                ].join(' ')}
              >
                {gw.label}
              </span>
              <span className="mt-0.5 text-xs text-slate-400 leading-tight">
                {gw.description}
              </span>
              {isSelected && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  ✓ Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Simple SVG icons for each gateway ────────────────────────────────────────

function GatewayIcon({ id }: { id: PaymentGateway }) {
  if (id === 'razorpay') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#072654" />
        <path
          d="M9 23L14.5 9H18L21 14.5L17.5 23H14L16.5 16.5L14.5 12.5L11.5 23H9Z"
          fill="#3395FF"
        />
      </svg>
    );
  }

  // Cashfree
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1A1A2E" />
      <path
        d="M16 8C11.582 8 8 11.582 8 16C8 20.418 11.582 24 16 24C20.418 24 24 20.418 24 16C24 11.582 20.418 8 16 8ZM16 21C13.238 21 11 18.762 11 16C11 13.238 13.238 11 16 11C18.762 11 21 13.238 21 16C21 18.762 18.762 21 16 21Z"
        fill="#00E5C2"
      />
      <circle cx="16" cy="16" r="3" fill="#00E5C2" />
    </svg>
  );
}
