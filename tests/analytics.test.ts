import { describe, expect, it, beforeEach } from 'vitest';
import { gaScriptUrl, getGaMeasurementId, initAnalytics } from '../src/lib/analytics';

const GA_SCRIPT_ID = 'omnitily-ga4-loader';

describe('GA4 analytics loader', () => {
  beforeEach(() => {
    document.getElementById(GA_SCRIPT_ID)?.remove();
    delete window.dataLayer;
    delete window.gtag;
  });

  it('returns null when no measurement ID is configured', () => {
    expect(getGaMeasurementId({})).toBeNull();
    expect(getGaMeasurementId({ VITE_GA_MEASUREMENT_ID: '' })).toBeNull();
    expect(getGaMeasurementId({ VITE_GA_MEASUREMENT_ID: '   ' })).toBeNull();
  });

  it('accepts a valid G- measurement ID and rejects malformed values', () => {
    expect(getGaMeasurementId({ VITE_GA_MEASUREMENT_ID: 'G-ABC123XYZ9' })).toBe('G-ABC123XYZ9');
    expect(getGaMeasurementId({ VITE_GA_MEASUREMENT_ID: 'UA-12345678-1' })).toBeNull();
    expect(getGaMeasurementId({ VITE_GA_MEASUREMENT_ID: 'G-abc' })).toBeNull();
    expect(getGaMeasurementId({ VITE_GA_MEASUREMENT_ID: 'not-a-ga-id' })).toBeNull();
  });

  it('builds the gtag script URL for a measurement ID', () => {
    expect(gaScriptUrl('G-ABC123XYZ9')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9',
    );
  });

  it('does not inject anything when the variable is unset', () => {
    expect(initAnalytics({})).toBe(false);
    expect(document.getElementById(GA_SCRIPT_ID)).toBeNull();
    expect(window.gtag).toBeUndefined();
  });

  it('injects the gtag script once when a measurement ID is configured', () => {
    expect(initAnalytics({ VITE_GA_MEASUREMENT_ID: 'G-ABC123XYZ9' })).toBe(true);

    const script = document.getElementById(GA_SCRIPT_ID);
    expect(script).not.toBeNull();
    expect(script?.getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9',
    );
    expect(typeof window.gtag).toBe('function');

    // Second call is a no-op: no duplicate script element.
    expect(initAnalytics({ VITE_GA_MEASUREMENT_ID: 'G-ABC123XYZ9' })).toBe(true);
    expect(document.querySelectorAll(`#${GA_SCRIPT_ID}`).length).toBe(1);
  });
});
