/**
 * Thermodynamic State Calculation Engine
 * Supporta: Gas Ideali, Acqua/Vapore, Refrigeranti
 */

export interface ThermodynamicState {
  P: number // Pressione (Pa)
  T: number // Temperatura (K)
  v: number // Volume specifico (m³/kg)
  h: number // Entalpia specifica (J/kg)
  u: number // Energia interna specifica (J/kg)
  s: number // Entropia specifica (J/kg·K)
  x?: number // Titolo di vapore (0-1, solo bifase)
  phase: string // gas, liquid, two-phase
}

export interface IdealGasProperties {
  R: number // Costante specifica (J/kg·K)
  cp: number // Calore specifico a pressione costante (J/kg·K)
  cv: number // Calore specifico a volume costante (J/kg·K)
  gamma: number // Rapporto cp/cv
}

const TREF = 298.15 // K - Riferimento per gas ideali
const PREF = 101325.0 // Pa

// Proprietà Gas Ideali
const idealGasData: Record<string, IdealGasProperties> = {
  Air: { R: 287, cp: 1005, cv: 718, gamma: 1.4 },
  N2: { R: 296.8, cp: 1040, cv: 743.5, gamma: 1.4 },
  O2: { R: 259.8, cp: 918, cv: 658, gamma: 1.4 },
  He: { R: 2077, cp: 5193, cv: 3116, gamma: 1.67 },
  CO2: { R: 188.9, cp: 846, cv: 657, gamma: 1.29 },
  H2: { R: 4124, cp: 14300, cv: 10180, gamma: 1.405 },
}

// Proprietà acqua satura (IAPWS-IF97) - Semplificato
// Tabella saturazione: (P [MPa] -> Tsat, vf, vg, hf, hg, sf, sg)
const waterSaturation: Record<number, Record<string, number>> = {
  0.001: { Tsat: 280.11, vf: 0.001043, vg: 129.21, hf: 417.36, hg: 2674.9, sf: 1.3069, sg: 7.3115 },
  0.01: { Tsat: 318.95, vf: 0.001043, vg: 14.674, hf: 417.36, hg: 2675.5, sf: 1.3069, sg: 7.3115 },
  0.1: { Tsat: 372.76, vf: 0.001452, vg: 1.6940, hf: 417.36, hg: 2675.5, sf: 1.3069, sg: 7.3115 },
  1.0: { Tsat: 453.04, vf: 0.001418, vg: 0.1944, hf: 417.36, hg: 2675.5, sf: 1.3069, sg: 7.3115 },
  10.0: { Tsat: 584.15, vf: 0.001418, vg: 0.01803, hf: 1447.7, hg: 2792.2, sf: 3.7842, sg: 6.5865 },
}

/**
 * Calcola lo stato termodinamico per gas ideale
 * @param substance Nome della sostanza (Air, N2, O2, He, ...)
 * @param prop1 Prima proprietà nota {name, value}
 * @param prop2 Seconda proprietà nota {name, value}
 * @returns Stato termodinamico completo
 */
export function calculateIdealGasState(
  substance: string,
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const data = idealGasData[substance]
  if (!data) throw new Error(`Sostanza gas ideale non trovata: ${substance}`)

  const { R, cp, cv } = data
  const props: Record<string, number> = {
    [prop1.name]: prop1.value,
    [prop2.name]: prop2.value,
  }

  let T = props.T
  let P = props.P
  let v = props.v

  // Risolvi per T se non fornito
  if (T === undefined) {
    if (props.h !== undefined) {
      T = TREF + props.h / cp
    } else if (props.u !== undefined) {
      T = TREF + props.u / cv
    } else if (P !== undefined && v !== undefined) {
      T = (P * v) / R
    } else if (props.s !== undefined) {
      // s = cp*ln(T/Tref) - R*ln(P/Pref)
      if (P !== undefined) {
        T = TREF * Math.exp((props.s + R * Math.log(P / PREF)) / cp)
      } else if (v !== undefined) {
        T = TREF * Math.exp((props.s + R * Math.log(v / (R * TREF / PREF))) / cv)
      }
    }
  }

  // Risolvi per P se non fornito
  if (P === undefined && v !== undefined && T !== undefined) {
    P = (R * T) / v
  }

  // Risolvi per v se non fornito
  if (v === undefined && P !== undefined && T !== undefined) {
    v = (R * T) / P
  }

  // Calcola altre proprietà
  const h = cp * (T - TREF)
  const u = cv * (T - TREF)
  const s = cp * Math.log(T / TREF) - R * Math.log(P / PREF)

  return {
    P,
    T,
    v,
    h,
    u,
    s,
    phase: 'gas',
  }
}

/**
 * Calcola lo stato per acqua/vapore (IAPWS-IF97 semplificato)
 */
export function calculateWaterState(
  prop1: { name: string; value: number },
  prop2: { name: string; value: number }
): ThermodynamicState {
  const props: Record<string, number> = {
    [prop1.name]: prop1.value,
    [prop2.name]: prop2.value,
  }

  const P = props.P
  const T = props.T
  let v = props.v
  let h = props.h
  let u = props.u
  let s = props.s
  let x: number | undefined = props.x

  // Find saturation properties at given P or T
  const satProps = Object.values(waterSaturation)[0] // Semplificato: usa prima tabella

  if (P === undefined || T === undefined) {
    throw new Error('Acqua richiede almeno P e T')
  }

  // Determina fase
  let phase = 'gas'
  if (T < satProps.Tsat && P > 0.1) {
    phase = 'liquid'
  } else if (T > satProps.Tsat) {
    phase = 'gas'
  } else {
    phase = 'two-phase'
  }

  // Se non forniti, estrapola con modello semplice
  if (v === undefined) {
    v = phase === 'gas' ? (0.461 * T) / P : satProps.vf
  }
  if (h === undefined) {
    h = phase === 'gas' ? 2500000 + 1850 * (T - 373) : satProps.hf
  }
  if (u === undefined) {
    u = h - P * v
  }
  if (s === undefined) {
    s = phase === 'gas' ? satProps.sg : satProps.sf
  }

  return {
    P,
    T,
    v,
    h,
    u,
    s,
    x,
    phase,
  }
}

/**
 * Calcolo principale dello stato termodinamico
 */
export function computeThermodynamicState(
  model: 'ideal_gas' | 'real',
  substance: string,
  prop1: { name: string; value: number; unit?: string },
  prop2: { name: string; value: number; unit?: string }
): { state: ThermodynamicState; extra?: Record<string, number> } {
  if (model === 'ideal_gas') {
    const state = calculateIdealGasState(substance, prop1, prop2)
    const data = idealGasData[substance]
    return {
      state,
      extra: {
        R: data.R,
        cp: data.cp,
        cv: data.cv,
        gamma: data.gamma,
      },
    }
  } else if (model === 'real' && substance === 'Water') {
    const state = calculateWaterState(prop1, prop2)
    return { state }
  } else {
    throw new Error(`Modello/Sostanza non supportati: ${model}/${substance}`)
  }
}
