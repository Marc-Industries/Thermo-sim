'use client'

import React, { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import ThermoChart from '@/components/ThermoChart'
import { Button } from '@/components/Button'
import { buildSaturationCurve } from '@/lib/thermo-engine'

export default function Diagrams() {
  const { t, cycle } = useStore()
  const [selectedDiagram, setSelectedDiagram] = useState('Ts')
  const [substance, setSubstance] = useState('Water')

  const diagrams = ['Ts', 'Pv', 'Ph', 'Hs', 'Tv', 'Ps']
  const substances = ['Water', 'R134a', 'R410a', 'R22', 'Ammoniaca', 'Metanolo']

  // Build the saturation envelope for the chosen substance / diagram.
  // All six planes supported: Ts/Pv/Ph/Hs/Tv/Ps.
  const satSeries = useMemo(() => {
    const pts = buildSaturationCurve(substance, selectedDiagram as any)
    if (!pts.length) return []
    const liquid = pts.filter((p: any) => p.series === 'liquid')
    const vapor = pts.filter((p: any) => p.series === 'vapor')
    return [
      { name: 'sat. liquid', color: '#38bdf8', points: liquid, showDots: false, showLine: true },
      { name: 'sat. vapor', color: '#f97316', points: vapor, showDots: false, showLine: true },
    ]
  }, [substance, selectedDiagram])

  const cycleSeries = useMemo(() => {
    if (!cycle.length) return []
    return [
      {
        name: 'ciclo',
        color: '#ff3366',
        points: cycle,
        showDots: true,
        showLine: true,
      },
    ]
  }, [cycle])

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[220px_1fr]">
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_diagram')}</h2>
        <p className="mb-6 text-sm text-slate-500">Diagrammi termodinamici</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Sostanza (per saturazione)
        </label>
        <select
          value={substance}
          onChange={(e) => setSubstance(e.target.value)}
          className="mb-4 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {substances.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Diagramma
        </label>
        <div className="space-y-2">
          {diagrams.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiagram(d)}
              className={`w-full px-3 py-2 rounded-sm text-sm font-semibold transition ${
                selectedDiagram === d
                  ? 'bg-signal-red text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-4 border border-slate-700 p-3 rounded text-xs space-y-1">
          <p className="text-slate-400">Curve di saturazione:</p>
          <p><span className="inline-block w-3 h-3 bg-sky-400 mr-1" /> sat. liquid</p>
          <p><span className="inline-block w-3 h-3 bg-orange-500 mr-1" /> sat. vapor</p>
          <p className="text-slate-400 pt-2">Punti nel ciclo: <span className="font-bold text-signal-red">{cycle.length}</span></p>
        </div>
      </div>

      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">
          Diagramma {selectedDiagram} — {substance}
        </h3>
        <ThermoChart
          diagram={selectedDiagram as any}
          height={520}
          series={[...satSeries, ...cycleSeries]}
        />
        <p className="mt-4 text-xs text-slate-500 text-center">
          {cycle.length === 0
            ? 'Aggiungi stati dal tab Stato e costruisci un ciclo per vederli qui.'
            : `Mostrati ${cycle.length} stati del ciclo.`}
        </p>
      </div>
    </div>
  )
}

