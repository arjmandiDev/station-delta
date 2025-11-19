import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, open: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'three-loaders': ['three/examples/jsm/loaders/GLTFLoader.js'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
});