/**
 * WebGL renderer manager with adaptive quality.
 * 
 * Purpose: Manages Three.js WebGL renderer with dynamic quality adjustments.
 * Responsibilities: Renderer creation, pixel ratio management, adaptive quality.
 * Inputs: Canvas element, device info.
 * Outputs: Configured WebGL renderer.
 * Side effects: Creates WebGL context, modifies canvas.
 */

import * as THREE from 'three';
import type { DeviceInfo } from '../utils/device';
import { MOBILE_MAX_PIXEL_RATIO, DESKTOP_MAX_PIXEL_RATIO } from '../utils/constants';

export class RendererManager {
  private renderer: THREE.WebGLRenderer;
  private deviceInfo: DeviceInfo;
  private currentPixelRatio: number;

  constructor(canvas: HTMLCanvasElement, deviceInfo: DeviceInfo) {
    this.deviceInfo = deviceInfo;
    this.currentPixelRatio = deviceInfo.pixelRatio;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: deviceInfo.performanceTier !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });

    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = deviceInfo.performanceTier !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Enable extensions
    //this.renderer.capabilities.isWebGL2 = true;
  }

  /**
   * Gets the WebGL renderer instance.
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Updates renderer size.
   */
  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  /**
   * Sets pixel ratio with clamping.
   */
  setPixelRatio(ratio: number): void {
    const maxRatio = this.deviceInfo.isMobile ? MOBILE_MAX_PIXEL_RATIO : DESKTOP_MAX_PIXEL_RATIO;
    this.currentPixelRatio = Math.min(ratio, maxRatio);
    this.renderer.setPixelRatio(this.currentPixelRatio);
  }

  /**
   * Gets current pixel ratio.
   */
  getPixelRatio(): number {
    return this.currentPixelRatio;
  }

  /**
   * Renders the scene.
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * Disposes of renderer resources.
   */
  dispose(): void {
    this.renderer.dispose();
  }

  /**
   * Gets renderer info for profiling.
   */
  getInfo(): {
    triangles: number;
    points: number;
    lines: number;
    geometries: number;
    textures: number;
    drawCalls: number;
    memory: {
      geometries: number;
      textures: number;
    };
  } {
    const info = this.renderer.info;
    return {
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      drawCalls: info.render.calls,
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
    };
  }
}

