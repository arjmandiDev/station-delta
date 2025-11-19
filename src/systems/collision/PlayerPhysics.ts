/**
 * Player physics system with gravity and movement constraints.
 * 
 * Purpose: Manages player physics including gravity, jumping, and movement.
 * Responsibilities: Apply gravity, handle vertical velocity, constrain movement.
 * Inputs: Input state, delta time, collision system.
 * Outputs: Updated player position and velocity.
 * Side effects: Modifies player position and velocity.
 */

import * as THREE from 'three';
import { GRAVITY, PLAYER_SPEED, PLAYER_JUMP_FORCE, PLAYER_HEIGHT, PLAYER_RADIUS } from '../../utils/constants';
import { CollisionSystem, type CollisionResult } from './CollisionSystem';
import { CameraController, type CameraInput } from '../../core/CameraController';

export class PlayerPhysics {
  private velocity: THREE.Vector3;
  private isOnGround: boolean;
  private collisionSystem: typeof CollisionSystem;

  constructor() {
    this.velocity = new THREE.Vector3();
    this.isOnGround = false;
    this.collisionSystem = CollisionSystem;
  }

  /**
   * Updates player physics.
   */
  update(
    deltaTime: number,
    cameraController: CameraController,
    input: CameraInput
  ): THREE.Vector3 {
    const position = cameraController.getPosition();
    const direction = cameraController.getDirection();
    const right = cameraController.getRight();

    // Horizontal movement
    const moveVector = new THREE.Vector3();
    if (input.moveForward) moveVector.add(direction);
    if (input.moveBackward) moveVector.sub(direction);
    if (input.moveRight) moveVector.add(right);
    if (input.moveLeft) moveVector.sub(right);

    moveVector.y = 0;
    moveVector.normalize();
    moveVector.multiplyScalar(PLAYER_SPEED * deltaTime);

    // Apply horizontal movement
    const newPosition = position.clone().add(moveVector);

    // Check horizontal collision
    const horizontalCollision = this.collisionSystem.checkCapsuleCollision(newPosition);
    if (horizontalCollision.hit) {
      // Slide along wall
      if (horizontalCollision.normal) {
        const slide = moveVector.clone().reflect(horizontalCollision.normal);
        slide.y = 0;
        newPosition.copy(position).add(slide.multiplyScalar(0.5));
      } else {
        newPosition.copy(position);
      }
    }

    // Apply gravity
    this.velocity.y += GRAVITY * deltaTime;

    // Jump
    if (input.jump && this.isOnGround && cameraController.getCanJump()) {
      this.velocity.y = PLAYER_JUMP_FORCE;
      this.isOnGround = false;
      cameraController.setCanJump(false);
    }

    // Apply vertical movement
    newPosition.y += this.velocity.y * deltaTime;

    // Ground check
    const groundCheck = this.collisionSystem.findGround(
      newPosition.clone().add(new THREE.Vector3(0, PLAYER_HEIGHT / 2, 0))
    );

    if (groundCheck.hit && groundCheck.point) {
      const groundY = groundCheck.point.y + PLAYER_HEIGHT / 2;
      if (newPosition.y <= groundY) {
        newPosition.y = groundY;
        this.velocity.y = 0;
        this.isOnGround = true;
        cameraController.setCanJump(true);
      }
    } else {
      // Falling
      this.isOnGround = false;
    }

    // Final collision check
    const finalCollision = this.collisionSystem.checkCapsuleCollision(newPosition);
    if (finalCollision.hit) {
      // Push away from collision
      if (finalCollision.normal && finalCollision.point) {
        const push = newPosition.clone().sub(finalCollision.point);
        const distance = push.length();
        if (distance < PLAYER_RADIUS) {
          newPosition.add(finalCollision.normal.multiplyScalar(PLAYER_RADIUS - distance));
        }
      }
    }

    return newPosition;
  }

  /**
   * Gets current velocity.
   */
  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  /**
   * Sets velocity (for teleportation, etc.).
   */
  setVelocity(velocity: THREE.Vector3): void {
    this.velocity.copy(velocity);
  }

  /**
   * Gets ground state.
   */
  getIsOnGround(): boolean {
    return this.isOnGround;
  }

  /**
   * Teleports player to position.
   */
  teleport(position: THREE.Vector3): void {
    this.velocity.set(0, 0, 0);
    this.isOnGround = false;
  }
}
