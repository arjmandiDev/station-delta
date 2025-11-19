/**
 * Math utilities and helpers.
 * 
 * Purpose: Common mathematical operations for 3D calculations.
 * Responsibilities: Vector operations, clamping, interpolation.
 * Inputs: Various numeric and vector inputs.
 * Outputs: Calculated values.
 * Side effects: None.
 */

import * as THREE from 'three';

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth step interpolation.
 */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Calculates distance between two 3D points.
 */
export function distance3D(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

/**
 * Projects a point onto a plane.
 */
export function projectOntoPlane(point: THREE.Vector3, planeNormal: THREE.Vector3, planePoint: THREE.Vector3): THREE.Vector3 {
  const d = point.clone().sub(planePoint);
  const distance = d.dot(planeNormal);
  return point.clone().sub(planeNormal.clone().multiplyScalar(distance));
}

/**
 * Checks if a point is inside a bounding box.
 */
export function isPointInBox(point: THREE.Vector3, box: THREE.Box3): boolean {
  return box.containsPoint(point);
}

