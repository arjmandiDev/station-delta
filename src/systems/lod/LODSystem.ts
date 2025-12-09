/**
 * LOD system for automatic quality management.
 * 
 * Purpose: Automatically manages LOD levels for all objects in scene.
 * Responsibilities: Monitor distances, trigger LOD upgrades/downgrades.
 * Inputs: Camera position, scene objects.
 * Outputs: LOD change events.
 * Side effects: Triggers asset loading/unloading.
 */

import * as THREE from 'three';
import { LODManager, type LODLevel } from './LODManager';
import { ZoneManager } from '../streaming/ZoneManager';

export interface LODObject {
  id: string;
  position: THREE.Vector3;
  currentLOD: LODLevel;
  targetLOD: LODLevel;
}

export class LODSystem {
  private lodManager: LODManager;
  private zoneManager: ZoneManager;
  private camera: THREE.Camera;
  private updateInterval: number = 1000; // Update every second
  private lastUpdate: number = 0;
  private qualityPreset: LODLevel = 'medium';

  constructor(zoneManager: ZoneManager, camera: THREE.Camera) {
    this.lodManager = new LODManager();
    this.zoneManager = zoneManager;
    this.camera = camera;
  }

  /**
   * Updates LOD system (call each frame or periodically).
   */
  update(currentTime: number): void {
    if (currentTime - this.lastUpdate < this.updateInterval) {
      return;
    }

    this.lastUpdate = currentTime;

    const cameraPosition = this.camera.position;
    const currentZoneId = this.zoneManager.getCurrentZoneId();

    if (!currentZoneId) return;

    const zone = this.zoneManager.getZone(currentZoneId);
    if (!zone) return;

    // Determine target LOD for current zone from the active quality preset.
    const targetLOD = this.qualityPreset;

    // Adjust zone LOD to match the active quality preset (upgrade or downgrade).
    if (targetLOD !== zone.lodLevel) {
      console.log('[LODSystem] Changing zone LOD', {
        zoneId: currentZoneId,
        from: zone.lodLevel,
        to: targetLOD,
      });

      this.zoneManager
        .loadZone(currentZoneId, targetLOD)
        .then(() => {
          console.log('[LODSystem] Zone LOD upgrade complete', {
            zoneId: currentZoneId,
            level: targetLOD,
          });
        })
        .catch((error) => {
          console.warn(`Failed to upgrade zone LOD:`, error);
        });
    }
  }

  /**
   * Sets update interval.
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = interval;
  }

  /**
   * Gets LOD manager.
   */
  getLODManager(): LODManager {
    return this.lodManager;
  }

  /**
   * Sets the desired LOD level for the current zone based on the user's
   * graphics quality preset. This value is applied on the next update tick.
   */
  setQualityPreset(level: LODLevel): void {
    this.qualityPreset = level;
  }
}

