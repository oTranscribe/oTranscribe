import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

/**
 * Enable cross-origin isolation (`crossOriginIsolated === true`) so we can use
 * SharedArrayBuffer + threaded WASM for whisper.cpp in the browser. Required for
 * Phase 3 onward. See SPEC §7.
 *
 * The same headers must also be set by the static host (see static/_headers).
 */
function crossOriginIsolation(): Plugin {
  const setHeaders = (res: { setHeader: (name: string, value: string) => void }) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  };

  return {
    name: 'cross-origin-isolation',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        setHeaders(res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        setHeaders(res);
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [crossOriginIsolation(), sveltekit()],
  // shout ships an Emscripten build that spawns its own pthread workers via
  // import.meta.url. Vite's dep pre-bundling breaks that path, so keep it raw.
  optimizeDeps: {
    exclude: ['@transcribe/shout', '@transcribe/transcriber']
  },
  worker: {
    format: 'es'
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'happy-dom'
  }
});
