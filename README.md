<p align="center">
  <img src="apps/frontend/public/globe.svg" alt="CyberGlobe" width="80" />
</p>

<h1 align="center">🌐 CyberGlobe</h1>

<p align="center">
  <strong>Real-Time Global Cyber Attack Visualization Platform</strong>
</p>

<p align="center">
  <code>Three.js</code> · <code>Next.js 16</code> · <code>React 19</code> · <code>WebSocket</code> · <code>Express</code> · <code>D3.js</code>
</p>

<p align="center">
  <a href="#architecture">Architecture</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#project-structure">Project Structure</a> ·
  <a href="#api-reference">API Reference</a>
</p>

---

## Overview

CyberGlobe is a high-performance, real-time cyber threat visualization platform that renders simulated global attack events on an interactive 3D globe. The platform uses a WebSocket-driven architecture to stream attack telemetry from a backend simulator to a Three.js-powered frontend, providing an immersive, cinematic command-center experience for monitoring threat intelligence.

The application features a post-processed 3D rendering pipeline with HDR bloom, particle systems, and multi-layer atmospheric effects — running at a consistent **60fps** with up to 30 concurrent attack arcs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MONOREPO (Turborepo)                       │
├──────────────────────────┬──────────────────────────────────────────┤
│      apps/backend        │              apps/frontend               │
│   ┌─────────────────┐    │     ┌───────────────────────────────┐    │
│   │  Express HTTP    │    │     │        Next.js 16 (App)       │    │
│   │  ┌────────────┐  │    │     │   ┌────────────────────────┐  │    │
│   │  │ REST API   │  │    │     │   │  CyberGlobePage        │  │    │
│   │  │ /api/stats │  │    │     │   │  ┌──────────────────┐  │  │    │
│   │  │ /api/attacks│  │    │     │   │  │ Globe (Three.js) │  │  │    │
│   │  │ /api/health│  │    │     │   │  │  • EffectComposer │  │  │    │
│   │  └────────────┘  │    │     │   │  │  • BloomPass      │  │  │    │
│   │                   │    │     │   │  │  • Particles      │  │  │    │
│   │  ┌────────────┐  │    │     │   │  │  • Instanced Mesh │  │  │    │
│   │  │ WebSocket  │◄─┼────┼─────┼───┤  └──────────────────┘  │  │    │
│   │  │ Server     │  │    │     │   │                         │  │    │
│   │  └────────────┘  │    │     │   │  ┌──────────────────┐   │  │    │
│   │                   │    │     │   │  │ Dashboard Panels │   │  │    │
│   │  ┌────────────┐  │    │     │   │  │  AttackFeed      │   │  │    │
│   │  │ Simulator  │  │    │     │   │  │  ThreatStats     │   │  │    │
│   │  │ (generates │  │    │     │   │  │  AttackFilters   │   │  │    │
│   │  │  attacks)  │  │    │     │   │  └──────────────────┘   │  │    │
│   │  └────────────┘  │    │     │   └────────────────────────┘  │    │
│   └─────────────────┘    │     └───────────────────────────────┘    │
├──────────────────────────┴──────────────────────────────────────────┤
│                     packages/types (shared)                         │
│              AttackEvent · ThreatStats · WSMessage                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Simulator → generateAttack() → WebSocket broadcast → useWebSocket hook → React state
                                                                           ↓
                                                    Globe (3D arcs)  ←─ filteredAttacks
                                                    AttackFeed       ←─ filteredAttacks
                                                    ThreatStats      ←─ stats
