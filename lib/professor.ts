/**
 * "Professor Mode" — convert a set of computed steps into a full symbolic
 * derivation + LaTeX + numerical substitution.
 *
 * The engine picks the appropriate derivations based on the requested cycle
 * type. For Rankine it walks the four states 1→2→3→4→1, explains each
 * transformation, applies the appropriate equation, and substitutes the
 * numerical values.
 *
 * Returns:
 *   - markdown:    full text with LaTeX math inside $...$ and $$...$$
 *   - latex:       standalone LaTeX (article class) suitable for tectonic /
 *                  pdflatex
 *   - steps:       structured array (used by the UI to render an interactive
 *                  walk-through)
 *   - summary:     one-line answer (η, COP, Wnet, etc.)
 */
import { computeThermodynamicState, analyzeCycle, CycleType, ThermodynamicState } from './thermo-engine'

export interface ProfessorPayload {
  type: 'state' | 'cycle' | 'process'
  cycle?: CycleType
  substance?: string
  model?: 'ideal_gas' | 'ideal_gas_cp_t' | 'real'
  state?: ThermodynamicState
  states?: ThermodynamicState[]
  prop1?: { name: string; value: number; unit?: string }
  prop2?: { name: string; value: number; unit?: string }
  extras?: Record<string, number>
}

export interface ProfessorOutput {
  markdown: string
  latex: string
  steps: { title: string; explanation: string; latex: string; numeric?: string }[]
  summary: string
}

const NUM = (x: number | undefined, digits = 3) =>
  x === undefined || x === null || Number.isNaN(x) ? '—' : Number(x).toFixed(digits)

export function generateProfessorReport(payload: ProfessorPayload): ProfessorOutput {
  const steps: ProfessorOutput['steps'] = []
  const md: string[] = []
  const tex: string[] = []

  if (payload.type === 'state' && payload.state) {
    return generateStateReport(payload)
  }
  if (payload.type === 'cycle' && payload.states) {
    return generateCycleReport(payload)
  }
  return {
    markdown: '# Professor Mode\n\nUnknown payload',
    latex: '% empty',
    steps: [],
    summary: '',
  }
}

