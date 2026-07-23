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

// Load real substance data (water, refrigerants)
const realSubstances: Record<string, any> = {}
;(substanceData as any).real?.forEach((r: any) => {
  realSubstances[r.key] = r
})

// Build saturation table maps for fast lookup
function buildSaturationMaps(substance: string) {
  const data = realSubstances[substance]
  if (!data?.saturation_table) return { byT: {}, byP: {}, entries: [] }
  
  const byT: Record<number, any> = {}
  const byP: Record<number, any> = {}
  const entries: any[] = Object.entries(data.saturation_table).map(([k, v]: any) => ({
    T: parseFloat(k),
    ...(v as any)
  }))
  
  entries.forEach(e => {
    byT[e.T] = e
    byP[e.P] = e
  })
  
  return { byT, byP, entries: entries || [] }
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
 * Improved real fluid model using saturation tables.
 */
export function calculateRealState(
  substance: string,
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const data = realSubstances[substance]
  if (!data) throw new Error(`Real substance not available: ${substance}`)
  
  const props: Record<string, number> = { [prop1.name]: prop1.value, [prop2.name]: prop2.value }
  const P = props.P
  const T = props.T
  let v = props.v
  let h = props.h
  let u = props.u
  let s = props.s
  let x = props.x
  
  // Build saturation lookup
  const { byT, byP, entries } = buildSaturationMaps(substance)
  
  if (!entries.length) throw new Error(`No saturation data for: ${substance}`)
  
  // Find nearest saturation point to determine phase
  let satPoint: any = null
  let phase = 'liquid'
  
  // If P and T both provided, determine phase
  if (P !== undefined && T !== undefined) {
    // Find saturation T at given P
    let closestSat = entries[0]
    for (const e of entries) {
      if (Math.abs(e.P - P) < Math.abs(closestSat.P - P)) closestSat = e
    }
    satPoint = closestSat
    const Tsat = closestSat.T
    
    if (T < Tsat) phase = 'liquid'
    else if (T > Tsat) phase = 'gas'
    else phase = 'two-phase'
  }
  
  // Fill in missing properties using saturation point
  if (!satPoint && entries.length > 0) satPoint = entries[Math.floor(entries.length / 2)]
  
  if (v === undefined) v = phase === 'gas' ? satPoint.vg : satPoint.vf
  if (h === undefined) h = phase === 'gas' ? satPoint.hg : satPoint.hf
  if (s === undefined) s = phase === 'gas' ? satPoint.sg : satPoint.sf
  if (u === undefined) u = h - P * v
  if (x === undefined && phase === 'two-phase') x = 0.5
  
  return { P, T, v, h, u, s, x, phase }
}

/**
 * Simplified water model fallback for backward compatibility
 */
export function calculateWaterState(
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  // Try new model first
  try {
    return calculateRealState('Water', prop1, prop2)
  } catch (e) {
    // Fallback to bare minimum
    const props: Record<string, number> = { [prop1.name]: prop1.value, [prop2.name]: prop2.value }
    const P = props.P
    const T = props.T
    
    if (P === undefined || T === undefined) {
      throw new Error('Water model requires P and T (SI units)')
    }
    
    // Extremely rough fallback properties
    const phase = T > 373.15 ? 'gas' : 'liquid'
    const h = phase === 'gas' ? 2500000 : 1447
    const s = phase === 'gas' ? 7.0 : 3.78
    const v = phase === 'gas' ? (461.5 * T) / P : 0.001
    const u = h - P * v
    
    return { P, T, v, h, u, s, phase }
  }
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
    // Check if real substance exists
    if (realSubstances[substance]) {
      const state = calculateRealState(substance, prop1, prop2)
      return { state }
    }
    
    // Fallback for older named substances
    if (substance === 'Water' || substance === 'Steam') {
      const state = calculateWaterState(prop1, prop2)
      return { state }
    }
    
    throw new Error(`Real substance not available: ${substance}`)
  }

  throw new Error(`Model/substance not supported: ${model}/${substance}`)
}
