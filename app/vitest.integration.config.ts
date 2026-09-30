import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.spec.mjs'],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
