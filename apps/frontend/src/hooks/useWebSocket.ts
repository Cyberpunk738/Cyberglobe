'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface AttackEvent {
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

interface ThreatStats {
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

interface WSMessage {
  type: 'attack' | 'stats' | 'history';
  data: AttackEvent | ThreatStats | AttackEvent[];
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
const MAX_ATTACKS = 50;

export function useWebSocket() {
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] Connected to CyberGlobe server');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'attack':
              setAttacks((prev) => {
                const incoming = msg.data as AttackEvent;
                // Deduplicate by ID
                if (prev.some((a) => a.id === incoming.id)) return prev;
                const next = [...prev, incoming];
                return next.slice(-MAX_ATTACKS);
              });
              break;

            case 'stats':
              setStats(msg.data as ThreatStats);
              break;

            case 'history': {
              const history = msg.data as AttackEvent[];
              setAttacks((prev) => {
                const existingIds = new Set(prev.map((a) => a.id));
                const newOnes = history.filter((a) => !existingIds.has(a.id));
                return [...prev, ...newOnes].slice(-MAX_ATTACKS);
              });
              break;
            }
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('[WS] Disconnected, reconnecting in 3s...');
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  return { attacks, stats, connected };
}
