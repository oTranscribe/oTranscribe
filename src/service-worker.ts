/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `otranscribe-cache-${version}`;
const DEV = import.meta.env?.DEV === true;

/**
 * Hashed build assets (JS/CSS chunks) are safe to precache — the filename changes
 * whenever the content changes, so cache-first can never serve stale JS on a new build.
 * Everything else (HTML shell, unhashed files, media, API responses) goes network-first
 * so we don't lock users into a stale bundle when we ship new code.
 */
function isHashedBuildAsset(url: URL): boolean {
  return build.includes(url.pathname);
}

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (!DEV) {
        const cache = await caches.open(CACHE_NAME);
        // Precache silently — a single asset failure shouldn't block install.
        await Promise.all([...build, ...files].map((url) => cache.add(url).catch(() => undefined)));
      }
      await sw.skipWaiting();
    })()
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await sw.clients.claim();
    })()
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;

  // In dev, get out of the way completely so Vite's HMR + fresh JS/CSS always win.
  if (DEV) return;

  if (isHashedBuildAsset(url)) {
    // Cache-first for immutable, content-hashed build outputs.
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          cache.put(request, response.clone()).catch(() => undefined);
        }
        return response;
      })
    );
    return;
  }

  // Network-first for the app shell + everything else, falling back to cache offline.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          cache.put(request, response.clone()).catch(() => undefined);
        }
        return response;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});

sw.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    void sw.skipWaiting();
  }
});
