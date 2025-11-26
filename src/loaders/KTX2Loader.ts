/**
 * KTX2/Basis texture loader.
 * 
 * Purpose: Load Basis-compressed textures with transcoder support.
 * Responsibilities: Load KTX2 files, initialize transcoder, decode textures.
 * Inputs: KTX2 file URLs, transcoder paths.
 * Outputs: Decoded textures.
 * Side effects: Loads transcoder WASM, allocates texture memory.
 */

import * as THREE from 'three';
// Note: KTX2Loader and BasisTextureLoader need to be imported from three/examples/jsm
// These are ESM modules and may need special handling in Vite
// For now, using a simplified implementation

export class KTX2Loader {
  private loader: any = null;
  private transcoderPath: string;
  private transcoderLoaded: boolean = false;

  constructor(transcoderPath: string = '/basis/') {
    this.transcoderPath = transcoderPath;
  }

  /**
   * Initializes transcoder (must be called before loading).
   */
  async initTranscoder(): Promise<void> {
    if (this.transcoderLoaded) return;

    try {
      // Dynamic import for KTX2Loader
      const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
      this.loader = new KTX2Loader();
      await (this.loader as any).setTranscoderPath(this.transcoderPath);
      const renderer = new THREE.WebGLRenderer();
      await (this.loader as any).detectSupport(renderer);
      renderer.dispose();
      this.transcoderLoaded = true;
    } catch (error) {
      // Fallback to BasisTextureLoader
      console.warn('KTX2Loader not available, falling back to BasisTextureLoader');
      try {
        const { BasisTextureLoader } = await import('three/examples/jsm/loaders/BasisTextureLoader.js');
        console.log(BasisTextureLoader);
        this.loader = new BasisTextureLoader();
        (this.loader as any).setTranscoderPath(this.transcoderPath);
        this.transcoderLoaded = true;
      } catch (fallbackError) {
        console.error('Failed to initialize texture loaders:', fallbackError);
        throw new Error('Texture loaders not available');
      }
    }
  }

  /**
   * Loads a KTX2 texture.
   */
  async load(url: string): Promise<THREE.Texture> {
    if (!this.transcoderLoaded) {
      await this.initTranscoder();
    }

    if (!this.loader) {
      throw new Error('Loader not initialized');
    }

    return new Promise((resolve, reject) => {
      this.loader!.load(
        url,
        (texture:any) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (error:any) => reject(error)
      );
    });
  }

  /**
   * Checks if transcoder is loaded.
   */
  isReady(): boolean {
    return this.transcoderLoaded;
  }
}

