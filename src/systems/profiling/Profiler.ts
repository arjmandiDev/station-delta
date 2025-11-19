/**
 * Profiler for frame time tracking and analysis.
 * 
 * Purpose: Track and analyze rendering performance.
 * Responsibilities: Collect frame time data, calculate percentiles.
 * Inputs: Frame times.
 * Outputs: Performance statistics.
 * Side effects: None (pure analysis).
 */

export interface ProfileData {
  frameTimes: number[];
  averageFrameTime: number;
  minFrameTime: number;
  maxFrameTime: number;
  p50: number;
  p95: number;
  p99: number;
}

export class Profiler {
  private frameTimes: number[] = [];
  private maxSamples: number = 1000;

  /**
   * Records a frame time.
   */
  recordFrameTime(frameTime: number): void {
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }

  /**
   * Gets profile data.
   */
  getProfileData(): ProfileData {
    if (this.frameTimes.length === 0) {
      return {
        frameTimes: [],
        averageFrameTime: 0,
        minFrameTime: 0,
        maxFrameTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      frameTimes: [...this.frameTimes],
      averageFrameTime: sum / sorted.length,
      minFrameTime: sorted[0],
      maxFrameTime: sorted[sorted.length - 1],
      p50: this.getPercentile(sorted, 0.5),
      p95: this.getPercentile(sorted, 0.95),
      p99: this.getPercentile(sorted, 0.99),
    };
  }

  /**
   * Gets percentile value.
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.floor(sorted.length * percentile);
    return sorted[index];
  }

  /**
   * Clears profile data.
   */
  clear(): void {
    this.frameTimes = [];
  }
}

