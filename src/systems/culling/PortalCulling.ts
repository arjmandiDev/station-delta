/**
 * Portal-based culling for zone visibility.
 * 
 * Purpose: Cull zones and objects based on portal visibility.
 * Responsibilities: Check portal visibility, determine visible zones.
 * Inputs: Camera position, portal definitions, zone boundaries.
 * Outputs: Visibility flags for zones.
 * Side effects: None (pure culling logic).
 */

import * as THREE from 'three';

export interface Portal {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
  sourceZone: string;
  targetZone: string;
}

export class PortalCulling {
  private portals: Map<string, Portal> = new Map();

  /**
   * Registers a portal.
   */
  registerPortal(portal: Portal): void {
    this.portals.set(portal.id, portal);
  }

  /**
   * Unregisters a portal.
   */
  unregisterPortal(portalId: string): void {
    this.portals.delete(portalId);
  }

  /**
   * Checks if a portal is visible from camera.
   */
  isPortalVisible(portal: Portal, camera: THREE.Camera): boolean {
    const cameraPosition = camera.position.clone();
    const portalPosition = portal.position.clone();
    const direction = portalPosition.sub(cameraPosition).normalize();

    // Check if camera is looking towards portal
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const dot = cameraDirection.dot(direction);
    if (dot < 0) {
      return false; // Portal is behind camera
    }

    // Check distance
    const distance = cameraPosition.distanceTo(portal.position);
    if (distance > 100) {
      return false; // Too far
    }

    // Frustum cull
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
    );

    const portalBox = new THREE.Box3().setFromCenterAndSize(
      portal.position,
      new THREE.Vector3(portal.size, portal.size, portal.size)
    );

    return frustum.intersectsBox(portalBox);
  }

  /**
   * Gets visible zones based on portal visibility.
   */
  getVisibleZones(camera: THREE.Camera, currentZoneId: string): Set<string> {
    const visibleZones = new Set<string>([currentZoneId]);

    for (const portal of this.portals.values()) {
      if (portal.sourceZone === currentZoneId && this.isPortalVisible(portal, camera)) {
        visibleZones.add(portal.targetZone);
      } else if (portal.targetZone === currentZoneId && this.isPortalVisible(portal, camera)) {
        visibleZones.add(portal.sourceZone);
      }
    }

    return visibleZones;
  }

  /**
   * Clears all portals.
   */
  clear(): void {
    this.portals.clear();
  }
}

