/**
 * Dynamic resolution system with pixel ratio clamping.
 * 
 * Purpose: Adjusts render resolution based on performance.
 * Responsibilities: Monitor FPS, adjust pixel ratio, clamp values.
 * Inputs: Performance metrics, device info.
 * Outputs: Pixel ratio adjustments.
 * Side effects: Modifies renderer pixel ratio.
 */

import { RendererManager } from '../../core/RendererManager';
import type { DeviceInfo } from '../../utils/device';
import { PerformanceMonitor, type PerformanceMetrics } from './PerformanceMonitor';
import { TARGET_FPS, ADAPTATION_INTERVAL_MS } from '../../utils/constants';

export class DynamicResolution {
  private renderer: RendererManager;
  private deviceInfo: DeviceInfo;
  private performanceMonitor: PerformanceMonitor;
  private lastAdaptation: number = 0;
  private currentPixelRatio: number;

  constructor(renderer: RendererManager, deviceInfo: DeviceInfo, performanceMonitor: PerformanceMonitor) {
    this.renderer = renderer;
    this.deviceInfo = deviceInfo;
    this.performanceMonitor = performanceMonitor;
    this.currentPixelRatio = deviceInfo.pixelRatio;
  }

  /**
   * Updates dynamic resolution based on performance.
   */
  update(currentTime: number, metrics: PerformanceMetrics): void {
    if (currentTime - this.lastAdaptation < ADAPTATION_INTERVAL_MS) {
      return;
    }

    this.lastAdaptation = currentTime;

    const targetFPS = TARGET_FPS;
    const currentFPS = metrics.fps;

    // Adjust pixel ratio based on FPS
    if (currentFPS < targetFPS * 0.9) {
      // FPS is low, reduce resolution
      this.currentPixelRatio = Math.max(0.5, this.currentPixelRatio - 0.1);
    } else if (currentFPS > targetFPS * 1.1 && this.currentPixelRatio < this.deviceInfo.maxPixelRatio) {
      // FPS is high, increase resolution
      this.currentPixelRatio = Math.min(
        this.deviceInfo.maxPixelRatio,
        this.currentPixelRatio + 0.1
      );
    }

    this.renderer.setPixelRatio(this.currentPixelRatio);
  }

  /**
   * Gets current pixel ratio.
   */
  getPixelRatio(): number {
    return this.currentPixelRatio;
  }

  /**
   * Resets to default pixel ratio.
   */
  reset(): void {
    this.currentPixelRatio = this.deviceInfo.pixelRatio;
    this.renderer.setPixelRatio(this.currentPixelRatio);
  }
}