```

1. **Simulator** generates realistic attack events at 1–3 second intervals using weighted country distributions
2. **Server** broadcasts each event via WebSocket to all connected clients + updates aggregate stats
3. **Frontend** receives events in `useWebSocket` hook, deduplicates by ID, and maintains a sliding window of 50 attacks
4. **Globe** renders 3D arcs with particle trails between source → target coordinates
5. **Dashboard** panels display live feed, filters, and statistical breakdowns

---

## Features

### 3D Globe Visualization

| Feature | Implementation |
|---------|---------------|
| **Interactive globe** | Procedurally-generated earth texture with continent outlines, interactive orbit controls (rotate, zoom) |
| **Attack arcs** | Quadratic Bézier curves between source/target with severity-based coloring (cyan/amber/red/magenta) |
| **Particle trails** | Each arc has a glowing sphere head + trailing particle emitter that fades along the curve |
| **Impact explosions** | 24 particles burst outward from the globe surface at each target location |
| **Multi-layer atmosphere** | Inner fresnel glow + outer shimmering halo, both animated with time-based oscillation |
| **Ambient particles** | 600 floating data-fragment particles with brownian motion around the globe |
| **Twinkling stars** | 4,000 star points with animated opacity and slow parallax rotation |
| **Country markers** | 39 city/country dots rendered via `InstancedMesh` with breathing scale animation |

### Post-Processing Pipeline

| Pass | Effect |
|------|--------|
| `RenderPass` | Standard scene render |
| `UnrealBloomPass` | HDR bloom (strength: 0.8, radius: 0.4, threshold: 0.7) |
| `ShaderPass` (custom) | Vignette + chromatic aberration |
| `OutputPass` | ACES filmic tone mapping + color space conversion |

### Dashboard

| Component | Description |
|-----------|-------------|
| **Live Attack Feed** | Rolling list of 25 most recent attacks with slide-in animation, severity-based coloring, glow-on-hover |
| **Threat Intelligence** | 6 stat cards (Total Attacks, Attacks/Min, Top Target, Top Attacker, Top Port, Top Attack Type) with animated counters |
| **Attack Type Distribution** | Horizontal bar chart with animated gradient fills |
| **Targeted Countries** | Tag-style display of top 6 most-attacked nations |
| **Attack Filters** | Filter by port (14 common ports) or attack type (14 categories) with clear button |
| **Threat Level Indicator** | Dynamic MODERATE / ELEVATED / CRITICAL badge based on attack rate |

### Visual Effects (CSS)

- **Holographic title** — animated gradient text (cyan ↔ magenta)
- **Animated gradient borders** — rotating conic-gradient on overlay panels
- **Data-stream shimmer** — sweeping light on the header bar
- **Animated scanlines** — vertically scrolling CRT scanline overlay
- **Data stream lines** — 8 vertical ambient lines flowing down the background
- **Severity hover glows** — per-severity box-shadow on feed item hover
- **Stat card glow** — breathing box-shadow + lift on hover
- **Legend dot pulse** — scale + shadow animation on severity legend

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.3 | App router, SSR framework, dev server |
| **React** | 19.2.4 | UI component library |
| **Three.js** | 0.170.0 | 3D WebGL rendering (globe, arcs, particles, atmosphere) |
| **D3.js** | 7.9.0 | Data aggregation (`d3.rollups`) for attack statistics |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **TypeScript** | 5.x | Type safety across entire frontend |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Express** | 4.18.2 | REST API endpoints |
| **ws** | 8.16.0 | WebSocket server for real-time event streaming |
| **uuid** | 9.0.0 | Unique attack event ID generation |
| **tsx** | 4.7.0 | TypeScript execution for development |

### Tooling

| Tool | Purpose |
|------|---------|
| **Turborepo** | Monorepo task orchestration |
| **Concurrently** | Parallel backend + frontend dev server startup |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd globe

# Install all workspace dependencies
npm run install:all
```

### Development

```bash
# Start both backend (port 4000) and frontend (port 3000)
npm run dev
```

Or run individually:

```bash
# Backend only (Express + WebSocket on port 4000)
npm run dev:backend

# Frontend only (Next.js on port 3000)
npm run dev:frontend
```

### Production Build

