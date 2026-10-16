import { defineConfig } from '@playwright/test';
const port = Number(process.env.POS_TEST_PORT || 5181);
export default defineConfig({ testDir:'./tests', testMatch:'primepos-*.spec.ts', timeout:45000, use:{channel:'chrome',baseURL:`http://127.0.0.1:${port}`,viewport:{width:1440,height:1000},trace:'retain-on-failure'}, outputDir:'/private/tmp/primepos-test-results', webServer:{command:`VITE_PRIME_PROTOTYPE=true npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:true}, workers:1 });
