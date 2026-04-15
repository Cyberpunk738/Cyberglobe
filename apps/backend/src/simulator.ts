import { v4 as uuidv4 } from 'uuid';
import {
  AttackEvent,
  ThreatStats,
  ATTACK_TYPES,
  COMMON_PORTS,
} from './types';
import { countries, countryMap } from './data/countries';

// ─── State ────────────────────────────────────────────────
const attackHistory: AttackEvent[] = [];
const MAX_HISTORY = 500;

const targetCounts = new Map<string, number>();
const sourceCounts = new Map<string, number>();
const portCounts = new Map<number, number>();
const attackTypeCounts = new Map<string, number>();
let totalAttacks = 0;
const startTime = Date.now();

// ─── Weighted random helpers ──────────────────────────────
// Some countries attack/get attacked more often for realism
const SOURCE_WEIGHTS: Record<string, number> = {
  CN: 20, RU: 18, US: 10, KP: 8, IR: 7, BR: 5, IN: 5,
  VN: 4, NG: 4, UA: 3, RO: 3, PK: 3, ID: 3, TR: 2,
};

const TARGET_WEIGHTS: Record<string, number> = {
  US: 22, GB: 10, DE: 8, JP: 7, FR: 6, KR: 5, AU: 5,
  CA: 5, NL: 4, SE: 3, IL: 3, IN: 3, SG: 3, TW: 3,
};

function weightedRandom(weights: Record<string, number>): string {
  const codes = countries.map((c) => c.code);
  const weightedCodes: string[] = [];

  for (const code of codes) {
    const w = weights[code] || 1;
    for (let i = 0; i < w; i++) {
      weightedCodes.push(code);
    }
  }

  return weightedCodes[Math.floor(Math.random() * weightedCodes.length)];
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSeverity(): 'low' | 'medium' | 'high' | 'critical' {
  const roll = Math.random();
  if (roll < 0.35) return 'low';
  if (roll < 0.65) return 'medium';
  if (roll < 0.88) return 'high';
  return 'critical';
}

// ─── Generate attack ─────────────────────────────────────
export function generateAttack(): AttackEvent {
  let sourceCode = weightedRandom(SOURCE_WEIGHTS);
  let targetCode = weightedRandom(TARGET_WEIGHTS);

  // Ensure source != target
  while (targetCode === sourceCode) {
    targetCode = weightedRandom(TARGET_WEIGHTS);
  }

  const source = countryMap.get(sourceCode)!;
  const target = countryMap.get(targetCode)!;

  const attack: AttackEvent = {
    id: uuidv4(),
    source_country: source.code,
    target_country: target.code,
    source_name: source.name,
    target_name: target.name,
    source_lat: source.lat,
    source_lng: source.lng,
    target_lat: target.lat,
    target_lng: target.lng,
    attack_type: randomItem(ATTACK_TYPES),
    port: randomItem(COMMON_PORTS),
    severity: getRandomSeverity(),
    timestamp: Date.now(),
  };

  // Update stats
  totalAttacks++;
  sourceCounts.set(sourceCode, (sourceCounts.get(sourceCode) || 0) + 1);
  targetCounts.set(targetCode, (targetCounts.get(targetCode) || 0) + 1);
  portCounts.set(attack.port, (portCounts.get(attack.port) || 0) + 1);
  attackTypeCounts.set(
    attack.attack_type,
    (attackTypeCounts.get(attack.attack_type) || 0) + 1
  );

  // Maintain history window
  attackHistory.push(attack);
  if (attackHistory.length > MAX_HISTORY) {
    attackHistory.shift();
  }

  return attack;
}

// ─── Get statistics ───────────────────────────────────────
function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => {
      const country = countryMap.get(key);
      return { code: key, name: country?.name || key, count };
    });
}

function topNPorts(map: Map<number, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([port, count]) => ({ port, count }));
}

function topNTypes(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([type, count]) => ({ type, count }));
}

export function getStats(): ThreatStats {
  const elapsedMinutes = Math.max(1, (Date.now() - startTime) / 60000);
  const topTargeted = topN(targetCounts, 10);
  const topAttacking = topN(sourceCounts, 10);
  const topPorts = topNPorts(portCounts, 10);
  const topTypes = topNTypes(attackTypeCounts, 14);

  return {
    totalAttacks,
    attacksPerMinute: Math.round((totalAttacks / elapsedMinutes) * 10) / 10,
    mostTargetedCountry: topTargeted[0] || { code: '-', name: '-', count: 0 },
    mostAttackingCountry: topAttacking[0] || { code: '-', name: '-', count: 0 },
    mostCommonPort: topPorts[0] || { port: 0, count: 0 },
    mostCommonAttackType: topTypes[0] || { type: '-', count: 0 },
    topAttackingCountries: topAttacking,
    topTargetedCountries: topTargeted,
    attackTypeDistribution: topTypes,
    portDistribution: topPorts,
  };
}

export function getRecentAttacks(count = 20): AttackEvent[] {
  return attackHistory.slice(-count);
}
