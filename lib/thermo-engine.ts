/**
 * Thermodynamic State Calculation Engine
 * - Loads substance data from public/substance-data.json
 * - Supports: Ideal gases (simple), simplified water model
 */

import substanceData from '../public/substance-data.json'

export interface ThermodynamicState {
  P?: number // Pressione (Pa)
  T?: number // Temperatura (K)
  v?: number // Volume specifico (m³/kg)
  h?: number // Entalpia specifica (J/kg)
  u?: number // Energia interna specifica (J/kg)
  s?: number // Entropia specifica (J/kg·K)
  x?: number // Titolo di vapore (0-1, solo bifase)
  phase?: string // gas, liquid, two-phase
}

export interface IdealGasProperties {
  R: number // Costante specifica (J/kg·K)
  cp: number // Calore specifico a pressione costante (J/kg·K)
  cv: number // Calore specifico a volume costante (J/kg·K)
  gamma: number // Rapporto cp/cv
}

const TREF = 298.15 // K - Riferimento per gas ideali
const PREF = 101325.0 // Pa

// Build ideal gas table from JSON (if available)
const idealGasData: Record<string, IdealGasProperties> = {}
;(substanceData as any).ideal_gas?.forEach((g: any) => {
  const key = g.key
  // Expect R (J/kg·K), cp and cv if present (J/kg·K)
  const R = g.R
  const cp = g.cp || (g.gamma && g.cv ? g.gamma * g.cv : undefined)
  const cv = g.cv || (cp && g.gamma ? cp / g.gamma : undefined)
  const gamma = g.gamma || (cp && cv ? cp / cv : undefined)
  if (R && cp && cv && gamma) {
    idealGasData[key] = { R, cp, cv, gamma }
  }
})

// Simplified water properties (use available JSON real data as metadata)
const waterMeta = (substanceData as any).real?.find((r: any) => r.key === 'Water') || {}

// Very small simplified saturation table (fallback)
const waterSaturation: Record<number, Record<string, number>> = {
  0.000611: { Tsat: 273.16, vf: 0.001, vg: 206.0, hf: 0.0, hg: 2500.0, sf: 0.0, sg: 7.5 },
  0.01: { Tsat: 318.6, vf: 0.001, vg: 14.67, hf: 419, hg: 2676, sf: 1.3, sg: 7.31 },
  0.1: { Tsat: 373.95, vf: 0.00104, vg: 1.673, hf: 417, hg: 2675, sf: 1.307, sg: 7.31 },
  1.0: { Tsat: 453.0, vf: 0.001, vg: 0.194, hf: 1447, hg: 2792, sf: 3.78, sg: 6.59 },
}

function ensureProps(obj: Record<string, any>, keys: string[]) {
  for (const k of keys) if (obj[k] === undefined) return false
  return true
}

/**
 * Calculate ideal gas state with simple relations. Inputs expected in SI (P: Pa, T: K, v: m3/kg, h/u: J/kg, s: J/kgK)
 */
export function calculateIdealGasState(
  substance: string,
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const data = idealGasData[substance]
  if (!data) throw new Error(`Ideal gas data not available for: ${substance}`)

  const { R, cp, cv } = data
  const props: Record<string, number> = {
    [prop1.name]: prop1.value,
    [prop2.name]: prop2.value,
  }

  let T = props.T
  let P = props.P
  let v = props.v
  let h = props.h
  let u = props.u
  let s = props.s

  // Basic solves
  // If T missing and we have P and v -> ideal gas law
  if (T === undefined && P !== undefined && v !== undefined) {
    T = (P * v) / R
  }

  // If P missing and T and v known
  if (P === undefined && T !== undefined && v !== undefined) {
    P = (R * T) / v
  }

  // If v missing and P and T known
  if (v === undefined && P !== undefined && T !== undefined) {
    v = (R * T) / P
  }

  // If T still missing but h or u provided
  if (T === undefined) {
    if (h !== undefined) T = TREF + h / cp
    else if (u !== undefined) T = TREF + u / cv
  }

  if (T === undefined || P === undefined || v === undefined) {
    // Not enough independent properties
    throw new Error('Insufficient independent properties to determine ideal gas state (need 2 independent: P,T,v,h,u,s)')
  }

  // compute remaining
  h = cp * (T - TREF)
  u = cv * (T - TREF)
  s = cp * Math.log(T / TREF) - R * Math.log(P / PREF)

  return { P, T, v, h, u, s, phase: 'gas' }
}

