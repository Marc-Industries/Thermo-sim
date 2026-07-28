import React from 'react'
import { unitsFor, defaultUnitFor, convertToSI, convertFromSI } from '@/lib/units'

interface PropFieldProps {
  options: string[]
  prop: { name: string; value: number | string; unit?: string }
  onChange: (prop: { name: string; value: number | string; unit?: string }) => void
  onUnitChange?: (unit: string) => void
  units?: Record<string, string> // legacy units map (still used as initial fallback)
  testid?: string
  showUnitSelect?: boolean
  showSIHint?: boolean
}

/**
 * Input field for one thermodynamic property.
 *
 * Composes:
 *  - a property selector (P/T/v/h/u/s/x)
 *  - a numeric input
 *  - a per-field unit dropdown (driven by lib/units)
 *
 * When the user changes the unit, the displayed value is re-scaled so the
 * underlying SI value stays constant. When the user changes the numeric
 * input, the value is stored in SI internally.
 */
export default function PropField({
  options,
  prop,
  onChange,
  onUnitChange,
  units,
  testid,
  showUnitSelect = true,
  showSIHint = false,
}: PropFieldProps) {
  const allUnits = unitsFor(prop.name)
  const initialUnit = prop.unit ?? (units && (units as any)[prop.name]) ?? defaultUnitFor(prop.name)
  const [unit, setUnit] = React.useState<string>(initialUnit || '')

  // When the property changes, reset the unit to the default for that property.
  React.useEffect(() => {
    const next = prop.unit ?? defaultUnitFor(prop.name)
    setUnit(next)
  }, [prop.name])

  const currentSI = React.useMemo(() => {
    const v = typeof prop.value === 'string' ? parseFloat(prop.value) : prop.value
    if (Number.isNaN(v as number)) return undefined
    // If the input is already in SI for the chosen unit, convert back from SI.
    return v
  }, [prop.value])

  // Display value in the chosen unit (so the input shows the user-friendly form).
  const displayValue = React.useMemo(() => {
    if (currentSI === undefined) return prop.value as any
    const v = convertFromSI(prop.name, currentSI as number, unit)
    if (typeof v === 'number' && Number.isFinite(v)) return Number(v.toFixed(6)).toString()
    return v as any
  }, [currentSI, unit, prop.name, prop.value])

  const handleValueChange = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (Number.isNaN(num as number)) {
      onChange({ ...prop, value: val, unit })
      return
    }
    const si = convertToSI(prop.name, num as number, unit)
    onChange({ ...prop, value: si, unit })
  }

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit)
    onUnitChange?.(newUnit)
  }

  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
        {prop.name}
      </label>
      <div className="flex gap-2">
        <select
          value={prop.name}
          onChange={(e) => onChange({ ...prop, name: e.target.value, unit: defaultUnitFor(e.target.value) })}
          className="h-10 w-20 rounded-sm border border-slate-700 bg-slate-900/60 px-2 text-sm text-slate-300"
          data-testid={`${testid}-select`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => handleValueChange(e.target.value)}
          className="flex-1 rounded-sm border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 placeholder-slate-600"
          placeholder="0"
          data-testid={`${testid}-input`}
        />
        {showUnitSelect && allUnits.length > 0 && (
          <select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="h-10 w-24 rounded-sm border border-slate-700 bg-slate-900/60 px-2 text-xs text-slate-300"
            data-testid={`${testid}-unit`}
            title="Unit of measurement"
          >
            {allUnits.map((u) => (
              <option key={u || 'si'} value={u}>
                {u || 'SI'}
              </option>
            ))}
          </select>
        )}
      </div>
      {showSIHint && typeof currentSI === 'number' && (
        <p className="mt-1 text-[10px] text-slate-500">
          SI: {currentSI.toExponential(3)} {unitHintSI(prop.name)}
        </p>
      )}
    </div>
  )
}

function unitHintSI(name: string): string {
  switch (name) {
    case 'P': return 'Pa'
    case 'T': return 'K'
    case 'h':
    case 'u': return 'J/kg'
    case 's': return 'J/(kg·K)'
    case 'v': return 'm³/kg'
    case 'x': return '–'
    default: return ''
  }
}
