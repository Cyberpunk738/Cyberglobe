// ─── Attack Event ─────────────────────────────────────────
export interface AttackEvent {
  id: string;
  source_country: string;
  target_country: string;
  source_name: string;
  target_name: string;
  source_lat: number;
  source_lng: number;
  target_lat: number;
  target_lng: number;
  attack_type: string;
  port: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

// ─── Country Data ─────────────────────────────────────────
export interface CountryData {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

// ─── Threat Statistics ────────────────────────────────────
export interface ThreatStats {
  totalAttacks: number;
  attacksPerMinute: number;
  mostTargetedCountry: { code: string; name: string; count: number };
  mostAttackingCountry: { code: string; name: string; count: number };
  mostCommonPort: { port: number; count: number };
  mostCommonAttackType: { type: string; count: number };
  topAttackingCountries: { code: string; name: string; count: number }[];
  topTargetedCountries: { code: string; name: string; count: number }[];
  attackTypeDistribution: { type: string; count: number }[];
  portDistribution: { port: number; count: number }[];
}

// ─── WebSocket Messages ───────────────────────────────────
export interface WSMessage {
  type: 'attack' | 'stats' | 'history';
  data: AttackEvent | ThreatStats | AttackEvent[];
}

// ─── Attack Types ─────────────────────────────────────────
export const ATTACK_TYPES = [
  'SSH Brute Force',
  'DDoS',
  'SQL Injection',
  'XSS Attack',
  'Ransomware',
  'Phishing',
  'Port Scan',
  'Man-in-the-Middle',
  'Zero-Day Exploit',
  'DNS Spoofing',
  'Buffer Overflow',
  'Cryptojacking',
  'API Abuse',
  'Credential Stuffing',
] as const;

export const COMMON_PORTS = [
  22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1433, 1521, 3306, 3389,
  5432, 5900, 6379, 8080, 8443, 9200, 27017,
] as const;

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export type AttackType = (typeof ATTACK_TYPES)[number];
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];
