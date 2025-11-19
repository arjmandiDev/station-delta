/**
 * Zone-specific asset loader.
 * 
 * Purpose: Loads all assets for a zone with proper LOD handling.
 * Responsibilities: Coordinate asset loading, apply transforms, register collision.
 * Inputs: Zone manifest, LOD level.
 * Outputs: Loaded zone objects.
 * Side effects: Loads assets, modifies scene.
 */

import * as THREE from 'three';
import type { ZoneManifest, ZoneAsset } from '../systems/streaming/AssetManifest';
import { StreamingLoader } from '../systems/streaming/StreamingLoader';
import { KTX2Loader } from './KTX2Loader';

export class ZoneLoader {
  private streamingLoader: StreamingLoader;
  private ktx2Loader: KTX2Loader;

  constructor() {
    this.streamingLoader = new StreamingLoader();
    this.ktx2Loader = new KTX2Loader();
  }

  /**
   * Initializes loaders.
   */
  async init(): Promise<void> {
    await this.ktx2Loader.initTranscoder();
  }

  /**
   * Loads a zone asset.
   */
  async loadAsset(
    asset: ZoneAsset,
    lodLevel: 'low' | 'medium' | 'high' = 'low'
  ): Promise<THREE.Object3D | THREE.Texture | null> {
    const lod = asset.lod.find((l) => l.level === lodLevel) || asset.lod[0];
    if (!lod) {
      throw new Error(`No LOD level ${lodLevel} found for asset ${asset.id}`);
    }

    // Check if it's a KTX2 texture
    if (asset.type === 'texture' && lod.url.endsWith('.ktx2')) {
      return await this.ktx2Loader.load(lod.url);
    }

    // Use streaming loader for other types
    return await this.streamingLoader.loadAsset(asset, lodLevel);
  }

  /**
   * Loads all assets for a zone.
   */
  async loadZone(
    manifest: ZoneManifest,
    lodLevel: 'low' | 'medium' | 'high' = 'low',
    onProgress?: (progress: number) => void
  ): Promise<THREE.Object3D[]> {
    const objects: THREE.Object3D[] = [];
    const total = manifest.assets.length;
    let loaded = 0;

    for (const asset of manifest.assets) {
      try {
        const object = await this.loadAsset(asset, lodLevel);

        if (object) {
          // Apply transforms
          if (asset.position) {
            if (object instanceof THREE.Object3D) {
              object.position.set(...asset.position);
            }
          }
          if (asset.rotation && object instanceof THREE.Object3D) {
            object.rotation.set(...asset.rotation);
          }
          if (asset.scale && object instanceof THREE.Object3D) {
            object.scale.set(...asset.scale);
          }

          if (object instanceof THREE.Object3D) {
            objects.push(object);
          }
        }
      } catch (error) {
        console.error(`Failed to load asset ${asset.id}:`, error);
      }

      loaded++;
      if (onProgress) {
        onProgress((loaded / total) * 100);
      }
    }

    return objects;
  }
}

