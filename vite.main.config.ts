import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/main/index.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['better-sqlite3'],
    },
  },
  resolve: {
    alias: {
      'better-sqlite3': 'better-sqlite3',
    },
  },
});
