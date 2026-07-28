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
  /** Optional axis units. Keys: x, y.
   *  By default, when `units` is passed, the values in `series` are assumed to
   *  be in SI and the chart converts them to the requested units before plotting.
   *  Pass `convertFromSI: false` to skip the conversion (e.g. when the data is
   *  already in user units, as in the cycle builder). */
  units?: { x?: string; y?: string; convertFromSI?: boolean }
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

  // Default behaviour: when a unit is requested, points come from the engine in
  // SI and we convert them to the requested unit for display. When
  // `convertFromSI: false` is set, points are already in the requested unit and
  // we plot them as-is.
  const shouldConvert = units?.convertFromSI !== false && !!xUnit

  const xConvert = (v: number) => (shouldConvert ? convertFromSI(ax.xKey, v, xUnit) : v)
  const yConvert = (v: number) => (shouldConvert && yUnit ? convertFromSI(ax.yKey, v, yUnit) : v)

  // Build a unified table keyed by (x, then each series name).
  // recharts needs every <Line dataKey="..."> to read from its own column, so
  // we collect all x values across series, then emit one row per x with one
  // column per series. Missing values become null.
  const xVals: number[] = []
  const seen = new Set<number>()
  const seriesByX: Record<number, Record<string, number | null>> = {}
  for (const s of series) {
    for (const p of s.points) {
      const xRaw = (p as Record<string, any>)[ax.xKey]
      const yRaw = (p as Record<string, any>)[ax.yKey]
      const xVal = typeof xRaw === 'number' ? xConvert(xRaw) : Number.NaN
      const yVal = typeof yRaw === 'number' ? yConvert(yRaw) : Number.NaN
      if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue
      if (!seen.has(xVal)) {
        seen.add(xVal)
        xVals.push(xVal)
        seriesByX[xVal] = {}
      }
      seriesByX[xVal][s.name] = yVal
    }
  }
  xVals.sort((a, b) => a - b)
  const data = xVals.map((x) => ({ [ax.xKey]: x, ...(seriesByX[x] || {}) }))

  return (
    <div className="w-full bg-slate-950 rounded border border-slate-800 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey={ax.xKey}
            label={{ value: axisLabelX, position: 'insideBottomRight', offset: -5 }}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            label={{ value: axisLabelY, angle: -90, position: 'insideLeft' }}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            formatter={(value: any, name: any) => {
              if (typeof value === 'number') return [Number(value).toFixed(4), name]
              return [value, name]
            }}
            labelFormatter={(label) => `${axisLabelX}: ${Number(label).toFixed(4)}`}
          />
          {series.map((s) => (
            <Line
              key={s.name}
              dataKey={s.name}
              stroke={s.color}
              dot={s.showDots}
              isAnimationActive={false}
              connectNulls={false}
              strokeWidth={s.big ? 2.5 : 1.5}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
