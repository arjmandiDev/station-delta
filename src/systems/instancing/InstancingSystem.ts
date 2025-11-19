/**
 * Instancing system for repeated geometry.
 * 
 * Purpose: Render multiple instances of the same geometry efficiently.
 * Responsibilities: Create instanced meshes, manage instance transforms.
 * Inputs: Base geometry, material, instance positions.
 * Outputs: Instanced mesh objects.
 * Side effects: Creates GPU instanced geometry.
 */

import * as THREE from 'three';

export class InstancingSystem {
  /**
   * Creates an instanced mesh from geometry and positions.
   */
  createInstancedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    positions: THREE.Vector3[],
    rotations?: THREE.Euler[],
    scales?: THREE.Vector3[]
  ): THREE.InstancedMesh {
    const count = positions.length;
    const mesh = new THREE.InstancedMesh(geometry, material, count);

    const matrix = new THREE.Matrix4();

    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(positions[i].x, positions[i].y, positions[i].z);

      if (rotations && rotations[i]) {
        const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotations[i]);
        matrix.multiply(rotationMatrix);
      }

      if (scales && scales[i]) {
        matrix.scale(scales[i]);
      }

      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  /**
   * Updates instance transform.
   */
  updateInstance(
    mesh: THREE.InstancedMesh,
    index: number,
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    const matrix = new THREE.Matrix4();

    if (position) {
      matrix.makeTranslation(position.x, position.y, position.z);
    }

    if (rotation) {
      const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation);
      matrix.multiply(rotationMatrix);
    }

    if (scale) {
      matrix.scale(scale);
    }

    mesh.setMatrixAt(index, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }
}

