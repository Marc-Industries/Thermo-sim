'use client'

import React, { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/Button'
import PropertyTable from '@/components/PropertyTable'
import ThermoChart from '@/components/ThermoChart'
import { toast } from 'sonner'

export default function CycleBuilder() {
  const { t, cycle, addToCycle, clearCycle, currentState } = useStore()
  const [selectedCycle, setSelectedCycle] = useState('rankine')

  const cycles = ['rankine', 'otto', 'diesel', 'brayton', 'carnot']

  const addStateToCycle = () => {
    if (!currentState) {
      toast.error('Seleziona uno stato prima')
      return
    }
    addToCycle(currentState)
    toast.success(`Stato aggiunto al ciclo (${cycle.length + 1} punti)`)
  }

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[300px_1fr]">
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_cycle')}</h2>
        <p className="mb-6 text-sm text-slate-500">Costruisci cicli termodinamici</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Tipo Ciclo</label>
        <select
          value={selectedCycle}
          onChange={(e) => setSelectedCycle(e.target.value)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {cycles.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>

        <div className="space-y-2 mb-4">
          <Button onClick={addStateToC ycle} className="w-full" variant="default">
            Aggiungi Stato
          </Button>
          <Button onClick={() => clearCycle()} className="w-full" variant="outline">
            Cancella Ciclo
          </Button>
        </div>

        <div className="border border-slate-700 p-3 rounded text-xs">
          <p className="text-slate-400">Punti nel ciclo: <span className="font-bold text-signal-red">{cycle.length}</span></p>
        </div>
      </div>

      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">Ciclo {selectedCycle.toUpperCase()}</h3>
        {cycle.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            <ThermoChart
              diagram="Ts"
              height={300}
              series={[
                {
                  name: 'ciclo',
                  color: '#ff3366',
                  points: cycle,
                  showDots: true,
                  showLine: true,
                },
              ]}
            />
            <div className="text-xs text-slate-400 p-3 border border-slate-800 rounded">
              <p>Ciclo con {cycle.length} stati caricati</p>
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 rounded text-sm text-slate-600">
            Aggiungi stati per visualizzare il ciclo →
          </div>
        )}
      </div>
    </div>
  )
}

