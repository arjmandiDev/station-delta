/**
 * Three.js canvas wrapper component.
 * 
 * Purpose: Manages Three.js scene lifecycle within React.
 * Responsibilities: Initialize scene, handle resize, render loop.
 * Inputs: Device info, scene configuration.
 * Outputs: Rendered canvas element.
 * Side effects: Creates WebGL context, manages render loop.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../core/SceneManager';
import { RendererManager } from '../core/RendererManager';
import { CameraController } from '../core/CameraController';
import { PlayerPhysics } from '../systems/collision/PlayerPhysics';
import { NavigationSystem } from '../systems/navigation/NavigationSystem';
import { MobileControls } from '../systems/navigation/MobileControls';
import { CollisionSystem } from '../systems/collision/CollisionSystem';
import { PerformanceMonitor } from '../systems/performance/PerformanceMonitor';
import { DynamicResolution } from '../systems/performance/DynamicResolution';
import { Profiler } from '../systems/profiling/Profiler';
import { TelemetryCollector } from '../systems/profiling/TelemetryCollector';
import { ZoneManager } from '../systems/streaming/ZoneManager';
import { LODSystem } from '../systems/lod/LODSystem';
import { Flashlight } from '../systems/Flashlight';
import { DebugGUI } from '../systems/DebugGUI';
import {
  registerGameAPI,
  type BunkerDestination,
  type BunkerSettings,
} from '../systems/ui/GameUIBridge';
import type { DeviceInfo } from '../utils/device';
import { PLAYER_RADIUS, PLAYER_HEIGHT, PLAYER_EYE_HEIGHT } from '../utils/constants';
import { parseZoneManifest } from '../systems/streaming/AssetManifest';

interface CanvasProps {
  deviceInfo: DeviceInfo;
  onReady?: () => void;
  onPointerLockChange?: (locked: boolean) => void;
  onLoadingProgress?: (progress: number, message: string) => void;
  startLoading?: boolean;
  onLoadingComplete?: () => void;
}

export function Canvas({
  deviceInfo,
  onReady,
  onPointerLockChange,
  onLoadingProgress,
  startLoading,
  onLoadingComplete,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const devOverlayRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const rendererRef = useRef<RendererManager | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const playerPhysicsRef = useRef<PlayerPhysics | null>(null);
  const navigationRef = useRef<NavigationSystem | null>(null);
  const mobileControlsRef = useRef<MobileControls | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const dynamicResolutionRef = useRef<DynamicResolution | null>(null);
  const profilerRef = useRef<Profiler | null>(null);
  const telemetryRef = useRef<TelemetryCollector | null>(null);
  const zoneManagerRef = useRef<ZoneManager | null>(null);
  const flashlightRef = useRef<Flashlight | null>(null);
  const debugGUIRef = useRef<DebugGUI | null>(null);
  const lodSystemRef = useRef<LODSystem | null>(null);

  const hasLoadedInitialZoneRef = useRef(false);
  /**
   * Indicates whether the world/zone has finished loading enough geometry
   * and collision data for player physics to run safely.
   * 
   * When `false`, the navigation system will not step physics, which prevents
   * the player from visually falling through empty space while assets stream in.
   */
  const isPhysicsReadyRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Use SceneManager
    const sceneManager = new SceneManager(deviceInfo);
    sceneManagerRef.current = sceneManager;
    const scene = sceneManager.getScene();

    // Create camera and use CameraController
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const cameraController = new CameraController(camera, deviceInfo);
    cameraControllerRef.current = cameraController;

    // Add PlayerPhysics
    const playerPhysics = new PlayerPhysics();
    playerPhysicsRef.current = playerPhysics;

    // Add NavigationSystem (wraps CameraController and PlayerPhysics)
    const navigation = new NavigationSystem(cameraController, playerPhysics);
    navigationRef.current = navigation;

    // Add MobileControls (only on mobile devices)
    let mobileControls: MobileControls | undefined;
    if (deviceInfo.isMobile) {
      mobileControls = new MobileControls(document.body);
      mobileControlsRef.current = mobileControls;
    }

    // Use RendererManager
    const renderer = new RendererManager(canvas, deviceInfo);
    rendererRef.current = renderer;

    // Add Performance Monitor
    const performanceMonitor = new PerformanceMonitor();
    performanceMonitorRef.current = performanceMonitor;

    // Add Dynamic Resolution
    const dynamicResolution = new DynamicResolution(renderer, deviceInfo, performanceMonitor);
    dynamicResolutionRef.current = dynamicResolution;

    // Add Profiler
    const profiler = new Profiler();
    profilerRef.current = profiler;

    // Add Telemetry Collector
    const telemetry = new TelemetryCollector();
    telemetryRef.current = telemetry;

    // Add ZoneManager (pass SceneManager for lighting support)
    const zoneManager = new ZoneManager(scene, sceneManager);
    zoneManagerRef.current = zoneManager;

    // Add LOD system to upgrade zones in the background after initial low LOD load
    const lodSystem = new LODSystem(zoneManager, camera);
    lodSystemRef.current = lodSystem;

    // Add Flashlight
    const flashlight = new Flashlight(scene, camera);
    flashlightRef.current = flashlight;

    // Add Debug GUI
    const debugGUI = new DebugGUI();
    debugGUIRef.current = debugGUI;

    // Connect debug configuration to scene and develop overlay
    debugGUI.setOnConfigChange((config) => {
      // Light helpers visibility
      sceneManager.setLightHelpersVisible(config.showLightHelpers);

      // Sync develop mode overlay with GUI switch (works on mobile too)
      isDevMode = config.showDevOverlay;
      if (devOverlayRef.current) {
        devOverlayRef.current.style.display = isDevMode ? 'block' : 'none';
      }
    });

    // Create player cylinder helper
    const playerCylinderGeometry = new THREE.CylinderGeometry(
      PLAYER_RADIUS,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      16
    );
    const playerCylinderMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    const playerCylinder = new THREE.Mesh(playerCylinderGeometry, playerCylinderMaterial);
    playerCylinder.visible = false;
    playerCylinder.renderOrder = 1000; // Render on top
    scene.add(playerCylinder);

    // Register player cylinder helper with GUI
    debugGUI.registerPlayerCylinderHelper(playerCylinder);

    // Create ray helpers group for collision visualization
    const rayHelpersGroup = new THREE.Group();
    rayHelpersGroup.visible = false;
    scene.add(rayHelpersGroup);
    debugGUI.registerRayHelpersGroup(rayHelpersGroup);

    // Create OBB helpers group for OBB visualization
    const obbHelpersGroup = new THREE.Group();
    obbHelpersGroup.visible = false;
    scene.add(obbHelpersGroup);
    debugGUI.registerOBBHelpersGroup(obbHelpersGroup);

    // Store OBB helpers for player and objects
    let playerOBBHelper: THREE.LineSegments | null = null;
    const objectOBBHelpers = new Map<THREE.Mesh, THREE.LineSegments>();

    // Set up zone transition callback
    navigation.setZoneTransitionCallback((transition) => {
      // Disable physics while we unload the current zone and load the next one,
      // so the player does not fall through empty space during streaming.
      isPhysicsReadyRef.current = false;

      zoneManager.setCurrentZone(transition.zoneId, 'low').then(() => {
        // Teleport player to transition position after zone loads
        if (transition.position) {
          navigation.teleport(transition.position, transition.rotation);
        }

        // Re-enable physics now that the destination zone is ready.
        isPhysicsReadyRef.current = true;
      }).catch((error) => {
        console.error('Zone transition failed:', error);
        // Leave physics disabled on failure to avoid updating against
        // an inconsistent or partially loaded world.
        isPhysicsReadyRef.current = false;
      });
    });

    // Set up zone change callback
    zoneManager.setZoneChangeCallback((zoneId) => {
      console.log('Zone changed to:', zoneId);
    });

    // Handle resize
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cameraController.updateAspect(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Input & simulation state
    const keys: Set<string> = new Set();
    let isPointerLocked = false;
    let isPaused = false;
    let nKeyPressed = false; // Track N key state to prevent multiple toggles
    let isDevMode = false; // Develop mode for displaying helper data (e.g., FPS)

    const handleKeyDown = (e: KeyboardEvent) => {
      // Use e.code instead of e.key for language-independent key detection
      // e.code returns physical key codes (KeyW, KeyA, etc.) regardless of keyboard layout
      const keyCode = e.code;

      // Handle develop mode toggle on U key (KeyU)
      if (keyCode === 'KeyU') {
        e.preventDefault();
        e.stopPropagation();
        isDevMode = !isDevMode;

        // Update overlay visibility immediately when toggling
        if (devOverlayRef.current) {
          devOverlayRef.current.style.display = isDevMode ? 'block' : 'none';
        }

        return;
      }
      
      // Map physical key codes to game actions
      const keyMap: Record<string, string> = {
        'KeyW': 'w',
        'KeyA': 'a',
        'KeyS': 's',
        'KeyD': 'd',
        'ArrowUp': 'arrowup',
        'ArrowDown': 'arrowdown',
        'ArrowLeft': 'arrowleft',
        'ArrowRight': 'arrowright',
        'Space': 'space',
        'KeyN': 'n',
      };
      
      const gameKey = keyMap[keyCode];
      const gameKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'n'];
      
      //console.log('[KeyDown] Code:', keyCode, 'Key:', e.key, 'Mapped to:', gameKey);
      
      if (gameKey && gameKeys.includes(gameKey)) {
        e.preventDefault();
        e.stopPropagation();
        keys.add(gameKey);
        //console.log('[KeyDown] Keys Set:', Array.from(keys));
        
        // Handle flashlight toggle (N key)
        if (gameKey === 'n' && !nKeyPressed) {
          nKeyPressed = true;
          flashlight.toggle();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Use e.code instead of e.key for language-independent key detection
      const keyCode = e.code;

      // Ignore U key here (develop mode is toggled on keydown only)
      if (keyCode === 'KeyU') {
        return;
      }
      
      // Map physical key codes to game actions
      const keyMap: Record<string, string> = {
        'KeyW': 'w',
        'KeyA': 'a',
        'KeyS': 's',
        'KeyD': 'd',
        'ArrowUp': 'arrowup',
        'ArrowDown': 'arrowdown',
        'ArrowLeft': 'arrowleft',
        'ArrowRight': 'arrowright',
        'Space': 'space',
        'KeyN': 'n',
      };
      
      const gameKey = keyMap[keyCode];
      
      //console.log('[KeyUp] Code:', keyCode, 'Key:', e.key, 'Mapped to:', gameKey);
      
      if (gameKey) {
        keys.delete(gameKey);
        //console.log('[KeyUp] Keys Set:', Array.from(keys));
        
        // Reset N key state when released
        if (gameKey === 'n') {
          nKeyPressed = false;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLocked && !isPaused) {
        navigation.handleRotation(e.movementX, e.movementY);
      }
    };

    const handleClick = () => {
      if (!deviceInfo.isMobile && canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    };

    const handlePointerLockChange = (_event: any ) => {
      isPointerLocked = document.pointerLockElement === canvas;
      // console.log('Pointer lock change event:', event, document.pointerLockElement);
      if (onPointerLockChange) {
        console.log('Pointer lock change event: (in canvas)', isPointerLocked);
        onPointerLockChange(isPointerLocked);
      }
    };

    /**
     * Game UI bridge implementation
     * Exposes pause, rooms, and settings controls to React overlays.
     */
    const setPaused = (paused: boolean) => {
      isPaused = paused;

      if (paused) {
        // Release pointer lock so the user can interact with overlays.
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        }
      }
    };

    const rooms = async (dest: BunkerDestination) => {
      try {
        // For now all destinations live inside the main-room zone.
        const targetZoneId = 'main-room';

        // Temporarily disable physics while we unload/reload zones so the player
        // does not fall while collision meshes are unavailable.
        isPhysicsReadyRef.current = false;

        await zoneManager.setCurrentZone(targetZoneId, 'low');

        // Base spawn position from manifest.
        const basePosition = new THREE.Vector3(0, 30.8072, -5);

        let position = basePosition.clone();
        let rotation: THREE.Euler | undefined = undefined;

        switch (dest) {
          case 'main':
            // Center of the bunker.
            position = basePosition.clone();
            rotation = new THREE.Euler(0, 0, 0);
            break;
          case 'projects':
            // Placeholder: shift toward the corridor / work area.
            position = basePosition.clone().add(new THREE.Vector3(5, 0, -2));
            rotation = new THREE.Euler(0, -Math.PI / 2, 0);
            break;
          case 'contact':
            // Placeholder: shift toward the communications corner.
            position = basePosition.clone().add(new THREE.Vector3(-4, 0, 1));
            rotation = new THREE.Euler(0, Math.PI / 2, 0);
            break;
        }

        navigation.teleport(position, rotation);

        // Re-enable physics now that the destination zone is loaded and the
        // player has been teleported onto valid geometry.
        isPhysicsReadyRef.current = true;
      } catch (error) {
        console.error('Rooms failed:', error);
        // Keep physics disabled on failure to avoid running against an
        // inconsistent world state.
        isPhysicsReadyRef.current = false;
      }
    };

    const applySettings = (settings: BunkerSettings) => {
      // Graphics: resolution scale and shadows derived from quality preset.
      const rendererInstance = renderer.getRenderer();

      const resolutionScale = Math.max(0.5, Math.min(1, settings.graphics.resolutionScale / 100));
      const targetPixelRatio = deviceInfo.pixelRatio * resolutionScale;
      renderer.setPixelRatio(targetPixelRatio);

      // Simple automatic shadow toggle based on quality (no explicit shadow setting).
      if (settings.graphics.quality === 'low') {
        rendererInstance.shadowMap.enabled = false;
      } else {
        rendererInstance.shadowMap.enabled = true;
      }

      // Connect graphics quality preset to LOD system so zones upgrade to the
      // appropriate LOD level in the background.
      if (lodSystemRef.current) {
        lodSystemRef.current.setQualityPreset(settings.graphics.quality);
      }

      // Controls: mouse sensitivity & invert Y.
      cameraController.setMouseSensitivity(settings.controls.mouseSensitivity);
      cameraController.setInvertY(settings.controls.invertY);

      // Audio & UI are currently managed at the React layer (no audio engine yet).
    };

    registerGameAPI({
      setPaused,
      rooms,
      applySettings,
    });

    if (!deviceInfo.isMobile) {
      // Add keyboard event listeners with capture mode to catch events early
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
      document.addEventListener('pointerlockchange', handlePointerLockChange, false);
      
      // Make canvas focusable to receive keyboard events
      canvas.setAttribute('tabindex', '0');
      canvas.style.outline = 'none';
    }

    // Render loop
    let lastTime = performance.now();
    let animationFrameId: number | null = null;
    let isVisible = true;
    let lastTriggerCheck = 0;
    const TRIGGER_CHECK_INTERVAL = 100; // Check every 100ms

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        // Tab became visible: reset time accumulator so the next frame
        // has a sane delta, but do NOT start a new animation loop here.
        // The existing requestAnimationFrame chain will continue automatically.
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle WebGL context loss
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
      // Re-initialize renderer if needed
      renderer.getRenderer().setPixelRatio(deviceInfo.pixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      cameraController.updateAspect(window.innerWidth, window.innerHeight);
      lastTime = performance.now();
      animate();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const animate = () => {
      // Don't render if tab is hidden
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const currentTime = performance.now();
      const elapsedSeconds = (currentTime - lastTime) / 1000;

      // For testing: hard-cap simulation/render to a maximum of 50 FPS.
      // This is done by skipping frames until at least 1/50s has passed.
      const MAX_FPS = 150;
      const MIN_FRAME_TIME_SECONDS = 1 / MAX_FPS;
      if (elapsedSeconds < MIN_FRAME_TIME_SECONDS) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = elapsedSeconds;
      const frameTime = elapsedSeconds * 1000;
      lastTime = currentTime;

      // Update performance monitor
      const metrics = performanceMonitor.update(renderer, currentTime);

      // When develop mode is enabled, update the on-screen overlay with helper data (e.g., FPS)
      if (isDevMode && devOverlayRef.current) {
        const fpsText = metrics.fps.toFixed(1);
        const frameTimeText = metrics.frameTime.toFixed(2);
        devOverlayRef.current.textContent =
          `FPS: ${fpsText} | Frame: ${frameTimeText} ms | ` +
          `Draw calls: ${metrics.drawCalls} | Triangles: ${metrics.triangles}`;
      }

      // Record frame time for profiling
      profiler.recordFrameTime(frameTime);

      // Record render telemetry
      telemetry.recordRender({
        timestamp: currentTime,
        frameTime,
        fps: metrics.fps,
        drawCalls: metrics.drawCalls,
        triangles: metrics.triangles,
        memory: metrics.memory,
      });

      // TODO: Fix dynamic resolution - Currently disabled due to canvas resizing issues.
      // Problem: Repeatedly calling setPixelRatio() causes visual glitches (gaps on right side of screen).
      // Solution needed: Only update pixel ratio when value actually changes, and ensure canvas size
      // is properly maintained after pixel ratio changes. Consider debouncing or using a threshold
      // to prevent unnecessary updates. May need to re-apply canvas size after pixel ratio changes.
      // dynamicResolution.update(currentTime, metrics);

      // Physics should only run when the game is unpaused *and* the active zone has
      // fully finished loading its assets and collision data.
      let physicsEnabled = !isPaused && isPhysicsReadyRef.current;

      // Extra safety: also require the current zone to be marked as loaded.
      const activeZoneId = zoneManager.getCurrentZoneId();
      if (!activeZoneId) {
        physicsEnabled = false;
      } else {
        const activeZone = zoneManager.getZone(activeZoneId);
        if (!activeZone || !activeZone.loaded) {
          physicsEnabled = false;
        }
      }

      // Set movement input - use mobile controls on mobile, keyboard on desktop.
      // When physics is disabled (e.g., while loading a zone), we feed zero input
      // so the player stays perfectly still until the world is ready.
      if (physicsEnabled) {
        if (deviceInfo.isMobile && mobileControls) {
          const controlState = mobileControls.getControlState();
          navigation.setMovementInput({
            moveForward: controlState.moveForward,
            moveBackward: controlState.moveBackward,
            moveLeft: controlState.moveLeft,
            moveRight: controlState.moveRight,
            jump: controlState.jump,
          });
          // Handle rotation from touch (always call to ensure smooth rotation)
          navigation.handleRotation(controlState.rotationDeltaX, controlState.rotationDeltaY, 0.002);
        } else {
          // Desktop keyboard input (using mapped keys)
          const moveForward = keys.has('w') || keys.has('arrowup');
          const moveBackward = keys.has('s') || keys.has('arrowdown');
          const moveLeft = keys.has('a') || keys.has('arrowleft');
          const moveRight = keys.has('d') || keys.has('arrowright');
          const jump = keys.has('space');
          
          navigation.setMovementInput({
            moveForward,
            moveBackward,
            moveLeft,
            moveRight,
            jump,
          });
        }
      } else {
        navigation.setMovementInput({
          moveForward: false,
          moveBackward: false,
          moveLeft: false,
          moveRight: false,
          jump: false,
        });
      }

      // Update navigation (handles physics, movement, and collision)
      if (physicsEnabled) {
        // Clamp physics timestep to avoid huge jumps on slow frames
        // (especially important on mobile devices).
        const physicsDelta = Math.min(deltaTime, 0.1); // max 100 ms per step
        navigation.update(physicsDelta);
      }

      // Update player cylinder position
      // Camera is at eye height (1.6m from ground)
      // Need to find the actual ground height where player is standing
      const cameraPosition = navigation.getPosition();
      
      // Find ground height below player using collision system
      const groundCheck = CollisionSystem.findGround(cameraPosition);
      
      if (groundCheck.hit && groundCheck.point) {
        // groundCheck.point.y is the ground height
        // Capsule center should be at ground + PLAYER_HEIGHT/2
        const groundY = groundCheck.point.y;
        const capsuleCenterY = groundY + PLAYER_HEIGHT / 2;
        playerCylinder.position.set(cameraPosition.x, capsuleCenterY, cameraPosition.z);
        
        // Debug: Log cylinder position when visible
        if (playerCylinder.visible) {
          console.log('[Cylinder] Ground Y:', groundY, 'Cylinder Center Y:', capsuleCenterY, 'Camera Y:', cameraPosition.y);
        }
      } else {
        // Fallback: if ground not found, use camera position - eye height
        const groundY = cameraPosition.y - PLAYER_EYE_HEIGHT;
        const capsuleCenterY = groundY + PLAYER_HEIGHT / 2;
        playerCylinder.position.set(cameraPosition.x, capsuleCenterY, cameraPosition.z);
        
        if (playerCylinder.visible) {
          console.warn('[Cylinder] Ground not found, using fallback. Ground Y:', groundY, 'Cylinder Y:', capsuleCenterY);
        }
      }

      // Update OBB helpers for visualization
      if (obbHelpersGroup.visible) {
        // Update player OBB helper
        const playerOBB = CollisionSystem.createPlayerOBB(cameraPosition);
        if (!playerOBBHelper) {
          playerOBBHelper = CollisionSystem.createOBBHelper(playerOBB, 0x00ff00); // Green for player
          obbHelpersGroup.add(playerOBBHelper);
        } else {
          CollisionSystem.updateOBBHelper(playerOBBHelper, playerOBB);
        }

        // Update object OBB helpers
        const objectMeshes = CollisionSystem.getObjectMeshes();
        
        // Remove helpers for meshes that are no longer registered
        for (const [mesh, helper] of objectOBBHelpers.entries()) {
          if (!objectMeshes.has(mesh)) {
            obbHelpersGroup.remove(helper);
            helper.geometry.dispose();
            (helper.material as THREE.Material).dispose();
            objectOBBHelpers.delete(mesh);
          }
        }

        // Add/update helpers for registered object meshes
        for (const [mesh, obb] of objectMeshes.entries()) {
          let helper = objectOBBHelpers.get(mesh);
          if (!helper) {
            helper = CollisionSystem.createOBBHelper(obb, 0xff00ff); // Magenta for objects
            obbHelpersGroup.add(helper);
            objectOBBHelpers.set(mesh, helper);
          } else {
            CollisionSystem.updateOBBHelper(helper, obb);
          }
        }
      } else {
        // Clean up helpers when not visible
        if (playerOBBHelper) {
          obbHelpersGroup.remove(playerOBBHelper);
          playerOBBHelper.geometry.dispose();
          (playerOBBHelper.material as THREE.Material).dispose();
          playerOBBHelper = null;
        }
        for (const [, helper] of objectOBBHelpers.entries()) {
          obbHelpersGroup.remove(helper);
          helper.geometry.dispose();
          (helper.material as THREE.Material).dispose();
        }
        objectOBBHelpers.clear();
      }

      // Update ray helpers for collision visualization
      if (rayHelpersGroup.visible) {
        // Clear existing ray helpers - dispose ALL children (Line and Mesh)
        while (rayHelpersGroup.children.length > 0) {
          const child = rayHelpersGroup.children[0];
          if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
            const geometry = child.geometry as THREE.BufferGeometry;
            const material = child.material as THREE.Material;
            geometry.dispose();
            if (material && typeof material.dispose === 'function') {
              material.dispose();
            }
          }
          rayHelpersGroup.remove(child);
        }

        // Create rays for capsule collision check
        // 32 fixed rays: 8 directions × 4 vertical rows (from surface to eye height)
        const groundRayHeight = PLAYER_RADIUS; // Near base for ground

        // 8 fixed horizontal directions (cardinal + diagonal: N, NE, E, SE, S, SW, W, NW)
        const sqrt2 = Math.sqrt(2);
        const directions = [
          { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff },                    // North (Forward) - Blue
          { dir: new THREE.Vector3(1 / sqrt2, 0, 1 / sqrt2), color: 0x0080ff },   // Northeast - Light Blue
          { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000 },                    // East (Right) - Red
          { dir: new THREE.Vector3(1 / sqrt2, 0, -1 / sqrt2), color: 0xff8000 },  // Southeast - Orange
          { dir: new THREE.Vector3(0, 0, -1), color: 0x00ffff },                   // South (Backward) - Cyan
          { dir: new THREE.Vector3(-1 / sqrt2, 0, -1 / sqrt2), color: 0x00ff80 }, // Southwest - Light Green
          { dir: new THREE.Vector3(-1, 0, 0), color: 0xff00ff },                   // West (Left) - Magenta
          { dir: new THREE.Vector3(-1 / sqrt2, 0, 1 / sqrt2), color: 0x8000ff }, // Northwest - Purple
        ];

        // 4 vertical rows from surface to eye height
        const numRows = 4;
        const baseHeight = PLAYER_RADIUS; // Start from surface
        const topHeight = PLAYER_EYE_HEIGHT; // End at eye height
        const verticalRange = topHeight - baseHeight;
        
        // Generate 4 vertical positions
        const verticalPositions: number[] = [];
        for (let i = 0; i < numRows; i++) {
          const ratio = i / (numRows - 1); // 0 to 1
          const height = baseHeight + verticalRange * ratio;
          verticalPositions.push(height);
        }

        // Draw all 32 rays (8 directions × 4 rows)
        verticalPositions.forEach((verticalHeight, rowIndex) => {
          const rayStart = cameraPosition.clone();
          rayStart.y = cameraPosition.y - (PLAYER_EYE_HEIGHT - verticalHeight);
          
          // Different opacity for different rows (lower rows more transparent)
          const opacity = 0.3 + (rowIndex / (numRows - 1)) * 0.7; // 0.3 to 1.0
          const lineWidth = 1 + (rowIndex / (numRows - 1)) * 2; // 1 to 3

          directions.forEach(({ dir, color }) => {
            const raycaster = new THREE.Raycaster();
            raycaster.set(rayStart, dir);
            const intersections = CollisionSystem.raycast(raycaster);
            const hit = intersections[0];

            const rayLength = hit ? Math.min(hit.distance, 2.0) : 2.0;
            const endPoint = rayStart.clone().add(dir.clone().multiplyScalar(rayLength));

            const points = [rayStart.clone(), endPoint];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
              color: hit && hit.distance < PLAYER_RADIUS ? 0xffff00 : color,
              linewidth: lineWidth,
              transparent: true,
              opacity: opacity,
            });
            const line = new THREE.Line(geometry, material);
            rayHelpersGroup.add(line);

            if (hit && hit.distance < PLAYER_RADIUS) {
              const sphereGeometry = new THREE.SphereGeometry(0.08, 8, 8);
              const sphereMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                transparent: true,
                opacity: 0.8,
              });
              const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
              sphere.position.copy(hit.point);
              rayHelpersGroup.add(sphere);
            }
          });
        });
        
        // Draw ground ray separately from base height
        {
          const groundRayStart = cameraPosition.clone();
          groundRayStart.y = cameraPosition.y - (PLAYER_EYE_HEIGHT - groundRayHeight);
          const dir = new THREE.Vector3(0, -1, 0); // Down
          const color = 0x00ff00; // Green
          const opacity = 1.0;
          
          const raycaster = new THREE.Raycaster();
          raycaster.set(groundRayStart, dir);
          const intersections = CollisionSystem.raycast(raycaster);
          const hit = intersections[0];

          const rayLength = hit ? Math.min(hit.distance, 2.0) : 2.0;
          const endPoint = groundRayStart.clone().add(dir.clone().multiplyScalar(rayLength));

          const points = [groundRayStart.clone(), endPoint];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: hit && hit.distance < PLAYER_RADIUS ? 0xffff00 : color,
            linewidth: 4,
            transparent: true,
            opacity: opacity,
          });
          const line = new THREE.Line(geometry, material);
          rayHelpersGroup.add(line);

          if (hit && hit.distance < PLAYER_RADIUS) {
            const sphereGeometry = new THREE.SphereGeometry(0.08, 8, 8);
            const sphereMaterial = new THREE.MeshBasicMaterial({ 
              color: 0xffff00,
              transparent: true,
              opacity: 0.8,
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(hit.point);
            rayHelpersGroup.add(sphere);
          }
        }

        // Ground check ray (only one, separate)
        const groundRaycaster = new THREE.Raycaster();
        groundRaycaster.set(cameraPosition, new THREE.Vector3(0, -1, 0));
        const groundIntersections = CollisionSystem.raycast(groundRaycaster);
        
        // Find the first hit that is thin enough to be considered ground (10% of player height or less)
        const MAX_GROUND_THICKNESS = PLAYER_HEIGHT * 0.1; // 10% of player height
        let groundHit: THREE.Intersection | null = null;
        let actualGroundPoint: THREE.Vector3 | null = null;
        let rayColor = 0x00ff00; // Green for ground
        
        for (const hit of groundIntersections) {
          // Calculate the height/thickness of the hit object
          let objectHeight = 0;
          if (hit.object instanceof THREE.Mesh && hit.object.geometry) {
            hit.object.geometry.computeBoundingBox();
            const box = hit.object.geometry.boundingBox;
            if (box) {
              const size = new THREE.Vector3();
              box.getSize(size);
              // Get world scale to account for object scaling
              const worldScale = new THREE.Vector3();
              hit.object.getWorldScale(worldScale);
              // Use Y dimension (height) of the bounding box
              objectHeight = size.y * Math.abs(worldScale.y);
            }
          }
          
          // If object is thin enough (like a floor), use it as ground
          if (objectHeight <= MAX_GROUND_THICKNESS) {
            groundHit = hit;
            actualGroundPoint = hit.point.clone();
            rayColor = 0x00ff00; // Green for ground
            break;
          } else {
            // Object is too thick (table, chair, etc.) - continue raycast from bottom of object
            // Calculate bottom of the object
            if (hit.object instanceof THREE.Mesh && hit.object.geometry) {
              hit.object.geometry.computeBoundingBox();
              const box = hit.object.geometry.boundingBox;
              if (box) {
                const worldMatrix = new THREE.Matrix4();
                hit.object.updateMatrixWorld();
                worldMatrix.copy(hit.object.matrixWorld);
                
                // Get bottom Y in world space
                const localBottom = new THREE.Vector3(0, box.min.y, 0);
                const worldBottom = localBottom.applyMatrix4(worldMatrix);
                
                // Continue raycast from bottom of this object
                const continueRaycaster = new THREE.Raycaster();
                continueRaycaster.set(worldBottom, new THREE.Vector3(0, -1, 0));
                const continueIntersections = CollisionSystem.raycast(continueRaycaster);
                
                // Find ground below this object
                for (const continueHit of continueIntersections) {
                  if (continueHit.object !== hit.object) {
                    // Check if this is also a thin object
                    let continueObjectHeight = 0;
                    if (continueHit.object instanceof THREE.Mesh && continueHit.object.geometry) {
                      continueHit.object.geometry.computeBoundingBox();
                      const continueBox = continueHit.object.geometry.boundingBox;
                      if (continueBox) {
                        const continueSize = new THREE.Vector3();
                        continueBox.getSize(continueSize);
                        const continueWorldScale = new THREE.Vector3();
                        continueHit.object.getWorldScale(continueWorldScale);
                        continueObjectHeight = continueSize.y * Math.abs(continueWorldScale.y);
                      }
                    }
                    
                    if (continueObjectHeight <= MAX_GROUND_THICKNESS) {
                      groundHit = continueHit;
                      actualGroundPoint = continueHit.point.clone();
                      rayColor = 0x00ff00; // Green for ground
                      break;
                    }
                  }
                }
                
                if (groundHit) break;
              }
            }
            
            // If we hit a thick object but couldn't find ground below, show it in orange
            if (!groundHit) {
              groundHit = hit;
              actualGroundPoint = hit.point.clone();
              rayColor = 0xff8800; // Orange for thick objects
            }
          }
        }

        if (groundHit && actualGroundPoint) {
          const groundEndPoint = cameraPosition.clone().add(new THREE.Vector3(0, -groundHit.distance, 0));
          const groundPoints = [cameraPosition.clone(), groundEndPoint];
          const groundGeometry = new THREE.BufferGeometry().setFromPoints(groundPoints);
          const groundMaterial = new THREE.LineBasicMaterial({
            color: rayColor,
            linewidth: 4,
            transparent: true,
            opacity: 1.0,
          });
          const groundLine = new THREE.Line(groundGeometry, groundMaterial);
          rayHelpersGroup.add(groundLine);

          // Add sphere at ground hit point
          const groundSphereGeometry = new THREE.SphereGeometry(0.12, 8, 8);
          const groundSphereMaterial = new THREE.MeshBasicMaterial({ 
            color: rayColor,
            transparent: true,
            opacity: 0.9,
          });
          const groundSphere = new THREE.Mesh(groundSphereGeometry, groundSphereMaterial);
          groundSphere.position.copy(actualGroundPoint);
          rayHelpersGroup.add(groundSphere);
        }
      }

      // Update flashlight position
      flashlight.update();

      // Check for zone triggers (e.g., door opening, teleportation) - throttled
      if (currentTime - lastTriggerCheck >= TRIGGER_CHECK_INTERVAL) {
        lastTriggerCheck = currentTime;
        const currentZoneId = zoneManager.getCurrentZoneId();
        if (currentZoneId) {
          const playerPosition = navigation.getPosition();
          const trigger = zoneManager.checkTriggers(playerPosition, currentZoneId);

          if (trigger) {
            // Handle trigger based on type
            switch (trigger.type) {
              case 'teleport':
                if (trigger.targetPosition && trigger.targetZone) {
                  navigation.transitionToZone(
                    trigger.targetZone,
                    new THREE.Vector3(...trigger.targetPosition),
                    trigger.targetRotation ? new THREE.Euler(...trigger.targetRotation) : undefined
                  );
                }
                break;
              case 'zone_transition':
                if (trigger.targetZone && trigger.targetPosition) {
                  navigation.transitionToZone(
                    trigger.targetZone,
                    new THREE.Vector3(...trigger.targetPosition),
                    trigger.targetRotation ? new THREE.Euler(...trigger.targetRotation) : undefined
                  );
                }
                break;
              case 'door':
                // Trigger door opening event
                if (trigger.event) {
                  zoneManager.handleEvent(trigger.event, currentZoneId).catch((error) => {
                    console.error('Event handling failed:', error);
                  });
                }
                break;
            }
          }
        }
      }

      // Update scene
      sceneManager.update(deltaTime);

      // Background LOD management: upgrade current zone to higher quality after start
      if (lodSystemRef.current) {
        lodSystemRef.current.update(currentTime);
      }

      // Ensure camera and scene matrices are updated before rendering (fixes rotation disappearing issue)
      const camera = cameraController.getCamera();
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();

      // Render
      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    if (onReady) {
      onReady();
    }

    // Cleanup
    return () => {
      // Cancel animation frame
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      // Remove visibility and context listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      window.removeEventListener('resize', handleResize);
      if (!deviceInfo.isMobile) {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
      }
      
      // Clear registered collision data
      CollisionSystem.clear();

      // Cleanup OBB helpers
      if (playerOBBHelper) {
        obbHelpersGroup.remove(playerOBBHelper);
        playerOBBHelper.geometry.dispose();
        (playerOBBHelper.material as THREE.Material).dispose();
        playerOBBHelper = null;
      }
      for (const [, helper] of objectOBBHelpers.entries()) {
        obbHelpersGroup.remove(helper);
        helper.geometry.dispose();
        (helper.material as THREE.Material).dispose();
      }
      objectOBBHelpers.clear();
      
      // Dispose mobile controls
      if (mobileControlsRef.current) {
        mobileControlsRef.current.dispose();
        mobileControlsRef.current = null;
      }
      
      // Clear performance monitor
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.clear();
        performanceMonitorRef.current = null;
      }
      
      // Clear profiling data
      if (profilerRef.current) {
        profilerRef.current.clear();
        profilerRef.current = null;
      }
      if (telemetryRef.current) {
        telemetryRef.current.clear();
        telemetryRef.current = null;
      }
      
      // Dispose zone manager
      if (zoneManagerRef.current) {
        zoneManagerRef.current.dispose();
        zoneManagerRef.current = null;
      }
      
      // Dispose flashlight
      if (flashlightRef.current) {
        flashlightRef.current.dispose();
        flashlightRef.current = null;
      }
      
      // Dispose debug GUI
      if (debugGUIRef.current) {
        debugGUIRef.current.dispose();
        debugGUIRef.current = null;
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
      sceneManagerRef.current = null;
      rendererRef.current = null;
      cameraControllerRef.current = null;
      playerPhysicsRef.current = null;
      navigationRef.current = null;
      dynamicResolutionRef.current = null;
      profilerRef.current = null;
      telemetryRef.current = null;
      zoneManagerRef.current = null;
      lodSystemRef.current = null;
    };
  }, []);

  // Start initial zone loading when requested by parent (Enter Bunker click).
  useEffect(() => {
    if (!startLoading || hasLoadedInitialZoneRef.current) {
      return;
    }

    const sceneManager = sceneManagerRef.current;
    const navigation = navigationRef.current;
    const zoneManager = zoneManagerRef.current;

    if (!sceneManager || !navigation || !zoneManager) {
      // Core systems not ready yet; wait for next render.
      return;
    }

    hasLoadedInitialZoneRef.current = true;

    const loadInitialZone = async () => {
      try {
        // Physics must stay disabled until we have loaded the initial zone
        // and teleported the player onto valid ground.
        isPhysicsReadyRef.current = false;

        if (onLoadingProgress) {
          onLoadingProgress(0, 'Initializing scene...');
        }

        // Ensure RectAreaLightUniformsLib is initialized before loading lights.
        await sceneManager.ensureRectAreaLightSupport();

        if (onLoadingProgress) {
          onLoadingProgress(10, 'Loading zone manifest...');
        }

        const response = await fetch('/assets/zones/main-room/manifest.json');
        const manifestData = await response.json();
        const manifest = parseZoneManifest(manifestData);
        zoneManager.registerZone(manifest);

        if (onLoadingProgress) {
          onLoadingProgress(20, 'Loading assets...');
        }

        await zoneManager.setCurrentZone('main-room', 'low', onLoadingProgress);

        if (manifest.initialPosition) {
          const startPosition = new THREE.Vector3(...manifest.initialPosition);
          navigation.teleport(
            startPosition,
            manifest.initialRotation ? new THREE.Euler(...manifest.initialRotation) : undefined,
          );
        }

        // Initial zone is fully loaded; physics can now safely run.
        isPhysicsReadyRef.current = true;

        if (onLoadingComplete) {
          onLoadingComplete();
        }
      } catch (error) {
        console.error('Failed to load initial zone:', error);
        hasLoadedInitialZoneRef.current = false;
        // Keep physics disabled on failure so the player does not move in an
        // undefined world state.
        isPhysicsReadyRef.current = false;
        if (onLoadingProgress) {
          onLoadingProgress(0, 'Loading failed. Please refresh.');
        }
      }
    };

    loadInitialZone();
  }, [startLoading, onLoadingProgress, onLoadingComplete]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/*
        Develop mode overlay for helper data (e.g., FPS).
        Toggled with the U key (KeyU) in the canvas input handler.
      */}
      <div
        ref={devOverlayRef}
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          padding: '4px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: '#ffffff',
          borderRadius: '4px',
          pointerEvents: 'none',
          display: 'none',
          whiteSpace: 'nowrap',
        }}
      />
    </div>
  );
}

