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
import { unitsFor, convertFromSI } from '@/lib/units'

type Model = 'ideal_gas' | 'ideal_gas_cp_t' | 'real'

export default function StateCalculator() {
  const { t, substances } = useStore()
  const [model, setModel] = React.useState<Model>('real')
  const [substance, setSubstance] = React.useState('Water')
  const [prop1, setProp1] = React.useState<{ name: string; value: number | string; unit?: string }>({ name: 'P', value: 101325, unit: 'Pa' })
  const [prop2, setProp2] = React.useState<{ name: string; value: number | string; unit?: string }>({ name: 'T', value: 373.15, unit: 'K' })
  const [result, setResult] = React.useState<any>(null)
  const [busy, setBusy] = React.useState(false)
  const [showSIHint, setShowSIHint] = React.useState(true)

  const subsList = (substances as any)[model] || []

  const onModel = (m: Model) => {
    setModel(m)
    if (m === 'real') {
      setSubstance('Water')
      setProp1({ name: 'P', value: 101325, unit: 'Pa' })
      setProp2({ name: 'T', value: 373.15, unit: 'K' })
    } else if (m === 'ideal_gas') {
      setSubstance('Aria')
      setProp1({ name: 'P', value: 101325, unit: 'Pa' })
      setProp2({ name: 'T', value: 288.15, unit: 'K' })
    } else {
      setSubstance('Aria')
      setProp1({ name: 'P', value: 101325, unit: 'Pa' })
      setProp2({ name: 'T', value: 500, unit: 'K' })
    }
    setResult(null)
  }

  const run = async () => {
    setBusy(true)
    try {
      // PropField already stores `value` in SI internally (it converts through
      // `convertToSI` on every input change). Sending the same `unit` again to
      // the server would cause a double conversion. Pass an empty unit so the
      // server treats the value as SI directly.
      const body = {
        model,
        substance,
        prop1: { name: prop1.name, value: parseFloat(String(prop1.value)), unit: '' },
        prop2: { name: prop2.name, value: parseFloat(String(prop2.value)), unit: '' },
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
    // addToCycle is omitted here; the CycleBuilder pulls from the store directly.
    toast.success('Stato pronto per il ciclo')
  }

  const modelOptions: { key: Model; label: string }[] = [
    { key: 'ideal_gas', label: 'Gas Ideale (cp=cost)' },
    { key: 'ideal_gas_cp_t', label: 'Gas Ideale cp(T)' },
    { key: 'real', label: 'Fluido Reale' },
  ]

  const propOptions = model === 'real'
    ? ['P', 'T', 'v', 'h', 's', 'x']
    : ['P', 'T', 'v', 'h', 'u', 's']

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[420px_1fr]">
      {/* INPUT PANEL */}
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_state')}</h2>
        <p className="mb-6 text-sm text-slate-500">{t('knownProps')}</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          {t('model')}
        </label>
        <div className="mb-4 flex flex-col gap-2">
          {modelOptions.map((m) => (
            <button
              key={m.key}
              onClick={() => onModel(m.key)}
              className={`rounded-sm px-3 py-2 text-xs font-semibold transition text-left ${
                model === m.key
                  ? 'bg-signal-red text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              data-testid={`model-${m.key}`}
            >
              {m.label}
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
          data-testid="substance-select"
        >
          {subsList.map((s: any) => (
            <option key={s.key} value={s.key}>
              {typeof s.name === 'string' ? s.name : s.name[t('lang')] || s.name.it}
            </option>
          ))}
        </select>

        <div className="space-y-3">
          <PropField
            options={propOptions}
            prop={prop1}
            onChange={setProp1}
            showSIHint={showSIHint}
            testid="prop1"
          />
          <PropField
            options={propOptions}
            prop={prop2}
            onChange={setProp2}
            showSIHint={showSIHint}
            testid="prop2"
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={showSIHint}
            onChange={(e) => setShowSIHint(e.target.checked)}
          />
          Mostra valore SI sotto ogni campo
        </label>

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
          <Button onClick={addState} className="mt-2 w-full gap-2 bg-signal-blue hover:bg-signal-blue/80">
            Aggiungi al ciclo
          </Button>
        )}
      </div>

      {/* RESULTS */}
      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">{t('results')}</h3>
        {result ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            <div className="border border-slate-800 p-3 rounded space-y-1">
              <PropertyTable
                state={result.state}
                units={Object.fromEntries(
                  Object.keys(result.state)
                    .filter(k => k !== 'phase')
                    .map(k => {
                      // Honour the unit the user picked in PropField when
                      // available, otherwise fall back to the canonical SI unit.
                      const userUnit =
                        k === prop1.name ? prop1.unit :
                        k === prop2.name ? prop2.unit :
                        ''
                      return [k, userUnit || unitsFor(k)[0] || '']
                    })
                ) as any}
              />
              {result.extra && (
                <div className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-400 mb-1">Costanti sostanza</p>
                  {Object.entries(result.extra).map(([k, v]) => (
                    <p key={k}>{k} = {(v as number).toFixed(3)}</p>
                  ))}
                </div>
              )}
            </div>
            <ThermoChart
              diagram="Ts"
              height={360}
              units={{ x: 'J/(kg·K)', y: 'K' }}
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
