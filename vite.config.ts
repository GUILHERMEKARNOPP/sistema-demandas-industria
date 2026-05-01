import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OptimaManutenção',
        short_name: 'Optima',
        description: 'SaaS Enterprise de Gestão de Manutenção',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/10435/10435165.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/10435/10435165.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/sistema-demandas-industria/',
})
