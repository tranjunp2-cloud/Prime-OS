/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_PRIME_ADMIN_API_BASE?: string;
  readonly VITE_PRIME_STAGING_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
