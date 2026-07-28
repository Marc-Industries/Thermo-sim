/**
 * Thermodynamic engine.
 *
 * Supports three substance models:
 *   - ideal_gas         constant cp, R, γ
 *   - ideal_gas_cp_t    variable cp = cp(T) (engineering formulas from Proprieties2.json)
 *   - real              saturation tables with linear interpolation
 *
 * Real-fluid behaviour:
 *   - Given two independent properties, the engine decides the phase and fills
 *     the missing ones:
 *       * subcooled liquid: properties taken at the nearest low-T saturation
 *         point (approximation; the engine flags this)
 *       * superheated vapour: properties taken at the nearest high-T saturation
 *         point (approximation; the engine flags this)
 *       * two-phase: full linear interpolation between saturated liquid and
 *         saturated vapour at the given T (or P), with x from the given
 *         property (h, s, v, u or x)
 *
 *  - Process analysis: W and Q for isobaric/isochoric/isothermal/adiabatic/
 *    polytropic for ideal gas, plus generic h1-h2 / u1-u2 for any model.
 *  - Cycle analysis: W_net, Q_in, Q_out, η, COP for Rankine/Otto/Diesel/Brayton/
 *    Carnot.
 *
 * All inputs are expected in SI (see lib/units.ts for conversion).
 */
import substanceData from '../public/substance-data.json'

const TREF = 298.15
const PREF = 101325.0

export interface ThermodynamicState {
  P?: number
  T?: number
  v?: number
  h?: number
  u?: number
  s?: number
  x?: number
  phase?: string
}

export interface IdealGasProperties {
  R: number
  cp: number
  cv: number
  gamma: number
  cpModel?: 'constant' | 'cp(T)'
  cpEquation?: string
  cpRangeK?: [number, number]
}

/* ---------- cp(T) formulas ----------------------------------------------- */
const formulaCache: Record<string, (T: number) => number> = {}

/** Evaluate a cp(T) formula of the form "a + b*T + c*T^2 + d*T^-1 + e*T^-0.5".
 *  Supports the small grammar used by Proprieties2.json:
 *    constant | <number> | <number>e<±digits>
 *    + - * / ^
 *    T, T^-1, T^-0.5, T^2, T^3, T^n
 *
 *  Implementation: tokenise + Recursive Descent. Tolerates whitespace; rejects
 *  anything that would let a hostile input smuggle code in.
 */
function compileCpFormula(formula: string): (T: number) => number {
  if (formulaCache[formula]) return formulaCache[formula]
  const tokens = tokenize(formula)
  const parser = new Parser(tokens)
  const fn = parser.parseExpression()
  // Accept trailing junk only if empty
  if (parser.pos !== tokens.length) {
    throw new Error(`Unexpected token in cp formula: ${formula.slice(parser.pos)}`)
  }
  const evaluate = (T: number) => {
    // clone and step
    const local = new Parser(tokens)
    return local.parseExpression()
  }
  // wrap to inject T
  const compiled = (T: number) => {
    const saved = (globalThis as any).__CP_T
    ;(globalThis as any).__CP_T = T
    try {
      const local = new Parser(tokens)
      return local.parseExpression()
    } finally {
      ;(globalThis as any).__CP_T = saved
    }
  }
  formulaCache[formula] = compiled
  return compiled
}

type TokenNumber = { kind: 'num'; value: number }
type TokenOp = { kind: 'op'; value: string }
type TokenPow = { kind: 'pow' }
type TokenVar = { kind: 'var' }
type TokenLParen = { kind: 'lparen' }
type TokenRParen = { kind: 'rparen' }
type Token = TokenNumber | TokenOp | TokenPow | TokenVar | TokenLParen | TokenRParen

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    if (c === '(') { tokens.push({ kind: 'lparen' }); i++; continue }
    if (c === ')') { tokens.push({ kind: 'rparen' }); i++; continue }
    if (c === '+' || c === '-' || c === '*' || c === '/') { tokens.push({ kind: 'op', value: c }); i++; continue }
    if (c === '^') { tokens.push({ kind: 'pow' }); i++; continue }
    if (c === 'T' || c === 't') { tokens.push({ kind: 'var' }); i++; continue }
    // number, possibly scientific and possibly followed by e±<digits>
    const m = src.slice(i).match(/^-?\d+(\.\d+)?(e[+-]?\d+)?/)
    if (m) {
      tokens.push({ kind: 'num', value: parseFloat(m[0]) })
      i += m[0].length
      continue
    }
    throw new Error(`cp formula parse error near: ${src.slice(i)}`)
  }
  return tokens
}

