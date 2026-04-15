'use client';

import { useEffect, useState, memo } from 'react';

interface ThreatStatsProps {
  stats: {
    totalAttacks: number;
    attacksPerMinute: number;
    mostTargetedCountry: { code: string; name: string; count: number };
    mostAttackingCountry: { code: string; name: string; count: number };
    mostCommonPort: { port: number; count: number };
    mostCommonAttackType: { type: string; count: number };
    topAttackingCountries: { code: string; name: string; count: number }[];
    topTargetedCountries: { code: string; name: string; count: number }[];
    attackTypeDistribution: { type: string; count: number }[];
  } | null;
  connected: boolean;
}

// ─── Animated counter with cubic ease-out ─────────────────
function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const diff = value - display;
    if (diff === 0) return;

    const startValue = display;
    const startTime = performance.now();
    const duration = 600;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentValue = Math.round(startValue + diff * easedProgress);
      setDisplay(currentValue);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}

// ─── Distribution bar with animated gradient fill ─────────
const DistributionBar = memo(function DistributionBar({
  items,
  maxCount,
}: {
  items: { label: string; count: number; color: string }[];
  maxCount: number;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 group">
          <span className="text-[10px] font-mono text-white/50 w-24 truncate text-right group-hover:text-white/70 transition-colors">
            {item.label}
          </span>
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out animated-bar"
              style={{
                width: `${Math.max(4, (item.count / maxCount) * 100)}%`,
                background: `linear-gradient(90deg, ${item.color}, ${item.color}88, ${item.color})`,
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/40 w-8 group-hover:text-white/60 transition-colors">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
});

// ─── Stat Card ────────────────────────────────────────────
const StatCard = memo(function StatCard({
  label,
  value,
  subValue,
  icon,
  color,
  bgColor,
  small,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  icon: string;
  color: string;
  bgColor: string;
  small?: boolean;
}) {
  return (
    <div className={`${bgColor} rounded-xl border border-white/5 p-3 flex flex-col gap-1 stat-card-glow`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          {label}
        </span>
        <span className="text-sm">{icon}</span>
      </div>
      <span
        className={`font-mono font-bold ${color} ${
          small ? 'text-xs' : 'text-lg'
        } truncate`}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-[10px] text-white/30 truncate">{subValue}</span>
      )}
    </div>
  );
});

export default function ThreatStats({ stats, connected }: ThreatStatsProps) {
  const typeColors = [
    '#00f0ff', '#ff00aa', '#ffaa00', '#ff4444',
    '#44ff88', '#aa66ff', '#ff6644', '#6688ff',
  ];

  const attackTypes = stats?.attackTypeDistribution?.slice(0, 6).map((item, i) => ({
    label: item.type,
    count: item.count,
    color: typeColors[i % typeColors.length],
  })) || [];

  const maxTypeCount = attackTypes.length > 0 ? attackTypes[0].count : 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-white/90">
            Threat Intelligence
          </h2>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[10px] text-white/30 font-mono">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            {connected && (
              <div className="w-2 h-2 rounded-full bg-green-500 absolute inset-0 animate-ping opacity-30" />
            )}
          </div>
          <span className="text-xs text-white/40">
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {/* Stat cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Total Attacks"
            value={<AnimatedCounter value={stats?.totalAttacks || 0} />}
            icon="⚡"
            color="text-cyan-400"
            bgColor="bg-cyan-400/10"
          />
          <StatCard
            label="Attacks/Min"
            value={stats?.attacksPerMinute?.toFixed(1) || '0'}
            icon="📈"
            color="text-green-400"
            bgColor="bg-green-400/10"
          />
          <StatCard
            label="Top Target"
            value={stats?.mostTargetedCountry?.code || '—'}
            subValue={stats?.mostTargetedCountry?.name}
            icon="🎯"
            color="text-red-400"
            bgColor="bg-red-400/10"
          />
          <StatCard
            label="Top Attacker"
            value={stats?.mostAttackingCountry?.code || '—'}
            subValue={stats?.mostAttackingCountry?.name}
            icon="💀"
            color="text-pink-400"
            bgColor="bg-pink-400/10"
          />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Top Port"
            value={`:${stats?.mostCommonPort?.port || '—'}`}
            icon="🔌"
            color="text-amber-400"
            bgColor="bg-amber-400/10"
          />
          <StatCard
            label="Top Attack"
            value={stats?.mostCommonAttackType?.type || '—'}
            icon="🛡️"
            color="text-purple-400"
            bgColor="bg-purple-400/10"
            small
          />
          {/* Top targeted countries mini list */}
          <div className="col-span-2 bg-white/[0.03] rounded-xl border border-white/5 p-3 stat-card-glow">
            <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
              Most Targeted Countries
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats?.topTargetedCountries?.slice(0, 6).map((country) => (
                <span
                  key={country.code}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 cursor-default"
                >
                  {country.code}{' '}
                  <span className="text-white/30">{country.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Attack Type Distribution */}
        {attackTypes.length > 0 && (
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 stat-card-glow">
            <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3">
              Attack Type Distribution
            </h3>
            <DistributionBar items={attackTypes} maxCount={maxTypeCount} />
          </div>
        )}
      </div>
    </div>
  );
}
