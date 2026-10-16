import { defineConfig } from '@playwright/test';

const port = process.env.PRODUCT_DETAIL_TEST_PORT || '5199';
export default defineConfig({
  testDir: './tests',
  testMatch: 'product-detail-layout.spec.ts',
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `npx vite --config vite.prototype.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
