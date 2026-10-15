import { defineConfig } from 'vitest/config';

// 순수 로직(systems/)·씬 흐름 시험용. vite.config.ts(PWA 플러그인)와 분리해 둔다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