function generateStateReport(p: ProfessorPayload): ProfessorOutput {
  const s = p.state || {}
  const steps: ProfessorOutput['steps'] = []
  const md: string[] = ['# Calcolo di uno Stato Termodinamico', '', "Sostanza: " + p.substance + " modello: " + p.model, '']
  const tex: string[] = ['\\section*{Calcolo di uno Stato Termodinamico}', `Sostanza: ${p.substance} (modello: ${p.model})']

  steps.push({
    title: 'Identificazione delle proprietà note',
    explanation: 'Inserisci due proprietà indipendenti per determinare lo stato. Il sistema sceglie le equazioni di stato appropriate al modello selezionato.',
    latex: '\\text{Date: } P = ' + NUM(s.P) + '\\ \\text{Pa},\\ T = ' + NUM(s.T) + '\\ \\text{K}',
  })
  md.push('- $P = ' + NUM(s.P) + '\\ \\text{Pa}$')
  md.push('- $T = ' + NUM(s.T) + '\\ \\text{K}$')
  md.push('- $v = ' + NUM(s.v) + '\\ \\text{m}^3/\\text{kg}$')
  md.push('- $h = ' + NUM(s.h) + '\\ \\text{J/kg}$')
  md.push('- $u = ' + NUM(s.u) + '\\ \\text{J/kg}$')
  md.push('- $s = ' + NUM(s.s) + '\\ \\text{J/(kg·K)}$')
  md.push('- Fase: ' + (s.phase ?? '—'))
  md.push('')

  if (p.model === 'ideal_gas' || p.model === 'ideal_gas_cp_t') {
    const cp = p.extras?.cp
    const R = p.extras?.R
    steps.push({
      title: 'Equazione di stato dei gas ideali',
      explanation: 'Per un gas ideale P·v = R·T. Da qui si ricava la terza proprietà.',
      latex: 'P v = R T',
      numeric: 'v = R·T / P = ' + R?.toFixed(2) + ' × ' + s.T?.toFixed(2) + ' / ' + s.P?.toFixed(2) + ' = ' + s.v?.toFixed(4) + ' m³/kg',
    })
    steps.push({
      title: 'Entalpia ed energia interna',
      explanation: 'Per gas ideale con ' + (p.model === 'ideal_gas_cp_t' ? 'cp variabile' : 'cp costante') + ':',
      latex: p.model === 'ideal_gas_cp_t'
        ? 'h = \\int_{T_{ref}}^{T} c_p(T)\\, dT,\\quad u = h - P v'
        : 'h = c_p (T - T_{ref}),\\quad u = c_v (T - T_{ref})',
      numeric: `h = ${NUM(s.h)} J/kg, u = ${NUM(s.u)} J/kg`,
    })
    steps.push({
      title: 'Entropia specifica',
      explanation: 'Per gas ideale:',
      latex: p.model === 'ideal_gas_cp_t'
        ? 's = \\int_{T_{ref}}^{T} \\frac{c_p(T)}{T}\\, dT - R \\ln\\frac{P}{P_{ref}}'
        : 's = c_p \\ln\\frac{T}{T_{ref}} - R \\ln\\frac{P}{P_{ref}}',
      numeric: `s = ${NUM(s.s)} J/(kg·K)`,
    })
    tex.push('\\begin{align*} P v &= R T \\\\ h &= c_p (T - T_{ref}) \\\\ s &= c_p \\ln\\frac{T}{T_{ref}} - R \\ln\\frac{P}{P_{ref}} \\end{align*}')
  } else {
    steps.push({
      title: 'Determinazione della fase (regione satura)',
      explanation: 'Dal confronto tra T e T_sat(P) il sistema identifica la fase: liquido sottoraffreddato, vapore surriscaldato, o miscela bifase.',
      latex: '\\text{Fase: } ' + (s.phase ?? '—'),
    })
    if (s.phase === 'two-phase') {
      steps.push({
        title: 'Calcolo del titolo x',
        explanation: 'Nella miscela bifase satura si interpola linearmente tra liquido saturo e vapore saturo alla T (o P) data.',
        latex: 'x = \\frac{h - h_f}{h_g - h_f}',
        numeric: `x = ${NUM(s.x)}`,
      })
    }
  }
  md.push('## Passaggi simbolici')
  md.push('')
  for (const s2 of steps) {
    md.push(`### ${s2.title}`)
    md.push(s2.explanation)
    md.push('')
    md.push('$$' + s2.latex + '$$')
    if (s2.numeric) md.push(`*Calcolo:* ${s2.numeric}`)
    md.push('')
  }

  return {
    markdown: md.join('\n'),
    latex: tex.join('\n'),
    steps,
    summary: `Stato calcolato (${s.phase}): P=${NUM(s.P)} Pa, T=${NUM(s.T)} K, h=${NUM(s.h)} J/kg, s=${NUM(s.s)} J/(kg·K)`,
  }
}