```bash
# Build frontend
cd apps/frontend && npm run build

# Build backend
cd apps/backend && npm run build

# Start production servers
cd apps/backend && npm start
cd apps/frontend && npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:4000` | WebSocket endpoint for frontend |

---

## Project Structure

```
globe/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.ts          # Express + WebSocket server
│   │   │   ├── simulator.ts       # Attack generation engine
│   │   │   ├── types.ts           # Backend type definitions
│   │   │   └── data/
│   │   │       └── countries.ts   # 38 countries with lat/lng coordinates
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx     # Root layout (fonts, metadata, SEO)
│       │   │   ├── page.tsx       # Main dashboard page
│       │   │   └── globals.css    # Design system + advanced CSS effects
│       │   │
│       │   ├── components/
│       │   │   ├── Globe/
│       │   │   │   ├── Globe.tsx          # Three.js 3D globe renderer
│       │   │   │   └── PostProcessing.ts  # Bloom + vignette + chromatic aberration
│       │   │   │
│       │   │   └── Dashboard/
│       │   │       ├── AttackFeed.tsx      # Live scrolling attack feed
│       │   │       ├── AttackFilters.tsx   # Port & type filter dropdowns
│       │   │       └── ThreatStats.tsx     # Statistical dashboard panel
│       │   │
│       │   ├── hooks/
│       │   │   ├── useWebSocket.ts    # WebSocket connection + state management
│       │   │   └── useAttackStats.ts  # D3-based attack analytics
│       │   │
│       │   └── lib/
│       │       └── geo.ts             # Lat/lng → 3D vector conversion
│       │
│       ├── public/                # Static assets
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── types/
│       └── src/
│           └── index.ts           # Shared type definitions
│
├── package.json                   # Monorepo root scripts
├── turbo.json                     # Turborepo configuration
└── tsconfig.json                  # Root TypeScript config
```

---

## API Reference

### REST Endpoints

#### `GET /api/health`

Health check endpoint.

```json
{
  "status": "ok",
  "uptime": 1234.56
}
```

#### `GET /api/stats`

Returns current aggregate threat statistics.

```json
{
  "totalAttacks": 847,
  "attacksPerMinute": 28.3,
  "mostTargetedCountry": { "code": "US", "name": "United States", "count": 182 },
  "mostAttackingCountry": { "code": "CN", "name": "China", "count": 167 },
  "mostCommonPort": { "port": 443, "count": 95 },
  "mostCommonAttackType": { "type": "DDoS", "count": 78 },
  "topAttackingCountries": [...],
  "topTargetedCountries": [...],
  "attackTypeDistribution": [...],
  "portDistribution": [...]
}
```

#### `GET /api/attacks?count=20`

Returns the most recent `count` attack events (max 100).

### WebSocket Protocol

Connect to `ws://localhost:4000`. Messages are JSON with a `type` discriminator:

#### `history` (sent on connection)

```json
{
  "type": "history",
  "data": [{ /* AttackEvent[] */ }]
}
```

#### `attack` (real-time)

```json
{
  "type": "attack",
  "data": {
    "id": "uuid-v4",
    "source_country": "CN",
    "target_country": "US",
    "source_name": "China",
    "target_name": "United States",
    "source_lat": 35.0,
    "source_lng": 105.0,
    "target_lat": 38.0,
    "target_lng": -97.0,
    "attack_type": "DDoS",
    "port": 443,
    "severity": "high",
    "timestamp": 1744622400000
  }
}
```

#### `stats` (every 5 attacks)

```json
{
  "type": "stats",
  "data": { /* ThreatStats */ }
}
```

---

## Performance Optimizations

### Three.js Rendering

