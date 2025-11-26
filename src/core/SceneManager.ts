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
import type { ZoneManifest, ZoneLightSource, ZoneAmbientLight } from '../systems/streaming/AssetManifest';

export class SceneManager {
  private scene: THREE.Scene;
  private deviceInfo: DeviceInfo;
  private rectAreaLightUniformsInitialized: boolean = false;
  private defaultAmbientLight!: THREE.AmbientLight;
  private defaultDirectionalLight!: THREE.DirectionalLight;
  private zoneAmbientLight: THREE.AmbientLight | null = null;
  private zoneLightSources: Map<string, THREE.Light> = new Map();
  private lightHelpers: Map<string, THREE.Object3D> = new Map();

  constructor(deviceInfo: DeviceInfo) {
    this.deviceInfo = deviceInfo;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1a);
    this.scene.fog = new THREE.Fog(0x0a0f1a, 50, 200);

    this.setupLighting();
    this.initRectAreaLightSupport();
  }

  /**
   * Initializes RectAreaLightUniformsLib for area light support.
   * This must be called before loading any GLTF files with area lights.
   */
  private async initRectAreaLightSupport(): Promise<void> {
    if (this.rectAreaLightUniformsInitialized) return;

    try {
      const { RectAreaLightUniformsLib } = await import('three/examples/jsm/lights/RectAreaLightUniformsLib.js');
      RectAreaLightUniformsLib.init();
      this.rectAreaLightUniformsInitialized = true;
      console.log('RectAreaLightUniformsLib initialized');
    } catch (error) {
      console.warn('Failed to initialize RectAreaLightUniformsLib:', error);
    }
  }

  /**
   * Ensures RectAreaLightUniformsLib is initialized (public method for ZoneManager).
   */
  async ensureRectAreaLightSupport(): Promise<void> {
    await this.initRectAreaLightSupport();
  }

  /**
   * Sets up default scene lighting.
   */
  private setupLighting(): void {
    // Default ambient light
    this.defaultAmbientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.defaultAmbientLight);

    // Default directional light (sun)
    this.defaultDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.defaultDirectionalLight.position.set(10, 10, 5);
    this.defaultDirectionalLight.castShadow = this.deviceInfo.performanceTier !== 'low';

    if (this.defaultDirectionalLight.castShadow) {
      this.defaultDirectionalLight.shadow.mapSize.width = 2048;
      this.defaultDirectionalLight.shadow.mapSize.height = 2048;
      this.defaultDirectionalLight.shadow.camera.near = 0.5;
      this.defaultDirectionalLight.shadow.camera.far = 50;
      this.defaultDirectionalLight.shadow.camera.left = -20;
      this.defaultDirectionalLight.shadow.camera.right = 20;
      this.defaultDirectionalLight.shadow.camera.top = 20;
      this.defaultDirectionalLight.shadow.camera.bottom = -20;
    }

    //this.scene.add(this.defaultDirectionalLight);
  }

  /**
   * Sets up zone-specific lighting from manifest.
   */
  setupZoneLighting(manifest: ZoneManifest): void {
    // Cleanup previous zone lighting
    this.cleanupZoneLighting(manifest.id);

    // Disable default directional light when zone lighting is active
    this.defaultDirectionalLight.visible = false;

    // Setup ambient light
    if (manifest.ambientLight) {
      this.setupAmbientLight(manifest.ambientLight);
    }

    // Setup light sources
    if (manifest.lightSources && manifest.lightSources.length > 0) {
      for (const lightSource of manifest.lightSources) {
        this.createLightSource(lightSource, manifest.id);
      }
    }
  }

  /**
   * Sets up ambient light for zone.
   */
  private setupAmbientLight(ambientDef: ZoneAmbientLight): void {
    // Remove previous zone ambient light
    if (this.zoneAmbientLight) {
      this.scene.remove(this.zoneAmbientLight);
    }

    // Parse color
    let color: THREE.Color;
    if (ambientDef.color) {
      if (Array.isArray(ambientDef.color)) {
        color = new THREE.Color(ambientDef.color[0], ambientDef.color[1], ambientDef.color[2]);
      } else if (typeof ambientDef.color === 'number') {
        color = new THREE.Color(ambientDef.color);
      } else if (typeof ambientDef.color === 'string') {
        color = new THREE.Color(ambientDef.color);
      } else {
        color = new THREE.Color(0x404040);
      }
    } else {
      color = new THREE.Color(0x404040);
    }

    const intensity = ambientDef.intensity ?? 0.3;

    // Disable default ambient light
    this.defaultAmbientLight.visible = false;

    // Create zone ambient light
    this.zoneAmbientLight = new THREE.AmbientLight(color, intensity);
    this.scene.add(this.zoneAmbientLight);
  }

  /**
   * Creates a light source from definition.
   */
  private createLightSource(lightDef: ZoneLightSource, zoneId: string): void {
    // Parse color
    let color: THREE.Color;
    if (lightDef.color) {
      if (Array.isArray(lightDef.color)) {
        color = new THREE.Color(lightDef.color[0], lightDef.color[1], lightDef.color[2]);
      } else if (typeof lightDef.color === 'number') {
        color = new THREE.Color(lightDef.color);
      } else if (typeof lightDef.color === 'string') {
        color = new THREE.Color(lightDef.color);
      } else {
        color = new THREE.Color(0xffffff);
      }
    } else {
      color = new THREE.Color(0xffffff);
    }

    const intensity = lightDef.intensity ?? 1.0;
    const position = new THREE.Vector3(...lightDef.position);

    let light: THREE.Light;

    switch (lightDef.type) {
      case 'point':
        light = new THREE.PointLight(color, intensity, lightDef.distance, lightDef.decay);
        light.position.copy(position);
        break;

      case 'spot':
        const spotLight = new THREE.SpotLight(
          color,
          intensity,
          lightDef.distance,
          lightDef.angle ?? Math.PI / 3,
          lightDef.penumbra ?? 0,
          lightDef.decay ?? 2
        );
        spotLight.position.copy(position);
        if (lightDef.target) {
          spotLight.target.position.set(...lightDef.target);
          this.scene.add(spotLight.target);
        }
        light = spotLight;
        break;

      case 'directional':
        const dirLight = new THREE.DirectionalLight(color, intensity);
        dirLight.position.copy(position);
        if (lightDef.target) {
          dirLight.target.position.set(...lightDef.target);
          this.scene.add(dirLight.target);
        }
        light = dirLight;
        break;

      default:
        console.warn(`Unknown light type: ${lightDef.type}`);
        return;
    }

    light.name = `${zoneId}_${lightDef.id}`;
    this.scene.add(light);
    this.zoneLightSources.set(`${zoneId}_${lightDef.id}`, light);

    // Create helper for the light
    this.createLightHelper(light, `${zoneId}_${lightDef.id}`);
  }

  /**
   * Creates a helper for a light for debugging purposes.
   */
  private createLightHelper(light: THREE.Light, lightId: string): void {
    try {
      let helper: THREE.Object3D | null = null;

      if (light instanceof THREE.PointLight) {
        helper = new THREE.PointLightHelper(light, 0.5);
      } else if (light instanceof THREE.SpotLight) {
        helper = new THREE.SpotLightHelper(light);
      } else if (light instanceof THREE.DirectionalLight) {
        helper = new THREE.DirectionalLightHelper(light, 1);
      }

      if (helper) {
        helper.visible = false; // Hidden by default
        this.scene.add(helper);
        this.lightHelpers.set(lightId, helper);
      }
    } catch (error) {
      console.warn(`Failed to create helper for light ${light.type}:`, error);
    }
  }

  /**
   * Gets all light helpers.
   */
  getLightHelpers(): Map<string, THREE.Object3D> {
    return this.lightHelpers;
  }

  /**
   * Sets visibility of all light helpers.
   */
  setLightHelpersVisible(visible: boolean): void {
    for (const helper of this.lightHelpers.values()) {
      helper.visible = visible;
    }
  }

  /**
   * Cleans up zone-specific lighting.
   */
  cleanupZoneLighting(zoneId: string): void {
    // Remove zone ambient light
    if (this.zoneAmbientLight) {
      this.scene.remove(this.zoneAmbientLight);
      this.zoneAmbientLight = null;
      // Re-enable default ambient light
      this.defaultAmbientLight.visible = true;
    }

    // Re-enable default directional light
    this.defaultDirectionalLight.visible = true;

    // Remove zone light sources
    const lightsToRemove: THREE.Light[] = [];
    for (const [key, light] of this.zoneLightSources.entries()) {
      if (key.startsWith(`${zoneId}_`)) {
        lightsToRemove.push(light);
        this.zoneLightSources.delete(key);
      }
    }

    for (const light of lightsToRemove) {
      // Remove light target if it's a spot or directional light
      if (light instanceof THREE.SpotLight || light instanceof THREE.DirectionalLight) {
        if (light.target.parent !== null) {
          this.scene.remove(light.target);
        }
      }
      this.scene.remove(light);
      if (light.dispose) {
        light.dispose();
      }
    }

    // Remove light helpers for this zone
    const helpersToRemove: THREE.Object3D[] = [];
    for (const [key, helper] of this.lightHelpers.entries()) {
      if (key.startsWith(`${zoneId}_`)) {
        helpersToRemove.push(helper);
        this.lightHelpers.delete(key);
      }
    }

    for (const helper of helpersToRemove) {
      if (helper.parent !== null) {
        this.scene.remove(helper);
      }
      if ((helper as any).dispose) {
        (helper as any).dispose();
      }
    }
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