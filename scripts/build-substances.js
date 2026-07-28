#!/usr/bin/env node
/**
 * Build public/substance-data.json from:
 *  - Proprieties.json          (NASA cp polynomials, critical/triple points)
 *  - Proprieties2.json         (cp(T) engineering formulas, vapor saturation, etc.)
 *  - public/substance-data.json (legacy entries — kept when not redefined)
 *
 * Outputs a single JSON file the runtime can `import` directly. Safe to re-run.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'substance-data.json')

const prop1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'Proprieties.json'), 'utf8'))
const prop2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'Proprieties2.json'), 'utf8'))

// Look at legacy file only to preserve manually-curated saturation tables
// we want to keep (Water, R134a, R410a, R22, Ammonia, Methanol).
const legacy = JSON.parse(fs.readFileSync(OUT, 'utf8'))

/* ---------- helpers ----------------------------------------------------- */
const RU = 8.314462618 // J/(mol·K) universal gas constant

function findLegacy(key) {
  return (legacy.real || []).find((r) => r.key === key)
}

/** Parse a cp equation expressed as a string like
 *  "1.92 + 7.08e-4*T - 3.73e4*T^-2" into a callable form we can serialise.
 *  Returns { kind: 'expr', formula, rangeK: [min,max] } so the engine can evaluate.
 */
function parseCpExpr(formula, rangeK) {
  return { kind: 'expr', formula, rangeK }
}

/** Compute specific gas constant R in J/(kg·K) from molar mass M (kg/kmol). */
function rFromM(MkgPerKmol) {
  return RU / MkgPerKmol * 1000 // RU is J/(mol·K); *1000 = J/(kmol·K); /(kg/kmol) = J/(kg·K)
}

/** cp from a numeric table (no NASA polynomial) — derive R, cv, gamma from cp and k. */
function basicIdealGas({ name, key, formula, M_kgPerKmol, cp_kcal, k }) {
  // cp_kcal in kcal/(kg·K) — convert to J/(kg·K)
  const cp = cp_kcal * 4186.8
  const R = rFromM(M_kgPerKmol)
  // gamma = cp/(cp - R) implies cv = cp - R; spec says use k directly.
  const gamma = k
  const cv = cp - R
  return {
    key,
    name,
    formula,
    M: M_kgPerKmol,
    R,
    cp,
    cv,
    gamma,
    cpModel: 'constant',
  }
}

/* ---------- ideal gases from Proprieties2 ------------------------------- */
const idealGas20C = prop2.proprieta_gas_ideale_20C
const cpTempBlock = prop2.dipendenza_calore_specifico_temperatura

// Map of (Italian name → cp(T) entry) for quick lookup
const cpTempByName = new Map()
for (const e of cpTempBlock.dati) cpTempByName.set(e.sostanza.toLowerCase(), e)

const idealGases = []
for (const g of idealGas20C.dati) {
  const cpT = cpTempByName.get(g.gas.toLowerCase())
  // M in kg/kmol → kg/mol ×1000 already; g.M is kg/kmol → J/(kg·K) via 8314/M
  const M_kgPerKmol = g.M
  const base = basicIdealGas({
    name: { it: g.gas, en: englishName(g.gas) },
    key: slugKey(g.gas),
    formula: cpT?.formula_chimica ?? null,
    M_kgPerKmol,
    cp_kcal: g.cp0,
    k: g.k,
  })
  if (cpT) {
    base.cpModel = 'cp(T)'
    base.cpEquation = cpT.equazione_cp
    base.cpRangeK = cpT.campo_validita_K
    base.cpUnits = 'kJ/(kg·K)' // formula is in kJ/(kg·K) per spec
  }
  idealGases.push(base)
}

/* ---------- critical / triple / fundamental from Proprieties2 ----------- */
const fundamentals = prop2.parametri_fondamentali_sostanze_pure.dati
const fundamentalsByName = new Map()
for (const e of fundamentals) fundamentalsByName.set(e.sostanza.toLowerCase(), e)

/** Map ideal-gas keys to "real" counterparts (for those with known saturation data). */
const realByLegacyKey = new Map()
for (const r of legacy.real || []) realByLegacyKey.set(r.key, r)

const real = []

// Water (use the 79-point saturation table from Proprieties2)
const water = {
  key: 'Water',
  name: { it: 'Acqua', en: 'Water' },
  formula: 'H2O',
  molar_mass: 18.015,
  critical_pressure: 22.064e6,
  critical_temperature: 647.096,
  critical_density: 322,
  acentric_factor: 0.344,
  triple_point_temp: 273.16,
  triple_point_pressure: 611.657,
  normal_boiling_point: 373.15,
  saturation_table: buildSaturationTable(prop2.proprieta_vapor_d_acqua_saturo.dati),
}
real.push(water)

/** Build a saturation table keyed by T in the same shape as the legacy file. */
function buildSaturationTable(rows) {
  const out = {}
  for (const r of rows) {
    const Tk = r.T // K
    out[String(Tk)] = {
      P: r.p * 1e5, // bar → Pa
      T: Tk,
      vf: r.v_prime,
      vg: r.v_second,
      hf: r.h_prime * 1000, // kJ/kg → J/kg
      hg: r.h_second * 1000,
      sf: r.s_prime * 1000, // kJ/(kg·K) → J/(kg·K)
      sg: r.s_second * 1000,
    }
  }
  return out
}

/** Keep the legacy refrigerants — they have hand-tuned saturation tables. */
for (const legacyKey of ['R134a', 'R410a', 'R22', 'Ammonia', 'Methanol']) {
  const r = realByLegacyKey.get(legacyKey)
  if (r) real.push(r)
}

const output = {
  metadata: {
    version: '2.0',
    description: 'Substance database assembled from Proprieties.json + Proprieties2.json',
    sources: ['Proprieties.json', 'Proprieties2.json'],
    generated_at: new Date().toISOString(),
    universal_gas_constant_R_u: RU,
  },
  ideal_gas: idealGases,
  real,
  combustion: prop2.caratteristiche_combustibili,
}

/* ---------- helpers ----------------------------------------------------- */
function slugKey(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([a-z])/, (m) => m.toUpperCase())
}

function englishName(itName) {
  const m = {
    'Acqua': 'Water',
    'Ammoniaca': 'Ammonia',
    'Anidride carbonica': 'Carbon Dioxide',
    'Anidride solforosa': 'Sulfur Dioxide',
    'Argo': 'Argon',
    'Aria': 'Air',
    'Azoto': 'Nitrogen',
    'Elio': 'Helium',
    'Idrogeno': 'Hydrogen',
    'Metano': 'Methane',
    'Ossigeno': 'Oxygen',
    'Propano': 'Propane',
  }
  return m[itName] || itName
}

fs.writeFileSync(OUT, JSON.stringify(output, null, 2))
console.log(`Wrote ${OUT} (${idealGases.length} ideal gases, ${real.length} real fluids)`)
