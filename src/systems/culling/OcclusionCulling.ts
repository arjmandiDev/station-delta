/**
 * Occlusion culling using BVH.
 * 
 * Purpose: Cull objects occluded by other geometry.
 * Responsibilities: Raycast occlusion checks, determine visibility.
 * Inputs: Camera, objects, scene geometry.
 * Outputs: Visibility flags.
 * Side effects: None (pure culling).
 */

import * as THREE from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';

export class OcclusionCulling {
  /**
   * Checks if an object is occluded.
   */
  isOccluded(object: THREE.Object3D, camera: THREE.Camera): boolean {
    const objectBox = new THREE.Box3().setFromObject(object);
    const objectCenter = objectBox.getCenter(new THREE.Vector3());
    const cameraPosition = camera.position.clone();

    const direction = objectCenter.sub(cameraPosition).normalize();
    const distance = cameraPosition.distanceTo(objectCenter);

    const raycaster = new THREE.Raycaster();
    raycaster.set(cameraPosition, direction);

    const intersections = CollisionSystem.raycast(raycaster);

    if (intersections.length > 0) {
      const firstHit = intersections[0];
      if (firstHit.distance < distance - 0.1) {
        return true; // Occluded
      }
    }

    return false;
  }

  /**
   * Filters objects to only non-occluded ones.
   */
  filterVisible(objects: THREE.Object3D[], camera: THREE.Camera): THREE.Object3D[] {
    return objects.filter((obj) => !this.isOccluded(obj, camera));
  }
}

