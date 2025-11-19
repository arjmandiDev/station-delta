/**
 * Root React component.
 * 
 * Purpose: Main application component coordinating all systems.
 * Responsibilities: Initialize app, manage state, coordinate components.
 * Inputs: None (entry point).
 * Outputs: Rendered application.
 * Side effects: Initializes systems, manages lifecycle.
 */

import { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Menu } from './components/Menu';
import { LoadingScreen } from './components/LoadingScreen';
import { PerformanceUI } from './components/PerformanceUI';
import { getDeviceInfo } from './utils/device';
import type { DeviceInfo } from './utils/device';
import type { SceneManager } from './core/SceneManager';
import type { RendererManager } from './core/RendererManager';
import type { CameraController } from './core/CameraController';
import type { NavigationSystem } from './systems/navigation/NavigationSystem';

export default function App() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [systems, setSystems] = useState<{
    scene: SceneManager;
    renderer: RendererManager;
    camera: CameraController;
    navigation: NavigationSystem;
  } | null>(null);
  const [showPerformanceUI, setShowPerformanceUI] = useState(false);

  useEffect(() => {
    // Detect device
    const info = getDeviceInfo();
    setDeviceInfo(info);

    // Simulate loading
    const loadingSteps = [
      { progress: 20, message: 'Loading assets...' },
      { progress: 50, message: 'Initializing scene...' },
      { progress: 80, message: 'Setting up systems...' },
      { progress: 100, message: 'Ready!' },
    ];

    let stepIndex = 0;
    const loadingInterval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        const step = loadingSteps[stepIndex];
        setLoadingProgress(step.progress);
        setLoadingMessage(step.message);
        stepIndex++;
      } else {
        clearInterval(loadingInterval);
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }, 500);

    // Performance UI toggle (dev mode)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        setShowPerformanceUI((prev) => !prev);
      }
    };
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      clearInterval(loadingInterval);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, []);

  const handleCanvasReady = (readySystems: {
    scene: SceneManager;
    renderer: RendererManager;
    camera: CameraController;
    navigation: NavigationSystem;
  }) => {
    setSystems(readySystems);
  };

  if (!deviceInfo) {
    return <LoadingScreen isLoading={true} progress={0} message="Detecting device..." />;
  }

  return (
    <>
      <LoadingScreen isLoading={isLoading} progress={loadingProgress} message={loadingMessage} />
      <Canvas deviceInfo={deviceInfo} onReady={handleCanvasReady} />
      <Menu />
      {systems && (
        <PerformanceUI
          enabled={showPerformanceUI}
          rendererInfo={systems.renderer.getInfo()}
        />
      )}
    </>
  );
}

