'use client';

import { useEffect, useRef, memo } from 'react';

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

const SEVERITY_STYLES: Record<string, string> = {
  low: 'border-l-cyan-400 text-cyan-400',
  medium: 'border-l-amber-400 text-amber-400',
  high: 'border-l-red-500 text-red-500',
  critical: 'border-l-pink-500 text-pink-500',
};

const SEVERITY_BG: Record<string, string> = {
  low: 'bg-cyan-400/10',
  medium: 'bg-amber-400/10',
  high: 'bg-red-500/10',
  critical: 'bg-pink-500/10',
};

const SEVERITY_GLOW: Record<string, string> = {
  low: 'severity-glow-low',
  medium: 'severity-glow-medium',
  high: 'severity-glow-high',
  critical: 'severity-glow-critical',
};

const SEVERITY_ICON: Record<string, string> = {
  low: '◆',
  medium: '◈',
  high: '▲',
  critical: '⬤',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Memoized feed item ──────────────────────────────────
const FeedItem = memo(function FeedItem({
  attack,
  index,
}: {
  attack: AttackEvent;
  index: number;
}) {
  return (
    <div
      className={`
        border-l-2 rounded-r-lg px-3 py-2 transition-all duration-300
        ${SEVERITY_STYLES[attack.severity]}
        ${SEVERITY_BG[attack.severity]}
        ${SEVERITY_GLOW[attack.severity]}
        hover:bg-white/5 feed-item-enter
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] opacity-60">{SEVERITY_ICON[attack.severity]}</span>
          <span className="text-xs font-mono font-bold truncate">
            {attack.source_country} → {attack.target_country}
          </span>
        </div>
        <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">
          {formatTime(attack.timestamp)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 gap-2">
        <span className="text-[11px] text-white/50 truncate">
          {attack.attack_type}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">
            :{attack.port}
          </span>
          <span className={`text-[8px] uppercase tracking-wider px-1 py-0.5 rounded ${SEVERITY_BG[attack.severity]} font-mono opacity-60`}>
            {attack.severity}
          </span>
        </div>
      </div>
    </div>
  );
});

export default function AttackFeed({ attacks }: { attacks: AttackEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new attacks (reversed list)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [attacks]);

  const displayed = attacks.slice(-25).reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 relative">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-red-500 absolute inset-0 animate-ping opacity-40" />
          </div>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-white/90">
            Live Attack Feed
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 animate-pulse" />
          <span className="text-xs text-white/40 font-mono">{attacks.length} events</span>
        </div>
      </div>

      {/* Attack list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
      >
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm gap-2">
            <div className="w-8 h-8 border border-white/10 border-t-cyan-400/50 rounded-full animate-spin" />
            <span className="font-mono text-xs tracking-wider">Waiting for attacks...</span>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {displayed.map((attack, index) => (
              <FeedItem key={`${attack.id}-${index}`} attack={attack} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
