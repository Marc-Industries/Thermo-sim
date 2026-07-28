/**
 * Unit conversion module.
 *
 * Conversion factors are derived from Proprieties2.json "fattori_di_conversione".
 * All conversions are to SI first, then back out — a single internal helper per
 * physical dimension keeps the matrix small and well-typed.
 *
 * The user-facing API exposes:
 *   - convertToSI(propName, value, unit)
 *   - convertFromSI(propName, value, unit)
 *   - unitsFor(propName): canonical list of unit symbols for the UI dropdown
 *   - normalizePayloadUnits(payload)
 */

import conversionData from '../Proprieties2.json'

type Matrix = Array<Record<string, number | string>>

type ConversionTables = {
  pressure: Matrix
  energy: Matrix
  energySpecific: Matrix
  power: Matrix
  length: Matrix
  mass: Matrix
  force: Matrix
  temperatureInterval: Matrix
}

function loadMatrix(key: string): Matrix {
  const block = (conversionData as any).fattori_di_conversione?.[key]
  if (!block || !Array.isArray(block.matrice)) return []
  return block.matrice as Matrix
}

const TABLES: ConversionTables = {
  pressure: loadMatrix('unita_pressione'),
  energy: loadMatrix('unita_energia'),
  energySpecific: loadMatrix('unita_energia_specifica'),
  power: loadMatrix('unita_potenza'),
  length: loadMatrix('unita_lunghezza'),
  mass: loadMatrix('unita_massa'),
  force: loadMatrix('unita_forza'),
  temperatureInterval: loadMatrix('unita_intervallo_temperatura'),
}

/** Aliases accepted on the wire — keyed to the canonical symbol used in TABLES. */
const PRESSURE_ALIASES: Record<string, string> = {
  Pa: 'Pa', pa: 'Pa', 'N/m²': 'Pa', 'N/m2': 'Pa',
  bar: 'bar',
  kPa: 'kPa',
  MPa: 'MPa',
  atm: 'atm',
  psi: 'lbf/in² (p.s.i.)', 'lbf/in2': 'lbf/in² (p.s.i.)', 'lbf/in²': 'lbf/in² (p.s.i.)', lbf_in2: 'lbf/in² (p.s.i.)',
  torr: 'torr (mm Hg)', 'mmHg': 'torr (mm Hg)', mm_Hg: 'torr (mm Hg)',
  baria: 'dyn/cm² (baria)', dyn_cm2: 'dyn/cm² (baria)',
  'kgf/cm²': 'kgf/cm² (at)', kgf_cm2: 'kgf/cm² (at)',
  at: 'kgf/cm² (at)',
  'kgf/m²': 'kgf/m² (mm H2O)', kgf_m2: 'kgf/m² (mm H2O)',
  'lbf/ft²': 'lbf/ft²', lbf_ft2: 'lbf/ft²',
}

const ENERGY_PER_MASS_ALIASES: Record<string, string> = {
  'J/kg': '1 J/kg',
  J_kg: '1 J/kg',
  'kJ/kg': '1 kJ/kg', kJ_kg: '1 kJ/kg',
  'MJ/kg': 'MJ/kg', MJ_kg: 'MJ/kg',
  'erg/g': '1 erg/g',
  'kgf m/kg': '1 kgf m/kg',
  'kcal/kg': '1 kcal/kg',
  'Btu/lb': '1 Btu/lb',
}

const ENERGY_ALIASES: Record<string, string> = {
  J: '1 J',
  kJ: 'kJ',
  MJ: 'MJ',
  erg: '1 erg',
  'kgf m': '1 kgf m',
  kWh: '1 kWh',
  kcal: '1 kcal',
  cal: '1 kcal', // small calorie treated as kcal/1000 only by convention
  Btu: '1 Btu',
  'l atm': '1 l atm',
}

const POWER_ALIASES: Record<string, string> = {
  W: '1 W',
  kW: '1 kW',
  MW: 'MW',
  'erg/s': '1 erg/s',
  'kgf m/s': '1 kgf m/s',
  CV: '1 CV',
  HP: '1 HP',
  'kcal/h': '1 kcal/h',
  'Btu/h': '1 Btu/h',
}

