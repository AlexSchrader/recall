import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',          // we show "update ready, refresh?" — never auto-reload mid-session
      injectRegister: false,           // we register the SW ourselves (src/pwa.js)
      includeAssets: ['favicon-32.png', 'apple-touch-icon-180.png'],
      manifest: {
        name: 'Recall',
        short_name: 'Recall',
        description: 'Adaptive study app — quizzes, flashcards, mini-games and a French tutor built from your own material.',
        theme_color: '#2563EB',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//], // never serve the app shell for API routes
        // Non-GET requests (POST/PATCH/DELETE) are never matched by these rules, so
        // every mutation goes straight to the network and is never cached.
        runtimeCaching: [
          {
            // Anything touching money is never cached — always hit the network.
            urlPattern: /\/api\/billing\//,
            handler: 'NetworkOnly',
          },
          {
            // Read-only study data: serve cached instantly, refresh in the background.
            urlPattern: /\/api\/(quizzes|flashcards|chat\/threads)/,
            method: 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'recall-study-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Icons / images.
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'recall-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false }, // SWs are quirky in dev — verify in a production build/preview
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
