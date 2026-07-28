// Thin loader for the optional Rust/WASM core.
//
// Usage:
//   const core = await loadWasmCore();
//   if (core) { core.computeState(...) } else { /* fall back to lib/thermo-engine */ }
//
// The TypeScript engine is the canonical implementation. The WASM module is
// loaded lazily so the initial page weight stays low until we have a build
// pipeline ready.

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
      // @ts-ignore — wasm module path is resolved at runtime
      const mod: any = await import(/* webpackIgnore: true */ '/wasm/thermo_wasm.js').catch(() => null)
      if (!mod) return null
      const init = mod.default ?? mod.init
      if (typeof init === 'function') {
        await init()
      }
      cached = {
        computeState: async (p) => mod.compute_state_js(p),
        rankineEta: (h1, h2, h3, h4) => mod.rankine_eta_js(h1, h2, h3, h4),
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
