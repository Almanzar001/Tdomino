import { createClient } from '@insforge/sdk'

declare global {
  interface Window {
    __ENV__?: Record<string, string>
  }
}

const runtimeEnv = typeof window !== 'undefined' ? (window.__ENV__ ?? {}) : {}

const noCacheFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

export const insforge = createClient({
  baseUrl: runtimeEnv.VITE_INSFORGE_URL || import.meta.env.VITE_INSFORGE_URL,
  anonKey: runtimeEnv.VITE_INSFORGE_ANON_KEY || import.meta.env.VITE_INSFORGE_ANON_KEY,
  fetch: noCacheFetch,
})
