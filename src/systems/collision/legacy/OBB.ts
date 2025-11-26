/**
 * Oriented Bounding Box (OBB) implementation.
 * 
 * Purpose: Represents an oriented bounding box for collision detection.
 * Responsibilities: OBB structure, SAT collision testing.
 */

import * as THREE from 'three';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../../../utils/constants';

/**
 * Oriented Bounding Box structure.
 */
export class OBB {
  center: THREE.Vector3;
  halfExtents: THREE.Vector3; // نیم‌طول در هر جهت (width/2, height/2, depth/2)
  axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; // 3 بردار جهت (normalized)

  constructor(
    center: THREE.Vector3,
    halfExtents: THREE.Vector3,
    axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3]
  ) {
    this.center = center.clone();
    this.halfExtents = halfExtents.clone();
    this.axes = [
      axes[0].clone().normalize(),
      axes[1].clone().normalize(),
      axes[2].clone().normalize(),
    ];
  }

  /**
   * Creates OBB from a Three.js mesh.
   */
  static fromMesh(mesh: THREE.Mesh): OBB {
    if (!mesh.geometry) {
      throw new Error('Mesh must have geometry');
    }

    mesh.updateMatrixWorld();
    mesh.geometry.computeBoundingBox();

    const box = mesh.geometry.boundingBox;
    if (!box) {
      throw new Error('Bounding box not computed');
    }

    // Get world transform
    const worldMatrix = mesh.matrixWorld;
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);

    // Calculate center in world space
    const localCenter = box.getCenter(new THREE.Vector3());
    const worldCenter = localCenter.applyMatrix4(worldMatrix);

    // Calculate half extents in world space
    const localSize = new THREE.Vector3();
    box.getSize(localSize);
    const halfExtents = new THREE.Vector3(
      (localSize.x * Math.abs(worldScale.x)) / 2,
      (localSize.y * Math.abs(worldScale.y)) / 2,
      (localSize.z * Math.abs(worldScale.z)) / 2
    );

    // Get axes from rotation (extract from world matrix)
    const rotationMatrix = new THREE.Matrix4().extractRotation(worldMatrix);
    const axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
      new THREE.Vector3(1, 0, 0).applyMatrix4(rotationMatrix).normalize(),
      new THREE.Vector3(0, 1, 0).applyMatrix4(rotationMatrix).normalize(),
      new THREE.Vector3(0, 0, 1).applyMatrix4(rotationMatrix).normalize(),
    ];

    return new OBB(worldCenter, halfExtents, axes);
  }

  /**
   * Creates OBB for player (capsule approximated as box).
   */
  static fromPlayerPosition(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    right: THREE.Vector3
  ): OBB {
    // Player is a capsule, but we approximate it as a box
    // Width and depth = PLAYER_RADIUS * 2, Height = PLAYER_HEIGHT
    const halfExtents = new THREE.Vector3(
      PLAYER_RADIUS,
      PLAYER_HEIGHT / 2,
      PLAYER_RADIUS
    );

    // Player's axes: right, up, forward (from camera)
    const up = new THREE.Vector3(0, 1, 0);
    const forward = direction.clone().normalize();
    const playerRight = right.clone().normalize();

    // Ensure axes are orthogonal
    const correctedUp = forward.clone().cross(playerRight).normalize();
    const correctedRight = correctedUp.clone().cross(forward).normalize();

    const axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
      correctedRight,
      correctedUp,
      forward,
    ];

    // Center is at position (camera position, but OBB center should be at capsule center)
    const center = position.clone();
    center.y -= 0.2; // Adjust to capsule center (eye height - half height)

    return new OBB(center, halfExtents, axes);
  }

  /**
   * Projects OBB onto an axis (for SAT).
   */
  projectOntoAxis(axis: THREE.Vector3): { min: number; max: number } {
    const normalizedAxis = axis.clone().normalize();
    
    // Project center
    const centerProjection = this.center.dot(normalizedAxis);
    
    // Calculate projection of half extents
    let radius = 0;
    for (let i = 0; i < 3; i++) {
      const axisProjection = Math.abs(this.axes[i].dot(normalizedAxis));
      radius += this.halfExtents.getComponent(i) * axisProjection;
    }

    return {
      min: centerProjection - radius,
      max: centerProjection + radius,
    };
  }

  /**
   * Tests collision between two OBBs using SAT (Separating Axis Theorem).
   */
  static testOBBvsOBB(obb1: OBB, obb2: OBB): {
    colliding: boolean;
    penetrationDepth?: number;
    normal?: THREE.Vector3;
  } {
    // Test 15 axes: 3 from obb1, 3 from obb2, 9 cross products
    const axes: THREE.Vector3[] = [
      // Axes from obb1
      obb1.axes[0],
      obb1.axes[1],
      obb1.axes[2],
      // Axes from obb2
      obb2.axes[0],
      obb2.axes[1],
      obb2.axes[2],
    ];

    // Cross products of axes (9 combinations)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const cross = obb1.axes[i].clone().cross(obb2.axes[j]);
        const length = cross.length();
        if (length > 0.001) {
          // Only add if not parallel
          axes.push(cross.normalize());
        }
      }
    }

    let minPenetration = Infinity;
    let minPenetrationAxis: THREE.Vector3 | null = null;

    // Test each axis
    for (const axis of axes) {
      const proj1 = obb1.projectOntoAxis(axis);
      const proj2 = obb2.projectOntoAxis(axis);

      // Check for separation
      if (proj1.max < proj2.min || proj2.max < proj1.min) {
        // Separated on this axis - no collision
        return { colliding: false };
      }

      // Calculate penetration depth
      const overlap = Math.min(proj1.max - proj2.min, proj2.max - proj1.min);
      if (overlap < minPenetration) {
        minPenetration = overlap;
        minPenetrationAxis = axis.clone();
      }
    }

    // All axes overlap - collision detected
    // Determine collision normal (from obb1 to obb2)
    const centerDiff = obb2.center.clone().sub(obb1.center);
    if (minPenetrationAxis) {
      // Ensure normal points from obb1 to obb2
      if (centerDiff.dot(minPenetrationAxis) < 0) {
        minPenetrationAxis.negate();
      }
    }

    return {
      colliding: true,
      penetrationDepth: minPenetration,
      normal: minPenetrationAxis || undefined,
    };
  }
}

