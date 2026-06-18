import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@courseware/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@courseware/shared'],
  },
  build: {
    emptyOutDir: false,
    outDir: 'dist-standalone',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'standalone-player.html'),
      },
    },
  },
});