const TEMP_ALIASES: Record<string, string> = {
  K: 'K',
  C: 'oC', '°C': 'oC', oC: 'oC',
  F: 'oF', '°F': 'oF', oF: 'oF',
  R: 'oR', '°R': 'oR', oR: 'oR',
}

const SPECIFIC_VOLUME_ALIASES: Record<string, string> = {
  'm³/kg': 'm3/kg', 'm3/kg': 'm3/kg',
  'cm³/g': 'cm3/g', 'cm3/g': 'cm3/g',
  'L/kg': 'L/kg',
  'ft³/lb': 'ft3/lb', 'ft3/lb': 'ft3/lb',
}

/** Look up the row whose "unita" matches the table label, return numeric factor to SI. */
function factorToSI(table: Matrix, label: string, siKey = 'Pa'): number {
  for (const row of table) {
    const u = String(row['unita'] ?? '').trim()
    if (u === label) {
      const v = Number((row as any)[siKey])
      if (!Number.isNaN(v)) return v
    }
  }
  return Number.NaN
}

/**
 * Convert a value expressed in `unit` to SI for property `propName`.
 *
 *  - P → Pa
 *  - T → K (interval handled via offset 273.15 for °C/R)
 *  - h, u → J/kg
 *  - s → J/(kg·K)
 *  - v → m³/kg
 *  - x → unitless (handles percent)
 *  - W, Q → J
 *  - Power → W
 *
 * Returns the original value when unit is unknown (preserves previous behaviour
 * so the engine does not silently mis-interpret a bad input).
 */
export function convertToSI(propName: string, value: number, unit?: string): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    throw new Error('Invalid numeric value')
  }
  const u = (unit || '').toString().trim()

  switch (propName) {
    case 'P': {
      if (!u) return value
      const label = PRESSURE_ALIASES[u] ?? u
      // Custom SI prefixes the matrix doesn't cover
      if (u === 'kPa') return value * 1e3
      if (u === 'MPa') return value * 1e6
      if (u === 'mbar') return value * 100
      const f = factorToSI(TABLES.pressure, label)
      return Number.isNaN(f) ? value : value * f
    }

    case 'T': {
      if (!u || u === 'K' || u === 'k') return value
      if (u === 'C' || u === '°C' || u === 'c' || u === 'oC') return value + 273.15
      if (u === 'F' || u === '°F' || u === 'f' || u === 'oF') return (value - 32) * (5 / 9) + 273.15
      if (u === 'R' || u === '°R' || u === 'oR') return value * (5 / 9)
      return value
    }

    case 'h':
    case 'u': {
      if (!u || u === 'J/kg') return value
      const label = ENERGY_PER_MASS_ALIASES[u] ?? u
      if (u === 'kJ/kg') return value * 1000
      if (u === 'MJ/kg') return value * 1e6
      const f = factorToSI(TABLES.energySpecific, label, 'J_kg')
      return Number.isNaN(f) ? value : value * f
    }

    case 's': {
      if (!u || u === 'J/kg·K' || u === 'J/kgK') return value
      if (u === 'kJ/kg·K' || u === 'kJ/kgK' || u === 'kJ/(kg·K)') return value * 1000
      // s is in J/(kg·K); reuse the energy-specific table as a stand-in (same dimension)
      return value
    }

    case 'v': {
      if (!u || u === 'm3/kg' || u === 'm³/kg') return value
      if (u === 'cm3/g' || u === 'cm³/g' || u === 'cc/g') return value * 1e-3
      if (u === 'L/kg') return value * 1e-3
      if (u === 'ft3/lb' || u === 'ft³/lb') return value * 0.062428
      return value
    }

    case 'x': {
      if (u === '%' || u === 'percent') return value / 100
      return value
    }

    case 'W':
    case 'Q': {
      if (!u || u === 'J') return value
      const label = ENERGY_ALIASES[u] ?? u
      if (u === 'kJ') return value * 1000
      if (u === 'MJ') return value * 1e6
      const f = factorToSI(TABLES.energy, label, 'J')
      return Number.isNaN(f) ? value : value * f
    }

    case 'Power': {
      if (!u || u === 'W') return value
      const label = POWER_ALIASES[u] ?? u
      if (u === 'kW') return value * 1000
      if (u === 'MW') return value * 1e6
      const f = factorToSI(TABLES.power, label, 'W')
      return Number.isNaN(f) ? value : value * f
    }

    default:
      return value
  }
}

