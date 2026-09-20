import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'DramaHub',
        short_name: 'DramaHub',
        description: 'Short dramas completos, dublados, sem paywall.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0b10',
        theme_color: '#0b0b10',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell em cache; API com rede primeiro (e cache de reserva para abrir offline)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/h2/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/series') || url.pathname.startsWith('/api/genres') || url.pathname === '/api/feed',
            handler: 'NetworkFirst',
            options: { cacheName: 'api-catalog', networkTimeoutSeconds: 5, expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'i.ytimg.com' || url.hostname.endsWith('dmcdn.net') || url.hostname === 'archive.org',
            handler: 'CacheFirst',
            options: { cacheName: 'thumbs', expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // permite abrir no celular pela rede local
    port: 5173,
    proxy: {
      // em dev, /api vai para o backend Spring Boot
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // build final vai direto para o backend servir (java -jar); no Netlify use VITE_OUT_DIR=dist
    outDir: process.env.VITE_OUT_DIR || '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
})