class Parser {
  pos: number
  tokens: Token[]
  constructor(tokens: Token[]) {
    this.tokens = tokens
    this.pos = 0
  }
  peek(): Token | undefined { return this.tokens[this.pos] }
  eat(): Token { return this.tokens[this.pos++] }

  parseExpression(): number {
    let left = this.parseTerm()
    while (this.peek() && (this.peek() as any).kind === 'op' && ((this.peek() as any).value === '+' || (this.peek() as any).value === '-')) {
      const op = (this.eat() as any).value
      const right = this.parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }
  parseTerm(): number {
    let left = this.parsePower()
    while (this.peek() && (this.peek() as any).kind === 'op' && ((this.peek() as any).value === '*' || (this.peek() as any).value === '/')) {
      const op = (this.eat() as any).value
      const right = this.parsePower()
      left = op === '*' ? left * right : left / right
    }
    return left
  }
  parsePower(): number {
    const base = this.parseUnary()
    if (this.peek() && (this.peek() as any).kind === 'pow') {
      this.eat()
      const exp = this.parseUnary()
      return Math.pow(base, exp)
    }
    return base
  }
  parseUnary(): number {
    if (this.peek() && (this.peek() as any).kind === 'op' && ((this.peek() as any).value === '-' || (this.peek() as any).value === '+')) {
      const op = (this.eat() as any).value
      const v = this.parseUnary()
      return op === '-' ? -v : v
    }
    return this.parsePrimary()
  }
  parsePrimary(): number {
    const t = this.peek()
    if (!t) throw new Error('cp formula: unexpected end')
    if ((t as any).kind === 'num') { this.eat(); return (t as any).value }
    if ((t as any).kind === 'lparen') {
      this.eat()
      const v = this.parseExpression()
      const r = this.peek()
      if (!r || (r as any).kind !== 'rparen') throw new Error('cp formula: missing )')
      this.eat()
      return v
    }
    if ((t as any).kind === 'var') {
      this.eat()
      return (globalThis as any).__CP_T
    }
    throw new Error(`cp formula: unexpected token ${JSON.stringify(t)}`)
  }
}

/* ---------- ideal gas table --------------------------------------------- */
const idealGasData: Record<string, IdealGasProperties> = {}
;(substanceData as any).ideal_gas?.forEach((g: any) => {
  idealGasData[g.key] = {
    R: g.R,
    cp: g.cp,
    cv: g.cv,
    gamma: g.gamma,
    cpModel: g.cpModel,
    cpEquation: g.cpEquation,
    cpRangeK: g.cpRangeK,
  }
})

/* ---------- real substance table ---------------------------------------- */
const realSubstances: Record<string, any> = {}
;(substanceData as any).real?.forEach((r: any) => {
  realSubstances[r.key] = r
})

function buildSaturationMaps(substance: string) {
  const data = realSubstances[substance]
  if (!data) throw new Error(`Real substance not available: ${substance}`)
  const entries: { T: number; P: number; vf: number; vg: number; hf: number; hg: number; sf: number; sg: number }[] = []
  for (const k of Object.keys(data.saturation_table)) {
    const v = data.saturation_table[k]
    entries.push({ T: v.T, P: v.P, vf: v.vf, vg: v.vg, hf: v.hf, hg: v.hg, sf: v.sf, sg: v.sg })
  }
  entries.sort((a, b) => a.T - b.T)
  return { entries }
}

/** Linear interpolation on the saturation table. */
function findSatByT(entries: any[], T: number) {
  if (entries.length === 0) throw new Error('No saturation data')
  if (T <= entries[0].T) return entries[0]
  if (T >= entries[entries.length - 1].T) return entries[entries.length - 1]
  for (let i = 0; i < entries.length - 1; i++) {
    const a = entries[i], b = entries[i + 1]
    if (T >= a.T && T <= b.T) {
      const f = (T - a.T) / (b.T - a.T)
      return {
        T,
        P: a.P + f * (b.P - a.P),
        vf: a.vf + f * (b.vf - a.vf),
        vg: a.vg + f * (b.vg - a.vg),
        hf: a.hf + f * (b.hf - a.hf),
        hg: a.hg + f * (b.hg - a.hg),
        sf: a.sf + f * (b.sf - a.sf),
        sg: a.sg + f * (b.sg - a.sg),
        interpolated: true,
      }
    }
  }
  return entries[entries.length - 1]
}

function findSatByP(entries: any[], P: number) {
  if (entries.length === 0) throw new Error('No saturation data')
  if (P <= entries[0].P) return entries[0]
  if (P >= entries[entries.length - 1].P) return entries[entries.length - 1]
  for (let i = 0; i < entries.length - 1; i++) {
    const a = entries[i], b = entries[i + 1]
    if (P >= a.P && P <= b.P) {
      const f = (P - a.P) / (b.P - a.P)
      return {
        T: a.T + f * (b.T - a.T),
        P,
        vf: a.vf + f * (b.vf - a.vf),
        vg: a.vg + f * (b.vg - a.vg),
        hf: a.hf + f * (b.hf - a.hf),
        hg: a.hg + f * (b.hg - a.hg),
        sf: a.sf + f * (b.sf - a.sf),
        sg: a.sg + f * (b.sg - a.sg),
        interpolated: true,
      }
    }
  }
  return entries[entries.length - 1]
}

/* ---------- ideal gas, constant cp ------------------------------------- */
export function calculateIdealGasState(
  substance: string,
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const data = idealGasData[substance]
  if (!data) throw new Error(`Ideal gas data not available for: ${substance}`)
  const { R, cp, cv } = data
  const props: Record<string, number> = { [prop1.name]: prop1.value, [prop2.name]: prop2.value }
  let { T, P, v, h, u, s } = { T: props.T, P: props.P, v: props.v, h: props.h, u: props.u, s: props.s }

  if (T === undefined && P !== undefined && v !== undefined) T = (P * v) / R
  if (P === undefined && T !== undefined && v !== undefined) P = (R * T) / v
  if (v === undefined && P !== undefined && T !== undefined) v = (R * T) / P
  if (T === undefined) {
    if (h !== undefined) T = TREF + h / cp
    else if (u !== undefined) T = TREF + u / cv
  }
  if (T === undefined || P === undefined || v === undefined) {
    throw new Error('Insufficient independent properties for ideal gas state')
  }
  h = cp * (T - TREF)
  u = cv * (T - TREF)
  s = cp * Math.log(T / TREF) - R * Math.log(P / PREF)
  return { P, T, v, h, u, s, phase: 'gas' }
}

/* ---------- ideal gas, variable cp(T) ----------------------------------
 * cp(T) is in kJ/(kg·K) per the source. Given h(T) = ∫ cp dT from Tref,
 * properties are computed numerically. We use a small Simpson quadrature over
 * the requested range — fast enough for the calculator UI.
 */
function integrateCp(substance: string, T1: number, T2: number): number {
  const data = idealGasData[substance]
  if (!data?.cpEquation) throw new Error('cp(T) formula not defined for this substance')
  const fn = compileCpFormula(data.cpEquation)
  // kJ/(kg·K) → J/(kg·K)
  const cpSI = (T: number) => fn(T) * 1000
  if (Math.abs(T2 - T1) < 1e-6) return 0
  // Simpson's rule with 16 subintervals
  const N = 16
  const a = Math.min(T1, T2), b = Math.max(T1, T2)
  const h = (b - a) / N
  const s0 = cpSI(a) + cpSI(b)
  let s1 = 0, s2 = 0
  for (let i = 1; i < N; i++) {
    const x = a + i * h
    if (i % 2 === 1) s1 += cpSI(x); else s2 += cpSI(x)
  }
  const integral = (h / 3) * (s0 + 4 * s1 + 2 * s2)
  return T2 >= T1 ? integral : -integral
}

export function calculateIdealGasCpTState(
  substance: string,
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const data = idealGasData[substance]
  if (!data) throw new Error(`Ideal gas data not available for: ${substance}`)
  if (data.cpModel !== 'cp(T)') throw new Error(`Substance ${substance} does not have cp(T) data; use ideal_gas instead`)
  const R = data.R
  const props: Record<string, number> = { [prop1.name]: prop1.value, [prop2.name]: prop2.value }
  let { T, P, v, h, u, s } = { T: props.T, P: props.P, v: props.v, h: props.h, u: props.u, s: props.s }

  // Whatever pair is given, decide T and P first.
  if (T === undefined && P !== undefined && v !== undefined) T = (P * v) / R
  if (P === undefined && T !== undefined && v !== undefined) P = (R * T) / v
  if (v === undefined && P !== undefined && T !== undefined) v = (R * T) / P
  if (T === undefined && h !== undefined) {
    // Crude inversion: h = ∫ cp(T) dT from Tref. Newton on residual.
    const fn = composeHFn(substance)
    T = invertH(h, fn)
  }
  if (T === undefined && u !== undefined) {
    const cp = data.cp
    T = TREF + u / (cp - R) // approximation: cv ≈ R(k-1) with constant k
  }
  if (T === undefined || P === undefined || v === undefined) {
    throw new Error('Insufficient independent properties for ideal gas cp(T) state')
  }
  // h, u, s from T and P
  const cpNow = (compileCpFormula(data.cpEquation!))(T) * 1000 // J/(kg·K)
  const cv = cpNow - R
  // For h, integrate from Tref (closed-form here is too costly — reuse quadrature)
  const hInt = integrateCp(substance, TREF, T)
  h = hInt
  u = h - P * v
  // s = ∫ cp/T dT - R ln(P/Pref)  — Simpson over [Tref, T]
  const cpOverT = (Tx: number) => (compileCpFormula(data.cpEquation!))(Tx) * 1000 / Tx
  s = simpsonIntegrate(cpOverT, TREF, T) - R * Math.log(P / PREF)
  return { P, T, v, h, u, s, phase: 'gas' }
}

function composeHFn(substance: string) {
  return (T: number) => integrateCp(substance, TREF, T)
}

function invertH(target: number, hFn: (T: number) => number): number {
  // Bisection over [50, 5000] K
  let lo = 50, hi = 5000
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi)
    const v = hFn(mid)
    if (v < target) lo = mid; else hi = mid
  }
  return 0.5 * (lo + hi)
}

