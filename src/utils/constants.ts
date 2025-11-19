/**
 * Game constants and configuration values.
 * 
 * Purpose: Centralized constants for physics, performance, and game settings.
 * Responsibilities: Define gravity, movement speeds, performance budgets.
 * Inputs: None (static constants).
 * Outputs: Exported constants.
 * Side effects: None.
 */

// Physics constants
export const GRAVITY = -9.81;
export const PLAYER_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.3;
export const PLAYER_SPEED = 3.0;
export const PLAYER_JUMP_FORCE = 5.0;

// Performance budgets
export const MAX_TRIANGLES_PER_ROOM = 60000;
export const MAX_VISIBLE_TRIANGLES = 100000;
export const MAX_DRAW_CALLS = 200;
export const TARGET_DRAW_CALLS = 100;
export const MAX_TEXTURE_MEMORY_MB = 300;
export const INITIAL_ZONE_PAYLOAD_MB = 5;

// LOD distances (in meters)
export const LOD_DISTANCE_LOW = 50;
export const LOD_DISTANCE_MEDIUM = 25;
export const LOD_DISTANCE_HIGH = 10;

// Performance targets
export const TARGET_FPS = 30;
export const TARGET_FRAME_TIME_MS = 33;
export const ADAPTATION_INTERVAL_MS = 2000;

// Zone loading
export const INITIAL_LOAD_TIME_MS = 1500;
export const TIME_TO_INTERACTIVE_MS = 2000;

// Mobile pixel ratio clamp
export const MOBILE_MAX_PIXEL_RATIO = 1.5;
export const DESKTOP_MAX_PIXEL_RATIO = 2.0;