function generateCycleReport(p: ProfessorPayload): ProfessorOutput {
  const cycle = p.cycle || 'rankine'
  const states = p.states || []
  const subst = p.substance || 'Water'
  const md: string[] = ["# Svolgimento Ciclo " + cycle.toUpperCase(), '', "Sostanza: " + subst + " modello: " + p.model, '']
  const tex: string[] = ["\\section*{Svolgimento Ciclo " + cycle.toUpperCase() + "}", "Sostanza: " + subst + " modello: " + p.model]
  const steps: ProfessorOutput['steps'] = []

  // Walk through each state
  md.push('## Dati degli stati calcolati', '')
  for (let i = 0; i < states.length; i++) {
    const s = states[i]
    md.push(`### Stato ${i + 1}`)
    md.push(`- $P = ${NUM(s.P)}\\ \\text{Pa}$`)
    md.push(`- $T = ${NUM(s.T)}\\ \\text{K}$`)
    md.push(`- $h = ${NUM(s.h)}\\ \\text{J/kg}$`)
    md.push(`- $s = ${NUM(s.s)}\\ \\text{J/(kg·K)}$`)
    if (s.x !== undefined) md.push(`- $x = ${NUM(s.x)}$`)
    if (s.phase) md.push(`- fase: ${s.phase}`)
    md.push('')
  }

  // Now derive process by process
  md.push('## Derivazione dei processi', '')
  steps.push({
    title: 'Schema del ciclo',
    explanation: `Il ciclo ${cycle.toUpperCase()} è composto da ${states.length} stati consecutivi. Applichiamo il I Principio della Termodinamica a ciascuna trasformazione:`,
    latex: '\\sum Q = \\sum W',
  })
  md.push('Schema del ciclo: ⚙️ I Principio della Termodinamica:\n')
  md.push('$$\\sum Q = \\sum W$$')
  md.push('')

  const perProcess: { from: number; to: number; W: number; Q: number }[] = []
  let Wnet = 0, Qin = 0, Qout = 0
  for (let i = 0; i < states.length; i++) {
    const a = states[i]
    const b = states[(i + 1) % states.length]
    const W = ((a.P ?? 0) + (b.P ?? 0)) / 2 * ((b.v ?? 0) - (a.v ?? 0))
    const Q = ((b.u ?? 0) - (a.u ?? 0)) + W
    perProcess.push({ from: i + 1, to: ((i + 1) % states.length) + 1, W, Q })
    Wnet += W
    if (Q > 0) Qin += Q
    else if (Q < 0) Qout += -Q
  }

  // Cycle-specific derivation
  if (cycle === 'rankine' || cycle === 'rankine_superheated' || cycle === 'rankine_reheat') {
    steps.push(...rankineDerivation(states, perProcess))
  } else if (cycle === 'otto') {
    steps.push(...ottoDerivation(states, perProcess))
  } else if (cycle === 'diesel') {
    steps.push(...dieselDerivation(states, perProcess))
  } else if (cycle === 'brayton') {
    steps.push(...braytonDerivation(states, perProcess))
  } else if (cycle === 'carnot') {
    steps.push(...carnotDerivation(states, perProcess))
  }

  // Per-process table
  md.push('## Tabella di processo', '')
  md.push('| Trasformazione | Lavoro W [J/kg] | Calore Q [J/kg] |')
  md.push('|---|---|---|')
  for (const p of perProcess) {
    md.push(`| ${p.from}→${p.to} | ${p.W.toFixed(2)} | ${p.Q.toFixed(2)} |`)
  }
  md.push('')

  const eta = Qin > 0 ? Wnet / Qin : 0
  const summary = `Ciclo ${cycle}: Wnet=${Wnet.toFixed(2)} J/kg, Qin=${Qin.toFixed(2)} J/kg, η=${eta.toFixed(3)}`

  md.push('## Risultati', '')
  md.push(`- **Lavoro netto**: $W_{net} = ${Wnet.toFixed(2)}\\ \\text{J/kg}$`)
  md.push(`- **Calore introdotto**: $Q_{in} = ${Qin.toFixed(2)}\\ \\text{J/kg}$`)
  md.push(`- **Calore ceduto**: $Q_{out} = ${Qout.toFixed(2)}\\ \\text{J/kg}$`)
  md.push(`- **Rendimento termico**: $\\eta = ${eta.toFixed(4)}$`)
  if (Wnet < 0) {
    const COP = Qout / Math.abs(Wnet)
    md.push(`- **COP (come refrigerator)**: $COP = ${COP.toFixed(3)}$`)
  }
  md.push('')

  // Build full LaTeX doc
  tex.push('\\begin{align*}')
  for (const p of perProcess) {
    tex.push(`W_{${p.from}\\to${p.to}} &= ${p.W.toFixed(2)}\\ \\text{J/kg} \\\\`)
  }
  tex.push('W_{net} &= ' + Wnet.toFixed(2) + '\\ \\text{J/kg} \\\\')
  tex.push('Q_{in} &= ' + Qin.toFixed(2) + '\\ \\text{J/kg} \\\\')
  tex.push('Q_{out} &= ' + Qout.toFixed(2) + '\\ \\text{J/kg} \\\\')
  tex.push('\\eta &= \\frac{W_{net}}{Q_{in}} = ' + eta.toFixed(4))
  tex.push('\\end{align*}')

  for (const s2 of steps) {
    md.push(`### ${s2.title}`)
    md.push(s2.explanation)
    md.push('')
    md.push('$$' + s2.latex + '$$')
    if (s2.numeric) md.push(`*Calcolo:* ${s2.numeric}`)
    md.push('')
  }

  return {
    markdown: md.join('\n'),
    latex: buildFullLatexDoc(`Svolgimento Ciclo ${cycle.toUpperCase()}`, tex.join('\n')),
    steps,
    summary,
  }
}

