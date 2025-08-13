export const BUILD_ID =
  (import.meta as any).env?.VITE_BUILD_ID ?? 'dev-' + new Date().toISOString();