<!-- 33ade01a-7332-4057-87a1-e672c94ee74a b934e2c2-4060-4c25-8f52-b7d477141ce8 -->
# Bunker Explorer - Implementation Plan

## Project Structure

```
src/
├── main.ts                    # Entry point, React app initialization
├── App.tsx                    # Root React component
├── components/               # React UI components
│   ├── Canvas.tsx           # Three.js canvas wrapper
│   ├── LoadingScreen.tsx    # Loading UI
│   ├── PerformanceUI.tsx    # FPS/stats display
│   ├── Menu.tsx             # Website menu (social links, contact)
│   └── MobileControls.tsx   # Mobile-only navigation buttons
├── core/                     # Core three.js systems
│   ├── SceneManager.ts      # Scene setup and lifecycle
│   ├── CameraController.ts  # First-person camera controls
│   └── RendererManager.ts   # WebGL renderer with adaptive quality
├── systems/                  # Feature systems
│   ├── collision/           # Collision detection
│   │   ├── CollisionSystem.ts
│   │   └── PlayerPhysics.ts
│   ├── navigation/          # Player movement
│   │   ├── NavigationSystem.ts
│   │   └── MobileControls.ts
│   ├── streaming/           # Zone loading
│   │   ├── ZoneManager.ts
│   │   ├── AssetManifest.ts
│   │   └── StreamingLoader.ts
│   ├── lod/                 # Level-of-detail
│   │   ├── LODSystem.ts
│   │   └── LODManager.ts
│   ├── culling/             # Visibility culling
│   │   ├── PortalCulling.ts
│   │   ├── FrustumCulling.ts
│   │   └── OcclusionCulling.ts
│   ├── instancing/          # Geometry batching
│   │   ├── InstancingSystem.ts
│   │   └── BatchManager.ts
│   ├── performance/         # Adaptive quality
│   │   ├── PerformanceMonitor.ts
│   │   ├── AdaptiveQuality.ts
│   │   └── DynamicResolution.ts
│   └── profiling/           # Telemetry
│       ├── Profiler.ts
│       └── TelemetryCollector.ts
├── loaders/                  # Custom loaders
│   ├── KTX2Loader.ts       # Basis texture loader
│   ├── ZoneLoader.ts       # Zone-specific loader
│   └── GLTFLoader.ts       # Optimized GLTF loader
├── utils/                    # Utilities
│   ├── math.ts             # Math helpers
│   ├── constants.ts       # Game constants
│   └── device.ts          # Device detection
├── workers/                  # Web workers
│   └── assetWorker.ts      # Background asset processing
└── service-worker/           # PWA support
    ├── sw.ts               # Service worker
    └── cacheStrategy.ts    # Caching logic
```

## Implementation Phases

### Phase 1: Foundation & Core Systems

- Set up React + three.js integration
- Create base SceneManager, RendererManager, CameraController
- Implement basic first-person movement with mobile touch controls
- Set up Vite build configuration for code splitting
- Add React dependencies (react, react-dom, @types/react)

### Phase 2: Collision & Navigation

- Implement capsule-based collision detection using three-mesh-bvh
- Create PlayerPhysics system for movement constraints
- Build NavigationSystem with zone transition handling
- Add mobile-friendly touch controls (virtual joystick or gyro)

### Phase 3: Streaming & Zone Management

- Design manifest format (JSON) for zone definitions
- Implement ZoneManager with neighbor preloading
- Create StreamingLoader with cancellation support
- Build zone transition system (load low LOD first, upgrade quality)

### Phase 4: Asset Loading & Compression

- Integrate KTX2Loader with Basis transcoder preloading
- Create optimized GLTF loader with streaming support
- Implement ZoneLoader for per-zone asset loading
- Set up asset manifest parsing and validation

### Phase 5: LOD System

- Design multi-level LOD structure (3-4 levels per asset)
- Implement LODManager with distance-based switching
- Add progressive quality upgrades during zone transitions
- Create LODSystem for automatic LOD selection

### Phase 6: Culling & Optimization

- Implement frustum culling (built into three.js)
- Create PortalCulling for zone-based visibility
- Add optional occlusion culling using BVH
- Optimize culling order and update frequency

### Phase 7: Instancing & Batching

- Implement InstancingSystem for repeated geometry
- Create BatchManager to combine static geometry by material
- Add draw call optimization (target ≤100, max 200)
- Optimize material sharing across instances

### Phase 8: Performance & Adaptive Quality

- Build PerformanceMonitor tracking frame time, draw calls, memory
- Implement DynamicResolution with pixel ratio clamping
- Create AdaptiveQuality system with effect toggles
- Add FPS target management (30 FPS minimum, higher on capable devices)

### Phase 9: Profiling & Telemetry

- Integrate stats.js for real-time metrics
- Add Spector.js integration for WebGL debugging
- Create TelemetryCollector for loading and rendering metrics
- Build Profiler with 95th percentile frame time tracking

### Phase 10: Service Worker & Caching

- Implement service worker with cache-first for assets
- Create network-first strategy for manifest updates
- Set up proper cache headers and invalidation
- Add offline fallback support

### Phase 11: Documentation

Create separate `.md` files in `docs/` for each system:

- `assets-and-compression.md`
- `streaming-and-manifest.md`
- `loaders.md`
- `lod-system.md`
- `culling-methods.md`
- `instancing-and-batching.md`
- `collision-and-navigation.md`
- `performance-and-adaptive-quality.md`
- `profiling-and-telemetry.md`
- `caching-and-service-worker.md`

Each doc includes: purpose, inputs/outputs, runtime budget, acceptance criteria.

## Key Technical Decisions

1. **React Integration**: React manages app state and UI; three.js runs in useEffect with cleanup
2. **Collision**: Use three-mesh-bvh for efficient raycast-based collision
3. **Mobile Controls**: Virtual joystick overlay for movement, touch drag for camera
4. **Zone Format**: JSON manifest with zone metadata, asset lists, LOD definitions, neighbor zones
5. **Texture Format**: KTX2 with Basis compression, transcoder loaded upfront
6. **LOD Strategy**: Distance-based with 3 levels (low/med/high), instant low LOD on zone entry
7. **Performance Budget**: Monitor every frame, adapt every 1-2 seconds
8. **Service Worker**: Cache-first for static assets, network-first for manifests, 7-day TTL

## Dependencies to Add

- `react`, `react-dom` (^18.x)
- `@types/react`, `@types/react-dom`
- `stats.js` (for FPS display)
- `@spectorjs/spector` (for WebGL debugging, dev only)

## Build Configuration

- Vite code splitting for zone assets
- Separate chunks for each zone
- Preload critical assets (transcoder, initial zone)
- Configure public asset serving for KTX2/GLTF files

## Testing Strategy

- Test on mobile devices (target: mid-range Android/iOS)
- Verify 30 FPS minimum on target hardware
- Measure initial load time on 4G simulation
- Validate zone transition smoothness
- Check memory usage stays within 200-300 MB
- Verify draw calls ≤ 200 (preferably ≤ 100)