function rankineDerivation(states: ThermodynamicState[], per: any[]) {
  const steps: ProfessorOutput['steps'] = []
  const s1 = states[0] || {}, s2 = states[1] || {}, s3 = states[2] || {}, s4 = states[3] || {}
  steps.push({
    title: 'Processo 1→2: Compressione (pompa)',
    explanation: 'La pompa è isentropica (reversibile+adiabatica). Il lavoro specifico è approssimato da w_p = v_1 (P_2 − P_1) per liquidi incomprimibili.',
    latex: 'w_{pump} = \\int_1^2 v\\, dP \\approx v_1 (P_2 - P_1)',
    numeric: `w_p = ${NUM(s1.v)} × (${NUM(s2.P)} − ${NUM(s1.P)}) = ${per[0]?.W.toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Processo 2→3: Riscaldamento (caldaia)',
    explanation: 'In caldaia il fluido riceve calore a pressione circa costante. Per fluido bifase saturo (Rankine semplice) h_3 = h_g(T_3).',
    latex: 'q_{in} = h_3 - h_2',
    numeric: `q_in = ${NUM(s3.h)} − ${NUM(s2.h)} = ${(per[1]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Processo 3→4: Espansione (turbina)',
    explanation: 'Turbina isoentropica: la variazione di entalpia fornisce il lavoro specifico.',
    latex: 'w_{turb} = h_3 - h_4',
    numeric: `w_t = ${NUM(s3.h)} − ${NUM(s4.h)} = ${(per[2]?.W ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Processo 4→1: Condensazione (condensatore)',
    explanation: 'Calore ceduto a pressione costante. Per il titolo in uscita: x_4 = (h_4 − h_f) / (h_g − h_f).',
    latex: 'q_{out} = h_4 - h_1',
    numeric: `q_out = ${NUM(s4.h)} − ${NUM(s1.h)} = ${(per[3]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Bilancio del ciclo',
    explanation: 'Il rendimento termico del Rankine è dato dal rapporto tra lavoro netto e calore introdotto:',
    latex: '\\eta = \\frac{w_{net}}{q_{in}} = \\frac{(h_3 - h_4) - (h_2 - h_1)}{h_3 - h_2}',
  })
  return steps
}

function ottoDerivation(states: ThermodynamicState[], per: any[]) {
  const steps: ProfessorOutput['steps'] = []
  const s1 = states[0] || {}, s2 = states[1] || {}, s3 = states[2] || {}, s4 = states[3] || {}
  steps.push({
    title: '1→2: Compressione isoentropica',
    explanation: 'Per gas ideale la compressione isoentropica ha T_2 = T_1 (P_2/P_1)^{(γ-1)/γ}.',
    latex: 'T_2 = T_1 \\left(\\frac{P_2}{P_1}\\right)^{(\\gamma-1)/\\gamma}',
    numeric: `T_2 = ${NUM(s1.T, 2)} × (${NUM(s2.P, 0)}/${NUM(s1.P, 0)})^{(γ-1)/γ} = ${NUM(s2.T, 2)} K`,
  })
  steps.push({
    title: '2→3: Riscaldamento isocoro',
    explanation: 'A volume costante il calore introdotto è q_in = c_v (T_3 − T_2).',
    latex: 'q_{in} = c_v (T_3 - T_2)',
    numeric: `q_in = ${(per[1]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: '3→4: Espansione isoentropica',
    explanation: 'Espansione isoentropica fino a V_4 = V_1.',
    latex: 'T_4 = T_3 \\left(\\frac{P_4}{P_3}\\right)^{(\\gamma-1)/\\gamma}',
    numeric: `T_4 = ${NUM(s4.T, 2)} K`,
  })
  steps.push({
    title: '4→1: Raffreddamento isocoro',
    explanation: 'Calore ceduto: q_out = c_v (T_4 − T_1).',
    latex: 'q_{out} = c_v (T_4 - T_1)',
    numeric: `q_out = ${(per[3]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Rendimento Otto',
    explanation: 'Per il ciclo Otto ideale: η = 1 − 1/r^{γ−1} con r = V_1/V_2.',
    latex: '\\eta = 1 - \\frac{1}{r^{\\gamma - 1}}',
  })
  return steps
}

function dieselDerivation(states: ThermodynamicState[], per: any[]) {
  const steps: ProfessorOutput['steps'] = []
  const s1 = states[0] || {}, s2 = states[1] || {}, s3 = states[2] || {}, s4 = states[3] || {}
  steps.push({
    title: '1→2: Compressione isoentropica',
    explanation: 'Compressione adiabatica reversibile.',
    latex: 'T_2 = T_1 (P_2/P_1)^{(\\gamma-1)/\\gamma}',
    numeric: `T_2 = ${NUM(s2.T, 2)} K`,
  })
  steps.push({
    title: '2→3: Combustione isobara',
    explanation: 'Calore introdotto a pressione costante: q_in = c_p (T_3 − T_2).',
    latex: 'q_{in} = c_p (T_3 - T_2)',
    numeric: `q_in = ${(per[1]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: '3→4: Espansione isoentropica',
    explanation: 'Espansione fino al volume iniziale.',
    latex: 'T_4 = T_3 (P_4/P_3)^{(\\gamma-1)/\\gamma}',
    numeric: `T_4 = ${NUM(s4.T, 2)} K`,
  })
  steps.push({
    title: '4→1: Raffreddamento isocoro',
    explanation: 'Calore ceduto a volume costante.',
    latex: 'q_{out} = c_v (T_4 - T_1)',
    numeric: `q_out = ${(per[3]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Rendimento Diesel',
    explanation: 'η = 1 − (1/r^{γ−1}) · (ρ^γ − 1)/(γ(ρ − 1)) con r rapporto di compressione e ρ = V_3/V_2 rapporto di taglio.',
    latex: '\\eta = 1 - \\frac{1}{r^{\\gamma-1}} \\cdot \\frac{\\rho^\\gamma - 1}{\\gamma(\\rho - 1)}',
  })
  return steps
}

function braytonDerivation(states: ThermodynamicState[], per: any[]) {
  const steps: ProfessorOutput['steps'] = []
  const s1 = states[0] || {}, s2 = states[1] || {}, s3 = states[2] || {}, s4 = states[3] || {}
  steps.push({
    title: '1→2: Compressione isoentropica',
    explanation: 'Compressione adiabatica reversibile.',
    latex: 'T_2 = T_1 (P_2/P_1)^{(\\gamma-1)/\\gamma}',
    numeric: `T_2 = ${NUM(s2.T, 2)} K`,
  })
  steps.push({
    title: '2→3: Riscaldamento isobaro',
    explanation: 'Calore introdotto a pressione costante: q_in = c_p (T_3 − T_2).',
    latex: 'q_{in} = c_p (T_3 - T_2)',
    numeric: `q_in = ${(per[1]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: '3→4: Espansione isoentropica',
    explanation: 'Espansione in turbina.',
    latex: 'T_4 = T_3 (P_4/P_3)^{(\\gamma-1)/\\gamma}',
    numeric: `T_4 = ${NUM(s4.T, 2)} K`,
  })
  steps.push({
    title: '4→1: Raffreddamento isobaro',
    explanation: 'Calore ceduto a pressione costante.',
    latex: 'q_{out} = c_p (T_4 - T_1)',
    numeric: `q_out = ${(per[3]?.Q ?? 0).toFixed(2)} J/kg`,
  })
  steps.push({
    title: 'Rendimento Brayton',
    explanation: 'η = 1 − (P_1/P_2)^{(γ−1)/γ}.',
    latex: '\\eta = 1 - \\left(\\frac{P_1}{P_2}\\right)^{(\\gamma-1)/\\gamma}',
  })
  return steps
}

function carnotDerivation(states: ThermodynamicState[], per: any[]) {
  const steps: ProfessorOutput['steps'] = []
  const s1 = states[0] || {}, s2 = states[1] || {}, s3 = states[2] || {}, s4 = states[3] || {}
  steps.push({
    title: '1→2: Espansione isoterma',
    explanation: 'Il sistema assorbe calore Q_in dalla sorgente calda a T_H > T_C.',
    latex: 'q_{in} = T_H (s_2 - s_1)',
  })
  steps.push({
    title: '2→3: Espansione isoentropica',
    explanation: 'Raffreddamento adiabatico reversibile dalla T_H alla T_C.',
    latex: 's_3 = s_2',
  })
  steps.push({
    title: '3→4: Compressione isoterma',
    explanation: 'Cessione di calore Q_out alla sorgente fredda.',
    latex: 'q_{out} = T_C (s_4 - s_3)',
  })
  steps.push({
    title: '4→1: Compressione isoentropica',
    explanation: 'Riscaldamento adiabatico reversibile.',
    latex: 's_1 = s_4',
  })
  steps.push({
    title: 'Rendimento Carnot',
    explanation: 'Il rendimento dipende solo dalle temperature delle due sorgenti:',
    latex: '\\eta = 1 - \\frac{T_C}{T_H}',
    numeric: `η = 1 − ${NUM(s4.T, 2)} / ${NUM(s1.T, 2)} = ${(1 - (s4.T ?? 0) / (s1.T ?? 1)).toFixed(4)}`,
  })
  return steps
}

function buildFullLatexDoc(title: string, body: string): string {
  return `\\documentclass[11pt,a4paper]{article}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage[utf8]{inputenc}
\\title{${escape(title)}}
\\date{\\today}
\\begin{document}
\\maketitle
${body}
\\end{document}`
}

function escape(s: string): string {
  return s.replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/_/g, '\\_')
}
