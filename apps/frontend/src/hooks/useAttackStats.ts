'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';

interface AttackEvent {
  id: string;
  source_country: string;
  target_country: string;
  source_name: string;
  target_name: string;
  attack_type: string;
  port: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

interface CountryCount {
  code: string;
  name: string;
  count: number;
}

export function useAttackStats(attacks: AttackEvent[]) {
  return useMemo(() => {
    if (attacks.length === 0) {
      return {
        totalAttacks: 0,
        topAttackers: [] as CountryCount[],
        topTargets: [] as CountryCount[],
        attackTypeDistribution: [] as { type: string; count: number }[],
        portDistribution: [] as { port: number; count: number }[],
        severityDistribution: [] as { severity: string; count: number }[],
        attackFrequency: 0,
      };
    }

    // Top attacking countries
    const sourceRollup = d3.rollups(
      attacks,
      (v) => v.length,
      (d) => d.source_country
    );
    const topAttackers: CountryCount[] = sourceRollup
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => {
        const attack = attacks.find((a) => a.source_country === code);
        return { code, name: attack?.source_name || code, count };
      });

    // Top targeted countries
    const targetRollup = d3.rollups(
      attacks,
      (v) => v.length,
      (d) => d.target_country
    );
    const topTargets: CountryCount[] = targetRollup
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => {
        const attack = attacks.find((a) => a.target_country === code);
        return { code, name: attack?.target_name || code, count };
      });

    // Attack type distribution
    const typeRollup = d3.rollups(
      attacks,
      (v) => v.length,
      (d) => d.attack_type
    );
    const attackTypeDistribution = typeRollup
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    // Port distribution
    const portRollup = d3.rollups(
      attacks,
      (v) => v.length,
      (d) => d.port
    );
    const portDistribution = portRollup
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([port, count]) => ({ port, count }));

    // Severity distribution
    const sevRollup = d3.rollups(
      attacks,
      (v) => v.length,
      (d) => d.severity
    );
    const severityDistribution = sevRollup
      .map(([severity, count]) => ({ severity, count }));

    // Attack frequency (attacks per minute)
    const timestamps = attacks.map((a) => a.timestamp);
    const timeRange = (d3.max(timestamps)! - d3.min(timestamps)!) / 60000;
    const attackFrequency =
      timeRange > 0 ? Math.round((attacks.length / timeRange) * 10) / 10 : 0;

    return {
      totalAttacks: attacks.length,
      topAttackers,
      topTargets,
      attackTypeDistribution,
      portDistribution,
      severityDistribution,
      attackFrequency,
    };
  }, [attacks]);
}
