'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useWebSocket } from '@/hooks/useWebSocket';
import AttackFeed from '@/components/Dashboard/AttackFeed';
import ThreatStats from '@/components/Dashboard/ThreatStats';
import AttackFilters from '@/components/Dashboard/AttackFilters';

// Dynamic import for Globe (needs window/document)
const Globe = dynamic(() => import('@/components/Globe/Globe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="w-10 h-10 border-2 border-pink-500/20 border-b-pink-500/60 rounded-full animate-spin absolute top-3 left-3"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          />
        </div>
        <span className="text-cyan-400/50 text-sm font-mono tracking-wider">
          INITIALIZING GLOBE...
        </span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 h-3 bg-cyan-400/40 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  ),
});

export default function CyberGlobePage() {
  const { attacks, stats, connected } = useWebSocket();
  const [portFilter, setPortFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Apply filters
  const filteredAttacks = useMemo(() => {
    return attacks.filter((attack) => {
      if (portFilter && attack.port !== portFilter) return false;
      if (typeFilter && attack.attack_type !== typeFilter) return false;
      return true;
    });
  }, [attacks, portFilter, typeFilter]);

  return (
    <main className="h-screen flex flex-col bg-grid scanlines relative overflow-hidden">
      {/* ─── Data stream lines (ambient background) ───── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="data-stream-line"
            style={{
              left: `${10 + i * 12}%`,
              animationDuration: `${4 + Math.random() * 6}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.3 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>

      {/* ─── Top Bar ────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 glass-panel border-b border-white/5 z-10 relative data-shimmer">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
            <div className="w-3 h-3 rounded-full bg-cyan-400 absolute inset-0 animate-ping opacity-50" />
          </div>
          <h1 className="text-lg font-bold tracking-wider holo-text font-mono">
            CYBERGLOBE
          </h1>
          <span className="text-[10px] text-white/20 font-mono tracking-wider border border-white/10 rounded px-1.5 py-0.5 version-badge">
            v2.0
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Filters */}
          <AttackFilters
            portFilter={portFilter}
            setPortFilter={setPortFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected
                    ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                }`}
              />
              {connected && (
                <div className="w-2 h-2 rounded-full bg-green-400 absolute inset-0 animate-ping opacity-30" />
              )}
            </div>
            <span className="text-[10px] font-mono text-white/40 tracking-wider">
              {connected ? 'CONNECTED' : 'RECONNECTING'}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <div className="flex-1 flex min-h-0 z-[1]">
        {/* Globe (center) */}
        <div className="flex-1 relative">
          <Globe attacks={filteredAttacks} />

          {/* Attack count overlay */}
          <div className="absolute bottom-4 left-4 glass-panel rounded-xl px-4 py-2 border-glow animated-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  Active Threats
                </span>
              </div>
              <span className="text-lg font-mono font-bold text-cyan-400 glow-cyan">
                {filteredAttacks.length}
              </span>
            </div>
          </div>

          {/* Severity legend */}
          <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-4 py-2 border-glow animated-border">
            <div className="flex items-center gap-4">
              {[
                { label: 'LOW', color: 'bg-cyan-400', textColor: 'text-cyan-400' },
                { label: 'MED', color: 'bg-amber-400', textColor: 'text-amber-400' },
                { label: 'HIGH', color: 'bg-red-500', textColor: 'text-red-500' },
                { label: 'CRIT', color: 'bg-pink-500', textColor: 'text-pink-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.color} ${s.textColor} legend-dot`} />
                  <span className="text-[9px] font-mono text-white/40">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top-right threat level indicator */}
          <div className="absolute top-4 right-4 glass-panel rounded-xl px-3 py-2 border-glow animated-border">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-white/30">
                Threat Level
              </span>
              <span className={`text-xs font-mono font-bold ${
                (stats?.attacksPerMinute || 0) > 40
                  ? 'text-red-500 glow-magenta'
                  : (stats?.attacksPerMinute || 0) > 20
                  ? 'text-amber-400'
                  : 'text-cyan-400 glow-cyan'
              }`}>
                {(stats?.attacksPerMinute || 0) > 40
                  ? 'CRITICAL'
                  : (stats?.attacksPerMinute || 0) > 20
                  ? 'ELEVATED'
                  : 'MODERATE'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel — Attack Feed */}
        <aside className="w-80 glass-panel border-l border-white/5 flex flex-col">
          <AttackFeed attacks={filteredAttacks} />
        </aside>
      </div>

      {/* ─── Bottom Panel — Stats ───────────────────────── */}
      <div className="h-56 glass-panel border-t border-white/5 z-[1]">
        <ThreatStats stats={stats} connected={connected} />
      </div>
    </main>
  );
}
