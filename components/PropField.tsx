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
 * The user-facing value is **always** the raw number they typed, in the unit
 * they chose. The internal SI conversion happens at the API boundary (server
 * side), not here. This means:
 *
 *  - `prop.value` is the user-facing number (e.g. 1 for "1 bar", 25 for "25 °C")
 *  - `prop.unit` is the user-facing unit symbol
 *  - `displayValue` re-scales the input only when the unit is changed, so the
 *    user sees the equivalent number in the new unit (the underlying `value`
 *    stays constant, in the user's chosen unit)
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

  // Display value: simply the raw user value, formatted. We do not auto-convert
  // away from the user's chosen unit.
  const displayValue = React.useMemo(() => {
    if (prop.value === undefined || prop.value === null) return ''
    const v = typeof prop.value === 'string' ? parseFloat(prop.value) : prop.value
    if (Number.isNaN(v as number)) return String(prop.value)
    return Number(v).toString()
  }, [prop.value])

  const handleValueChange = (val: number | string) => {
    // Store the user-typed number verbatim, in the chosen unit. Conversion to
    // SI happens only at the server / engine boundary.
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (Number.isNaN(num as number)) {
      onChange({ ...prop, value: val, unit })
      return
    }
    onChange({ ...prop, value: num, unit })
  }

  const handleUnitChange = (newUnit: string) => {
    // Switching unit: convert the *underlying* value so that the SI meaning
    // stays constant and the displayed number matches the new unit. This keeps
    // the user's previous input semantically the same.
    const v = typeof prop.value === 'string' ? parseFloat(prop.value) : (prop.value as number)
    if (Number.isFinite(v) && unit) {
      const si = convertToSI(prop.name, v, unit)
      const inNew = convertFromSI(prop.name, si, newUnit)
      onChange({ ...prop, value: inNew, unit: newUnit })
    } else {
      onChange({ ...prop, unit: newUnit })
    }
    setUnit(newUnit)
    onUnitChange?.(newUnit)
  }

  const siHintValue = React.useMemo(() => {
    const v = typeof prop.value === 'string' ? parseFloat(prop.value) : (prop.value as number)
    if (!Number.isFinite(v)) return undefined
    const si = convertToSI(prop.name, v, unit)
    return si
  }, [prop.value, unit, prop.name])

  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
        {prop.name}
      </label>
      <div className="flex gap-2">
        <select
          value={prop.name}
          onChange={(e) =>
            onChange({ ...prop, name: e.target.value, unit: defaultUnitFor(e.target.value) })
          }
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
      {showSIHint && Number.isFinite(siHintValue) && (
        <p className="mt-1 text-[10px] text-slate-500">
          SI: {(siHintValue as number).toExponential(3)} {unitHintSI(prop.name)}
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