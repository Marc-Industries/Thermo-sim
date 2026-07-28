'use client'

import React, { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/Button'
import PropertyTable from '@/components/PropertyTable'
import PropField from '@/components/PropField'
import { toast } from 'sonner'
import { computeState } from '@/lib/api'
import { analyzeProcess, ProcessType } from '@/lib/thermo-engine'

export default function ProcessAnalysis() {
  const { t, substances, addToCycle, setCurrentState } = useStore()
  const [substance, setSubstance] = useState('Water')
  const [model, setModel] = useState<'real' | 'ideal_gas' | 'ideal_gas_cp_t'>('real')
  const [processType, setProcessType] = useState<ProcessType>('isobaric')
  const [polytropicN, setPolytropicN] = useState<string>('1.3')
  const [state1, setState1] = useState<any>(null)
  const [state2, setState2] = useState<any>(null)
  const [W, setW] = useState<number | null>(null)
  const [Q, setQ] = useState<number | null>(null)
  const [prop1_1, setProp1_1] = useState<{ name: string; value: number | string; unit?: string }>({ name: 'P', value: 101325, unit: 'Pa' })
  const [prop1_2, setProp1_2] = useState<{ name: string; value: number | string; unit?: string }>({ name: 'T', value: 373.15, unit: 'K' })
  const [prop2_1, setProp2_1] = useState<{ name: string; value: number | string; unit?: string }>({ name: 'P', value: 101325, unit: 'Pa' })
  const [prop2_2, setProp2_2] = useState<{ name: string; value: number | string; unit?: string }>({ name: 'h', value: 2676, unit: 'kJ/kg' })
  const [busy, setBusy] = useState(false)

  const processTypes: ProcessType[] = ['isobaric', 'isochoric', 'isothermal', 'adiabatic', 'polytropic']
  const propOptions = model === 'real' ? ['P', 'T', 'v', 'h', 's', 'x'] : ['P', 'T', 'v', 'h', 'u', 's']

  const compute = async () => {
    setBusy(true)
    try {
      const r1 = await computeState({
        model,
        substance,
        prop1: { name: prop1_1.name, value: Number(prop1_1.value), unit: prop1_1.unit || '' },
        prop2: { name: prop1_2.name, value: Number(prop1_2.value), unit: prop1_2.unit || '' },
      })
      const r2 = await computeState({
        model,
        substance,
        prop1: { name: prop2_1.name, value: Number(prop2_1.value), unit: prop2_1.unit || '' },
        prop2: { name: prop2_2.name, value: Number(prop2_2.value), unit: prop2_2.unit || '' },
      })
      setState1(r1.state)
      setState2(r2.state)
      // Process analysis
      const n = processType === 'polytropic' ? parseFloat(polytropicN) : undefined
      const out = analyzeProcess(model, substance, r1.state, r2.state, processType, n)
      setW(out.W); setQ(out.Q)
      // Push state 1 to store for cycle building
      setCurrentState({ ...r1.state, substance, model })
    } catch (e: any) {
      toast.error(e.message || t('saveErr'))
    } finally {
      setBusy(false)
    }
  }

  const subsList = (substances as any)[model === 'ideal_gas_cp_t' ? 'ideal_gas' : model] || []

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[440px_1fr]">
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_process')}</h2>
        <p className="mb-6 text-sm text-slate-500">Analizza trasformazioni tra due stati</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Modello</label>
        <div className="mb-4 flex flex-col gap-2">
          {[
            { key: 'ideal_gas', label: 'Gas ideale cp=cost' },
            { key: 'ideal_gas_cp_t', label: 'Gas ideale cp(T)' },
            { key: 'real', label: 'Fluido reale' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setModel(m.key as any)}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold text-left ${
                model === m.key ? 'bg-signal-red text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Sostanza</label>
        <select
          value={substance}
          onChange={(e) => setSubstance(e.target.value)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {subsList.map((s: any) => (
            <option key={s.key} value={s.key}>
              {typeof s.name === 'string' ? s.name : (s.name.it || s.name.en)}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Tipo Processo</label>
        <select
          value={processType}
          onChange={(e) => setProcessType(e.target.value as ProcessType)}
          className="mb-3 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {processTypes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {processType === 'polytropic' && (
          <div className="mb-4">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Esponente n</label>
            <input
              type="number"
              value={polytropicN}
              onChange={(e) => setPolytropicN(e.target.value)}
              step="0.05"
              className="h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
            />
          </div>
        )}

        <h3 className="mb-3 font-semibold">Stato 1</h3>
        <div className="space-y-3 mb-4">
          <PropField options={propOptions} prop={prop1_1} onChange={setProp1_1} testid="state1_prop1" />
          <PropField options={propOptions} prop={prop1_2} onChange={setProp1_2} testid="state1_prop2" />
        </div>

        <h3 className="mb-3 font-semibold">Stato 2</h3>
        <div className="space-y-3 mb-4">
          <PropField options={propOptions} prop={prop2_1} onChange={setProp2_1} testid="state2_prop1" />
          <PropField options={propOptions} prop={prop2_2} onChange={setProp2_2} testid="state2_prop2" />
        </div>

        <Button onClick={compute} disabled={busy} className="w-full">
          {busy ? t('calc') : 'Analizza Processo'}
        </Button>
      </div>

      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">Risultati</h3>
        {state1 && state2 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="border border-slate-800 p-3 rounded">
                <h4 className="mb-2 text-sm font-semibold text-slate-400">Stato 1</h4>
                <PropertyTable state={state1} units={{ P: 'Pa', T: 'K', v: 'm³/kg', h: 'J/kg', u: 'J/kg', s: 'J/(kg·K)' }} />
              </div>
              <div className="border border-slate-800 p-3 rounded">
                <h4 className="mb-2 text-sm font-semibold text-slate-400">Stato 2</h4>
                <PropertyTable state={state2} units={{ P: 'Pa', T: 'K', v: 'm³/kg', h: 'J/kg', u: 'J/kg', s: 'J/(kg·K)' }} />
              </div>
            </div>
            {W !== null && Q !== null && (
              <div className="border border-slate-700 p-4 rounded bg-slate-900/40">
                <h4 className="mb-2 font-semibold text-slate-300">Analisi del processo: {processType}</h4>
                <p className="text-sm">Lavoro specifico: <span className="font-mono text-signal-red">W = {W.toFixed(2)} J/kg</span></p>
                <p className="text-sm">Calore specifico: <span className="font-mono text-signal-blue">Q = {Q.toFixed(2)} J/kg</span></p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 rounded text-sm text-slate-600">
            Inserisci due stati per analizzare il processo →
          </div>
        )}
      </div>
    </div>
  )
}
