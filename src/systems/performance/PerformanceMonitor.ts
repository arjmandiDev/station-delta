/**
 * Performance monitor tracking frame time, draw calls, memory.
 * 
 * Purpose: Monitor rendering performance metrics.
 * Responsibilities: Track frame times, draw calls, memory usage.
 * Inputs: Renderer info, frame times.
 * Outputs: Performance metrics.
 * Side effects: None (pure monitoring).
 */

import { RendererManager } from '../../core/RendererManager';

export interface PerformanceMetrics {
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  memory: {
    geometries: number;
    textures: number;
  };
  frameTimeHistory: number[];
}

export class PerformanceMonitor {
  private frameTimeHistory: number[] = [];
  private maxHistorySize: number = 100;
  private lastFrameTime: number = 0;

  /**
   * Updates performance metrics.
   */
  update(renderer: RendererManager, currentTime: number): PerformanceMetrics {
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    const frameTime = deltaTime;
    const fps = 1000 / frameTime;

    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }

    const info = renderer.getInfo();

    return {
      frameTime,
      fps,
      drawCalls: info.drawCalls,
      triangles: info.triangles,
      memory: info.memory,
      frameTimeHistory: [...this.frameTimeHistory],
    };
  }

  /**
   * Gets 95th percentile frame time.
   */
  get95thPercentileFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;

    const sorted = [...this.frameTimeHistory].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  /**
   * Gets average frame time.
   */
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  /**
   * Clears history.
   */
  clear(): void {
    this.frameTimeHistory = [];
  }
}

