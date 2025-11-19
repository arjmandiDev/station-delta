/**
 * Telemetry collector for loading and rendering metrics.
 * 
 * Purpose: Collect and report telemetry data for analysis.
 * Responsibilities: Track loading times, render metrics, memory usage.
 * Inputs: Loading events, render metrics.
 * Outputs: Telemetry data.
 * Side effects: May send data to analytics (if configured).
 */

export interface LoadingTelemetry {
  assetId: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  size?: number;
  success: boolean;
  error?: string;
}

export interface RenderTelemetry {
  timestamp: number;
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  memory: {
    geometries: number;
    textures: number;
  };
}

export class TelemetryCollector {
  private loadingEvents: LoadingTelemetry[] = [];
  private renderEvents: RenderTelemetry[] = [];
  private maxEvents: number = 1000;

  /**
   * Records a loading event.
   */
  recordLoading(telemetry: LoadingTelemetry): void {
    this.loadingEvents.push(telemetry);
    if (this.loadingEvents.length > this.maxEvents) {
      this.loadingEvents.shift();
    }
  }

  /**
   * Records a render event.
   */
  recordRender(telemetry: RenderTelemetry): void {
    this.renderEvents.push(telemetry);
    if (this.renderEvents.length > this.maxEvents) {
      this.renderEvents.shift();
    }
  }

  /**
   * Gets all loading telemetry.
   */
  getLoadingTelemetry(): LoadingTelemetry[] {
    return [...this.loadingEvents];
  }

  /**
   * Gets all render telemetry.
   */
  getRenderTelemetry(): RenderTelemetry[] {
    return [...this.renderEvents];
  }

  /**
   * Gets average loading time.
   */
  getAverageLoadingTime(): number {
    const completed = this.loadingEvents.filter((e) => e.duration !== undefined);
    if (completed.length === 0) return 0;
    const sum = completed.reduce((a, b) => a + (b.duration || 0), 0);
    return sum / completed.length;
  }

  /**
   * Clears all telemetry.
   */
  clear(): void {
    this.loadingEvents = [];
    this.renderEvents = [];
  }

  /**
   * Exports telemetry as JSON.
   */
  export(): string {
    return JSON.stringify({
      loading: this.loadingEvents,
      render: this.renderEvents,
    }, null, 2);
  }
}

