/// <reference types="vite/client" />

import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/ga-visualize/',
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['node_modules/@testing-library/jest-dom/vitest'],
    // Keep module mocks independent when suites run in the same worker.
    isolate: true,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
});
