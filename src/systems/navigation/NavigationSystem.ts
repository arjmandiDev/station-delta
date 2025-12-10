/**
 * Navigation system for player movement and zone transitions.
 * 
 * Purpose: Handles player movement input, zone transitions, and teleportation.
 * Responsibilities: Process input, manage movement state, handle zone changes.
 * Inputs: Input events, zone triggers, teleport requests.
 * Outputs: Movement commands, zone change events.
 * Side effects: Updates player position, triggers zone loads.
 */

import * as THREE from 'three';
import { CameraController,  type CameraInput } from '../../core/CameraController';
import { PlayerPhysics } from '../collision/PlayerPhysics';

export interface ZoneTransition {
  zoneId: string;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
}

export class NavigationSystem {
  private cameraController: CameraController;
  private playerPhysics: PlayerPhysics;
  private input: CameraInput;
  private onZoneTransition?: (transition: ZoneTransition) => void;

  constructor(cameraController: CameraController, playerPhysics: PlayerPhysics) {
    this.cameraController = cameraController;
    this.playerPhysics = playerPhysics;
    this.input = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      jump: false,
      rotationX: 0,
      rotationY: 0,
    };
  }

  /**
   * Sets zone transition callback.
   */
  setZoneTransitionCallback(callback: (transition: ZoneTransition) => void): void {
    this.onZoneTransition = callback;
  }

  /**
   * Updates navigation system.
   */
  update(deltaTime: number): void {
    const newPosition = this.playerPhysics.update(deltaTime, this.cameraController, this.input);
    // Apply camera damping during normal movement and collisions.
    this.cameraController.setPosition(newPosition, true);

    // Reset rotation deltas
    this.input.rotationX = 0;
    this.input.rotationY = 0;
    this.input.jump = false;
  }

  /**
   * Sets movement input.
   */
  setMovementInput(input: Partial<CameraInput>): void {
    Object.assign(this.input, input);
  }

  /**
   * Gets current input state.
   */
  getInput(): CameraInput {
    return { ...this.input };
  }

  /**
   * Handles rotation input.
   */
  handleRotation(deltaX: number, deltaY: number, sensitivity?: number): void {
    this.cameraController.updateRotation(deltaX, deltaY, sensitivity);
  }

  /**
   * Teleports player to position.
   */
  teleport(position: THREE.Vector3, rotation?: THREE.Euler): void {
    // Snap the target position onto the ground immediately so that after a
    // zone load (especially on mobile), the player does not visually fall
    // from a high spawn Y before physics corrects their height.
    const snappedPosition = this.playerPhysics.snapToGroundFrom(position);

    // Zone teleport: snap camera directly to new position without damping so
    // transitions feel instant and avoid trailing motion across zones.
    this.cameraController.setPosition(snappedPosition, false);
    if (rotation) {
      this.cameraController.setRotation(rotation);
    }
    this.playerPhysics.teleport(snappedPosition);
  }

  /**
   * Triggers zone transition.
   */
  transitionToZone(zoneId: string, position: THREE.Vector3, rotation?: THREE.Euler): void {
    /**
     * Defer teleport until the target zone has finished loading.
     * 
     * The actual loading and teleportation are handled by the registered
     * zone transition callback (typically in `Canvas.tsx`), which will:
     *   1. Load the target zone with `ZoneManager.setCurrentZone`.
     *   2. Teleport the player once collision data is ready.
     */
    if (this.onZoneTransition) {
      this.onZoneTransition({ zoneId, position, rotation });
    }
  }

  /**
   * Gets current position.
   */
  getPosition(): THREE.Vector3 {
    return this.cameraController.getPosition();
  }

  /**
   * Gets current rotation.
   */
  getRotation(): THREE.Euler {
    return this.cameraController.getCamera().rotation;
  }
}

