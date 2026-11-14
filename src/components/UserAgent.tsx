import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  Copy,
  DeviceMobile,
  Desktop,
  Globe,
  Sliders,
  Trash,
} from '@phosphor-icons/react';
import { useToast } from './Toast';

export interface ParsedUserAgent {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: 'Mobile' | 'Tablet' | 'Desktop';
  engine: string;
  isBot: boolean;
}

/** Parse a user-agent string into browser, OS, device and engine. */
export function parseUserAgent(ua: string): ParsedUserAgent {
  const result: ParsedUserAgent = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    device: 'Desktop',
    engine: 'Unknown',
    isBot: /bot|crawl|spider|slurp|mediapartners|facebookexternalhit/i.test(ua),
  };

  // Device
  if (/ipad|tablet/i.test(ua) && !/mobile/i.test(ua)) result.device = 'Tablet';
  else if (/mobi|android|iphone|ipod|phone/i.test(ua)) result.device = 'Mobile';

  // OS — iOS first: its version follows "iPhone OS" / "CPU OS", not "Mac OS X".
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Windows NT ([\d.]+)/))) {
    result.os = 'Windows';
    result.osVersion = m[1];
  } else if ((m = ua.match(/(?:iPhone OS|CPU OS) ([\d_]+)/))) {
    result.os = 'iOS';
    result.osVersion = m[1].replace(/_/g, '.');
  } else if ((m = ua.match(/Mac OS X ([\d_]+)/))) {
    result.os = ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : 'macOS';
    result.osVersion = m[1].replace(/_/g, '.');
  } else if ((m = ua.match(/Android ([\d.]+)/))) {
    result.os = 'Android';
    result.osVersion = m[1];
  } else if (/Linux/.test(ua)) {
    result.os = 'Linux';
  } else if (/CrOS/.test(ua)) {
    result.os = 'ChromeOS';
  }

  // Browser — check Edge/Opera first, they also contain "Chrome".
  if ((m = ua.match(/Edg\/([\d.]+)/))) {
    result.browser = 'Edge';
    result.browserVersion = m[1];
  } else if ((m = ua.match(/OPR\/([\d.]+)/))) {
    result.browser = 'Opera';
    result.browserVersion = m[1];
  } else if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) {
    result.browser = 'Samsung Internet';
    result.browserVersion = m[1];
  } else if ((m = ua.match(/Chrome\/([\d.]+)/))) {
    result.browser = 'Chrome';
    result.browserVersion = m[1];
  } else if ((m = ua.match(/Firefox\/([\d.]+)/))) {
    result.browser = 'Firefox';
    result.browserVersion = m[1];
  } else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) {
    result.browser = 'Safari';
    result.browserVersion = m[1];
  } else if (/Safari/.test(ua)) {
    result.browser = 'Safari';
    result.browserVersion = '';
  }

  // Engine
  if (/AppleWebKit/.test(ua)) {
    result.engine = result.browser === 'Chrome' || result.browser === 'Edge' || result.browser === 'Opera'
      ? 'Blink'
      : 'WebKit';
  } else if (/Gecko/.test(ua)) {
    result.engine = 'Gecko';
  } else if (/Trident/.test(ua)) {
    result.engine = 'Trident';
  }

  return result;
}

export interface NavigatorInfo {
  language: string;
  languages: string[];
  platform: string;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  online: boolean;
  cookieEnabled: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  touchPoints: number;
}

export function getNavigatorInfo(): NavigatorInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    language: navigator.language,
    languages: [...navigator.languages],
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    touchPoints: navigator.maxTouchPoints,
  };
}

