import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.js'],
    environment: 'node',
    passWithNoTests: true,
    // better-sqlite3 is a native addon that segfaults on worker-thread teardown
    // (exit 139). Run each test file in a forked child process instead.
    pool: 'forks',
    // Forces in-memory DB + mocks every external-API boundary (Anthropic,
    // ElevenLabs, Resend, Wikipedia). Applies to all test files; the pure-unit
    // tests are unaffected because they never call the mocked functions.
    setupFiles: ['./__tests__/setup/integration.setup.js'],
  },
});
