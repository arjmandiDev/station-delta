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
import type { DeviceInfo } from '../utils/device';

interface CanvasProps {
  deviceInfo: DeviceInfo;
  onReady?: () => void;
}

export function Canvas({ deviceInfo, onReady }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    // Handle resize
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cameraController.updateAspect(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Add floor and cube - store references for cleanup
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    CollisionSystem.registerMesh(floor);

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 0.5, -3);
    scene.add(cube);
    CollisionSystem.registerMesh(cube);

    // Store meshes for cleanup
    const meshesToCleanup: THREE.Mesh[] = [floor, cube];

    // Input handling
    const keys: Set<string> = new Set();
    let isPointerLocked = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLocked) {
        navigation.handleRotation(e.movementX, e.movementY);
      }
    };

    const handleClick = () => {
      if (!deviceInfo.isMobile && canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      isPointerLocked = document.pointerLockElement === canvas;
    };

    if (!deviceInfo.isMobile) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
      document.addEventListener('pointerlockchange', handlePointerLockChange);
    }

    // Render loop
    let lastTime = performance.now();
    let animationFrameId: number | null = null;
    let isVisible = true;

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        // Tab became visible, restart animation loop
        lastTime = performance.now();
        animate();
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
      const deltaTime = (currentTime - lastTime) / 1000;
      const frameTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update performance monitor
      const metrics = performanceMonitor.update(renderer, currentTime);

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

      // Set movement input - use mobile controls on mobile, keyboard on desktop
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
        // Desktop keyboard input
        navigation.setMovementInput({
          moveForward: keys.has('w') || keys.has('arrowup'),
          moveBackward: keys.has('s') || keys.has('arrowdown'),
          moveLeft: keys.has('a') || keys.has('arrowleft'),
          moveRight: keys.has('d') || keys.has('arrowright'),
          jump: keys.has(' '),
        });
      }

      // Update navigation (handles physics, movement, and collision)
      navigation.update(deltaTime);

      // Update scene
      sceneManager.update(deltaTime);

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
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
      }
      
      // Unregister collision meshes
      for (const mesh of meshesToCleanup) {
        CollisionSystem.unregisterMesh(mesh);
      }
      CollisionSystem.clear();
      
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
    };
  }, [deviceInfo, onReady]);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