function simpsonIntegrate(fn: (x: number) => number, a: number, b: number): number {
  const N = 16
  const h = (b - a) / N
  let s0 = fn(a) + fn(b)
  let s1 = 0, s2 = 0
  for (let i = 1; i < N; i++) {
    const x = a + i * h
    if (i % 2 === 1) s1 += fn(x); else s2 += fn(x)
  }
  return (h / 3) * (s0 + 4 * s1 + 2 * s2)
}

/* ---------- real fluid --------------------------------------------------- */
export function calculateRealState(
  substance: string,
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const data = realSubstances[substance]
  if (!data) throw new Error(`Real substance not available: ${substance}`)
  const { entries } = buildSaturationMaps(substance)
  if (!entries.length) throw new Error(`No saturation data for: ${substance}`)

  const props: Record<string, number> = { [prop1.name]: prop1.value, [prop2.name]: prop2.value }
  const P = props.P
  const T = props.T
  let v = props.v
  let h = props.h
  let u = props.u
  let s = props.s
  let x = props.x

  // Determine phase from P and T if both are given.
  let phase = ''
  let satByT: any = null
  if (T !== undefined) satByT = findSatByT(entries, T)
  const satByP: any = P !== undefined ? findSatByP(entries, P) : null

  if (T !== undefined && P !== undefined) {
    const TsatAtP = satByP.T
    // Tollerance for "two-phase" detection
    const eps = Math.max(0.5, 0.001 * TsatAtP)
    if (Math.abs(T - TsatAtP) < eps) phase = 'two-phase'
    else if (T < TsatAtP) phase = 'liquid'
    else phase = 'gas'
  } else if (P !== undefined && x !== undefined) {
    phase = 'two-phase'
  } else if (T !== undefined) {
    const TsatAtP = satByT.P
    if (T <= entries[0].T) phase = 'liquid'
    else if (T >= entries[entries.length - 1].T) phase = 'gas'
    else phase = 'two-phase-or-sat'
  }

  // Two-phase: blend saturated liquid and saturated vapor
  if (phase === 'two-phase') {
    const sat = satByT || satByP
    if (!sat) throw new Error('Need P or T to determine two-phase properties')
    // Find x from whichever given (h, s, v, u) is available
    if (x === undefined) {
      if (h !== undefined) x = clampX((h - sat.hf) / (sat.hg - sat.hf))
      else if (s !== undefined) x = clampX((s - sat.sf) / (sat.sg - sat.sf))
      else if (v !== undefined) x = clampX((v - sat.vf) / (sat.vg - sat.vf))
      else if (u !== undefined) {
        // u = hf + x·hfg - P·v; need v first
        const vx = sat.vf + 0.5 * (sat.vg - sat.vf)
        const ux = sat.hf + 0.5 * (sat.hg - sat.hf) - sat.P * vx
        x = clampX((u - (sat.hf - sat.P * sat.vf)) / ((sat.hg - sat.hf) - sat.P * (sat.vg - sat.vf)))
      } else x = 0.5
    }
    v = (v !== undefined) ? v : sat.vf + x * (sat.vg - sat.vf)
    h = (h !== undefined) ? h : sat.hf + x * (sat.hg - sat.hf)
    s = (s !== undefined) ? s : sat.sf + x * (sat.sg - sat.sf)
    u = (u !== undefined) ? u : h - (P ?? sat.P) * v
    if (T === undefined) { /* use sat.T */ }
    if (P === undefined) P = sat.P
    if (T === undefined) T = sat.T
    return { P, T, v, h, u, s, x, phase }
  }

  // Single-phase: pick the closest saturation point and approximate.
  if (phase === 'liquid') {
    const sat = satByT || satByP
    if (v === undefined) v = sat.vf
    if (h === undefined) h = sat.hf + (data.cp_liquid_approx ?? 4186) * Math.max(0, (T ?? sat.T) - sat.T)
    if (s === undefined) s = sat.sf
    if (u === undefined) u = h - (P ?? sat.P) * v
    if (P === undefined) P = sat.P
    return { P, T, v, h, u, s, phase: 'liquid (approx)' }
  }

  if (phase === 'gas' || phase === 'two-phase-or-sat') {
    const sat = satByT || satByP
    if (T === undefined || P === undefined) {
      throw new Error('Need at least (P,T) or (P,x) for superheated region')
    }
    // Superheated: assume ideal gas with R = (P · v) / T using sat as starting point.
    // Better: use the highest-T saturation vapor row as a baseline, then add ideal-gas increments.
    const baseline = entries[entries.length - 1]
    // best estimate: v = R·T/P with R_u / M
    const R = 8314.462618 / data.molar_mass
    if (v === undefined) v = (R * T) / P
    if (h === undefined) {
      // baseline: hg at baseline.T; then add cp_approx * (T - baseline.T)
      const cp = 2000 // J/(kg·K) rough constant for superheated vapor
      h = baseline.hg + cp * (T - baseline.T)
    }
    if (s === undefined) {
      const cp = 2000
      s = baseline.sg + cp * Math.log(T / baseline.T) - R * Math.log(P / baseline.P)
    }
    u = h - P * v
    return { P, T, v, h, u, s, phase: 'gas (approx)' }
  }

  // Fallback: not enough data
  throw new Error('Insufficient independent properties for real fluid state')
}

