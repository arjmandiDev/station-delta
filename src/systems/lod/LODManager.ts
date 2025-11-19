/**
 * LOD manager for distance-based quality switching.
 * 
 * Purpose: Manages LOD levels based on distance to camera.
 * Responsibilities: Calculate distances, determine appropriate LOD, trigger upgrades.
 * Inputs: Camera position, object positions, LOD distances.
 * Outputs: LOD level recommendations.
 * Side effects: None (pure calculation).
 */

import * as THREE from 'three';
import { LOD_DISTANCE_LOW, LOD_DISTANCE_MEDIUM, LOD_DISTANCE_HIGH } from '../../utils/constants';

export type LODLevel = 'low' | 'medium' | 'high';

export class LODManager {
  private distances: {
    low: number;
    medium: number;
    high: number;
  };

  constructor(
    lowDistance: number = LOD_DISTANCE_LOW,
    mediumDistance: number = LOD_DISTANCE_MEDIUM,
    highDistance: number = LOD_DISTANCE_HIGH
  ) {
    this.distances = {
      low: lowDistance,
      medium: mediumDistance,
      high: highDistance,
    };
  }

  /**
   * Determines LOD level based on distance.
   */
  getLODLevel(distance: number): LODLevel {
    if (distance <= this.distances.high) {
      return 'high';
    } else if (distance <= this.distances.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Gets LOD level for an object from camera position.
   */
  getLODForObject(cameraPosition: THREE.Vector3, objectPosition: THREE.Vector3): LODLevel {
    const distance = cameraPosition.distanceTo(objectPosition);
    return this.getLODLevel(distance);
  }

  /**
   * Gets LOD level for multiple objects (returns most common needed level).
   */
  getLODForObjects(
    cameraPosition: THREE.Vector3,
    objectPositions: THREE.Vector3[]
  ): LODLevel {
    if (objectPositions.length === 0) return 'low';

    const distances = objectPositions.map((pos) => cameraPosition.distanceTo(pos));
    const minDistance = Math.min(...distances);

    return this.getLODLevel(minDistance);
  }

  /**
   * Updates LOD distances.
   */
  setDistances(low: number, medium: number, high: number): void {
    this.distances = { low, medium, high };
  }
}

