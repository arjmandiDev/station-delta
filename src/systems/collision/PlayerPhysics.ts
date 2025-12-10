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
import { GRAVITY, PLAYER_SPEED, PLAYER_JUMP_FORCE, PLAYER_RADIUS, PLAYER_EYE_HEIGHT } from '../../utils/constants';
import { CollisionSystem } from './CollisionSystem';
import { CameraController, type CameraInput } from '../../core/CameraController';

export class PlayerPhysics {
  private velocity: THREE.Vector3;
  private isOnGround: boolean;
  private collisionSystem: typeof CollisionSystem;
  private pushbackVelocity: THREE.Vector3; // Smooth pushback velocity for deep penetrations
  private readonly PENETRATION_THRESHOLD = 0.2; // 20% of radius
  private readonly PUSHBACK_MULTIPLIER = 2.0; // Multiplier for deep penetration pushback
  private readonly PUSHBACK_DAMPING = 0.85; // Damping factor for smooth pushback (0-1, higher = slower decay)
  /**
   * Global safety floor to prevent infinite free-fall when the player leaves
   * valid level geometry (e.g., walks off the world or collision data is missing).
   * 
   * The camera Y position will never go below this value.
   */
  private readonly MIN_FALL_Y = -10;
  /**
   * Last known safe (grounded) camera position.
   * 
   * Used to restore the player if they fall out of the world or leave valid
   * collision geometry (e.g., walking off the level).
   */
  private lastSafePosition: THREE.Vector3 | null = null;
  /**
   * Indicates that the next physics update after a teleport should snap the
   * player directly onto the ground beneath them instead of letting them
   * visually fall from the spawn height.
   */
  private needsGroundSnap: boolean = false;
  /**
   * Internal physics position for the player. This decouples physics from the
   * rendered camera position so we can apply visual smoothing (camera damping)
   * without affecting collision correctness.
   */
  private position: THREE.Vector3;

