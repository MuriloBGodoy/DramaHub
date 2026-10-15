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
        background_color: '#0B0B0C',
        theme_color: '#0B0B0C',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // inclui a fonte Geist (woff2) no precache para o app abrir offline com a tipografia certa
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // app shell em cache; catalogo do Supabase com rede primeiro (e cache de reserva para abrir offline)
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && /^\/rest\/v1\/(series|episode|genres)\b/.test(url.pathname),
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
  },
})
