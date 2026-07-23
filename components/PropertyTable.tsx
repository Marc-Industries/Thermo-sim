import React from 'react'
import { fmt } from '@/lib/format'

interface PropertyTableProps {
  state: Record<string, any>
  units: Record<string, string>
}

export default function PropertyTable({ state, units }: PropertyTableProps) {
  const properties = [
    { key: 'P', label: 'Pressione' },
    { key: 'T', label: 'Temperatura' },
    { key: 'v', label: 'Volume specifico' },
    { key: 'h', label: 'Entalpia' },
    { key: 'u', label: 'Energia interna' },
    { key: 's', label: 'Entropia' },
    { key: 'x', label: 'Titolo di vapore' },
    { key: 'phase', label: 'Fase' },
  ]

  return (
    <div className="space-y-2">
      {properties.map(({ key, label }) => {
        const value = state[key]
        if (value === undefined || value === null) return null
        const unit = (units as Record<string, string>)[key] || ''
        const displayValue = typeof value === 'number' ? fmt(value) : value
        return (
          <div key={key} className="flex justify-between text-sm border-b border-slate-700 pb-1">
            <span className="text-slate-500">{label}:</span>
            <span className="font-mono text-slate-200">
              {displayValue} {unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
