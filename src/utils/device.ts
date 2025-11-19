/**
 * Device detection and capabilities.
 * 
 * Purpose: Detect device type, capabilities, and performance characteristics.
 * Responsibilities: Identify mobile vs desktop, GPU info, performance tier.
 * Inputs: None (uses browser APIs).
 * Outputs: Device information object.
 * Side effects: None (pure detection).
 */

import { MOBILE_MAX_PIXEL_RATIO, DESKTOP_MAX_PIXEL_RATIO } from './constants';

export interface DeviceInfo {
  isMobile: boolean;
  isTouch: boolean;
  pixelRatio: number;
  maxPixelRatio: number;
  performanceTier: 'low' | 'medium' | 'high';
}

/**
 * Detects if device is mobile based on user agent and screen size.
 */
function detectMobile(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUA || isSmallScreen;
}

/**
 * Detects touch capability.
 */
function detectTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Estimates performance tier based on hardware.
 */
function estimatePerformanceTier(): 'low' | 'medium' | 'high' {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;
  const isMobile = detectMobile();

  if (isMobile) {
    if (cores >= 8 && memory >= 6) return 'high';
    if (cores >= 4 && memory >= 4) return 'medium';
    return 'low';
  }

  // Desktop
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'medium';
  return 'low';
}

/**
 * Gets device information.
 */
export function getDeviceInfo(): DeviceInfo {
  const isMobile = detectMobile();
  const isTouch = detectTouch();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? MOBILE_MAX_PIXEL_RATIO : DESKTOP_MAX_PIXEL_RATIO);
  const maxPixelRatio = isMobile ? MOBILE_MAX_PIXEL_RATIO : DESKTOP_MAX_PIXEL_RATIO;
  const performanceTier = estimatePerformanceTier();

  return {
    isMobile,
    isTouch,
    pixelRatio,
    maxPixelRatio,
    performanceTier,
  };
}
