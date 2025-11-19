/**
 * Frustum culling system.
 * 
 * Purpose: Cull objects outside camera frustum.
 * Responsibilities: Check object visibility, filter visible objects.
 * Inputs: Camera, objects.
 * Outputs: Visibility flags.
 * Side effects: None (pure culling).
 */

import * as THREE from 'three';

export class FrustumCulling {
  private frustum: THREE.Frustum;

  constructor() {
    this.frustum = new THREE.Frustum();
  }

  /**
   * Updates frustum from camera.
   */
  update(camera: THREE.Camera): void {
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(matrix);
  }

  /**
   * Checks if an object is visible.
   */
  isVisible(object: THREE.Object3D): boolean {
    if (!object.visible) return false;

    const box = new THREE.Box3();
    box.setFromObject(object);

    return this.frustum.intersectsBox(box);
  }

  /**
   * Filters objects to only visible ones.
   */
  filterVisible(objects: THREE.Object3D[]): THREE.Object3D[] {
    return objects.filter((obj) => this.isVisible(obj));
  }
}

