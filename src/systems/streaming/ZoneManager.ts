/**
 * Zone management system with event-driven loading.
 * 
 * Purpose: Manages zone loading, unloading, and transitions based on events.
 * Responsibilities: Zone lifecycle, neighbor preloading, event handling.
 * Inputs: Zone manifests, player position, events.
 * Outputs: Loaded zones, transition events.
 * Side effects: Loads/unloads assets, modifies scene.
 */

import * as THREE from 'three';
import { type ZoneManifest, type ZoneTrigger, parseZoneManifest } from './AssetManifest';
import { StreamingLoader } from './StreamingLoader';
import { CollisionSystem } from '../collision/CollisionSystem';

export interface Zone {
  id: string;
  manifest: ZoneManifest;
  objects: THREE.Object3D[];
  loaded: boolean;
  loading: boolean;
  lodLevel: 'low' | 'medium' | 'high';
}

export class ZoneManager {
  private zones: Map<string, Zone> = new Map();
  private currentZoneId: string | null = null;
  private loader: StreamingLoader;
  private scene: THREE.Scene;
  private onZoneChange?: (zoneId: string) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new StreamingLoader();
  }

  /**
   * Sets zone change callback.
   */
  setZoneChangeCallback(callback: (zoneId: string) => void): void {
    this.onZoneChange = callback;
  }

  /**
   * Registers a zone manifest.
   */
  registerZone(manifest: ZoneManifest): void {
    const zone: Zone = {
      id: manifest.id,
      manifest,
      objects: [],
      loaded: false,
      loading: false,
      lodLevel: 'low',
    };
    this.zones.set(manifest.id, zone);
  }

  /**
   * Loads a zone (low LOD first, then upgrades).
   */
  async loadZone(
    zoneId: string,
    lodLevel: 'low' | 'medium' | 'high' = 'low',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone ${zoneId} not found`);
    }

    if (zone.loaded && zone.lodLevel === lodLevel) {
      return; // Already loaded at this level
    }

    if (zone.loading) {
      // Wait for current load to finish
      while (zone.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    zone.loading = true;

    try {
      // Load low LOD first if not loaded
      if (!zone.loaded) {
        await this.loadZoneLOD(zone, 'low', onProgress);
        zone.loaded = true;
        zone.lodLevel = 'low';
      }

      // Upgrade to requested LOD if different
      if (lodLevel !== zone.lodLevel && lodLevel !== 'low') {
        await this.upgradeZoneLOD(zone, lodLevel, onProgress);
        zone.lodLevel = lodLevel;
      }
    } finally {
      zone.loading = false;
    }
  }

  /**
   * Loads zone at specific LOD level.
   */
  private async loadZoneLOD(
    zone: Zone,
    lodLevel: 'low' | 'medium' | 'high',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const total = zone.manifest.assets.length;
    let loaded = 0;

    for (const asset of zone.manifest.assets) {
      try {
        const object = await this.loader.loadAsset(
          asset,
          lodLevel,
          (progress) => {
            if (onProgress) {
              const totalProgress = (loaded + progress.loaded / progress.total) / total;
              onProgress(totalProgress * 100);
            }
          }
        );

        if (object && object instanceof THREE.Object3D) {
          // Apply transforms
          if (asset.position) {
            object.position.set(...asset.position);
          }
          if (asset.rotation) {
            object.rotation.set(...asset.rotation);
          }
          if (asset.scale) {
            object.scale.set(...asset.scale);
          }

          // Add to scene
          this.scene.add(object);
          zone.objects.push(object);

          // Register for collision if it's geometry
          if (object instanceof THREE.Mesh && object.geometry) {
            CollisionSystem.registerMesh(object);
          }
        }
      } catch (error) {
        console.error(`Failed to load asset ${asset.id}:`, error);
      }

      loaded++;
    }
  }

  /**
   * Upgrades zone LOD level.
   */
  private async upgradeZoneLOD(
    zone: Zone,
    newLodLevel: 'low' | 'medium' | 'high',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // For now, just reload at higher LOD
    // In production, you'd want to swap meshes more efficiently
    this.unloadZone(zone.id);
    await this.loadZoneLOD(zone, newLodLevel, onProgress);
  }

  /**
   * Unloads a zone.
   */
  unloadZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    for (const object of zone.objects) {
      // Unregister collision
      if (object instanceof THREE.Mesh) {
        CollisionSystem.unregisterMesh(object);
      }

      // Dispose resources
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material?.dispose();
        }
      }

      this.scene.remove(object);
    }

    zone.objects = [];
    zone.loaded = false;
    zone.lodLevel = 'low';
  }

  /**
   * Sets current zone and loads it.
   */
  async setCurrentZone(zoneId: string, lodLevel: 'low' | 'medium' | 'high' = 'low'): Promise<void> {
    if (this.currentZoneId === zoneId) return;

    // Unload previous zone
    if (this.currentZoneId) {
      this.unloadZone(this.currentZoneId);
    }

    this.currentZoneId = zoneId;

    // Load new zone (low LOD first for instant display)
    await this.loadZone(zoneId, 'low');

    // Preload neighbors
    const zone = this.zones.get(zoneId);
    if (zone) {
      for (const neighborId of zone.manifest.neighbors) {
        this.loadZone(neighborId, 'low').catch((error) => {
          console.warn(`Failed to preload neighbor ${neighborId}:`, error);
        });
      }
    }

    // Upgrade to requested LOD
    if (lodLevel !== 'low') {
      this.loadZone(zoneId, lodLevel).catch((error) => {
        console.warn(`Failed to upgrade zone ${zoneId} to ${lodLevel}:`, error);
      });
    }

    if (this.onZoneChange) {
      this.onZoneChange(zoneId);
    }
  }

  /**
   * Handles zone events (e.g., door opening).
   */
  async handleEvent(eventName: string, zoneId: string): Promise<void> {
    const zone = this.zones.get(zoneId);
    if (!zone || !zone.manifest.events) return;

    const event = zone.manifest.events[eventName];
    if (!event) return;

    switch (event.action) {
      case 'load_zone':
        if (event.targetZone) {
          await this.loadZone(event.targetZone, 'low');
        }
        break;
      case 'unload_zone':
        if (event.targetZone) {
          this.unloadZone(event.targetZone);
        }
        break;
      case 'teleport':
        // Teleportation is handled by NavigationSystem
        break;
    }
  }

  /**
   * Gets current zone ID.
   */
  getCurrentZoneId(): string | null {
    return this.currentZoneId;
  }

  /**
   * Gets zone by ID.
   */
  getZone(zoneId: string): Zone | undefined {
    return this.zones.get(zoneId);
  }

  /**
   * Checks if player is in a trigger zone.
   */
  checkTriggers(position: THREE.Vector3, zoneId: string): ZoneTrigger | null {
    const zone = this.zones.get(zoneId);
    if (!zone) return null;

    for (const trigger of zone.manifest.triggers) {
      const triggerPos = new THREE.Vector3(...trigger.position);
      const distance = position.distanceTo(triggerPos);
      const size = Math.max(...trigger.size);

      if (distance < size) {
        return trigger;
      }
    }

    return null;
  }

  /**
   * Disposes of all zones.
   */
  dispose(): void {
    for (const zoneId of this.zones.keys()) {
      this.unloadZone(zoneId);
    }
    this.zones.clear();
    this.currentZoneId = null;
  }
}

