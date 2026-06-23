/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    // vitest 4.x dropped environmentMatchGlobs. Each tests/ui/ file must carry
    // a `// @vitest-environment jsdom` docblock on line 1 to get a DOM.
  },
});
