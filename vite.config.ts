import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://i9place1.uazapi.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        xfwd: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Erro no proxy:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            
            proxyReq.setHeader('Host', 'i9place1.uazapi.com');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
            
            const token = req.headers.token || req.headers.admintoken;
            if (token) {
              proxyReq.setHeader('token', token);
            }
            
            console.log('Enviando requisição:', {
              method: req.method,
              url: req.url,
              headers: proxyReq.getHeaders()
            });
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Resposta recebida:', {
              statusCode: proxyRes.statusCode,
              url: req.url,
              headers: proxyRes.headers
            });
          });
        },
      },
      '/instance/sse': {
        target: 'https://i9place1.uazapi.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        xfwd: true
      }
    }
  }
});
