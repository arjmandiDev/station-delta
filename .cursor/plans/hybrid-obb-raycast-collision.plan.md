# Hybrid OBB and Raycast Collision Detection

## Overview
Implement a hybrid collision detection system that uses:
- **Three.js built-in OBB** (from `three/addons/math/OBB.js`) for collisions with objects/assets
- **Ray casting** for collisions with room geometry

This solves the corner collision issues with ray casting when two objects collide.

## Changes Required

### 1. Manifest Updates
**File: `src/systems/streaming/AssetManifest.ts`**
- Add `isRoom?: boolean` field to `ZoneAsset` interface to mark room assets

**File: `public/assets/zones/main-room/manifest.json`**
- Add `"isRoom": true` to the `main-room` asset (the room geometry)

### 2. Collision System Enhancement
**File: `src/systems/collision/CollisionSystem.ts`**

Import and setup:
- `import { OBB } from 'three/addons/math/OBB.js'`
- Add `private static objectMeshes: Map<THREE.Mesh, OBB> = new Map()`

New methods (based on obb.js patterns):
- `registerObjectMesh(mesh)` - Register mesh for OBB, create OBB using `createOBBFromMesh`
- `unregisterObjectMesh(mesh)` - Remove from OBB tracking
- `checkObjectCollisions(playerOBB: OBB)` - Check collisions using `intersectsOBB` (obb.js lines 355-362)
- `createOBBFromMesh(mesh)` - Create OBB from mesh (obb.js lines 264-272 pattern)
- `updateOBB(obb: OBB, mesh)` - Update OBB transform (obb.js lines 330-337 exact pattern)
- `createPlayerOBB(position)` - Create player OBB (obb.js lines 201-206 pattern)
- `resolvePenetration(playerOBB: OBB, objectOBB: OBB)` - Resolve penetration (obb.js lines 389-433 exact logic)
- `projectOntoTangentPlane(moveVector, normal)` - Project for sliding (obb.js lines 441-451 exact logic)

Modify existing:
- Keep `registerMesh`/`unregisterMesh` for room meshes (ray casting only)
- `checkCapsuleCollision` should only check room meshes

### 3. Zone Manager Updates
**File: `src/systems/streaming/ZoneManager.ts`**
- Modify `registerObjectForCollision`:
  - If `asset.isRoom === true`: use `CollisionSystem.registerMesh` (ray casting)
  - If `asset.isRoom !== true` and `collision === true`: use `CollisionSystem.registerObjectMesh` (OBB)
- Update `unregisterObjectForCollision` similarly

### 4. Player Physics Updates
**File: `src/systems/collision/PlayerPhysics.ts`**

Import:
- `import { OBB } from 'three/addons/math/OBB.js'`

Modify `slideCollision` method:
1. Create player OBB using `CollisionSystem.createPlayerOBB`
2. Check OBB collisions with objects using `CollisionSystem.checkObjectCollisions`
3. If object collision:
   - Resolve penetration using `CollisionSystem.resolvePenetration` (obb.js lines 389-433)
   - Apply sliding using `CollisionSystem.projectOntoTangentPlane` (obb.js lines 441-451)
   - Use progressive slide attempts (obb.js lines 551-576) if full slide causes collision
4. Then check ray cast collisions with room (existing behavior)
5. Combine responses appropriately

### 5. OBB Update Loop
**File: `src/systems/collision/CollisionSystem.ts`**
- Add `updateObjectOBBs()` method to update all object OBBs each frame
- Call from animation loop or when objects transform

## Implementation Details

### OBB Creation (from obb.js)
- **From mesh** (lines 264-272): Create OBB, set halfSize from bounding box, copy position to center, extract rotation matrix from matrixWorld
- **Player OBB** (lines 201-206): Set halfSize (radius, height/2, radius), copy position to center, initialize rotation

### OBB Update (from obb.js)
- **updateOBB** (lines 330-337): Copy mesh position to center, extract Matrix3 from matrixWorld, copy to rotation

### Collision Detection (from obb.js)
- **checkSphereCollisions** (lines 355-362): Iterate objects, use `playerOBB.intersectsOBB(objectOBB)`

### Collision Response (from obb.js)
- **resolvePenetration** (lines 389-433): Calculate direction, radii, min separation, penetration depth, push-out vector
- **projectOntoTangentPlane** (lines 441-451): Project movement vector onto tangent plane
- **handleMovement sliding** (lines 531-578): Progressive slide attempts with reduced distances

### Hybrid Detection Flow
1. Create player OBB from current position/orientation
2. Check OBB collisions with objects first
3. If object collision: resolve penetration and apply sliding
4. Then check ray cast collisions with room
5. Combine responses (object collision resolved first, then room collision)

