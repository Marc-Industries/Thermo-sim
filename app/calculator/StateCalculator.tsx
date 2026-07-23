'use client'

import React from 'react'
import { Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/Button'
import { useStore } from '@/lib/store'
import PropField from '@/components/PropField'
import PropertyTable from '@/components/PropertyTable'
import ThermoChart from '@/components/ThermoChart'
import { toast } from 'sonner'
import { computeState } from '@/lib/api'

export default function StateCalculator() {
  const { t, units, substances, addToCycle } = useStore()
  const [model, setModel] = React.useState<'ideal_gas' | 'real'>('real')
  const [substance, setSubstance] = React.useState('Water')
  const [prop1, setProp1] = React.useState<{ name: string; value: number | string }>({ name: 'P', value: 101325 })
  const [prop2, setProp2] = React.useState<{ name: string; value: number | string }>({ name: 'T', value: 373.15 })
  const [result, setResult] = React.useState<any>(null)
  const [busy, setBusy] = React.useState(false)

  const subsList = substances[model] || []

  const onModel = (m: 'ideal_gas' | 'real') => {
    setModel(m)
    setSubstance(m === 'real' ? 'Water' : 'Air')
    setProp1({ name: 'P', value: m === 'real' ? 101325 : 101325 })
    setProp2({ name: 'T', value: m === 'real' ? 373.15 : 288.15 })
    setResult(null)
  }

  const run = async () => {
    setBusy(true)
    try {
      const body = {
        model,
        substance,
        prop1: {
          name: prop1.name,
          value: parseFloat(String(prop1.value)),
          unit: (units as Record<string, string>)[prop1.name] || 'SI',
        },
        prop2: {
          name: prop2.name,
          value: parseFloat(String(prop2.value)),
          unit: (units as Record<string, string>)[prop2.name] || 'SI',
        },
        units,
      }
      const data = await computeState(body)
      setResult(data)
      toast.success('Stato calcolato')
    } catch (e: any) {
      toast.error(e?.message || t('saveErr'))
      setResult(null)
    } finally {
      setBusy(false)
    }
  }

  const addState = () => {
    if (!result?.state) return
    addToCycle({
      ...result.state,
      substance,
      model,
    })
    toast.success('Stato aggiunto al ciclo')
  }

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[380px_1fr]">
      {/* INPUT PANEL */}
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_state')}</h2>
        <p className="mb-6 text-sm text-slate-500">{t('knownProps')}</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          {t('model')}
        </label>
        <div className="mb-4 flex gap-2">
          {['ideal_gas', 'real'].map((m: any) => (
            <button
              key={m}
              onClick={() => onModel(m)}
              className={`flex-1 rounded-sm px-3 py-2 text-xs font-semibold transition ${
                model === m
                  ? 'bg-signal-red text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(m)}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          {t('substance')}
        </label>
        <select
          value={substance}
          onChange={(e) => setSubstance(e.target.value)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {subsList.map((s: any) => (
            <option key={s.key} value={s.key}>
              {typeof s.name === 'string' ? s.name : s.name[t('lang')]}
            </option>
          ))}
        </select>

        <div className="space-y-3">
          <PropField
            options={model === 'real' ? ['P', 'T', 'v', 'h', 's', 'x'] : ['P', 'T', 'v', 's']}
            prop={prop1}
            onChange={setProp1}
            units={units}
            testid="prop1"
          />
          <PropField
            options={model === 'real' ? ['P', 'T', 'v', 'h', 's', 'x'] : ['P', 'T', 'v', 's']}
            prop={prop2}
            onChange={setProp2}
            units={units}
            testid="prop2"
          />
        </div>

        <Button
          onClick={run}
          disabled={busy}
          className="mt-6 w-full gap-2"
          data-testid="compute-state-btn"
        >
          <Lightning size={16} weight="fill" />
          {busy ? t('calc') : t('computeState')}
        </Button>
        
        {result && (
          <Button
            onClick={addState}
            className="mt-2 w-full gap-2 bg-signal-blue hover:bg-signal-blue/80"
          >
            Aggiungi al ciclo
          </Button>
        )}
      </div>

      {/* RESULTS */}
      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">{t('results')}</h3>
        {result ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
            <div className="border border-slate-800 p-3 rounded">
              <PropertyTable state={result.state} units={units} />
            </div>
            <ThermoChart
              diagram="Ts"
              height={360}
              series={[
                {
                  name: 'state',
                  color: '#ff3366',
                  points: [result.state],
                  showDots: true,
                  showLine: false,
                  big: true,
                },
              ]}
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 rounded text-sm text-slate-600">
            {t('knownProps')} →
          </div>
        )}
      </div>
    </div>
  )
}
