import { defineConfig } from '@playwright/test';
import productDetailConfig from './playwright.product-detail.config';

export default defineConfig({ ...productDetailConfig, testMatch: 'product-list-variants.spec.ts' });
