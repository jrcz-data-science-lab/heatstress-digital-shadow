import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  plugins: [react()],
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
