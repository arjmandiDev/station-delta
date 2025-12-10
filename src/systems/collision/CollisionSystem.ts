/**
 * Collision detection system using BVH.
 * 
 * Purpose: Efficient collision detection for player movement.
 * Responsibilities: Raycast-based collision, ground detection, wall detection.
 * Inputs: Player position, movement direction, scene geometry.
 * Outputs: Collision results, valid movement positions.
 * Side effects: None (pure collision detection).
 */

import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { OBB } from 'three/addons/math/OBB.js';
import { PLAYER_HEIGHT, PLAYER_RADIUS, PLAYER_EYE_HEIGHT, PLAYER_SPEED } from '../../utils/constants';

// Extend Mesh and BufferGeometry to include BVH
THREE.Mesh.prototype.raycast = acceleratedRaycast;
(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;

export interface CollisionResult {
  hit: boolean;
  normal?: THREE.Vector3;
  distance?: number;
  point?: THREE.Vector3;
}

export class CollisionSystem {
  private static meshes: THREE.Mesh[] = []; // Room meshes for ray casting
  private static objectMeshes: Map<THREE.Mesh, OBB> = new Map(); // Object meshes with OBBs

  /**
   * Helper: Generates horizontal directions for collision detection.
   * @param count Number of directions to generate (must be power of 2, e.g., 8, 16, 32)
   * @returns Array of normalized direction vectors
   */
  private static generateHorizontalDirections(count: number = 16): THREE.Vector3[] {
    const directions: THREE.Vector3[] = [];
    const angleStep = (2 * Math.PI) / count;
    
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const x = Math.sin(angle);
      const z = Math.cos(angle);
      directions.push(new THREE.Vector3(x, 0, z).normalize());
    }
    
    return directions;
  }

  /**
   * Helper: Calculates the height/thickness of a mesh object in world space.
   * @param mesh The mesh to calculate height for
   * @returns Height in world units, or 0 if calculation fails
   */
  private static getObjectHeight(mesh: THREE.Mesh): number {
    if (!mesh.geometry) {
      return 0;
    }
    
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) {
      return 0;
    }
    
    const size = new THREE.Vector3();
    box.getSize(size);
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);
    
    return size.y * Math.abs(worldScale.y);
  }

  /**
   * Helper: Transforms a face normal to world space.
   * @param face The intersection face (can be null or undefined)
   * @param object The object containing the face
   * @returns World space normal vector, or undefined if calculation fails
   */
  private static getWorldNormal(face: THREE.Face | null | undefined, object: THREE.Object3D): THREE.Vector3 | undefined {
    if (!face?.normal) {
      return undefined;
    }
    
    const normal = new THREE.Vector3().copy(face.normal);
    return normal.transformDirection(object.matrixWorld);
  }

  /**
   * Registers a mesh for collision detection (room geometry - uses ray casting).
   */
  static registerMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry && !(mesh.geometry as any).boundsTree) {
      (mesh.geometry as any).computeBoundsTree();
    }
    this.meshes.push(mesh);
  }

  /**
   * Registers an object mesh for OBB collision detection.
   */
  static registerObjectMesh(mesh: THREE.Mesh): void {
    if (!mesh.geometry) {
      return;
    }

    // Update matrix to ensure correct transform
    mesh.updateMatrixWorld();

    // Create OBB from mesh
    const obb = this.createOBBFromMesh(mesh);
    this.objectMeshes.set(mesh, obb);
  }

  /**
   * Unregisters an object mesh from OBB collision detection.
   */
  static unregisterObjectMesh(mesh: THREE.Mesh): void {
    this.objectMeshes.delete(mesh);
  }

  /**
   * Unregisters a mesh from collision detection.
   */
  static unregisterMesh(mesh: THREE.Mesh): void {
    const index = this.meshes.indexOf(mesh);
    if (index > -1) {
      this.meshes.splice(index, 1);
      if (mesh.geometry && (mesh.geometry as any).boundsTree) {
        (mesh.geometry as any).disposeBoundsTree();
      }
    }
  }

  /**
   * Performs a raycast against all registered meshes.
   */
  static raycast(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const intersections: THREE.Intersection[] = [];
    for (const mesh of this.meshes) {
      const hits = raycaster.intersectObject(mesh, false);
      intersections.push(...hits);
    }
    return intersections.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Checks if a capsule position is valid (no collisions).
   * Uses ground ray and one rotating side ray (checks multiple angles).
   */
  static checkCapsuleCollision(
    position: THREE.Vector3,
    radius: number = PLAYER_RADIUS
  ): CollisionResult {
    const raycaster = new THREE.Raycaster();
    
    // Generate 16 horizontal directions (every 22.5 degrees)
    const directions = this.generateHorizontalDirections(16);

    const PLAYER_EYE_HEIGHT = 1.6; // Import this constant
    
    // 2 vertical rows from surface (near ground) to eye height
    // Distribute evenly from base to eye height
    const numRows = 2;
    const baseHeight = PLAYER_RADIUS*4; // Start from surface (just above ground)
    const topHeight = PLAYER_EYE_HEIGHT; // End at eye height
    const verticalRange = topHeight - baseHeight;
    
    // Generate 2 vertical positions
    const verticalPositions: number[] = [];
    for (let i = 0; i < numRows; i++) {
      const ratio = i / (numRows - 1); // 0 to 1
      const height = baseHeight + verticalRange * ratio;
      verticalPositions.push(height);
    }

    // Check all 32 rays (16 directions × 2 rows)
    for (const verticalHeight of verticalPositions) {
      const rayStart = position.clone();
      rayStart.y = position.y - (PLAYER_EYE_HEIGHT - verticalHeight); // Adjust from camera position

      // Check all 16 horizontal directions
      for (const dir of directions) {
        raycaster.set(rayStart, dir);
        const intersections = this.raycast(raycaster);
        const hit = intersections[0];

        if (hit && hit.distance < radius) {
          return {
            hit: true,
            normal: this.getWorldNormal(hit.face, hit.object),
            distance: hit.distance,
            point: hit.point,
          };
        }
      }
    }

    return { hit: false };
  }

  /**
   * Finds ground position below a point.
   * Only treats objects as ground if their height is 10% of player height or less.
   */
  static findGround(position: THREE.Vector3, maxDistance: number = 10): CollisionResult {
    const raycaster = new THREE.Raycaster();
    raycaster.set(position, new THREE.Vector3(0, -1, 0));
    const intersections = this.raycast(raycaster);

    const MAX_GROUND_THICKNESS = PLAYER_HEIGHT * 0.1; // 10% of player height

    for (const hit of intersections) {
      if (hit.distance > maxDistance) {
        continue;
      }

      // Calculate the height/thickness of the hit object
      let objectHeight = 0;
      if (hit.object instanceof THREE.Mesh) {
        objectHeight = this.getObjectHeight(hit.object);
      }

      // If object is thin enough (like a floor), use it as ground
      if (objectHeight <= MAX_GROUND_THICKNESS) {
        return {
          hit: true,
          normal: this.getWorldNormal(hit.face, hit.object),
          distance: hit.distance,
          point: hit.point,
        };
      } else {
        // Object is too thick (table, chair, etc.) - continue raycast from bottom of object
        if (hit.object instanceof THREE.Mesh && hit.object.geometry) {
          hit.object.geometry.computeBoundingBox();
          const box = hit.object.geometry.boundingBox;
          if (box) {
            const worldMatrix = new THREE.Matrix4();
            hit.object.updateMatrixWorld();
            worldMatrix.copy(hit.object.matrixWorld);
            
            // Get bottom Y in world space
            const localBottom = new THREE.Vector3(0, box.min.y, 0);
            const worldBottom = localBottom.applyMatrix4(worldMatrix);
            
            // Continue raycast from bottom of this object
            const continueRaycaster = new THREE.Raycaster();
            continueRaycaster.set(worldBottom, new THREE.Vector3(0, -1, 0));
            const continueIntersections = this.raycast(continueRaycaster);
            
            // Find ground below this object
            for (const continueHit of continueIntersections) {
              if (continueHit.object !== hit.object && continueHit.distance <= maxDistance) {
                // Check if this is also a thin object
                let continueObjectHeight = 0;
                if (continueHit.object instanceof THREE.Mesh) {
                  continueObjectHeight = this.getObjectHeight(continueHit.object);
                }
                
                if (continueObjectHeight <= MAX_GROUND_THICKNESS) {
                  return {
                    hit: true,
                    normal: this.getWorldNormal(continueHit.face, continueHit.object),
                    distance: continueHit.distance + hit.distance, // Total distance from original position
                    point: continueHit.point,
                  };
                }
              }
            }
          }
        }
      }
    }

    return { hit: false };
  }

  /**
   * Clears all registered meshes.
   */
  static clear(): void {
    for (const mesh of this.meshes) {
      if (mesh.geometry && (mesh.geometry as any).boundsTree) {
        (mesh.geometry as any).disposeBoundsTree();
      }
    }
    this.meshes = [];
    this.objectMeshes.clear();
  }

  /**
   * Creates an OBB from a mesh (based on obb.js pattern).
   * @param mesh The mesh to create OBB from
   * @returns The created OBB
   */
  static createOBBFromMesh(mesh: THREE.Mesh): OBB {
    if (!mesh.geometry) {
      throw new Error('Mesh must have geometry');
    }

    mesh.updateMatrixWorld();
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) {
      throw new Error('Bounding box not computed');
    }

    // Get world scale
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);

    // Calculate size in world space
    const localSize = new THREE.Vector3();
    box.getSize(localSize);
    const halfSize = new THREE.Vector3(
      (localSize.x * Math.abs(worldScale.x)) / 2,
      (localSize.y * Math.abs(worldScale.y)) / 2,
      (localSize.z * Math.abs(worldScale.z)) / 2
    );

    // Create OBB
    const obb = new OBB();
    obb.halfSize.copy(halfSize);
    obb.center.copy(mesh.position);

    // Extract rotation matrix from mesh (based on obb.js lines 270-272)
    const rotationMatrix = new THREE.Matrix3();
    rotationMatrix.setFromMatrix4(mesh.matrixWorld);
    obb.rotation.copy(rotationMatrix);

    return obb;
  }

  /**
   * Updates OBB to match mesh position and rotation (based on obb.js lines 330-337).
   * @param obb The OBB to update
   * @param mesh The mesh to match
   */
  static updateOBB(obb: OBB, mesh: THREE.Mesh): void {
    mesh.updateMatrixWorld();
    obb.center.copy(mesh.position);

    // Update rotation matrix from mesh quaternion
    const rotationMatrix = new THREE.Matrix3();
    rotationMatrix.setFromMatrix4(mesh.matrixWorld);
    obb.rotation.copy(rotationMatrix);
  }

  /**
   * Creates player OBB (based on obb.js lines 201-206).
   * @param position Player position
   * @returns Player OBB
   */
  static createPlayerOBB(position: THREE.Vector3): OBB {
    const playerOBB = new OBB();
    playerOBB.halfSize.set(PLAYER_RADIUS, PLAYER_HEIGHT / 2, PLAYER_RADIUS);
    
    // Center at player position (adjusted for eye height)
    const center = position.clone();
    center.y -= (PLAYER_EYE_HEIGHT - PLAYER_HEIGHT / 2);
    playerOBB.center.copy(center);

    // Initialize rotation matrix (identity for now - player doesn't rotate)
    playerOBB.rotation.identity();

    return playerOBB;
  }

  /**
   * Checks OBB collisions with all registered object meshes (based on obb.js lines 355-362).
   * @param playerOBB Player OBB
   * @returns Collision result with collided mesh and OBB, or null
   */
  static checkObjectCollisions(playerOBB: OBB): { mesh: THREE.Mesh; obb: OBB } | null {
    // Update all object OBBs first
    this.updateObjectOBBs();

    for (const [mesh, obb] of this.objectMeshes.entries()) {
      if (playerOBB.intersectsOBB(obb)) {
        return { mesh, obb };
      }
    }

    return null;
  }

  /**
   * Updates all registered object OBBs to match their mesh transforms.
   */
  static updateObjectOBBs(): void {
    for (const [mesh, obb] of this.objectMeshes.entries()) {
      this.updateOBB(obb, mesh);
    }
  }

  /**
   * Resolves penetration between player and object OBBs (based on obb.js lines 389-433).
   * @param playerOBB Player OBB
   * @param objectOBB Object OBB
   * @param deltaTimeSeconds Physics step time in seconds (for frame-rate aware pushback)
   * @returns Push-out vector to resolve penetration
   */
  static resolvePenetration(
    playerOBB: OBB,
    objectOBB: OBB,
    deltaTimeSeconds: number,
  ): THREE.Vector3 {
    const playerCenter = playerOBB.center;
    const objectCenter = objectOBB.center;

    // Calculate direction from object to player
    const direction = new THREE.Vector3();
    direction.subVectors(playerCenter, objectCenter);
    const distance = direction.length();

    // If centers are too close, use a default direction
    if (distance < 0.001) {
      direction.set(1, 0, 0); // Default direction
    } else {
      direction.normalize();
    }

    // Calculate approximate radii from OBB half-sizes
    // For object: use the largest half-size
    const objectRadius = Math.max(
      objectOBB.halfSize.x,
      objectOBB.halfSize.y,
      objectOBB.halfSize.z
    );

    // For player: use the larger of radius or half-height
    const playerRadius = Math.max(
      playerOBB.halfSize.x, // radius
      playerOBB.halfSize.y   // half-height
    );

    // Minimum separation distance
    const minSeparation = objectRadius + playerRadius;

    // Current distance between centers
    const currentDistance = playerCenter.distanceTo(objectCenter);

    // If penetrating, push out
    if (currentDistance < minSeparation) {
      const penetrationDepth = minSeparation - currentDistance;

      /**
       * Push distance is:
       * - proportional to penetration depth (to get out of the object),
       * - but limited by a max push *per second* so behavior is smooth and
       *   consistent across different FPS.
       */
      const MARGIN = 0.0005; // Small extra distance to avoid sticking on the surface
      const MAX_PUSH_PER_SECOND = PLAYER_SPEED * 2; // Tunable factor

      const targetPush = penetrationDepth + MARGIN;
      const maxPushThisStep = Math.max(0, MAX_PUSH_PER_SECOND * deltaTimeSeconds);

      const pushDistance =
        maxPushThisStep > 0 ? Math.min(targetPush, maxPushThisStep) : targetPush;

      return direction.clone().multiplyScalar(pushDistance);
    }

    return new THREE.Vector3(0, 0, 0);
  }

  /**
   * Projects movement vector onto tangent plane for sliding (based on obb.js lines 441-451).
   * @param moveVector Original movement vector
   * @param normal Collision normal vector
   * @returns Projected movement vector on tangent plane
   */
  static projectOntoTangentPlane(moveVector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // Calculate dot product of movement and normal
    const dot = moveVector.dot(normal);

    // Project onto tangent plane: moveVector - (moveVector · normal) * normal
    const projected = new THREE.Vector3();
    projected.copy(moveVector);
    projected.sub(normal.clone().multiplyScalar(dot));

    return projected;
  }

  /**
   * Calculates collision normal between player and object (based on obb.js lines 370-381).
   * @param playerPos Player position
   * @param objectPos Object position
   * @returns Normalized collision normal vector
   */
  static calculateCollisionNormal(playerPos: THREE.Vector3, objectPos: THREE.Vector3): THREE.Vector3 {
    const normal = new THREE.Vector3();
    normal.subVectors(playerPos, objectPos);
    const distance = normal.length();
    if (distance > 0) {
      normal.normalize();
    } else {
      // If positions are identical, use default up direction
      normal.set(0, 1, 0);
    }
    return normal;
  }

  /**
   * Creates a visible wireframe box to visualize an OBB (based on obb.js lines 131-150).
   * @param obb The OBB to visualize
   * @param color Color of the wireframe (default: yellow)
   * @returns Wireframe box representing the OBB
   */
  static createOBBHelper(obb: OBB, color: number = 0xffff00): THREE.LineSegments {
    // Create box geometry matching OBB dimensions
    const boxGeometry = new THREE.BoxGeometry(
      obb.halfSize.x * 2,
      obb.halfSize.y * 2,
      obb.halfSize.z * 2
    );

    // Create wireframe material
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2
    });

    // Create wireframe from edges
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const wireframe = new THREE.LineSegments(edges, wireframeMaterial);

    // Update position and rotation to match OBB
    CollisionSystem.updateOBBHelper(wireframe, obb);

    return wireframe;
  }

  /**
   * Updates OBB helper position and rotation to match the OBB (based on obb.js lines 157-171).
   * @param helper The wireframe helper
   * @param obb The OBB to match
   */
  static updateOBBHelper(helper: THREE.LineSegments, obb: OBB): void {
    // Update position
    helper.position.copy(obb.center);

    // Update rotation to match OBB orientation
    // OBB rotation is stored as a matrix, extract quaternion
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.set(
      obb.rotation.elements[0], obb.rotation.elements[1], obb.rotation.elements[2], 0,
      obb.rotation.elements[3], obb.rotation.elements[4], obb.rotation.elements[5], 0,
      obb.rotation.elements[6], obb.rotation.elements[7], obb.rotation.elements[8], 0,
      0, 0, 0, 1
    );
    helper.quaternion.setFromRotationMatrix(rotationMatrix);
  }

  /**
   * Gets all registered object meshes and their OBBs for visualization.
   */
  static getObjectMeshes(): Map<THREE.Mesh, OBB> {
    return this.objectMeshes;
  }
}
