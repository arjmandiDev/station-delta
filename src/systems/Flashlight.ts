/**
 * Player flashlight system.
 * 
 * Purpose: Provides a flashlight attached to the camera.
 * Responsibilities: Flashlight creation, toggle, position updates.
 * Inputs: Camera position and rotation.
 * Outputs: SpotLight attached to camera.
 * Side effects: Adds/removes light from scene.
 */

import * as THREE from 'three';

export class Flashlight {
  private light: THREE.SpotLight;
  private target: THREE.Object3D;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isOn: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    // Create spotlight for flashlight
    this.light = new THREE.SpotLight(0xffffff, 4.0, 20, Math.PI / 6, 0.3, 1);
    this.light.castShadow = false; // Disable shadows for performance
    this.light.visible = false;

    // Create target object for spotlight
    this.target = new THREE.Object3D();
    this.light.target = this.target;
    this.scene.add(this.target);

    // Add light to scene (but keep it invisible initially)
    this.scene.add(this.light);
  }

  /**
   * Toggles flashlight on/off.
   */
  toggle(): void {
    this.isOn = !this.isOn;
    this.light.visible = this.isOn;
  }

  /**
   * Turns flashlight on.
   */
  turnOn(): void {
    this.isOn = true;
    this.light.visible = true;
  }

  /**
   * Turns flashlight off.
   */
  turnOff(): void {
    this.isOn = false;
    this.light.visible = false;
  }

  /**
   * Checks if flashlight is on.
   */
  isEnabled(): boolean {
    return this.isOn;
  }

  /**
   * Updates flashlight position and rotation to match camera.
   * Should be called every frame.
   */
  update(): void {
    if (!this.isOn) return;

    // Position light at camera position
    this.light.position.copy(this.camera.position);

    // Calculate forward direction from camera
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Position target in front of camera
    const targetPosition = this.camera.position.clone().add(direction.multiplyScalar(10));
    this.target.position.copy(targetPosition);

    // Update light direction
    this.light.lookAt(this.target.position);
  }

  /**
   * Sets flashlight intensity.
   */
  setIntensity(intensity: number): void {
    this.light.intensity = intensity;
  }

  /**
   * Sets flashlight color.
   */
  setColor(color: THREE.Color | number | string): void {
    if (color instanceof THREE.Color) {
      this.light.color.copy(color);
    } else {
      this.light.color.set(color);
    }
  }

  /**
   * Sets flashlight distance.
   */
  setDistance(distance: number): void {
    this.light.distance = distance;
  }

  /**
   * Disposes of flashlight resources.
   */
  dispose(): void {
    if (this.target.parent) {
      this.scene.remove(this.target);
    }
    if (this.light.parent) {
      this.scene.remove(this.light);
    }
    this.light.dispose();
  }
}

