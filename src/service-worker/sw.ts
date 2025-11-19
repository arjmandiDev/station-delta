/**
 * Service worker for asset caching.
 * 
 * Purpose: Implements caching strategies for offline support and performance.
 * Responsibilities: Cache assets, handle fetch events, manage cache lifecycle.
 * Inputs: Fetch events, install events.
 * Outputs: Cached responses.
 * Side effects: Manages browser cache storage.
 */

/// <reference lib="webworker" />

import { CacheStrategyManager } from './cacheStrategy';

const CACHE_VERSION = 'v1';
const CACHE_NAME = `bunker-explorer-${CACHE_VERSION}`;

const cacheStrategy = new CacheStrategyManager();

// Type assertion for service worker global scope
declare const self: ServiceWorkerGlobalScope;

/**
 * Installs service worker and caches initial assets.
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache critical assets
      return cache.addAll([
        '/',
        '/src/main.ts',
        // Add other critical assets
      ]);
    })
  );
  self.skipWaiting();
});

/**
 * Activates service worker and cleans old caches.
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

/**
 * Handles fetch events with caching strategy.
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  const strategy = cacheStrategy.getStrategy(url.href);

  event.respondWith(handleFetch(event.request, strategy));
});

/**
 * Handles fetch with specific strategy.
 */
async function handleFetch(request: Request, config: { strategy: string; maxAge?: number }): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  switch (config.strategy) {
    case 'cache-first':
      return cacheFirst(request, cache);
    case 'network-first':
      return networkFirst(request, cache);
    case 'network-only':
      return fetch(request);
    case 'cache-only': {
      const cached = await cache.match(request);
      return cached || new Response('Not found', { status: 404 });
    }
    default:
      return fetch(request);
  }
}

/**
 * Cache-first strategy.
 */
async function cacheFirst(request: Request, cache: Cache): Promise<Response> {
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}

/**
 * Network-first strategy.
 */
async function networkFirst(request: Request, cache: Cache): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Network error', { status: 503 });
  }
}