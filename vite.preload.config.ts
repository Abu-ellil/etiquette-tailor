import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: './src/main/preload.ts',
      formats: ['cjs'],
    },
  },
});
