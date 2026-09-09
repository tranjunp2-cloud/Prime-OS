import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  base: './',
  define: {
    'import.meta.env.VITE_PRIME_PROTOTYPE': JSON.stringify('true'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://prototype.invalid'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_primeos_prototype'),
  },
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('../../.prototype-build', import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 50_000_000,
    minify: true,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
