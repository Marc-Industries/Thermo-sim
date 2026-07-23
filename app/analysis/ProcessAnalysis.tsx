'use client'

import React, { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/Button'
import PropertyTable from '@/components/PropertyTable'
import PropField from '@/components/PropField'
import { toast } from 'sonner'
import { computeState } from '@/lib/api'

export default function ProcessAnalysis() {
  const { t, units, substances } = useStore()
  const [substance, setSubstance] = useState('Water')
  const [processType, setProcessType] = useState('isobaric')
  const [state1, setState1] = useState<any>(null)
  const [state2, setState2] = useState<any>(null)
  const [prop1_1, setProp1_1] = useState<{ name: string; value: string | number }>({ name: 'P', value: 1 })
  const [prop1_2, setProp1_2] = useState<{ name: string; value: string | number }>({ name: 'T', value: 373 })
  const [prop2_1, setProp2_1] = useState<{ name: string; value: string | number }>({ name: 'P', value: 1 })
  const [prop2_2, setProp2_2] = useState<{ name: string; value: string | number }>({ name: 'h', value: 2600 })
  const [busy, setBusy] = useState(false)

  const processTypes = ['isobaric', 'isochoric', 'isothermal', 'adiabatic', 'polytropic']

  const compute = async () => {
    setBusy(true)
    try {
      const r1 = await computeState({
        model: 'real',
        substance,
        prop1: { ...prop1_1, unit: (units as any)[prop1_1.name] },
        prop2: { ...prop1_2, unit: (units as any)[prop1_2.name] },
        units,
      })
      const r2 = await computeState({
        model: 'real',
        substance,
        prop1: { ...prop2_1, unit: (units as any)[prop2_1.name] },
        prop2: { ...prop2_2, unit: (units as any)[prop2_2.name] },
        units,
      })
      setState1(r1.state)
      setState2(r2.state)
    } catch (e: any) {
      toast.error(e.message || t('saveErr'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[400px_1fr]">
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_process')}</h2>
        <p className="mb-6 text-sm text-slate-500">Analizza trasformazioni tra due stati</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Tipo Processo</label>
        <select
          value={processType}
          onChange={(e) => setProcessType(e.target.value)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {processTypes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Sostanza</label>
        <select
          value={substance}
          onChange={(e) => setSubstance(e.target.value)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {(substances.real || []).map((s: any) => (
            <option key={s.key} value={s.key}>
              {typeof s.name === 'string' ? s.name : s.name.it}
            </option>
          ))}
        </select>

        <h3 className="mb-3 font-semibold">Stato 1</h3>
        <div className="space-y-3 mb-4">
          <PropField
            options={['P', 'T', 'v', 'h', 's', 'x']}
            prop={prop1_1}
            onChange={setProp1_1}
            units={units}
            testid="state1_prop1"
          />
          <PropField
            options={['P', 'T', 'v', 'h', 's', 'x']}
            prop={prop1_2}
            onChange={setProp1_2}
            units={units}
            testid="state1_prop2"
          />
        </div>

        <h3 className="mb-3 font-semibold">Stato 2</h3>
        <div className="space-y-3 mb-4">
          <PropField
            options={['P', 'T', 'v', 'h', 's', 'x']}
            prop={prop2_1}
            onChange={setProp2_1}
            units={units}
            testid="state2_prop1"
          />
          <PropField
            options={['P', 'T', 'v', 'h', 's', 'x']}
            prop={prop2_2}
            onChange={setProp2_2}
            units={units}
            testid="state2_prop2"
          />
        </div>

        <Button onClick={compute} disabled={busy} className="w-full">
          {busy ? t('calc') : 'Analizza Processo'}
        </Button>
      </div>

      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">Risultati</h3>
        {state1 && state2 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="border border-slate-800 p-3 rounded">
              <h4 className="mb-2 text-sm font-semibold text-slate-400">Stato 1</h4>
              <PropertyTable state={state1} units={units} />
            </div>
            <div className="border border-slate-800 p-3 rounded">
              <h4 className="mb-2 text-sm font-semibold text-slate-400">Stato 2</h4>
              <PropertyTable state={state2} units={units} />
            </div>
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

