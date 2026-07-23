'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useStore } from '@/lib/store'
import { Function, Thermometer, ArrowsClockwise, Gauge, ChartLine } from '@phosphor-icons/react'
import StateCalculator from '@/app/calculator/StateCalculator'
import ProcessAnalysis from '@/app/analysis/ProcessAnalysis'
import CycleBuilder from '@/app/cycles/CycleBuilder'
import Diagrams from '@/app/diagrams/Diagrams'

const NAV = [
  { key: 'calculator', icon: Thermometer, label: 'nav_state' },
  { key: 'analysis', icon: ArrowsClockwise, label: 'nav_process' },
  { key: 'cycles', icon: Gauge, label: 'nav_cycle' },
  { key: 'diagrams', icon: ChartLine, label: 'nav_diagram' },
]

const PAGES: Record<string, React.ComponentType> = {
  calculator: StateCalculator,
  analysis: ProcessAnalysis,
  cycles: CycleBuilder,
  diagrams: Diagrams,
}

export default function Shell() {
  const { t, lang, setLang, unitSystem, setUnitSystem, unitSystems } = useStore()
  const [tab, setTab] = useState('calculator')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const Active = PAGES[tab] || StateCalculator

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-signal-red">
              <Function size={20} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="font-head text-lg font-black leading-none tracking-tight">
                THERMONATOR <span className="text-signal-red">PRO</span>
              </h1>
              <p className="mt-0.5 text-[11px] text-slate-500">{t('appTagline')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value)}
              className="h-9 rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-xs text-slate-300"
              data-testid="unit-system-select"
            >
              {Object.keys(unitSystems).map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-sm border border-slate-700">
              {['it', 'en'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l as 'it' | 'en')}
                  data-testid={`lang-${l}`}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                    lang === l
                      ? 'bg-signal-red text-white'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex gap-0 overflow-x-auto border-t border-slate-800 px-5">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = tab === n.key
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                data-testid={`tab-${n.key}`}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'border-signal-red text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={16} weight={active ? 'fill' : 'regular'} />
                {t(n.label)}
              </button>
            )
          })}
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mx-auto w-full max-w-[1500px] px-4 py-6">
        <Active />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 px-5 py-4 text-center text-xs text-slate-600">
        Thermonator Pro · Rust + WebAssembly · Next.js + Vercel
      </footer>
    </div>
  )
}