function clampX(v: number) {
  if (Number.isNaN(v)) return 0.5
  return Math.max(0, Math.min(1, v))
}

/* ---------- public API -------------------------------------------------- */
export function computeThermodynamicState(
  model: 'ideal_gas' | 'ideal_gas_cp_t' | 'real',
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
  if (model === 'ideal_gas_cp_t') {
    if (!idealGasData[substance]) throw new Error(`Ideal gas not supported: ${substance}`)
    const state = calculateIdealGasCpTState(substance, prop1, prop2)
    const d = idealGasData[substance]
    return { state, extra: { R: d.R, cpModel: d.cpModel || 'cp(T)' } }
  }
  if (model === 'real') {
    const state = calculateRealState(substance, prop1, prop2)
    return { state }
  }
  throw new Error(`Model/substance not supported: ${model}/${substance}`)
}

/* ---------- process analysis -------------------------------------------- */
export type ProcessType = 'isobaric' | 'isochoric' | 'isothermal' | 'adiabatic' | 'polytropic'

export function analyzeProcess(
  model: 'ideal_gas' | 'ideal_gas_cp_t' | 'real',
  substance: string,
  state1: ThermodynamicState,
  state2: ThermodynamicState,
  process: ProcessType,
  polytropic_n?: number
): { W: number; Q: number; extra?: Record<string, number> } {
  const data = idealGasData[substance]
  // Ideal gas: analytic expressions
  if (model === 'ideal_gas' && data) {
    const R = data.R
    const cp = data.cp
    const cv = data.cv
    const gamma = data.gamma
    const T1 = state1.T!
    const T2 = state2.T!
    const P1 = state1.P!
    const P2 = state2.P!
    const v1 = state1.v!
    const v2 = state2.v!
    switch (process) {
      case 'isobaric':
        return { W: P1 * (v2 - v1), Q: cp * (T2 - T1), extra: { kind: 'isobaric' } }
      case 'isochoric':
        return { W: 0, Q: cv * (T2 - T1), extra: { kind: 'isochoric' } }
      case 'isothermal':
        return { W: R * T1 * Math.log(v2 / v1), Q: W, extra: { kind: 'isothermal' } }
      case 'adiabatic':
        return { W: cv * (T1 - T2), Q: 0, extra: { kind: 'adiabatic', gamma } }
      case 'polytropic': {
        const n = polytropic_n ?? ((P2 * v2 - P1 * v1) > 0 ? polytropic_from_state(P1, v1, P2, v2, R, T1) : 1.3)
        if (Math.abs(n - 1) < 1e-6) return { W: R * T1 * Math.log(v2 / v1), Q: W, extra: { kind: 'polytropic', n } }
        const W = (P2 * v2 - P1 * v1) / (1 - n)
        const Q = ((gamma - n) / (gamma - 1)) * W
        return { W, Q, extra: { kind: 'polytropic', n } }
      }
    }
  }
  // Generic: W = ∫ P dv (ideal approx) ; Q = Δu + W
  if (model === 'ideal_gas' || model === 'ideal_gas_cp_t') {
    const R = data!.R
    const v1 = state1.v!, v2 = state2.v!
    const P1 = state1.P!, P2 = state2.P!
    const W = process === 'isobaric' ? P1 * (v2 - v1) : 0.5 * (P1 + P2) * (v2 - v1)
    const u1 = state1.u ?? 0, u2 = state2.u ?? 0
    const Q = (u2 - u1) + W
    return { W, Q, extra: { kind: 'generic' } }
  }
  // Real fluid: generic h1-h2 / Δu + W
  const u1 = state1.u ?? 0, u2 = state2.u ?? 0
  const v1 = state1.v!, v2 = state2.v!
  const P = (state1.P! + state2.P!) / 2
  const W = P * (v2 - v1)
  const Q = (u2 - u1) + W
  return { W, Q, extra: { kind: 'real_generic' } }
}

