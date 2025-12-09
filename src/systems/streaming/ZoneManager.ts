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
import { type ZoneManifest, type ZoneTrigger } from './AssetManifest';
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
  private sceneManager?: any; // Reference to SceneManager for lighting

  constructor(scene: THREE.Scene, sceneManager?: any) {
    this.scene = scene;
    this.sceneManager = sceneManager;
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
    
    // Setup zone lighting in SceneManager
    if (this.sceneManager) {
      this.sceneManager.setupZoneLighting(manifest);
    }
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

    // Downgrade path: if the zone is already loaded at a higher LOD and we
    // request "low", fully unload and reload the zone at low quality, including
    // restoring its lighting setup.
    if (zone.loaded && zone.lodLevel !== lodLevel && lodLevel === 'low') {
      this.unloadZone(zoneId);
      const reloadedZone = this.zones.get(zoneId);
      if (!reloadedZone) {
        return;
      }

      // Recreate zone lighting after unload so the scene does not go dark.
      if (this.sceneManager) {
        this.sceneManager.setupZoneLighting(reloadedZone.manifest);
      }

      // After unload, the zone is marked as not loaded; recurse once to load low LOD.
      await this.loadZone(zoneId, 'low', onProgress);
      return;
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

          // Register for collision based on asset type
          if (asset.collision === true) {
            this.registerObjectForCollision(object, asset);
          }
        }
      } catch (error) {
        console.error(`Failed to load asset ${asset.id}:`, error);
      }

      loaded++;
    }
  }


  /**
   * Registers an object and all its nested meshes for collision detection.
   * Uses ray casting for room geometry, OBB for objects.
   */
  private registerObjectForCollision(object: THREE.Object3D, asset: any): void {
    const isRoom = asset.isRoom === true;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        if (isRoom) {
          // Room geometry: use ray casting
          CollisionSystem.registerMesh(child);
        } else {
          // Objects: use OBB
          CollisionSystem.registerObjectMesh(child);
        }
      }
    });
  }

  /**
   * Unregisters an object and all its nested meshes from collision detection.
   */
  private unregisterObjectForCollision(object: THREE.Object3D, asset?: any): void {
    const isRoom = asset?.isRoom === true;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (isRoom) {
          CollisionSystem.unregisterMesh(child);
        } else {
          CollisionSystem.unregisterObjectMesh(child);
        }
      }
    });
  }

  /**
   * Upgrades zone LOD level.
   */
  private async upgradeZoneLOD(
    zone: Zone,
    newLodLevel: 'low' | 'medium' | 'high',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Upgrade individual assets that have higher LOD available
    const assetsToUpgrade: { asset: any; objectIndex: number }[] = [];
    
    // Find assets that have the requested LOD level
    for (let i = 0; i < zone.manifest.assets.length; i++) {
      const asset = zone.manifest.assets[i];
      const hasRequestedLOD = asset.lod.some(l => l.level === newLodLevel);
      if (hasRequestedLOD && i < zone.objects.length) {
        assetsToUpgrade.push({ asset, objectIndex: i });
      }
    }

    if (assetsToUpgrade.length === 0) {
      return;
    }

    const total = assetsToUpgrade.length;
    let upgraded = 0;

    for (const { asset, objectIndex } of assetsToUpgrade) {
      try {
        // Check if asset has the requested LOD level
        const requestedLOD = asset.lod.find((l: any) => l.level === newLodLevel);
        if (!requestedLOD) {
          continue; // Skip if this asset doesn't have the requested LOD
        }

        // Get the current object
        const currentObject = zone.objects[objectIndex];
        if (!currentObject) {
          continue;
        }

        // Load the new LOD version
        const newObject = await this.loader.loadAsset(
          asset,
          newLodLevel,
          (progress) => {
            if (onProgress) {
              const totalProgress = (upgraded + progress.loaded / progress.total) / total;
              onProgress(totalProgress * 100);
            }
          }
        );

        if (newObject && newObject instanceof THREE.Object3D) {
          // Apply transforms
          if (asset.position) {
            newObject.position.set(asset.position[0], asset.position[1], asset.position[2]);
          }
          if (asset.rotation) {
            newObject.rotation.set(asset.rotation[0], asset.rotation[1], asset.rotation[2]);
          }
          if (asset.scale) {
            newObject.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
          }

          // Unregister collision for old object
          if (asset.collision === true) {
            this.unregisterObjectForCollision(currentObject, asset);
          }

          // Dispose old object
          currentObject.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material?.dispose();
              }
            }
          });
          this.scene.remove(currentObject);

          // Add new object
          this.scene.add(newObject);
          zone.objects[objectIndex] = newObject;

          // Register collision for new object
          if (asset.collision === true) {
            this.registerObjectForCollision(newObject, asset);
          }
        }
      } catch (error) {
        console.error(`Failed to upgrade asset ${asset.id} to ${newLodLevel} LOD:`, error);
      }

      upgraded++;
    }
  }

  /**
   * Unloads a zone.
   */
  unloadZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    for (let i = 0; i < zone.objects.length; i++) {
      const object = zone.objects[i];
      const asset = zone.manifest.assets[i];
      // Unregister collision (handles nested meshes)
      this.unregisterObjectForCollision(object, asset);

      // Dispose resources
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });

      this.scene.remove(object);
    }

    // Cleanup zone lighting in SceneManager
    if (this.sceneManager) {
      this.sceneManager.cleanupZoneLighting(zoneId);
    }

    zone.objects = [];
    zone.loaded = false;
    zone.lodLevel = 'low';
  }

  /**
   * Sets current zone and loads it.
   */
  async setCurrentZone(
    zoneId: string,
    lodLevel: 'low' | 'medium' | 'high' = 'low',
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    if (this.currentZoneId === zoneId) return;

    // Unload previous zone
    if (this.currentZoneId) {
      this.unloadZone(this.currentZoneId);
    }

    this.currentZoneId = zoneId;

    // Setup zone lighting before loading
    const zone = this.zones.get(zoneId);
    if (zone && this.sceneManager) {
      this.sceneManager.setupZoneLighting(zone.manifest);
    }

    // Load new zone (low LOD first for instant display)
    if (onProgress) {
      onProgress(0, 'Loading assets...');
    }
    await this.loadZone(zoneId, 'low', (progress) => {
      if (onProgress) {
        onProgress(progress, 'Loading assets...');
      }
    });

    // Preload neighbors
    if (zone) {
      for (const neighborId of zone.manifest.neighbors) {
        this.loadZone(neighborId, 'low').catch((error) => {
          console.warn(`Failed to preload neighbor ${neighborId}:`, error);
        });
      }
    }

    // Upgrade to requested LOD
    if (lodLevel !== 'low') {
      if (onProgress) {
        onProgress(80, 'Upgrading quality...');
      }
      await this.loadZone(zoneId, lodLevel, (progress) => {
        if (onProgress) {
          // Map upgrade progress (0-100) to overall progress (80-100)
          const overallProgress = 80 + (progress * 0.2);
          onProgress(overallProgress, 'Upgrading quality...');
        }
      }).catch((error) => {
        console.warn(`Failed to upgrade zone ${zoneId} to ${lodLevel}:`, error);
      });
    }
    
    if (onProgress) {
      onProgress(100, 'Ready!');
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

