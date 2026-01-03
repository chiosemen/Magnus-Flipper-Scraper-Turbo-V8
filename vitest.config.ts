import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    // React components require jsdom, not node
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    
    // Look for tests in flat structure and subdirectories
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'services/**/*.test.{ts,tsx}',
      'scrapers/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'services/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'types.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'setupTests.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    
    // Timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@services': path.resolve(__dirname, './services'),
      '@components': path.resolve(__dirname, './components'),
    },
  },
});