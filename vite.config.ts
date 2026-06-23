/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
  },
});
