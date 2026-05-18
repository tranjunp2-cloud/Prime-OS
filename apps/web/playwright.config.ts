import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:5177',
    viewport: { width: 1600, height: 1000 },
    colorScheme: 'dark',
  },
  webServer: {
    command: 'npm run dev:5177 -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5177/__ui-regression',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
