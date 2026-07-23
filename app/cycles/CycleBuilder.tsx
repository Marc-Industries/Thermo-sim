'use client'

import React, { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/Button'
import PropertyTable from '@/components/PropertyTable'
import ThermoChart from '@/components/ThermoChart'
import { toast } from 'sonner'

export default function CycleBuilder() {
  const { t, cycle, addToCycle, clearCycle, currentState, setCycle, removeFromCycle, moveCycleItem } = useStore()
  const [selectedCycle, setSelectedCycle] = useState('rankine')
  const dragIndex = useRef<number | null>(null)

  const cycles = ['rankine', 'otto', 'diesel', 'brayton', 'carnot']

  const addStateToCycle = () => {
    if (!currentState) {
      toast.error('Seleziona uno stato prima')
      return
    }
    addToCycle(currentState)
    toast.success(`Stato aggiunto al ciclo (${cycle.length + 1} punti)`)
  }

  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIndex.current === null) return
    const from = dragIndex.current
    const to = idx
    if (from !== to) moveCycleItem(from, to)
    dragIndex.current = null
  }

  const exportJSON = () => {
    try {
      const data = JSON.stringify({ cycle }, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cycle-${selectedCycle}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Snapshot esportato')
    } catch (e) {
      toast.error('Esportazione fallita')
    }
  }

  const importJSON = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const obj = JSON.parse(text)
      if (Array.isArray(obj.cycle)) {
        setCycle(obj.cycle)
        toast.success('Snapshot importato')
      } else {
        toast.error('Formato non valido')
      }
    } catch (e) {
      toast.error('Import fallita')
    }
  }

  const exportReport = async () => {
    try {
      const payload = { type: 'cycle', cycle }
      const res = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.markdown) {
        const blob = new Blob([data.markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cycle-report-${selectedCycle}.md`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success('Report Markdown scaricato')
      } else {
        toast.error('Export report fallito')
      }
    } catch (e) {
      toast.error('Export report fallito')
    }
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
          <Button onClick={addStateToCycle} className="w-full" variant="default">
            Aggiungi Stato
          </Button>
          <Button onClick={() => clearCycle()} className="w-full" variant="outline">
            Cancella Ciclo
          </Button>
        </div>

        <div className="border border-slate-700 p-3 rounded text-xs mb-4">
          <p className="text-slate-400">Punti nel ciclo: <span className="font-bold text-signal-red">{cycle.length}</span></p>
        </div>

        <div className="flex gap-2">
          <Button onClick={exportJSON} className="flex-1">Esporta JSON</Button>
          <label className="flex-1">
            <input type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0] ?? null)} className="hidden" />
            <Button className="w-full">Importa JSON</Button>
          </label>
        </div>

        <div className="mt-3">
          <Button onClick={exportReport} className="w-full">Esporta Report</Button>
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

            <div className="space-y-2">
              {cycle.map((st: any, idx: number) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, idx)}
                  className="flex items-center justify-between gap-2 border border-slate-700 p-2 rounded bg-slate-900/40"
                >
                  <div className="text-xs">
                    <div className="font-semibold">Stato {idx + 1}</div>
                    <div className="text-slate-400">P: {st.P ?? '-'}, T: {st.T ?? '-'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => removeFromCycle(idx)} variant="outline">Rimuovi</Button>
                  </div>
                </div>
              ))}
            </div>

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

