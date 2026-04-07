import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  root: '.',
  build: {
    outDir: '.vite/renderer/main_window',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
