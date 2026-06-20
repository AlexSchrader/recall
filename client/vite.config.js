import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Strip any <meta http-equiv="Content-Security-Policy"> that VitePWA injects.
// Our Express server sets CSP via HTTP header; a meta tag would add a second
// policy and browsers apply both — the more restrictive one wins per-directive.
const stripCspMeta = {
  name: 'strip-csp-meta',
  transformIndexHtml(html) {
    return html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*\/?>/gi, '');
  },
};

export default defineConfig({
  plugins: [
    react(),
    stripCspMeta,
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Recall',
        short_name: 'Recall',
        description: 'Adaptive spaced-repetition study tool',
        theme_color: '#2563EB',
        background_color: '#2563EB',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
