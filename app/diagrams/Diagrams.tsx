'use client'

import React, { useState } from 'react'
import { useStore } from '@/lib/store'
import ThermoChart from '@/components/ThermoChart'
import { Button } from '@/components/Button'

export default function Diagrams() {
  const { t } = useStore()
  const [selectedDiagram, setSelectedDiagram] = useState('Ts')

  const diagrams = ['Ts', 'Pv', 'Ph', 'Hs', 'Tv', 'Ps']

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[200px_1fr]">
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_diagram')}</h2>
        <p className="mb-6 text-sm text-slate-500">Diagrammi termodinamici</p>

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
      </div>

      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">
          Diagramma {selectedDiagram}
        </h3>
        <ThermoChart
          diagram={selectedDiagram as any}
          height={500}
          series={[
            {
              name: 'reference',
              color: '#94a3b8',
              points: [
                { [selectedDiagram[0].toLowerCase()]: 5, [selectedDiagram[1].toLowerCase()]: 400 },
                { [selectedDiagram[0].toLowerCase()]: 8, [selectedDiagram[1].toLowerCase()]: 600 },
              ],
              showDots: true,
              showLine: true,
            },
          ]}
        />
        <p className="mt-4 text-xs text-slate-500 text-center">
          Piano {selectedDiagram} - Aggiungi stati dal Calculator per visualizzarli
        </p>
      </div>
    </div>
  )
}

