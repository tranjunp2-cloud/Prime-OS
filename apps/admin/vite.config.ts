import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': process.env.PRIME_ADMIN_PROXY_TARGET || 'http://127.0.0.1:8280'
    }
  }
});
