import { defineConfig } from '@playwright/test';
import productDetailConfig from './playwright.product-detail.config';

export default defineConfig({ ...productDetailConfig, testMatch: 'variant-stock-setup.spec.ts' });
