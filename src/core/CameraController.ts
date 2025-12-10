/**
 * First-person camera controls.
 * 
 * Purpose: Manages first-person camera movement and rotation.
 * Responsibilities: Camera positioning, rotation, input handling.
 * Inputs: Mouse/touch input, keyboard input.
 * Outputs: Camera position and rotation updates.
 * Side effects: Modifies camera transform.
 */

import * as THREE from 'three';
import type { DeviceInfo } from '../utils/device';
import { PLAYER_EYE_HEIGHT } from '../utils/constants';

export interface CameraInput {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  rotationX: number;
  rotationY: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private deviceInfo: DeviceInfo;
  private euler: THREE.Euler;
  private velocity: THREE.Vector3;
  private canJump: boolean;
  private rotationSensitivity: number;
  private invertY: boolean;
  /**
   * Smoothed camera position target.
   * 
   * Physics can update the logical player position independently; the camera
   * eases toward that target to reduce visible jitter from collision
   * corrections at low frame rates.
   */
  private targetPosition: THREE.Vector3;
  private positionInitialized: boolean;
  private readonly positionSmoothingFactor: number = 0.03; // 0-1, higher = less smoothing

  // Rotation limits
  private readonly minPolarAngle = 0;
  private readonly maxPolarAngle = Math.PI;

  constructor(camera: THREE.PerspectiveCamera, deviceInfo: DeviceInfo) {
    this.camera = camera;
    this.deviceInfo = deviceInfo;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.canJump = false;
    this.rotationSensitivity = 0.002;
    this.invertY = false;
    this.targetPosition = new THREE.Vector3();
    this.positionInitialized = false;

    this.setupCamera();
  }

  /**
   * Sets up camera initial state.
   */
  private setupCamera(): void {
    this.camera.position.set(0, PLAYER_EYE_HEIGHT, 0);
    this.camera.lookAt(0, PLAYER_EYE_HEIGHT, -1);
    // Initialize euler from camera's initial rotation
    this.euler.setFromQuaternion(this.camera.quaternion);

    // Initialize smoothing target to the initial camera position
    this.targetPosition.copy(this.camera.position);
    this.positionInitialized = true;
  }

  /**
   * Updates camera rotation from input.
   */
  updateRotation(deltaX: number, deltaY: number, sensitivity?: number): void {
    const effectiveSensitivity = sensitivity ?? this.rotationSensitivity;

    // Yaw (left/right)
    this.euler.y -= deltaX * effectiveSensitivity;

    // Pitch (up/down) with optional inversion.
    let pitchDelta = deltaY * effectiveSensitivity;
    if (!this.invertY) {
      pitchDelta = -pitchDelta;
    }
    this.euler.x += pitchDelta;

    // Clamp vertical rotation
    this.euler.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.euler.x)
    );

    // Apply rotation to camera
    this.camera.quaternion.setFromEuler(this.euler);
  }

  /**
   * Gets camera forward direction.
   */
  getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }

  /**
   * Gets camera right direction.
   */
  getRight(): THREE.Vector3 {
    const right = new THREE.Vector3();
    right.crossVectors(this.getDirection(), new THREE.Vector3(0, 1, 0)).normalize();
    return right;
  }

  /**
   * Gets camera position.
   */
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Sets camera position.
   * 
   * When `useSmoothing` is true (typically during collisions), the camera
   * eases toward the target to reduce visible jitter. When false, the camera
   * snaps directly to the position (normal movement, teleports, etc.).
   */
  setPosition(position: THREE.Vector3, useSmoothing: boolean = false): void {
    // Update target position used for smoothing.
    this.targetPosition.copy(position);

    if (!this.positionInitialized || !useSmoothing) {
      // First call or explicit snap: move directly to target.
      this.camera.position.copy(this.targetPosition);
      this.positionInitialized = true;
      return;
    }

    // Smoothly move camera toward target to reduce jitter from collision
    // corrections while keeping gameplay-responsive movement.
    const alpha = this.positionSmoothingFactor;
    this.camera.position.lerp(this.targetPosition, alpha);
  }

  /**
   * Sets camera rotation.
   */
  setRotation(rotation: THREE.Euler): void {
    // Ensure same euler order
    this.euler.set(rotation.x, rotation.y, rotation.z, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
  }

  /**
   * Gets camera instance.
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Updates camera aspect ratio.
   */
  updateAspect(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Sets jump state.
   */
  setCanJump(canJump: boolean): void {
    this.canJump = canJump;
  }

  /**
   * Gets jump state.
   */
  getCanJump(): boolean {
    return this.canJump;
  }

  /**
   * Sets base mouse sensitivity multiplier for look controls.
   * Value is relative (1 = default), clamped to a safe range.
   */
  setMouseSensitivity(multiplier: number): void {
    const clamped = Math.max(0.3, Math.min(3, multiplier));
    this.rotationSensitivity = 0.002 * clamped;
  }

  /**
   * Enables or disables inverted Y look controls.
   */
  setInvertY(invert: boolean): void {
    this.invertY = invert;
  }
}

