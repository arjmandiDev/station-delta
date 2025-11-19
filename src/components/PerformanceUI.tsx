/**
 * Performance UI component for displaying FPS and stats.
 * 
 * Purpose: Shows real-time performance metrics.
 * Responsibilities: Display FPS, draw calls, memory usage.
 * Inputs: Performance metrics.
 * Outputs: Rendered performance UI.
 * Side effects: None (UI only).
 */

import { useEffect, useRef, useState } from 'react';
import Stats from 'stats.js';

interface PerformanceUIProps {
  enabled?: boolean;
  rendererInfo?: {
    triangles: number;
    drawCalls: number;
    memory: {
      geometries: number;
      textures: number;
    };
  };
}

export function PerformanceUI({ enabled = false, rendererInfo }: PerformanceUIProps) {
  const statsRef = useRef<Stats | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const stats = new Stats();
    stats.showPanel(0); // FPS panel
    statsRef.current = stats;

    if (containerRef.current) {
      containerRef.current.appendChild(stats.dom);
      stats.dom.style.position = 'fixed';
      stats.dom.style.top = '0';
      stats.dom.style.left = '0';
      stats.dom.style.zIndex = '1000';
    }

    const animate = () => {
      if (stats) {
        stats.update();
      }
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (statsRef.current && containerRef.current) {
        containerRef.current.removeChild(statsRef.current.dom);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={containerRef} />
      {rendererInfo && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '0',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '10px',
            fontSize: '12px',
            fontFamily: 'monospace',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <div>
              <div>Triangles: {rendererInfo.triangles.toLocaleString()}</div>
              <div>Draw Calls: {rendererInfo.drawCalls}</div>
              <div>Geometries: {rendererInfo.memory.geometries}</div>
              <div>Textures: {rendererInfo.memory.textures}</div>
            </div>
          ) : (
            <div>Click for details</div>
          )}
        </div>
      )}
    </>
  );
}

