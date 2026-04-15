import { CountryData } from '../types';

export const countries: CountryData[] = [
  // ─── North America ────────────────────────────
  { code: 'US', name: 'United States', lat: 38.0, lng: -97.0 },
  { code: 'CA', name: 'Canada', lat: 56.0, lng: -106.0 },
  { code: 'MX', name: 'Mexico', lat: 23.0, lng: -102.0 },

  // ─── South America ────────────────────────────
  { code: 'BR', name: 'Brazil', lat: -14.0, lng: -51.0 },
  { code: 'AR', name: 'Argentina', lat: -38.0, lng: -63.0 },
  { code: 'CO', name: 'Colombia', lat: 4.0, lng: -72.0 },

  // ─── Europe ────────────────────────────────────
  { code: 'GB', name: 'United Kingdom', lat: 55.0, lng: -3.0 },
  { code: 'DE', name: 'Germany', lat: 51.0, lng: 9.0 },
  { code: 'FR', name: 'France', lat: 46.0, lng: 2.0 },
  { code: 'NL', name: 'Netherlands', lat: 52.0, lng: 5.0 },
  { code: 'SE', name: 'Sweden', lat: 60.0, lng: 18.0 },
  { code: 'PL', name: 'Poland', lat: 51.0, lng: 20.0 },
  { code: 'IT', name: 'Italy', lat: 41.0, lng: 12.0 },
  { code: 'ES', name: 'Spain', lat: 40.0, lng: -4.0 },
  { code: 'UA', name: 'Ukraine', lat: 48.0, lng: 31.0 },
  { code: 'RO', name: 'Romania', lat: 45.0, lng: 25.0 },

  // ─── Eastern Europe / CIS ─────────────────────
  { code: 'RU', name: 'Russia', lat: 61.0, lng: 105.0 },

  // ─── Middle East ──────────────────────────────
  { code: 'IR', name: 'Iran', lat: 32.0, lng: 53.0 },
  { code: 'IL', name: 'Israel', lat: 31.0, lng: 34.0 },
  { code: 'SA', name: 'Saudi Arabia', lat: 23.0, lng: 45.0 },
  { code: 'AE', name: 'UAE', lat: 23.0, lng: 53.0 },
  { code: 'TR', name: 'Turkey', lat: 38.0, lng: 35.0 },

  // ─── Asia ─────────────────────────────────────
  { code: 'CN', name: 'China', lat: 35.0, lng: 105.0 },
  { code: 'JP', name: 'Japan', lat: 36.0, lng: 138.0 },
  { code: 'KR', name: 'South Korea', lat: 35.0, lng: 127.0 },
  { code: 'KP', name: 'North Korea', lat: 40.0, lng: 127.0 },
  { code: 'IN', name: 'India', lat: 20.0, lng: 78.0 },
  { code: 'PK', name: 'Pakistan', lat: 30.0, lng: 69.0 },
  { code: 'VN', name: 'Vietnam', lat: 14.0, lng: 108.0 },
  { code: 'TW', name: 'Taiwan', lat: 23.0, lng: 120.0 },
  { code: 'SG', name: 'Singapore', lat: 1.0, lng: 103.0 },
  { code: 'ID', name: 'Indonesia', lat: -5.0, lng: 120.0 },
  { code: 'TH', name: 'Thailand', lat: 15.0, lng: 100.0 },

  // ─── Africa ───────────────────────────────────
  { code: 'NG', name: 'Nigeria', lat: 9.0, lng: 8.0 },
  { code: 'ZA', name: 'South Africa', lat: -30.0, lng: 22.0 },
  { code: 'EG', name: 'Egypt', lat: 26.0, lng: 30.0 },
  { code: 'KE', name: 'Kenya', lat: -0.0, lng: 37.0 },

  // ─── Oceania ──────────────────────────────────
  { code: 'AU', name: 'Australia', lat: -25.0, lng: 133.0 },
  { code: 'NZ', name: 'New Zealand', lat: -40.0, lng: 174.0 },
];

export const countryMap = new Map(countries.map((c) => [c.code, c]));
