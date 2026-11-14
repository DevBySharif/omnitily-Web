import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  CheckCircle,
  CurrencyDollar,
  Sliders,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

/**
 * Currency converter — live rates only.
 *
 * Rates come from Frankfurter (https://api.frankfurter.app/latest), a free,
 * keyless API that republishes the European Central Bank reference rates.
 * There are NO fallback or hard-coded rates anywhere in this file: the old
 * static table (0.92 EUR, 0.79 GBP, 158.42 JPY, 1.36 CAD per USD) was
 * fabricated and is deliberately not reproduced. When the API is
 * unreachable the UI shows an honest error and converts nothing.
 *
 * Integration note for the coordinator: the site's Content-Security-Policy
 * currently sets `connect-src 'self'` (vercel.json), which blocks a
 * cross-origin fetch to api.frankfurter.app from the live site. The fetch
 * works in this component's tests (mocked) and in a plain browser, but the
 * live deployment needs `https://api.frankfurter.app` added to `connect-src`
 * before this tool can convert on omnitily.vercel.app.
 */

export const FRANKFURTER_URL = 'https://api.frankfurter.app/latest';

/** Currencies Frankfurter serves (ECB reference-rate set, plus a few majors). */
export const SUPPORTED_CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'MXN', name: 'Mexican Peso' },
];

export interface LiveRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export function buildRatesUrl(base: string, targets: string[]): string {
  const unique = [...new Set(targets.filter((t) => t && t !== base))];
  const params = new URLSearchParams({ from: base });
  if (unique.length > 0) params.set('to', unique.join(','));
  return `${FRANKFURTER_URL}?${params.toString()}`;
}

/**
 * Fetch live rates from Frankfurter. `fetchImpl` is injectable so tests can
 * mock the endpoint (this sandbox has no external network). Throws a plain
 * Error with a user-facing message on any failure — network error, non-2xx,
 * malformed JSON, or a response that lacks a usable rate. Never returns a
 * fabricated rate.
 */