/**
 * Simplified water model: expects P (Pa) and T (K) ideally. Returns rough estimates.
 */
export function calculateWaterState(
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const props: Record<string, number> = { [prop1.name]: prop1.value, [prop2.name]: prop2.value }
  const P = props.P
  const T = props.T
  let v = props.v
  let h = props.h
  let u = props.u
  let s = props.s
  let x = props.x

  if (P === undefined || T === undefined) {
    throw new Error('Water model requires at least P and T (in SI units: Pa, K)')
  }

  // choose nearest saturation entry by pressure (Pa -> convert table keys in Pa)
  const satEntries: any[] = Object.entries(waterSaturation).map(([k, v]) => ({ p: parseFloat(k), ...(v as any) }))
  // find approximate saturation at given P (conversion: table keys in MPa or Pa? table keys in Pa already)
  let sat: any = satEntries[0]
  for (const e of satEntries) {
    if (Math.abs(e.p - P) < Math.abs(sat.p - P)) sat = e
  }

  // rough phase decision
  let phase = 'liquid'
  if (T > (sat?.Tsat ?? -Infinity)) phase = 'gas'
  else if (Math.abs(T - (sat?.Tsat ?? T)) < 1e-6) phase = 'two-phase'

  if (v === undefined) {
    v = phase === 'gas' ? (461.5 * T) / P : sat.vf
  }
  if (h === undefined) {
    h = phase === 'gas' ? 2500000 + 1850 * (T - 373) : sat.hf
  }
  if (u === undefined) u = h - P * v
  if (s === undefined) s = phase === 'gas' ? sat.sg : sat.sf

  return { P, T, v, h, u, s, x, phase }
}

export function computeThermodynamicState(
  model: 'ideal_gas' | 'real',
  substance: string,
  prop1: { name: string; value: number; unit?: string },
  prop2: { name: string; value: number; unit?: string }
): { state: ThermodynamicState; extra?: Record<string, number> } {
  if (model === 'ideal_gas') {
    if (!idealGasData[substance]) throw new Error(`Ideal gas not supported: ${substance}`)
    const state = calculateIdealGasState(substance, prop1, prop2)
    const d = idealGasData[substance]
    return { state, extra: { R: d.R, cp: d.cp, cv: d.cv, gamma: d.gamma } }
  }

  if (model === 'real') {
    if (substance === 'Water' || substance === 'Steam') {
      const state = calculateWaterState(prop1, prop2)
      return { state }
    }
    // For other real fluids, return metadata if available
    const meta = (substanceData as any).real?.find((r: any) => r.key === substance)
    if (meta) {
      // Very rough idealization: treat as ideal gas with molar mass conversion if possible
      const M = meta.molar_mass
      if (M && (prop1.name === 'P' || prop2.name === 'P')) {
        // Attempt ideal gas fallback using R_universal / M
        const R_univ = 8.314462618
        const R_spec = (R_univ * 1000) / M // J/kgK
        // create a temporary ideal gas entry
        const temp: IdealGasProperties = { R: R_spec, cp: 1000, cv: 700, gamma: 1.428 }
        idealGasData[substance] = temp
        const state = calculateIdealGasState(substance, prop1, prop2)
        return { state, extra: { R: temp.R, cp: temp.cp, cv: temp.cv, gamma: temp.gamma } }
      }
    }
  }

  throw new Error(`Model/substance not supported: ${model}/${substance}`)
}