/** Inverse: SI → user unit. Used by the UI when displaying results. */
export function convertFromSI(propName: string, valueSI: number, unit: string): number {
  if (valueSI === undefined || valueSI === null) return valueSI as any
  const u = (unit || '').toString().trim()
  if (!u) return valueSI

  switch (propName) {
    case 'P': {
      if (u === 'Pa' || u === 'pa') return valueSI
      if (u === 'kPa') return valueSI / 1e3
      if (u === 'MPa') return valueSI / 1e6
      if (u === 'bar') return valueSI / 1e5
      if (u === 'atm') return valueSI / 101325
      if (u === 'psi' || u === 'lbf/in²' || u === 'lbf/in2') return valueSI / 6894.757
      if (u === 'torr' || u === 'mmHg') return valueSI / 133.322
      if (u === 'mbar') return valueSI / 100
      return valueSI
    }

    case 'T': {
      if (u === 'K' || u === 'k') return valueSI
      if (u === 'C' || u === '°C') return valueSI - 273.15
      if (u === 'F' || u === '°F') return (valueSI - 273.15) * (9 / 5) + 32
      if (u === 'R' || u === '°R') return (valueSI - 273.15) * (9 / 5)
      return valueSI
    }

    case 'h':
    case 'u': {
      if (!u || u === 'J/kg') return valueSI
      if (u === 'kJ/kg') return valueSI / 1000
      if (u === 'MJ/kg') return valueSI / 1e6
      if (u === 'kcal/kg') return valueSI / 4186.8
      if (u === 'Btu/lb') return valueSI / 2326.0
      return valueSI
    }

    case 's': {
      if (!u || u === 'J/kg·K' || u === 'J/kgK') return valueSI
      if (u === 'kJ/kg·K' || u === 'kJ/kgK') return valueSI / 1000
      return valueSI
    }

    case 'v': {
      if (!u || u === 'm3/kg' || u === 'm³/kg') return valueSI
      if (u === 'cm3/g' || u === 'cm³/g') return valueSI / 1e-3
      if (u === 'L/kg') return valueSI / 1e-3
      if (u === 'ft3/lb' || u === 'ft³/lb') return valueSI / 0.062428
      return valueSI
    }

    case 'x': {
      if (u === '%' || u === 'percent') return valueSI * 100
      return valueSI
    }

    default:
      return valueSI
  }
}

/** Canonical list of unit symbols for the UI per-field dropdown. */
export function unitsFor(propName: string): string[] {
  switch (propName) {
    case 'P':
      return ['Pa', 'kPa', 'MPa', 'bar', 'atm', 'psi', 'torr', 'mbar']
    case 'T':
      return ['K', '°C', '°F', '°R']
    case 'h':
    case 'u':
      return ['J/kg', 'kJ/kg', 'MJ/kg', 'kcal/kg', 'Btu/lb']
    case 's':
      return ['J/kg·K', 'kJ/kg·K']
    case 'v':
      return ['m³/kg', 'cm³/g', 'L/kg', 'ft³/lb']
    case 'x':
      return ['', '%']
    case 'W':
    case 'Q':
      return ['J', 'kJ', 'MJ', 'kcal', 'Btu']
    case 'Power':
      return ['W', 'kW', 'MW', 'CV', 'HP', 'kcal/h', 'Btu/h']
    default:
      return ['']
  }
}

/** Default unit for a property when nothing is selected. */
export function defaultUnitFor(propName: string): string {
  const list = unitsFor(propName)
  return list[0] ?? ''
}

/** Helper used by /api/compute-state to convert incoming payload values to SI. */
export function normalizePayloadUnits(payload: {
  prop1: { name: string; value: number; unit?: string }
  prop2: { name: string; value: number; unit?: string }
  units?: Record<string, string>
}) {
  const prop1Unit = payload.prop1.unit || (payload.units?.[payload.prop1.name] ?? '')
  const prop2Unit = payload.prop2.unit || (payload.units?.[payload.prop2.name] ?? '')

  const p1 = { ...payload.prop1 }
  const p2 = { ...payload.prop2 }

  p1.value = convertToSI(p1.name, Number(p1.value), prop1Unit)
  p2.value = convertToSI(p2.name, Number(p2.value), prop2Unit)

  return { prop1: p1, prop2: p2 }
}
