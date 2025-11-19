/**
 * Batch manager for combining static geometry.
 * 
 * Purpose: Reduce draw calls by batching static geometry by material.
 * Responsibilities: Group meshes by material, merge geometries.
 * Inputs: Array of meshes.
 * Outputs: Batched mesh groups.
 * Side effects: Merges geometries, reduces draw calls.
 */

import * as THREE from 'three';

export class BatchManager {
  /**
   * Batches meshes by material.
   */
  async batchMeshes(meshes: THREE.Mesh[]): Promise<THREE.Mesh[]> {
    const materialGroups = new Map<THREE.Material, THREE.Mesh[]>();

    // Group meshes by material
    for (const mesh of meshes) {
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!materialGroups.has(material)) {
        materialGroups.set(material, []);
      }
      materialGroups.get(material)!.push(mesh);
    }

    const batchedMeshes: THREE.Mesh[] = [];

    // Merge geometries for each material group
    for (const [material, group] of materialGroups) {
      if (group.length === 0) continue;

      if (group.length === 1) {
        batchedMeshes.push(group[0]);
        continue;
      }

      // Merge geometries
      const geometries: THREE.BufferGeometry[] = [];
      for (const mesh of group) {
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);
        geometries.push(geometry);
      }

      const mergedGeometry = await mergeGeometries(geometries);
      const batchedMesh = new THREE.Mesh(mergedGeometry, material);
      batchedMeshes.push(batchedMesh);

      // Dispose original geometries
      for (const geometry of geometries) {
        geometry.dispose();
      }
    }

    return batchedMeshes;
  }
}

// BufferGeometryUtils will be dynamically imported when needed
async function mergeGeometries(geometries: THREE.BufferGeometry[]): Promise<THREE.BufferGeometry> {
  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }
  if (geometries.length === 1) {
    return geometries[0];
  }

  try {
    const { mergeGeometries: merge } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
    return merge(geometries);
  } catch (error) {
    console.warn('BufferGeometryUtils not available, using fallback');
    // Fallback: return first geometry
    return geometries[0].clone();
  }
}