export async function fetchLiveRates(
  base: string,
  targets: string[],
  fetchImpl: typeof fetch = fetch
): Promise<LiveRates> {
  let response: Response;
  try {
    response = await fetchImpl(buildRatesUrl(base, targets));
  } catch {
    throw new Error('Could not reach the exchange-rate service. Check your connection and try again — no rate is shown instead of a guess.');
  }
  if (!response.ok) {
    throw new Error(`The exchange-rate service returned HTTP ${response.status}. No rate is shown instead of a guess — try again in a moment.`);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('The exchange-rate service returned an unreadable response. No rate is shown instead of a guess.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('The exchange-rate service returned an unexpected response. No rate is shown instead of a guess.');
  }
  const { base: respBase, date, rates } = data as { base?: unknown; date?: unknown; rates?: unknown };
  if (typeof respBase !== 'string' || typeof date !== 'string' || !rates || typeof rates !== 'object') {
    throw new Error('The exchange-rate service returned an incomplete response. No rate is shown instead of a guess.');
  }
  const cleanRates: Record<string, number> = {};
  for (const [code, value] of Object.entries(rates as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) cleanRates[code] = value;
  }
  if (Object.keys(cleanRates).length === 0) {
    throw new Error('The exchange-rate service returned no usable rates. No rate is shown instead of a guess.');
  }
  return { base: respBase, date, rates: cleanRates };
}

/** Pure conversion: amount x a verified live rate. Returns null for bad input. */
export function convertAmount(amount: number, rate: number): number | null {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) return null;
  return amount * rate;
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default function CurrencyConverter({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState<string>('100');
  const [from, setFrom] = useState<string>('USD');
  const [to, setTo] = useState<string>('EUR');
  const [rates, setRates] = useState<LiveRates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [converted, setConverted] = useState<number | null>(null);
  const requestRef = useRef(0);

  const loadRates = useCallback(async (base: string, target: string) => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError('');
    try {
      const live = await fetchLiveRates(base, [target]);
      if (requestRef.current !== requestId) return;
      setRates(live);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setRates(null);
      setConverted(null);
      setError(err instanceof Error ? err.message : 'Could not load live exchange rates.');
    } finally {
      if (requestRef.current === requestId) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates(from, to);
  }, [from, to, loadRates]);

  const handleConvert = () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Invalid Amount', 'Enter a non-negative number to convert.');
      return;
    }
    if (!rates || rates.base !== from) {
      toast.error('No Live Rates', 'Live rates have not loaded yet — convert only runs on a verified live rate.');
      return;
    }
    if (from === to) {
      setConverted(value);
      return;
    }
    const rate = rates.rates[to];
    if (typeof rate !== 'number') {
      setError(`The rate service did not return a ${from} → ${to} rate. Nothing was converted.`);
      setConverted(null);
      return;
    }
    const result = convertAmount(value, rate);
    if (result === null) {
      setError('The conversion could not be computed from the live rate.');
      setConverted(null);
      return;
    }
    setConverted(result);
    try {
      confetti({ particleCount: 50, spread: 40 });
    } catch (e) {}
    toast.success('Converted', `${formatMoney(value, from)} = ${formatMoney(result, to)} at the live rate.`);
  };

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
    setConverted(null);
  };

  const rate = from === to ? 1 : rates?.rates[to];
  const numericAmount = parseFloat(amount);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="currency-converter-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <CurrencyDollar className="w-8 h-8 text-[#10b981]" />
            Currency Converter
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Live exchange rates from the European Central Bank via Frankfurter (free, keyless API). No stored or estimated rates — if the service is unreachable, nothing is converted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a2a]">
            <Sliders className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-sans text-lg text-white">Convert</h2>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="currency-amount" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</label>
            <input
              id="currency-amount"
              data-testid="currency-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setConverted(null); }}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="currency-from" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">From</label>
            <select
              id="currency-from"
              data-testid="currency-from"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setConverted(null); }}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={swapCurrencies}
            aria-label="Swap currencies"
            className="self-center p-2 rounded-full border border-[#2a2a2a] text-gray-400 hover:text-[#10b981] hover:border-[#10b981]/50 transition-colors cursor-pointer"
          >
            <ArrowsLeftRight className="w-4 h-4" />
          </button>

          <div className="flex flex-col gap-2">
            <label htmlFor="currency-to" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">To</label>
            <select
              id="currency-to"
              data-testid="currency-to"
              value={to}
              onChange={(e) => { setTo(e.target.value); setConverted(null); }}
              className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleConvert}
            disabled={isLoading || !rates}
            data-testid="currency-convert"
            className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <ArrowsClockwise className="w-4 h-4 animate-spin" /> Loading Live Rates...
              </>
            ) : (
              <>Convert</>
            )}
          </button>

          <button
            onClick={() => loadRates(from, to)}
            disabled={isLoading}
            className="w-full py-2 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowsClockwise className="w-4 h-4" /> Refresh Rates
          </button>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {error && (
            <div data-testid="currency-error" className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/10 text-rose-300 text-xs flex items-start gap-2">
              <WarningCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase tracking-wider mb-1 text-[10px]">Live Rates Unavailable</span>
                {error}
              </div>
            </div>
          )}

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Result</span>
            {converted !== null && Number.isFinite(numericAmount) ? (
              <div data-testid="currency-result">
                <p className="text-3xl font-sans text-white">
                  {formatMoney(numericAmount, from)} ={' '}
                  <span className="text-[#10b981]">{formatMoney(converted, to)}</span>
                </p>
                {typeof rate === 'number' && (
                  <p data-testid="currency-rate" className="text-sm text-gray-400 mt-2">
                    1 {from} = {rate} {to}
                    {rates?.date ? ` · Rates as of ${rates.date} (ECB reference rates via Frankfurter)` : ''}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {isLoading
                  ? 'Loading live rates…'
                  : rates
                    ? 'Enter an amount and press Convert. The rate above is fetched live for every conversion.'
                    : 'Live rates have not loaded. Nothing is shown until the rate service answers.'}
              </p>
            )}
            {rates && converted === null && typeof rate === 'number' && (
              <p data-testid="currency-rate" className="text-sm text-gray-400 mt-3">
                1 {from} = {rate} {to}
                {rates.date ? ` · Rates as of ${rates.date} (ECB reference rates via Frankfurter)` : ''}
              </p>
            )}
          </div>

          <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 text-xs text-gray-400 font-medium leading-relaxed">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest block mb-2 font-mono">About These Rates</span>
            Rates are fetched live from api.frankfurter.app, which republishes the European Central Bank daily reference rates. Indicative rates for information only — your bank or card provider applies its own rate and fees. This tool stores no rates and never estimates one.
          </div>

          {converted !== null && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-950/20 border border-emerald-900/40 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Converted with the live rate shown above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
