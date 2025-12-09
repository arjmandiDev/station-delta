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
import { TitleScreenOverlay } from './components/TitleScreenOverlay';
import { HintOverlay } from './components/HintOverlay';
import { PauseMenuOverlay } from './components/PauseMenuOverlay';
import { getDeviceInfo } from './utils/device';
import type { DeviceInfo } from './utils/device';
import type { SceneManager } from './core/SceneManager';
import type { RendererManager } from './core/RendererManager';
import type { CameraController } from './core/CameraController';
import type { NavigationSystem } from './systems/navigation/NavigationSystem';
import {
  applyGameSettings,
  defaultSettings,
  roomsTo,
  loadSettings,
  saveSettings,
  setGamePaused,
  shouldSkipTitleScreen,
  setSkipTitleScreen,
  type BunkerSettings,
} from './systems/ui/GameUIBridge';
import './overlays.css';

export default function App() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Click "Enter Bunker" to start loading...');
  const [startLoading, setStartLoading] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [systems, setSystems] = useState<{
    scene: SceneManager;
    renderer: RendererManager;
    camera: CameraController;
    navigation: NavigationSystem;
  } | null>(null);
  const [showPerformanceUI, setShowPerformanceUI] = useState(false);

  type AppMode = 'title' | 'playing' | 'paused';
  const [mode, setMode] = useState<AppMode>(() =>
    shouldSkipTitleScreen() ? 'playing' : 'title',
  );
  const [activePauseTab, setActivePauseTab] = useState<'rooms' | 'settings' | 'help'>('help');
  const [hint, setHint] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: '',
  });
  const [settings, setSettings] = useState<BunkerSettings>(() => {
    const loaded = loadSettings();
    return loaded ?? defaultSettings;
  });
  const [skipTitle, setSkipTitle] = useState<boolean>(() => shouldSkipTitleScreen());
  const [hasShownIntroHint, setHasShownIntroHint] = useState(false);
  const [hasLoadedBunker, setHasLoadedBunker] = useState(false);

  useEffect(() => {
    // Detect device
    const info = getDeviceInfo();
    setDeviceInfo(info);
  }, []);

  const handleLoadingProgress = (progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
  };

  const handleLoadingComplete = () => {
    // Loading is complete, start the game from title screen.
    setIsLoading(false);
    setStartLoading(false);
    setMode('playing');
    setGamePaused(false);
    setHasLoadedBunker(true);

    if (!hasShownIntroHint) {
      setHasShownIntroHint(true);
      setHint({
        visible: true,
        text: 'WASD to move, mouse to look. Press H any time for a quick reminder.',
      });
    }

    requestPointerLockOnCanvas();
  };

  // Keep game pause state in sync with high-level UI mode.
  useEffect(() => {
    setGamePaused(mode !== 'playing');
  }, [mode]);

  // Apply settings to the running game and persist them.
  useEffect(() => {
    applyGameSettings(settings);
    saveSettings(settings);
  }, [settings]);

  const handleCanvasReady = () => {
    // Canvas and Three.js systems are initialized.
    setIsCanvasReady(true);
  };

  const requestPointerLockOnCanvas = () => {
    if (typeof document === 'undefined') return;
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas && (canvas as any).requestPointerLock) {
      
      setTimeout(() => {
        canvas.requestPointerLock();
      }, 100);
    }
  };

  const handleStartFromTitle = () => {
    if (!isCanvasReady) {
      return;
    }

    // If the bunker is already loaded, just resume gameplay from the title screen.
    if (hasLoadedBunker) {
      setMode('playing');
      setGamePaused(false);
      requestPointerLockOnCanvas();
      return;
    }

    // Start real loading after user clicks "Enter Bunker" for the first time.
    if (startLoading || isLoading) {
      return;
    }

    setStartLoading(true);
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Initializing...');
  };

  const handleRoomsFromTitle = (dest: 'main' | 'projects' | 'contact') => {
    // Rooms will implicitly resume gameplay.
    setMode('playing');
    setGamePaused(false);
    roomsTo(dest);
    requestPointerLockOnCanvas();
  };

  const handleOpenMenuFromTitle = () => {
    setMode('paused');
    setActivePauseTab('help');
  };

  const handleToggleSkipTitle = (value: boolean) => {
    setSkipTitle(value);
    setSkipTitleScreen(value);
  };

  const handleResumeFromPause = () => {
    setMode('playing');
    setGamePaused(false);
    requestPointerLockOnCanvas();
  };

  const handleExitToTitle = () => {
    setMode('title');
    setGamePaused(true);
  };

  // Global keyboard handling: Esc (menu), H (hint), any key to dismiss hint,
  // plus dev performance overlay (P).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      // Dev-only: toggle performance HUD.
      if (key === 'p' || key === 'P') {
        setShowPerformanceUI((prev) => !prev);
        return;
      }

      // Hints: any key while a hint is visible will dismiss it.
      if (hint.visible) {
        setHint({ visible: false, text: '' });
        return;
      }

      if (key === 'h' || key === 'H') {
        if (mode === 'playing') {
          setHint({
            visible: true,
            text: 'Explore the bunker. Esc opens menu, H toggles this hint. Flashlight: N.',
          });
        }
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        
        if (mode === 'playing') {
          setMode('paused');
          setActivePauseTab('help');
         }
        //  else if (mode === 'title') {
        //   // From title screen, Esc opens the pause menu instead of entering FPS.
        //   setMode('paused');
        //   setActivePauseTab('rooms');
        // }
          else if (mode === 'paused') {
          // Esc again resumes gameplay.
          setMode('playing');
          setGamePaused(false);
          //requestPointerLockOnCanvas();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, hint.visible, setShowPerformanceUI]);

  if (!deviceInfo) {
    return <LoadingScreen isLoading={true} progress={0} message="Detecting device..." />;
  }

  return (
    <>
      <Canvas
        deviceInfo={deviceInfo}
        onReady={handleCanvasReady}
        onLoadingProgress={handleLoadingProgress}
        startLoading={startLoading}
        onLoadingComplete={handleLoadingComplete}
        onPointerLockChange={(locked) => {
          // When the user presses Esc while playing, the browser exits pointer lock
          // but does not deliver the Esc key event. Detect that transition here
          // and treat it as a pause, so the menu appears after a single Esc.
          if (!locked) {
            setMode('paused');
            setActivePauseTab('rooms');
          }
        }}
      />
      <TitleScreenOverlay
        visible={mode === 'title'}
        isLoading={isLoading}
        loadingProgress={loadingProgress}
        loadingMessage={loadingMessage}
        skipTitle={skipTitle}
        onToggleSkip={handleToggleSkipTitle}
        onStart={handleStartFromTitle}
        onRooms={handleRoomsFromTitle}
        onOpenMenu={handleOpenMenuFromTitle}
      />
      {/* <HintOverlay
        visible={hint.visible}
        text={hint.text}
        onClose={() => setHint({ visible: false, text: '' })}
      /> */}
      <PauseMenuOverlay
        visible={mode === 'paused'}
        activeTab={activePauseTab}
        onChangeTab={setActivePauseTab}
        settings={settings}
        onSettingsChange={setSettings}
        onRooms={(dest) => {
          setMode('playing');
          setGamePaused(false);
          roomsTo(dest);
          requestPointerLockOnCanvas();
        }}
        onResume={handleResumeFromPause}
        onExitToTitle={handleExitToTitle}
      />
      {systems && (
        <PerformanceUI
          enabled={showPerformanceUI}
          rendererInfo={systems.renderer.getInfo()}
        />
      )}
    </>
  );
}

