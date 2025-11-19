/**
 * Optimized GLTF loader with streaming support.
 * 
 * Purpose: Load GLTF models efficiently with progress tracking.
 * Responsibilities: Load GLTF files, handle streaming, report progress.
 * Inputs: GLTF file URLs, load options.
 * Outputs: Loaded GLTF scenes.
 * Side effects: Network requests, memory allocation.
 */

import * as THREE from 'three';
// Dynamic imports for three.js loaders (ESM modules)

export interface GLTFLoadOptions {
  dracoPath?: string;
  onProgress?: (progress: { loaded: number; total: number }) => void;
}

export class GLTFLoader {
  private loader: any;
  private dracoLoader: any = null;
  private loaderPromise: Promise<any> | null = null;

  constructor() {
    // Lazy load GLTFLoader
    this.loaderPromise = import('three/examples/jsm/loaders/GLTFLoader.js').then(
      (module) => {
        this.loader = new module.GLTFLoader();
        return this.loader;
      }
    );
  }

  /**
   * Sets up Draco decompression.
   */
  async setDRACOPath(path: string): Promise<void> {
    if (!this.loader) {
      await this.loaderPromise;
    }
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(path);
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  /**
   * Loads a GLTF file.
   */
  async load(url: string, options: GLTFLoadOptions = {}): Promise<THREE.Group> {
    if (!this.loader) {
      await this.loaderPromise;
    }
    if (options.dracoPath && !this.dracoLoader) {
      await this.setDRACOPath(options.dracoPath);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf: any) => resolve(gltf.scene),
        (progress: any) => {
          if (options.onProgress) {
            options.onProgress({
              loaded: progress.loaded,
              total: progress.total,
            });
          }
        },
        (error: any) => reject(error)
      );
    });
  }

  /**
   * Disposes of loader resources.
   */
  dispose(): void {
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }
  }
}

