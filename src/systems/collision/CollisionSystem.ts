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
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../../utils/constants';

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
  private static meshes: THREE.Mesh[] = [];

  /**
   * Registers a mesh for collision detection.
   */
  static registerMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry && !(mesh.geometry as any).boundsTree) {
      (mesh.geometry as any).computeBoundsTree();
    }
    this.meshes.push(mesh);
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
   */
  static checkCapsuleCollision(
    position: THREE.Vector3,
    radius: number = PLAYER_RADIUS,
    height: number = PLAYER_HEIGHT
  ): CollisionResult {
    const raycaster = new THREE.Raycaster();
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, -1, 0), // Ground check
    ];

    for (const dir of directions) {
      raycaster.set(position, dir);
      const intersections = this.raycast(raycaster);
      const hit = intersections[0];

      if (hit && hit.distance < radius) {
        return {
          hit: true,
          normal: hit.face?.normal ? new THREE.Vector3().copy(hit.face.normal).transformDirection(hit.object.matrixWorld) : undefined,
          distance: hit.distance,
          point: hit.point,
        };
      }
    }

    return { hit: false };
  }

  /**
   * Finds ground position below a point.
   */
  static findGround(position: THREE.Vector3, maxDistance: number = 10): CollisionResult {
    const raycaster = new THREE.Raycaster();
    raycaster.set(position, new THREE.Vector3(0, -1, 0));
    const intersections = this.raycast(raycaster);

    if (intersections.length > 0 && intersections[0].distance <= maxDistance) {
      const hit = intersections[0];
      return {
        hit: true,
        normal: hit.face?.normal ? new THREE.Vector3().copy(hit.face.normal).transformDirection(hit.object.matrixWorld) : undefined,
        distance: hit.distance,
        point: hit.point,
      };
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
  }
}

