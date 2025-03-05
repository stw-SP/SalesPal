import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Standard Vite port to avoid conflicts
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Target the backend port
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 120000, // Increase timeout for API requests to 2 minutes
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    historyApiFallback: true, // Add history API fallback for client-side routing
  },
  build: {
    // Improve source maps for better error reporting
    sourcemap: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Specify dependencies to pre-bundle for better stability
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'react-bootstrap']
  },
  // Improve error reporting
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});