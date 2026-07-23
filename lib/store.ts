import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface PropValue {
  name: string
  value: number | string
}

export interface ThermoState {
  P?: number
  T?: number
  v?: number
  h?: number
  u?: number
  s?: number
  x?: number
  phase?: string
  substance?: string
}

interface UnitSystem extends Record<string, string> {
  P: string
  T: string
  h: string
  u: string
  s: string
}

interface Substance {
  key: string
  name: string | Record<string, string>
}

interface Store {
  // Language & Units
  lang: 'it' | 'en'
  setLang: (lang: 'it' | 'en') => void
  
  unitSystem: string
  setUnitSystem: (system: string) => void
  
  units: UnitSystem
  unitSystems: Record<string, UnitSystem>
  
  // Substances
  substances: Record<string, Substance[]>
  loadSubstances: (data: Record<string, Substance[]>) => void
  
  // Translations
  t: (key: string) => string
  L: (text: string | Record<string, string>) => string
  
  // State calculations
  currentState: ThermoState | null
  setCurrentState: (state: ThermoState | null) => void
  
  // Cycle builder
  cycle: ThermoState[]
  addToCycle: (state: ThermoState) => void
  clearCycle: () => void
}

const translations = {
  it: {
    appTagline: 'Simulazione e Calcolo Termodinamico',
    nav_state: 'Stato',
    nav_process: 'Processo',
    nav_cycle: 'Ciclo',
    nav_diagram: 'Diagrammi',
    model: 'Modello',
    ideal_gas: 'Gas Ideale',
    real: 'Fluido Reale',
    substance: 'Sostanza',
    knownProps: 'Inserisci due proprietà indipendenti',
    results: 'Risultati',
    computeState: 'Calcola Stato',
    calc: 'Calcolo...',
    saveErr: 'Errore nel calcolo',
  },
  en: {
    appTagline: 'Thermodynamic Simulation & Calculation',
    nav_state: 'State',
    nav_process: 'Process',
    nav_cycle: 'Cycle',
    nav_diagram: 'Diagrams',
    model: 'Model',
    ideal_gas: 'Ideal Gas',
    real: 'Real Fluid',
    substance: 'Substance',
    knownProps: 'Enter two independent properties',
    results: 'Results',
    computeState: 'Calculate State',
    calc: 'Computing...',
    saveErr: 'Calculation error',
  },
}

const unitSystems: Record<string, UnitSystem> = {
  SI: { P: 'Pa', T: 'K', h: 'J/kg', u: 'J/kg', s: 'J/kg·K' },
  SI_BAR: { P: 'bar', T: 'K', h: 'J/kg', u: 'J/kg', s: 'J/kg·K' },
  CGS: { P: 'dyne/cm²', T: 'K', h: 'erg/g', u: 'erg/g', s: 'erg/g·K' },
}

export const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        lang: 'it',
        setLang: (lang) => set({ lang }),
        
        unitSystem: 'SI',
        setUnitSystem: (system) => set({ unitSystem: system }),
        
        units: unitSystems['SI'],
        unitSystems,
        
        substances: {},
        loadSubstances: (data) => set({ substances: data }),
        
        t: (key) => {
          const lang = get().lang
          return (translations[lang] as Record<string, string>)[key] || key
        },
        
        L: (text) => {
          if (typeof text === 'string') return text
          return text[get().lang] || text['en'] || ''
        },
        
        currentState: null,
        setCurrentState: (state) => set({ currentState: state }),
        
        cycle: [],
        addToCycle: (state) => set((s) => ({ cycle: [...s.cycle, state] })),
        clearCycle: () => set({ cycle: [] }),
      }),
      {
        name: 'thermo-store',
        partialize: (state) => ({
          lang: state.lang,
          unitSystem: state.unitSystem,
          currentState: state.currentState,
          cycle: state.cycle,
        }),
      }
    )
  )
)