  constructor() {
    this.velocity = new THREE.Vector3();
    this.pushbackVelocity = new THREE.Vector3();
    this.isOnGround = false;
    this.collisionSystem = CollisionSystem;
    this.position = new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0);
  }

  /**
   * Immediately snaps an arbitrary camera position down to the nearest valid
   * ground below it (if any) and updates internal grounded state.
   * 
   * This is used by `NavigationSystem.teleport` so that after a zone load,
   * especially on mobile devices where the first physics frame may be long,
   * the player appears directly on the floor instead of visually falling
   * from a high spawn position.
   */
  snapToGroundFrom(position: THREE.Vector3): THREE.Vector3 {
    const snapped = position.clone();

    const groundCheck = this.collisionSystem.findGround(snapped, 100);
    if (groundCheck.hit && groundCheck.point) {
      const targetCameraY = groundCheck.point.y + PLAYER_EYE_HEIGHT;
      snapped.y = targetCameraY;

      // Update internal physics state to match the snapped, grounded position.
      this.velocity.set(0, 0, 0);
      this.pushbackVelocity.set(0, 0, 0);
      this.isOnGround = true;
      this.needsGroundSnap = false;
      this.lastSafePosition = snapped.clone();
      // Keep internal physics position in sync with snapped camera position.
      this.position.copy(snapped);
    } else {
      // No ground found directly underneath this spawn; keep position but mark
      // that we still need to snap once ground becomes available.
      this.needsGroundSnap = true;
    }

    return snapped;
  }

  /**
   * Hybrid collision detection and sliding response.
   * First checks OBB collisions with objects, then ray cast collisions with room.
   * Based on obb.js handleMovement pattern (lines 490-581).
   */
  private slideCollision(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTimeSeconds: number,
    maxRecursion: number = 3
  ): THREE.Vector3 {
    // Base case: if velocity is too small or max recursion reached, return position
    if (velocity.lengthSq() < 0.0001 || maxRecursion <= 0) {
      return position;
    }

    // Calculate destination point
    const destination = position.clone().add(velocity);
    
    // Create player OBB at destination
    const playerOBB = this.collisionSystem.createPlayerOBB(destination);
    
    // Step 1: Check OBB collisions with objects first
    const objectCollision = this.collisionSystem.checkObjectCollisions(playerOBB);
    
    let finalPosition = destination;
    
    if (objectCollision) {
      // Object collision detected - resolve penetration with a frame-rate aware push-out.
      const pushOutVector = this.collisionSystem.resolvePenetration(
        playerOBB,
        objectCollision.obb,
        deltaTimeSeconds,
      );
      const resolvedPosition = destination.clone().add(pushOutVector);

      // Calculate collision normal from the resolved position (from object to player).
      const collisionNormal = this.collisionSystem.calculateCollisionNormal(
        resolvedPosition,
        objectCollision.mesh.position
      );

      // Prevent climbing up objects: ignore vertical component for object sliding.
      collisionNormal.y = 0;
      if (collisionNormal.lengthSq() === 0) {
        collisionNormal.set(0, 1, 0);
      }

      // Project original movement vector onto the tangent plane for sliding.
      let slideVector = this.collisionSystem.projectOntoTangentPlane(velocity, collisionNormal);

      // Force slide to stay horizontal to avoid stepping up on vertical surfaces.
      slideVector.y = 0;

      // If slide is almost zero, stay at the resolved position this frame.
      if (slideVector.lengthSq() <= 0.000001) {
        finalPosition = resolvedPosition;
      } else {
        const beforeSlidePosition = resolvedPosition.clone();

        // Limit slide length to at most the original movement length,
        // and additionally slow movement when colliding with objects.
        const COLLISION_SPEED_FACTOR = 0.4; // 40% of normal speed when sliding along objects
        const baseDistance = velocity.length();
        const maxSlideDistance = baseDistance * COLLISION_SPEED_FACTOR;

        const slideLength = Math.min(slideVector.length(), maxSlideDistance);
        const limitedSlideVector = slideVector.clone().normalize().multiplyScalar(slideLength);

        // Try full slide first.
        const slidePosition = beforeSlidePosition.clone().add(limitedSlideVector);
        const slideOBB = this.collisionSystem.createPlayerOBB(slidePosition);
        const slideCollision = this.collisionSystem.checkObjectCollisions(slideOBB);

        if (slideCollision) {
          // Sliding causes collision, try progressively smaller slide distances.
          const slideAttempts = [0.75, 0.5, 0.25, 0.1];
          let slideApplied = false;

          for (const slideFactor of slideAttempts) {
            const reducedSlide = limitedSlideVector.clone().multiplyScalar(slideFactor);
            const reducedPosition = beforeSlidePosition.clone().add(reducedSlide);
            const reducedOBB = this.collisionSystem.createPlayerOBB(reducedPosition);

            const reducedCollision = this.collisionSystem.checkObjectCollisions(reducedOBB);
            if (!reducedCollision) {
              // This slide distance works, keep it.
              finalPosition = reducedPosition;
              slideApplied = true;
              break;
            }
          }

          // If no slide distance worked, stay at resolved position.
          if (!slideApplied) {
            finalPosition = beforeSlidePosition;
          }
        } else {
          // No collision on full slide, accept it.
          finalPosition = slidePosition;
        }
      }
    }
    
    // Step 2: Check ray cast collisions with room at final position (existing behavior)
    const roomCollision = this.collisionSystem.checkCapsuleCollision(finalPosition);
    
    if (!roomCollision.hit || !roomCollision.point || !roomCollision.normal) {
      // No room collision, move to final position
      return finalPosition;
    }

    // Room collision detected - implement sliding (existing algorithm)
    const collisionPoint = roomCollision.point;
    const collisionNormal = roomCollision.normal;
    
    // Move to collision point + radius along normal (just touching the surface)
    const newPosition = collisionPoint.clone().add(
      collisionNormal.clone().multiplyScalar(PLAYER_RADIUS + 0.001)
    );
    
    // Calculate sliding plane normal
    const sphereCenter = newPosition.clone();
    const slidingPlaneNormal = collisionPoint.clone().sub(sphereCenter).normalize();
    
    // Project destination point onto sliding plane
    const planeOrigin = collisionPoint;
    const toFinalPosition = finalPosition.clone().sub(planeOrigin);
    const distanceToPlane = toFinalPosition.dot(slidingPlaneNormal);
    
    // Project destination onto sliding plane
    const projectedDestination = finalPosition.clone().sub(
      slidingPlaneNormal.clone().multiplyScalar(distanceToPlane)
    );
    
    // Create new velocity vector (from collision point to projected destination)
    const newVelocity = projectedDestination.clone().sub(collisionPoint);
    
    // Recurse with new position and new velocity
    return this.slideCollision(newPosition, newVelocity, deltaTimeSeconds, maxRecursion - 1);
  }

  /**
   * Updates player physics.
   */
  update(
    deltaTime: number,
    cameraController: CameraController,
    input: CameraInput
  ): THREE.Vector3 {
    // Use internal physics position as the source of truth instead of the
    // rendered camera position (which may be smoothed).
    const position = this.position.clone();
    const direction = cameraController.getDirection();
    const right = cameraController.getRight();

    // Horizontal movement
    const moveVector = new THREE.Vector3();
    if (input.moveForward) moveVector.add(direction);
    if (input.moveBackward) moveVector.sub(direction);
    if (input.moveRight) moveVector.add(right);
    if (input.moveLeft) moveVector.sub(right);

    moveVector.y = 0;

    // Start from current position and advance in small horizontal steps so that
    // OBB collisions remain stable even when deltaTime is large (low FPS).
    let newPosition = position.clone();

    // Only normalize and apply speed if there's actual movement
    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.multiplyScalar(PLAYER_SPEED * deltaTime);

      // Maximum distance per sub-step (tuned using player radius so we don't
      // "jump" over thin OBB objects in a single step).
      const maxStepDistance = PLAYER_RADIUS * 0.5;
      const totalDistance = moveVector.length();
      let remainingDistance = totalDistance;

      while (remainingDistance > 0.0001) {
        const stepDistance = Math.min(maxStepDistance, remainingDistance);
        const stepVelocity = moveVector.clone().setLength(stepDistance);

        // Split deltaTime proportionally across sub-steps so pushback logic
        // remains frame-rate aware.
        const stepFraction = stepDistance / totalDistance;
        const stepDeltaTime = deltaTime * stepFraction;

        // Use recursive sliding collision response for this small step.
        newPosition = this.slideCollision(newPosition, stepVelocity, stepDeltaTime);

        remainingDistance -= stepDistance;
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
      newPosition,
      this.needsGroundSnap ? 100 : 10
    );
    
    if (groundCheck.hit && groundCheck.point) {
      const targetCameraY = groundCheck.point.y + PLAYER_EYE_HEIGHT;
      
      if (this.needsGroundSnap) {
        // After a teleport/spawn, snap directly onto the ground so the player
        // does not visually fall from a high spawn position.
        newPosition.y = targetCameraY;
        this.velocity.y = 0;
        this.isOnGround = true;
        cameraController.setCanJump(true);
        this.needsGroundSnap = false;
        this.lastSafePosition = newPosition.clone();
      } else if (newPosition.y <= targetCameraY) {
        // Normal landing from a jump or small fall.
        newPosition.y = targetCameraY;
        this.velocity.y = 0;
        this.isOnGround = true;
        cameraController.setCanJump(true);
        this.lastSafePosition = newPosition.clone();
      } else {
        // Above ground (jumping or falling).
        this.isOnGround = false;
      }
    } else {
      this.isOnGround = false;
    }

    // Final collision check with smooth pushback for deep penetrations (room only)
    const finalCollision = this.collisionSystem.checkCapsuleCollision(newPosition);
    if (finalCollision.hit) {
      if (finalCollision.normal && finalCollision.point) {
        const push = newPosition.clone().sub(finalCollision.point);
        const distance = push.length();
        
        if (distance < PLAYER_RADIUS) {
          // Base pushback distance
          const basePushDistance = PLAYER_RADIUS - distance;
          const threshold = PLAYER_RADIUS * this.PENETRATION_THRESHOLD;
          
          // If penetration is deeper than threshold, apply stronger pushback
          if (basePushDistance > threshold) {
            // Calculate pushback velocity based on penetration depth
            const pushbackStrength = (basePushDistance / threshold) * this.PUSHBACK_MULTIPLIER;
            const pushbackDistance = basePushDistance * pushbackStrength;
            
            // Add to pushback velocity (will be applied smoothly over multiple frames)
            const pushbackDirection = finalCollision.normal.clone();
            const pushbackSpeed = pushbackDistance / deltaTime; // Convert distance to velocity
            this.pushbackVelocity.add(pushbackDirection.multiplyScalar(pushbackSpeed));
          } else {
            // Normal pushback for shallow penetrations
            newPosition.add(finalCollision.normal.clone().multiplyScalar(basePushDistance));
          }
        }
      }
    }
    
    // Apply smooth pushback velocity
    if (this.pushbackVelocity.lengthSq() > 0.0001) {
      const pushbackMovement = this.pushbackVelocity.clone().multiplyScalar(deltaTime);
      newPosition.add(pushbackMovement);
      
      // Dampen pushback velocity for smooth decay
      this.pushbackVelocity.multiplyScalar(this.PUSHBACK_DAMPING);
      
      // Stop if velocity is too small
      if (this.pushbackVelocity.lengthSq() < 0.0001) {
        this.pushbackVelocity.set(0, 0, 0);
      }
    }

    // Safety: if the player has fallen below the world, restore the last
    // grounded position (if available) or clamp to the global fall floor.
    if (newPosition.y < this.MIN_FALL_Y) {
      if (this.lastSafePosition) {
        newPosition.copy(this.lastSafePosition);
      } else {
        newPosition.y = this.MIN_FALL_Y;
      }
      this.velocity.set(0, 0, 0);
      this.pushbackVelocity.set(0, 0, 0);
      this.isOnGround = false;
      cameraController.setCanJump(false);
    }

    // Persist internal physics position for the next update.
    this.position.copy(newPosition);

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
  teleport(_position: THREE.Vector3): void {
    this.velocity.set(0, 0, 0);
    this.pushbackVelocity.set(0, 0, 0); // Reset pushback when teleporting
    this.isOnGround = false;
    // Teleport resets internal physics position; external systems (navigation)
    // handle updating the rendered camera position.
    this.position.copy(_position);
  }
}