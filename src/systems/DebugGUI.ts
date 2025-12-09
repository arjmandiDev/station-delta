/**
 * Debug GUI system using lil-gui.
 * 
 * Purpose: Provides debug controls for development.
 * Responsibilities: GUI creation, control management, helper visibility.
 * Inputs: Scene, lights, helpers.
 * Outputs: GUI controls.
 * Side effects: Creates DOM elements, modifies scene objects.
 */

import GUI from 'lil-gui';
import * as THREE from 'three';

export interface DebugGUIConfig {
  showLightHelpers: boolean;
  showPlayerCylinder: boolean;
  showRayHelpers: boolean;
  showOBBHelpers: boolean;
}

export class DebugGUI {
  private gui: GUI;
  private config: DebugGUIConfig;
  private lightHelpers: Map<string, THREE.Object3D> = new Map();
  private playerCylinderHelper?: THREE.Object3D;
  private rayHelpersGroup?: THREE.Group;
  private obbHelpersGroup?: THREE.Group;
  private onConfigChange?: (config: DebugGUIConfig) => void;

  constructor() {
    this.config = {
      showLightHelpers: false,
      showPlayerCylinder: false,
      showRayHelpers: false,
      showOBBHelpers: false,
    };

    this.gui = new GUI();
    this.gui.title('Debug Controls');
    this.gui.close();

    // Add light helpers toggle
    const lightingFolder = this.gui.addFolder('Lighting');
    lightingFolder
      .add(this.config, 'showLightHelpers')
      .name('Show Light Helpers')
      .onChange((value: boolean) => {
        this.updateLightHelpersVisibility(value);
        if (this.onConfigChange) {
          this.onConfigChange(this.config);
        }
      });

    // Add player controls
    const playerFolder = this.gui.addFolder('Player');
    playerFolder
      .add(this.config, 'showPlayerCylinder')
      .name('Show Player Cylinder')
      .onChange((value: boolean) => {
        this.updatePlayerCylinderVisibility(value);
        if (this.onConfigChange) {
          this.onConfigChange(this.config);
        }
      });
    playerFolder
      .add(this.config, 'showRayHelpers')
      .name('Show Ray Helpers')
      .onChange((value: boolean) => {
        this.updateRayHelpersVisibility(value);
        if (this.onConfigChange) {
          this.onConfigChange(this.config);
        }
      });
    playerFolder
      .add(this.config, 'showOBBHelpers')
      .name('Show OBB Helpers')
      .onChange((value: boolean) => {
        this.updateOBBHelpersVisibility(value);
        if (this.onConfigChange) {
          this.onConfigChange(this.config);
        }
      });
  }

  /**
   * Registers a light helper for management.
   */
  registerLightHelper(id: string, helper: THREE.Object3D): void {
    this.lightHelpers.set(id, helper);
    // Set initial visibility based on config
    helper.visible = this.config.showLightHelpers;
  }

  /**
   * Unregisters a light helper.
   */
  unregisterLightHelper(id: string): void {
    this.lightHelpers.delete(id);
  }

  /**
   * Updates visibility of all registered light helpers.
   */
  private updateLightHelpersVisibility(visible: boolean): void {
    for (const helper of this.lightHelpers.values()) {
      helper.visible = visible;
    }
  }

  /**
   * Updates visibility of player cylinder helper.
   */
  private updatePlayerCylinderVisibility(visible: boolean): void {
    if (this.playerCylinderHelper) {
      this.playerCylinderHelper.visible = visible;
    } else {
      console.warn('[DebugGUI] Player cylinder helper not registered!');
    }
  }

  /**
   * Registers player cylinder helper.
   */
  registerPlayerCylinderHelper(helper: THREE.Object3D): void {
    this.playerCylinderHelper = helper;
    helper.visible = this.config.showPlayerCylinder;
  }

  /**
   * Registers ray helpers group.
   */
  registerRayHelpersGroup(group: THREE.Group): void {
    this.rayHelpersGroup = group;
    group.visible = this.config.showRayHelpers;
  }

  /**
   * Updates visibility of ray helpers.
   */
  private updateRayHelpersVisibility(visible: boolean): void {
    if (this.rayHelpersGroup) {
      this.rayHelpersGroup.visible = visible;
    } else {
      console.warn('[DebugGUI] Ray helpers group not registered!');
    }
  }

  /**
   * Registers OBB helpers group.
   */
  registerOBBHelpersGroup(group: THREE.Group): void {
    this.obbHelpersGroup = group;
    group.visible = this.config.showOBBHelpers;
  }

  /**
   * Updates visibility of OBB helpers.
   */
  private updateOBBHelpersVisibility(visible: boolean): void {
    if (this.obbHelpersGroup) {
      this.obbHelpersGroup.visible = visible;
    } else {
      console.warn('[DebugGUI] OBB helpers group not registered!');
    }
  }

  /**
   * Sets callback for config changes.
   */
  setOnConfigChange(callback: (config: DebugGUIConfig) => void): void {
    this.onConfigChange = callback;
  }

  /**
   * Gets current config.
   */
  getConfig(): DebugGUIConfig {
    return { ...this.config };
  }

  /**
   * Disposes of GUI resources.
   */
  dispose(): void {
    this.gui.destroy();
    this.lightHelpers.clear();
  }
}

