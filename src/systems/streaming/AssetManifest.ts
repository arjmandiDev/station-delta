/**
 * Asset manifest types and parsing.
 * 
 * Purpose: Defines zone manifest structure and parsing logic.
 * Responsibilities: Type definitions, manifest validation, zone metadata.
 * Inputs: JSON manifest data.
 * Outputs: Parsed zone definitions.
 * Side effects: None (pure parsing).
 */

export interface LODLevel {
  level: 'low' | 'medium' | 'high';
  url: string;
  triangles?: number;
  size?: number;
}

export interface ZoneAsset {
  id: string;
  type: 'gltf' | 'texture' | 'audio' | 'other';
  lod: LODLevel[];
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  collision?: boolean; // If true, register this asset's meshes for collision detection
  isRoom?: boolean; // If true, this asset is room geometry (uses ray casting), otherwise uses OBB for objects
}

export interface ZoneLightSource {
  id: string;
  type: 'point' | 'spot' | 'directional';
  position: [number, number, number];
  color?: [number, number, number] | number | string; // RGB array (0-1), hex number, or hex string
  intensity?: number;
  distance?: number; // For point/spot lights
  angle?: number; // For spot lights (in radians)
  penumbra?: number; // For spot lights (0-1)
  decay?: number; // For point/spot lights
  target?: [number, number, number]; // For spot/directional lights
}

export interface ZoneAmbientLight {
  color?: [number, number, number] | number | string; // RGB array (0-1), hex number, or hex string
  intensity?: number;
}

export interface ZoneTrigger {
  id: string;
  type: 'door' | 'teleport' | 'zone_transition';
  position: [number, number, number];
  size: [number, number, number];
  targetZone?: string;
  targetPosition?: [number, number, number];
  targetRotation?: [number, number, number];
  event?: string; // Event name that triggers this (e.g., "door_open")
}

export interface ZoneManifest {
  id: string;
  name: string;
  version: string;
  initialPosition: [number, number, number];
  initialRotation?: [number, number, number];
  assets: ZoneAsset[];
  ambientLight?: ZoneAmbientLight; // Ambient light for the zone
  lightSources?: ZoneLightSource[]; // Light sources with position and type
  triggers: ZoneTrigger[];
  neighbors: string[]; // Zone IDs that should be preloaded
  events?: {
    [eventName: string]: {
      action: 'load_zone' | 'unload_zone' | 'teleport';
      targetZone?: string;
      position?: [number, number, number];
      rotation?: [number, number, number];
    };
  };
}

/**
 * Parses and validates a zone manifest.
 */
export function parseZoneManifest(data: unknown): ZoneManifest {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid manifest: must be an object');
  }

  const manifest = data as Partial<ZoneManifest>;

  if (!manifest.id || typeof manifest.id !== 'string') {
    throw new Error('Invalid manifest: missing or invalid id');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new Error('Invalid manifest: missing or invalid name');
  }

  if (!Array.isArray(manifest.assets)) {
    throw new Error('Invalid manifest: assets must be an array');
  }

  if (!Array.isArray(manifest.triggers)) {
    throw new Error('Invalid manifest: triggers must be an array');
  }

  return manifest as ZoneManifest;
}

