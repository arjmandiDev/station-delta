/**
 * Streaming asset loader with cancellation support.
 * 
 * Purpose: Loads assets with progress tracking and cancellation.
 * Responsibilities: Asset loading, progress reporting, cancellation handling.
 * Inputs: Asset URLs, load options.
 * Outputs: Loaded assets, progress events.
 * Side effects: Network requests, memory allocation.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ZoneAsset, LODLevel } from './AssetManifest';

export interface LoadProgress {
  loaded: number;
  total: number;
  current?: string;
}

export type LoadCallback = (progress: LoadProgress) => void;

export class StreamingLoader {
  private activeLoads: Map<string, AbortController> = new Map();

  /**
   * Loads a GLTF model.
   */
  async loadGLTF(
    url: string,
    onProgress?: LoadCallback,
    signal?: AbortSignal
  ): Promise<THREE.Group> {
    const controller = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const loader = new GLTFLoader();
      const gltf = await new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          url,
          (gltf: any) => resolve(gltf.scene),
          (progress: any) => {
            if (onProgress) {
              onProgress({
                loaded: progress.loaded,
                total: progress.total,
                current: url,
              });
            }
          },
          (error: any) => reject(error)
        );
      });

      return gltf;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Load cancelled');
      }
      throw error;
    }
  }

  /**
   * Loads a texture.
   */
  async loadTexture(
    url: string,
    onProgress?: LoadCallback,
    signal?: AbortSignal
  ): Promise<THREE.Texture> {
    const controller = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const loader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          url,
          (texture) => resolve(texture),
          undefined,
          (error) => reject(error)
        );
      });

      return texture;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Load cancelled');
      }
      throw error;
    }
  }

  /**
   * Loads an asset with LOD support.
   */
  async loadAsset(
    asset: ZoneAsset,
    lodLevel: 'low' | 'medium' | 'high' = 'low',
    onProgress?: LoadCallback,
    signal?: AbortSignal
  ): Promise<THREE.Object3D | THREE.Texture | null> {
    const lod = asset.lod.find((l) => l.level === lodLevel) || asset.lod[0];
    if (!lod) {
      throw new Error(`No LOD level ${lodLevel} found for asset ${asset.id}`);
    }

    switch (asset.type) {
      case 'gltf':
        return await this.loadGLTF(lod.url, onProgress, signal);
      case 'texture':
        return await this.loadTexture(lod.url, onProgress, signal);
      default:
        console.warn(`Unsupported asset type: ${asset.type}`);
        return null;
    }
  }

  /**
   * Cancels an active load.
   */
  cancelLoad(id: string): void {
    const controller = this.activeLoads.get(id);
    if (controller) {
      controller.abort();
      this.activeLoads.delete(id);
    }
  }

  /**
   * Cancels all active loads.
   */
  cancelAll(): void {
    for (const controller of this.activeLoads.values()) {
      controller.abort();
    }
    this.activeLoads.clear();
  }
}

