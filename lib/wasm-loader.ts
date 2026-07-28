/**
 * Thin loader for the optional Rust/WASM core.
 *
 * Usage:
 *   const core = await loadWasmCore()
 *   if (core) { /* use core.computeState(...) */ } else { /* fallback */ }
 *
 * The TypeScript engine is the canonical implementation for now. The WASM
 * core exposes the same JSON shape and is loaded lazily so the initial page
 * weight doesn't change.
 */

export interface WasmCore {
  computeState: (payload: {
    model: 'ideal_gas' | 'ideal_gas_cp_t' | 'real'
    substance: string
    prop1: { name: string; value: number; unit?: string }
    prop2: { name: string; value: number; unit?: string }
  }) => Promise<{ state: any; extra?: any }>
  rankineEta: (h1: number, h2: number, h3: number, h4: number) => number
}

let cached: WasmCore | null = null
let pending: Promise<WasmCore | null> | null = null

export async function loadWasmCore(): Promise<WasmCore | null> {
  if (cached) return cached
  if (pending) return pending
  pending = (async () => {
    if (typeof window === 'undefined') return null
    try {
      // The wasm-bindgen web target ships a default init helper that fetches
      // the .wasm file and exposes the named exports.
      const mod = await import(/* @vite-ignore */ '/wasm/thermo_wasm.js' as any).catch(() => null)
      if (!mod) return null
      const init = mod.default ?? mod.init
      if (typeof init === 'function') {
        await init()
      }
      cached = {
        computeState: async (p) => {
          // The Rust wrapper takes a string-keyed payload with `prop1`/`prop2`
          // as { name, value }. We mirror that here.
          const out = (mod as any).compute_state_js(p)
          return out
        },
        rankineEta: (h1, h2, h3, h4) => (mod as any).rankine_eta_js(h1, h2, h3, h4),
      }
      return cached
    } catch (e) {
      console.warn('WASM core not available, falling back to TS engine', e)
      return null
    }
  })()
  return pending
}

export function hasWasmCore(): boolean {
  return cached !== null
}
