/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_PORT: string
  readonly VITE_HOST: string
  readonly VITE_HTTPS: string
  readonly VITE_OPEN: string
  readonly VITE_PREVIEW_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global variables defined by Vite
declare const __DEV__: boolean
declare const __BUILD_TIME__: string
declare const __VERSION__: string