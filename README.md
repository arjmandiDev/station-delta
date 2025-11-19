# Bunker Explorer

A mobile-first first-person web experience exploring an apocalyptic bunker built inside a sea cliff.

## Features

- Smooth first-person navigation (30+ FPS on mobile)
- Zone-based streaming with progressive quality upgrades
- Event-driven asset loading (reacts to door openings, teleportation)
- Gravity-based player physics
- Mobile and desktop support
- LOD system for performance optimization
- Collision detection using BVH
- Adaptive quality based on performance
- Comprehensive profiling and telemetry

## Project Structure

```
src/
├── main.ts                 # Entry point
├── App.tsx                 # Root React component
├── components/             # UI components
├── core/                   # Core Three.js systems
├── systems/                # Feature systems
│   ├── collision/         # Collision detection
│   ├── navigation/        # Player movement
│   ├── streaming/         # Zone loading
│   ├── lod/               # Level-of-detail
│   ├── culling/           # Visibility culling
│   ├── instancing/        # Geometry batching
│   ├── performance/       # Adaptive quality
│   └── profiling/         # Telemetry
├── loaders/               # Asset loaders
├── utils/                 # Utilities
├── workers/               # Web workers
└── service-worker/        # PWA support

docs/                      # System documentation
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Performance Budgets

- Initial zone payload: ≤ 5 MB
- Active triangles per room: 30-60k
- Visible triangles total: ≤ 100k
- Draw calls: ≤ 100 (target), ≤ 200 (max)
- Texture memory: 200-300 MB
- Initial load time: ≤ 1.5 seconds on 4G
- Time-to-interactive: ≤ 2 seconds
- 95th percentile frame time: ≤ 33 ms

## Documentation

See the `docs/` directory for detailed documentation on each system:

- [Assets and Compression](docs/assets-and-compression.md)
- [Streaming and Manifest](docs/streaming-and-manifest.md)
- [Loaders](docs/loaders.md)
- [LOD System](docs/lod-system.md)
- [Culling Methods](docs/culling-methods.md)
- [Instancing and Batching](docs/instancing-and-batching.md)
- [Collision and Navigation](docs/collision-and-navigation.md)
- [Performance and Adaptive Quality](docs/performance-and-adaptive-quality.md)
- [Profiling and Telemetry](docs/profiling-and-telemetry.md)
- [Caching and Service Worker](docs/caching-and-service-worker.md)

## Controls

### Desktop
- **WASD** or **Arrow Keys**: Move
- **Mouse**: Look around
- **Space**: Jump
- **P**: Toggle performance UI

### Mobile
- **Virtual Joystick**: Move (left side)
- **Touch Drag**: Look around (right side)
- **Jump Button**: Jump (bottom right)

## Technologies

- React 18
- Three.js
- TypeScript
- Vite
- three-mesh-bvh (collision)
- stats.js (performance monitoring)

## License

See LICENSE file.

