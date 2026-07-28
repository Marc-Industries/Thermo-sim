import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { convertFromSI } from '@/lib/units'

interface ChartPoint {
  P?: number
  T?: number
  v?: number
  h?: number
  s?: number
  u?: number
  x?: number
  phase?: string
}

interface SeriesData {
  name: string
  color: string
  points: ChartPoint[]
  showDots?: boolean
  showLine?: boolean
  big?: boolean
}

interface ThermoChartProps {
  diagram: 'Ts' | 'Pv' | 'Ph' | 'Tv' | 'Ps' | 'Hs'
  height?: number
  series: SeriesData[]
  /** Optional axis units (otherwise SI). Keys: x, y. */
  units?: { x?: string; y?: string }
}

export default function ThermoChart({ diagram, height = 400, series, units }: ThermoChartProps) {
  const siAxisMap: Record<string, { xKey: string; yKey: string; x: string; y: string }> = {
    Ts: { xKey: 's', yKey: 'T', x: 's (J/kg·K)', y: 'T (K)' },
    Pv: { xKey: 'v', yKey: 'P', x: 'v (m³/kg)', y: 'P (Pa)' },
    Ph: { xKey: 'h', yKey: 'P', x: 'h (J/kg)', y: 'P (Pa)' },
    Tv: { xKey: 'v', yKey: 'T', x: 'v (m³/kg)', y: 'T (K)' },
    Ps: { xKey: 's', yKey: 'P', x: 's (J/kg·K)', y: 'P (Pa)' },
    Hs: { xKey: 's', yKey: 'h', x: 's (J/kg·K)', y: 'h (J/kg)' },
  }

  const ax = siAxisMap[diagram] || siAxisMap['Ts']
  const xUnit = units?.x ?? ''
  const yUnit = units?.y ?? ''
  const axisLabelX = xUnit ? `${ax.xKey} (${xUnit})` : ax.x
  const axisLabelY = yUnit ? `${ax.yKey} (${yUnit})` : ax.y

  // Flatten points into chart data, converting from SI when the user picked
  // a non-SI unit for the axis.
  const data = series.flatMap((s) =>
    s.points.map((p) => {
      const xRaw = (p as Record<string, any>)[ax.xKey]
      const yRaw = (p as Record<string, any>)[ax.yKey]
      const xVal = typeof xRaw === 'number' ? (xUnit ? convertFromSI(ax.xKey, xRaw, xUnit) : xRaw) : xRaw
      const yVal = typeof yRaw === 'number' ? (yUnit ? convertFromSI(ax.yKey, yRaw, yUnit) : yRaw) : yRaw
      return {
        [ax.xKey]: xVal,
        [ax.yKey]: yVal,
        seriesName: s.name,
        color: s.color,
      }
    })
  )

  return (
    <div className="w-full bg-slate-950 rounded border border-slate-800 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey={ax.xKey} label={{ value: axisLabelX, position: 'insideBottomRight', offset: -5 }} />
          <YAxis label={{ value: axisLabelY, angle: -90, position: 'insideLeft' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            formatter={(value: any, name: any, props: any) => {
              if (typeof value === 'number') return [Number(value).toFixed(4), props && props.payload && props.payload.seriesName]
              return [value, name]
            }}
            labelFormatter={(label) => `${axisLabelX}: ${label}`}
          />
          {series.map((s, idx) => (
            <Line
              key={s.name}
              dataKey={ax.yKey}
              stroke={s.color}
              dot={s.showDots}
              isAnimationActive={false}
              connectNulls
              strokeWidth={s.big ? 2.5 : 1.5}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
