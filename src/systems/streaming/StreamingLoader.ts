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
import type { ZoneAsset } from './AssetManifest';

export interface LoadProgress {
  loaded: number;
  total: number;
  current?: string;
}

export type LoadCallback = (progress: LoadProgress) => void;

// Module-level singletons shared across all StreamingLoader instances
let sharedKTX2Loader: any = null;
let sharedKTX2LoaderPromise: Promise<any> | null = null;
let sharedMeshoptDecoder: any = null;
let sharedMeshoptDecoderPromise: Promise<any> | null = null;

export class StreamingLoader {
  private activeLoads: Map<string, AbortController> = new Map();
  private gltfLoader: any = null;
  private gltfLoaderInitialized: boolean = false;

  /**
   * Initializes KTX2Loader (module-level singleton, shared across all instances).
   */
  private async initKTX2Loader(): Promise<any> {
    if (sharedKTX2Loader) {
      return sharedKTX2Loader;
    }

    if (sharedKTX2LoaderPromise) {
      return sharedKTX2LoaderPromise;
    }

    sharedKTX2LoaderPromise = (async () => {
      try {
        const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
        const ktx2Loader = new KTX2Loader();
        await ktx2Loader.setTranscoderPath('/basis/');
        
        // Create a temporary renderer to detect support
        const testRenderer = new THREE.WebGLRenderer();
        await ktx2Loader.detectSupport(testRenderer);
        testRenderer.dispose();
        
        sharedKTX2Loader = ktx2Loader;
        return ktx2Loader;
      } catch (error) {
        console.warn('KTX2Loader setup failed, continuing without KTX2 support:', error);
        sharedKTX2LoaderPromise = null;
        return null;
      }
    })();

    return sharedKTX2LoaderPromise;
  }

  /**
   * Initializes MeshoptDecoder (module-level singleton, shared across all instances).
   */
  private async initMeshoptDecoder(): Promise<any> {
    if (sharedMeshoptDecoder) {
      return sharedMeshoptDecoder;
    }

    if (sharedMeshoptDecoderPromise) {
      return sharedMeshoptDecoderPromise;
    }

    sharedMeshoptDecoderPromise = (async () => {
      try {
        const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
        await MeshoptDecoder.ready;
        sharedMeshoptDecoder = MeshoptDecoder;
        return MeshoptDecoder;
      } catch (error) {
        console.warn('MeshoptDecoder setup failed, continuing without Meshopt support:', error);
        sharedMeshoptDecoderPromise = null;
        return null;
      }
    })();

    return sharedMeshoptDecoderPromise;
  }

  /**
   * Initializes GLTFLoader with decoders (singleton).
   */
  private async initGLTFLoader(): Promise<any> {
    if (this.gltfLoader && this.gltfLoaderInitialized) {
      return this.gltfLoader;
    }

    // Import GLTFLoader
    if (!this.gltfLoader) {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      this.gltfLoader = new GLTFLoader();
    }

    // Set up decoders if not already initialized
    if (!this.gltfLoaderInitialized) {
      // Set up MeshoptDecoder (reused instance)
      const meshoptDecoder = await this.initMeshoptDecoder();
      if (meshoptDecoder) {
        this.gltfLoader.setMeshoptDecoder(meshoptDecoder);
      }
      
      // Set up KTX2Loader (reused instance)
      const ktx2Loader = await this.initKTX2Loader();
      if (ktx2Loader) {
        this.gltfLoader.setKTX2Loader(ktx2Loader);
      }
      
      this.gltfLoaderInitialized = true;
    }

    return this.gltfLoader;
  }

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
      // Use singleton GLTFLoader instance
      const loader = await this.initGLTFLoader();
      
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
    // Pick the best available LOD for this asset:
    // 1. Try the requested level.
    // 2. If missing, fall back to the next lower level (e.g., medium → low).
    // 3. As a final fallback, use the first LOD entry defined in the manifest.
    const order: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const requestedIndex = order.indexOf(lodLevel);

    let lod = asset.lod.find((l) => l.level === lodLevel);

    if (!lod && requestedIndex > 0) {
      for (let i = requestedIndex - 1; i >= 0; i--) {
        const candidate = asset.lod.find((l) => l.level === order[i]);
        if (candidate) {
          lod = candidate;
          break;
        }
      }
    }

    if (!lod) {
      lod = asset.lod[0];
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

  /**
   * Disposes of loader resources.
   * Note: Shared KTX2Loader and MeshoptDecoder are not disposed here
   * as they may be used by other StreamingLoader instances.
   */
  dispose(): void {
    this.gltfLoader = null;
    this.gltfLoaderInitialized = false;
    this.cancelAll();
  }

  /**
   * Disposes of shared resources (call when all StreamingLoader instances are done).
   */
  static disposeShared(): void {
    if (sharedKTX2Loader && typeof sharedKTX2Loader.dispose === 'function') {
      sharedKTX2Loader.dispose();
      sharedKTX2Loader = null;
      sharedKTX2LoaderPromise = null;
    }
    sharedMeshoptDecoder = null;
    sharedMeshoptDecoderPromise = null;
  }
}

