/**
 * UI ↔ Game bridge for the bunker experience.
 *
 * Purpose: Provide a clean, framework-agnostic API that React overlays
 * can call to control the Three.js FPS runtime (pause, rooms, settings).
 *
 * All functions here are safe to call from React components. The actual
 * implementations are registered by the Three.js bootstrap code in `Canvas.tsx`.
 */

export type BunkerDestination = 'main' | 'projects' | 'contact';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface BunkerSettings {
  graphics: {
    quality: GraphicsQuality;
    resolutionScale: number; // 50–100 (%)
  };
  audio: {
    masterVolume: number; // 0–1
    sfxVolume: number; // 0–1
    musicVolume: number; // 0–1
    muted: boolean;
  };
  controls: {
    mouseSensitivity: number; // multiplier for look speed
    invertY: boolean;
  };
  ui: {
    showUI: boolean;
  };
}

export interface GameAPI {
  /**
   * Pause/unpause simulation (movement, physics, triggers).
   */
  setPaused(paused: boolean): void;

  /**
   * Teleport player to a high-level portfolio destination.
   */
  rooms(dest: BunkerDestination): void;

  /**
   * Apply graphics/audio/control/UI settings to the live game.
   */
  applySettings(settings: BunkerSettings): void;
}

let currentAPI: GameAPI | null = null;

/**
 * Called by the Three.js bootstrap (inside `Canvas.tsx`) once systems are ready.
 */
export function registerGameAPI(api: GameAPI) {
  currentAPI = api;

  // Apply the last saved settings immediately so that graphics quality,
  // LOD level, and control preferences are active on first load, without
  // requiring the player to open the settings menu.
  try {
    const initialSettings = loadSettings();
    api.applySettings(initialSettings);
  } catch {
    // If anything goes wrong, fail silently and let the React layer
    // re-apply settings on the next state effect.
  }
}

/**
 * Pauses or resumes the game. Safe to call from any React overlay.
 */
export function setGamePaused(paused: boolean) {
  if (!currentAPI) return;
  currentAPI.setPaused(paused);
}

/**
 * High-level rooms entry point used by title and pause menu.
 */
export function roomsTo(dest: BunkerDestination) {
  if (!currentAPI) return;
  currentAPI.rooms(dest);
}

/**
 * Applies settings to the running game (renderer, audio, controls, UI).
 */
export function applyGameSettings(settings: BunkerSettings) {
  if (!currentAPI) return;
  currentAPI.applySettings(settings);
}

// ───────────────────────────────────────────────────────────────────────────────
// Settings persistence helpers
// ───────────────────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'bunker.settings.v1';
const TITLE_SEEN_KEY = 'bunker.title.seen';

export const defaultSettings: BunkerSettings = {
  graphics: {
    quality: 'medium',
    resolutionScale: 100,
  },
  audio: {
    masterVolume: 1,
    sfxVolume: 0.9,
    musicVolume: 0.6,
    muted: false,
  },
  controls: {
    mouseSensitivity: 1,
    invertY: false,
  },
  ui: {
    showUI: true,
  },
};

/**
 * Normalizes a raw graphics quality value (from storage) into a supported preset.
 * Any unknown value (including legacy "ultra") is mapped to "medium".
 */
function normalizeGraphicsQuality(value: unknown): GraphicsQuality {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return 'medium';
}

export function loadSettings(): BunkerSettings {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as any;
    const merged: BunkerSettings = {
      ...defaultSettings,
      ...parsed,
      graphics: { ...defaultSettings.graphics, ...(parsed.graphics || {}) },
      audio: { ...defaultSettings.audio, ...(parsed.audio || {}) },
      controls: { ...defaultSettings.controls, ...(parsed.controls || {}) },
      ui: { ...defaultSettings.ui, ...(parsed.ui || {}) },
    };
    // Ensure graphics quality is always one of the supported presets.
    merged.graphics.quality = normalizeGraphicsQuality(parsed?.graphics?.quality);
    return merged;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: BunkerSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (e.g., private browsing).
  }
}

export function shouldSkipTitleScreen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TITLE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSkipTitleScreen(skip: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (skip) {
      window.localStorage.setItem(TITLE_SEEN_KEY, '1');
    } else {
      window.localStorage.removeItem(TITLE_SEEN_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}


