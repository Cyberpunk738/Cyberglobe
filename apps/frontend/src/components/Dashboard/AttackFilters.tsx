'use client';

interface AttackFiltersProps {
  portFilter: number | null;
  setPortFilter: (port: number | null) => void;
  typeFilter: string | null;
  setTypeFilter: (type: string | null) => void;
}

const ATTACK_TYPES = [
  'SSH Brute Force', 'DDoS', 'SQL Injection', 'XSS Attack',
  'Ransomware', 'Phishing', 'Port Scan', 'Man-in-the-Middle',
  'Zero-Day Exploit', 'DNS Spoofing', 'Buffer Overflow', 'Cryptojacking',
  'API Abuse', 'Credential Stuffing',
];

const COMMON_PORTS = [
  22, 23, 25, 53, 80, 443, 445, 1433, 3306, 3389, 5432, 8080, 8443, 27017,
];

export default function AttackFilters({
  portFilter,
  setPortFilter,
  typeFilter,
  setTypeFilter,
}: AttackFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
      {/* Port filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/30">Port:</span>
        <select
          value={portFilter ?? ''}
          onChange={(e) =>
            setPortFilter(e.target.value ? Number(e.target.value) : null)
          }
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/70 font-mono focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
        >
          <option value="">All Ports</option>
          {COMMON_PORTS.map((p) => (
            <option key={p} value={p}>
              :{p}
            </option>
          ))}
        </select>
      </div>

      {/* Attack type filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/30">Type:</span>
        <select
          value={typeFilter ?? ''}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/70 font-mono focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
        >
          <option value="">All Types</option>
          {ATTACK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {(portFilter || typeFilter) && (
        <button
          onClick={() => {
            setPortFilter(null);
            setTypeFilter(null);
          }}
          className="text-[10px] uppercase tracking-wider text-cyan-400/70 hover:text-cyan-400 transition-colors cursor-pointer"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
