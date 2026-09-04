/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_CONTROL_TECH_URL?: string
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