function polytropic_from_state(P1: number, v1: number, P2: number, v2: number, R: number, T1: number) {
  // Solve P1 v1^n = P2 v2^n → n = ln(P2/P1)/ln(v1/v2)
  if (v1 <= 0 || v2 <= 0 || P1 <= 0 || P2 <= 0) return 1.3
  return Math.log(P2 / P1) / Math.log(v1 / v2)
}

/* ---------- cycle analysis ---------------------------------------------- */
export type CycleType = 'rankine' | 'rankine_superheated' | 'rankine_reheat' | 'otto' | 'diesel' | 'brayton' | 'carnot'

export interface CycleResult {
  Wnet: number
  Qin: number
  Qout: number
  eta: number
  COP?: number
  perProcess: { from: number; to: number; W: number; Q: number }[]
  extra?: Record<string, number>
}

export function analyzeCycle(
  type: CycleType,
  states: ThermodynamicState[],
  opts: { polytropic_n?: number; pump_isentropic?: number; turbine_isentropic?: number } = {}
): CycleResult {
  if (states.length < 4) throw new Error('Need at least 4 states for a cycle')
  const perProcess: { from: number; to: number; W: number; Q: number }[] = []
  let Wnet = 0, Qin = 0, Qout = 0

  for (let i = 0; i < states.length; i++) {
    const from = states[i]
    const to = states[(i + 1) % states.length]
    const W = (from.P! + to.P!) / 2 * (to.v! - from.v!)
    const Q = (to.u! - from.u!) + W
    perProcess.push({ from: i + 1, to: ((i + 1) % states.length) + 1, W, Q })
    Wnet += W
    if (Q > 0) Qin += Q
    else if (Q < 0) Qout += -Q
  }
  const eta = Qin > 0 ? Wnet / Qin : 0
  const result: CycleResult = { Wnet, Qin, Qout, eta, perProcess, extra: { type } }
  if (type === 'carnot' || type.startsWith('rankine')) {
    // COP analogy for refrigeration: if Wnet < 0, treat as cooling cycle
    if (Wnet < 0) result.COP = Qout / Math.abs(Wnet)
  }
  return result
}