| Technique | Impact |
|-----------|--------|
| **InstancedMesh** for country dots | 39 draw calls → 1 |
| **Pre-allocated Float32Array** with `drawRange` for arcs | Eliminates per-frame geometry allocation + GC |
| **Shared singleton geometries** | Pulse rings, trail heads, dots reuse single geometry instances |
| **Debounced resize** (100ms) | Prevents expensive camera/renderer reconfiguration during drag-resize |
| **EffectComposer** | Single render pass with post-processing chain |
| **Pixel ratio capped** at 2.0 | Prevents excessive GPU load on high-DPI displays |

### React Rendering

| Technique | Impact |
|-----------|--------|
| **`React.memo(Globe)`** | Prevents re-render on parent state changes unrelated to attacks |
| **`memo(FeedItem)`** | Only new/changed feed items re-render (not all 25) |
| **`memo(StatCard)`** | Static stat cards skip re-render |
| **`memo(DistributionBar)`** | Distribution chart re-renders only on data change |
| **`requestAnimationFrame`** counter | Smooth cubic ease-out animation at display refresh rate |
| **WebSocket deduplication** | `Set`-based ID dedup prevents duplicate state entries |

### Resource Management

- Attack history capped at **50 events** (frontend) / **500 events** (backend)
- Processed attack ID set trimmed at **200 entries**
- Max concurrent arcs capped at **30**
- Materials and geometries explicitly `.dispose()`'d on removal

---

## Attack Simulation

The backend simulator generates realistic attack events using:

- **38 countries** across 7 regions, each with geographic coordinates
- **Weighted random selection** — China, Russia, US, North Korea, Iran have higher source weights; US, UK, Germany, Japan have higher target weights
- **14 attack types**: SSH Brute Force, DDoS, SQL Injection, XSS, Ransomware, Phishing, Port Scan, MitM, Zero-Day, DNS Spoofing, Buffer Overflow, Cryptojacking, API Abuse, Credential Stuffing
- **22 common ports**: 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9200, 27017
- **4 severity levels**: low (35%), medium (30%), high (23%), critical (12%)
- **1–3 second intervals** between attacks

---

## Type Definitions

### `AttackEvent`

```typescript
interface AttackEvent {
  id: string;                                    // UUID v4
  source_country: string;                        // ISO 3166-1 alpha-2
  target_country: string;
  source_name: string;                           // Human-readable country name
  target_name: string;
  source_lat: number;                            // Source coordinates
  source_lng: number;
  target_lat: number;                            // Target coordinates
  target_lng: number;
  attack_type: string;                           // One of 14 attack types
  port: number;                                  // Target port number
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;                             // Unix epoch milliseconds
}
```

### `ThreatStats`

```typescript
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
```

---

## Custom Shaders

### Atmosphere (Inner Fresnel)

```glsl
// Fragment shader — creates edge-lighting effect
float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
float pulse = 0.9 + 0.1 * sin(uTime * 1.5);
gl_FragColor = vec4(0.0, 0.94, 1.0, intensity * 0.5 * pulse);
```

### Vignette + Chromatic Aberration

```glsl
// Chromatic aberration — RGB split increases with distance from center
float aberr = uAberration * dist * dist;
float r = texture2D(tDiffuse, uv + vec2(aberr, 0.0)).r;
float g = texture2D(tDiffuse, uv).g;
float b = texture2D(tDiffuse, uv - vec2(aberr, 0.0)).b;

// Vignette — smooth darkening at edges
float vignette = 1.0 - dist * uIntensity * 1.8;
vignette = smoothstep(0.0, 1.0, clamp(vignette, 0.0, 1.0));
```

---

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 90+ | ✅ Supported | Full WebGL2 + CSS `@property` |
| Firefox 90+ | ✅ Supported | Full WebGL2 |
| Safari 15.4+ | ✅ Supported | WebGL2 support required |
| Edge 90+ | ✅ Supported | Chromium-based |

**Requirements:** WebGL 2.0, ES2020+, WebSocket API

---

## License

MIT

---

<p align="center">
  Built with <code>Three.js</code>, <code>Next.js</code>, and a lot of <code>gl_FragColor</code>.
</p>
#
