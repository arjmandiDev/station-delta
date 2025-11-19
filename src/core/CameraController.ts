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

  // Rotation limits
  private readonly minPolarAngle = 0;
  private readonly maxPolarAngle = Math.PI;

  constructor(camera: THREE.PerspectiveCamera, deviceInfo: DeviceInfo) {
    this.camera = camera;
    this.deviceInfo = deviceInfo;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.canJump = false;

    this.setupCamera();
  }

  /**
   * Sets up camera initial state.
   */
  private setupCamera(): void {
    this.camera.position.set(0, 1.6, 0);
    this.camera.lookAt(0, 1.6, -1);
  }

  /**
   * Updates camera rotation from input.
   */
  updateRotation(deltaX: number, deltaY: number, sensitivity: number = 0.002): void {
    this.euler.setFromQuaternion(this.camera.quaternion);

    this.euler.y -= deltaX * sensitivity;
    this.euler.x -= deltaY * sensitivity;

    // Clamp vertical rotation
    this.euler.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.euler.x)
    );

    this.camera.quaternion.setFromEuler(this.euler);
    // Mark camera matrix as needing update (will be updated in render loop)
    this.camera.updateMatrix();
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
   */
  setPosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
  }

  /**
   * Sets camera rotation.
   */
  setRotation(rotation: THREE.Euler): void {
    this.camera.quaternion.setFromEuler(rotation);
    this.euler.copy(rotation);
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
}