export const SAMPLE_USER_AGENTS: { label: string; ua: string }[] = [
  {
    label: 'Chrome on Windows 11',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
  {
    label: 'Safari on iPhone',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Firefox on Linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  },
  {
    label: 'Edge on macOS',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  },
];

export default function UserAgent({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [ua, setUa] = useState(() => (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
  const [isCopied, setIsCopied] = useState(false);

  const parsed = useMemo(() => parseUserAgent(ua), [ua]);
  const info = useMemo(() => {
    try {
      return getNavigatorInfo();
    } catch (e) {
      return null;
    }
  }, []);

  const copyUa = async () => {
    try {
      await navigator.clipboard.writeText(ua);
      setIsCopied(true);
      toast.success('Copied', 'The user-agent string is on your clipboard.');
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      toast.error('Copy Failed', 'Your browser blocked clipboard access.');
    }
  };

  const rows: [string, string][] = [
    ['Browser', parsed.browserVersion ? `${parsed.browser} ${parsed.browserVersion}` : parsed.browser],
    ['Operating System', parsed.osVersion ? `${parsed.os} ${parsed.osVersion}` : parsed.os],
    ['Device Type', parsed.device],
    ['Engine', parsed.engine],
    ['Bot?', parsed.isBot ? 'Yes — looks like a bot/crawler' : 'No'],
  ];

  const detailRows: [string, string][] = info
    ? [
        ['Language', info.language],
        ['Languages', info.languages.join(', ')],
        ['Platform', info.platform],
        ['CPU Cores', info.hardwareConcurrency === null ? 'Unknown' : String(info.hardwareConcurrency)],
        ['Device Memory', info.deviceMemory === null ? 'Unknown' : `~${info.deviceMemory} GB`],
        ['Online', info.online ? 'Yes' : 'No (offline)'],
        ['Cookies Enabled', info.cookieEnabled ? 'Yes' : 'No'],
        ['Screen', `${info.screenWidth} × ${info.screenHeight} @ ${info.devicePixelRatio}x`],
        ['Touch Points', String(info.touchPoints)],
      ]
    : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="user-agent-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Sliders className="w-8 h-8 text-[#10b981]" />
            User Agent Inspector
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Deconstruct a browser user-agent string — browser, operating system, device, and engine.
          </p>
        </div>
        <button
          onClick={() => setUa(navigator.userAgent)}
          className="text-xs font-semibold text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 px-3 py-1.5 rounded border border-emerald-900/50 transition-colors cursor-pointer"
        >
          Use My Browser
        </button>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="ua-input" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User-Agent String</label>
            <button
              onClick={copyUa}
              className="text-[11px] font-semibold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {isCopied ? 'Copied!' : 'Copy UA'}
            </button>
          </div>
          <textarea
            id="ua-input"
            value={ua}
            onChange={(e) => setUa(e.target.value)}
            placeholder="Paste a user-agent string here…"
            spellCheck={false}
            className="w-full h-20 text-sm font-mono border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] resize-y break-all"
          />
          <div className="flex flex-wrap gap-2">
            {SAMPLE_USER_AGENTS.map((s) => (
              <button
                key={s.label}
                onClick={() => setUa(s.ua)}
                className="text-xs font-semibold text-gray-300 bg-[#151515] border border-[#2a2a2a] hover:border-[#10b981]/50 rounded-full px-3 py-1 transition-colors cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div data-testid="ua-result" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="border border-[#2a2a2a] rounded-lg px-4 py-3 bg-[#151515] flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#10b981] shrink-0" />
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Browser</span>
              <span className="block text-sm font-bold text-white">{rows[0][1]}</span>
            </div>
          </div>
          <div className="border border-[#2a2a2a] rounded-lg px-4 py-3 bg-[#151515] flex items-center gap-3">
            <Desktop className="w-6 h-6 text-[#10b981] shrink-0" />
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Operating System</span>
              <span className="block text-sm font-bold text-white">{rows[1][1]}</span>
            </div>
          </div>
          <div className="border border-[#2a2a2a] rounded-lg px-4 py-3 bg-[#151515] flex items-center gap-3">
            <DeviceMobile className="w-6 h-6 text-[#10b981] shrink-0" />
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Device</span>
              <span className="block text-sm font-bold text-white">{rows[2][1]}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {rows.slice(3).map(([label, value]) => (
            <div key={label} className="flex gap-3 text-xs border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515]">
              <span className="font-bold text-gray-400 w-24 shrink-0">{label}</span>
              <span className="text-gray-200">{value}</span>
            </div>
          ))}
        </div>

        {detailRows.length > 0 && (
          <div className="border-t border-[#2a2a2a] pt-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              This Browser's Own Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {detailRows.map(([label, value]) => (
                <div key={label} className="flex gap-3 text-xs border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515]">
                  <span className="font-bold text-gray-400 w-32 shrink-0">{label}</span>
                  <span className="text-gray-200 break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setUa('')}
          className="self-start text-xs font-semibold text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Parsing is heuristic: user-agent strings are not standardised, so unusual or spoofed strings may
        report "Unknown".
      </p>
    </div>
  );
}
