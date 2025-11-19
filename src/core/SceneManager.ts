/**
 * Scene setup and lifecycle management.
 * 
 * Purpose: Manages Three.js scene, lighting, and environment.
 * Responsibilities: Scene creation, lighting setup, environment configuration.
 * Inputs: None (creates new scene).
 * Outputs: Configured Three.js scene.
 * Side effects: Creates 3D objects, sets up lighting.
 */

import * as THREE from 'three';
import type { DeviceInfo } from '../utils/device';

export class SceneManager {
  private scene: THREE.Scene;
  private deviceInfo: DeviceInfo;

  constructor(deviceInfo: DeviceInfo) {
    this.deviceInfo = deviceInfo;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1a);
    this.scene.fog = new THREE.Fog(0x0a0f1a, 50, 200);

    this.setupLighting();
  }

  /**
   * Sets up scene lighting.
   */
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = this.deviceInfo.performanceTier !== 'low';

    if (directionalLight.castShadow) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -20;
      directionalLight.shadow.camera.right = 20;
      directionalLight.shadow.camera.top = 20;
      directionalLight.shadow.camera.bottom = -20;
    }

    this.scene.add(directionalLight);
  }

  /**
   * Gets the scene instance.
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Adds an object to the scene.
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Removes an object from the scene.
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Updates scene (called each frame).
   */
  update(deltaTime: number): void {
    // Scene-level updates can go here
  }

  /**
   * Disposes of scene resources.
   */
  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });
  }
}

