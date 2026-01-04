import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './vitest.config.ts',
  './api/vitest.config.ts',
  './workers/vitest.config.ts',
  './apps/web/vitest.config.ts',
]);
