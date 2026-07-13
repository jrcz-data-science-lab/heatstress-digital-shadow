import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    proxy: {
      '/backend': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/backend/, '')
      },
      '/nginx': {
        target: 'http://nginx:80',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/nginx/, ''),
        configure: (proxy) => {
          // add permissive CORS headers on the fly (dev only)
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Headers'] = '*';
          });
        }
      },
    }
  }
});
