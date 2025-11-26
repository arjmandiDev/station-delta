<!-- 94e236aa-a99d-4142-abdd-f866e537f392 0878696b-ba5b-4397-ad33-fd1dba235990 -->
# Third Person Camera and Box Collision Detection

## Overview

1. Convert player cylinder debug visualization to box
2. Replace radius-based collision detection with box-based detection using 8 rays
3. Implement third-person camera that orbits around player

## Task 1: Convert Cylinder to Box (Debug Visualization)

**File: `src/components/Canvas.tsx`**

- Replace `THREE.CylinderGeometry` with `THREE.BoxGeometry`
- Update dimensions: width = PLAYER_RADIUS * 2, height = PLAYER_HEIGHT, depth = PLAYER_RADIUS * 2
- Update position calculation to center box at player center
- Update variable names from `playerCylinder` to `playerBox`

**File: `src/systems/DebugGUI.ts`**

- Update references from "Player Cylinder" to "Player Box"
- Update method names: `registerPlayerCylinderHelper` → `registerPlayerBoxHelper`

## Task 2: Implement Box-Based Collision Detection

**File: `src/systems/collision/CollisionSystem.ts`**

### 2.1 Update `checkCapsuleCollision` method:

- Remove `radius` parameter (no longer needed)
- Calculate player box dimensions:
- Width = PLAYER_RADIUS * 2 (0.6m)
- Height = PLAYER_HEIGHT (1.8m)
- Depth = PLAYER_RADIUS * 2 (0.6m)
- Calculate box center (player position adjusted for eye height)
- Calculate 4 corner positions of the box base

### 2.2 Implement 8-ray collision detection:

- **4 rays from center** (cardinal directions):
- North: (0, 0, 1)
- East: (1, 0, 0)
- South: (0, 0, -1)
- West: (-1, 0, 0)
- Ray length: half of box dimension (0.3m for width/depth)

- **4 rays from corners** (as specified):
- Corner positions relative to box center:
- Corner 0: (-0.3, 0, -0.3) - bottom-left
- Corner 1: (-0.3, 0, 0.3) - top-left
- Corner 2: (0.3, 0, 0.3) - top-right
- Corner 3: (0.3, 0, -0.3) - bottom-right
- Ray directions:
- RAY1: Corner 0 → Corner 1 (along left edge)
- RAY2: Corner 1 → Corner 2 (along top edge)
- RAY3: Corner 2 → Corner 3 (along right edge)
- RAY4: Corner 3 → Corner 0 (along bottom edge)
- Ray length: box dimension (0.6m)
- Check at multiple heights (similar to current 4-row system)

### 2.3 Collision response:

- If any ray hits within its length, return collision
- Use hit point and normal for sliding algorithm
- Remove PLAYER_RADIUS from distance calculations

**File: `src/systems/collision/PlayerPhysics.ts`**

- Update `slideCollision` to work with box dimensions instead of radius
- Update collision response to use box half-extents instead of PLAYER_RADIUS

## Task 3: Implement Third-Person Camera

**File: `src/core/CameraController.ts`**

### 3.1 Add third-person camera mode:

- Add `cameraMode: 'first-person' | 'third-person'` property
- Add `thirdPersonDistance: number` (default: ~4-5 meters)
- Add `thirdPersonHeight: number` (default: ~2 meters above player)
- Add `thirdPersonAngle: number` (horizontal rotation around player)

### 3.2 Update camera positioning:

- **First-person mode**: Keep current behavior
- **Third-person mode**:
- Calculate camera position: player position + offset
- Offset calculation:
- Horizontal: based on `thirdPersonAngle` (mouse rotation)
- Vertical: `thirdPersonHeight` above player center
- Distance: `thirdPersonDistance` from player
- Camera should look at player center (or slightly above)
- Ensure full player is visible in view

### 3.3 Update rotation handling:

- In third-person mode, mouse movement rotates camera around player
- Update `thirdPersonAngle` based on mouse delta
- Camera should orbit around player, not rotate in place

**File: `src/components/Canvas.tsx`**

- Add GUI control to toggle between first-person and third-person
- Update camera controller initialization if needed

## Implementation Notes

1. **Box dimensions**: 

- Width/Depth = PLAYER_RADIUS * 2 = 0.6m
- Height = PLAYER_HEIGHT = 1.8m
- Center at player position adjusted for eye height

2. **Ray detection**:

- Check rays at multiple vertical positions (similar to current 4-row system)
- Consider checking at: base, mid, and top of box

3. **Third-person camera**:

- Start with distance ~4-5 meters
- Height ~2 meters above player center
- Smooth transitions when switching modes (optional)

4. **Testing**:

- Verify collision detection works with box shape
- Verify sliding works correctly with new collision method
- Verify third-person camera shows full player and orbits correctly

### To-dos

- [ ] Convert player cylinder debug visualization to box in Canvas.tsx and DebugGUI.ts
- [ ] Update CollisionSystem.checkCapsuleCollision to use box-based detection with 8 rays (4 center + 4 corners)
- [ ] Update PlayerPhysics.slideCollision to work with box dimensions instead of radius
- [ ] Add third-person camera mode to CameraController with orbit functionality
- [ ] Add GUI control to toggle between first-person and third-person camera modes