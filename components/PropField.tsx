import React from 'react'

interface PropFieldProps {
  options: string[]
  prop: { name: string; value: number | string }
  onChange: (prop: { name: string; value: number | string }) => void
  units: Record<string, string>
  testid?: string
}

export default function PropField({
  options,
  prop,
  onChange,
  units,
  testid,
}: PropFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
        {prop.name} ({(units as Record<string, string>)[prop.name] || ''})
      </label>
      <div className="flex gap-2">
        <select
          value={prop.name}
          onChange={(e) => onChange({ ...prop, name: e.target.value })}
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
          value={prop.value}
          onChange={(e) => onChange({ ...prop, value: parseFloat(e.target.value) || e.target.value })}
          className="flex-1 rounded-sm border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 placeholder-slate-600"
          placeholder="0"
          data-testid={`${testid}-input`}
        />
      </div>
    </div>
  )
}