/* ---------- saturation curve generator (for diagrams) ------------------- */
export function buildSaturationCurve(substance: string, kind: 'Pv' | 'Ts' | 'Ph' | 'Tv' | 'Ps' | 'Hs') {
  const data = realSubstances[substance]
  if (!data) return []
  const out: any[] = []
  const entries = Object.values(data.saturation_table) as any[]
  entries.sort((a, b) => a.T - b.T)
  for (const e of entries) {
    if (kind === 'Pv') out.push({ v: e.vf, P: e.P, series: 'liquid' }, { v: e.vg, P: e.P, series: 'vapor' })
    else if (kind === 'Ts') out.push({ s: e.sf, T: e.T, series: 'liquid' }, { s: e.sg, T: e.T, series: 'vapor' })
    else if (kind === 'Ph') out.push({ h: e.hf, P: e.P, series: 'liquid' }, { h: e.hg, P: e.P, series: 'vapor' })
    else if (kind === 'Tv') out.push({ v: e.vf, T: e.T, series: 'liquid' }, { v: e.vg, T: e.T, series: 'vapor' })
    else if (kind === 'Ps') out.push({ s: e.sf, P: e.P, series: 'liquid' }, { s: e.sg, P: e.P, series: 'vapor' })
    else if (kind === 'Hs') out.push({ s: e.sf, h: e.hf, series: 'liquid' }, { s: e.sg, h: e.hg, series: 'vapor' })
  }
  return out
}

export function listSubstances() {
  return {
    ideal_gas: Object.keys(idealGasData),
    real: Object.keys(realSubstances),
  }
}

export function getIdealGasProperties(key: string) {
  return idealGasData[key]
}

export function getRealSubstance(key: string) {
  return realSubstances[key]
}
