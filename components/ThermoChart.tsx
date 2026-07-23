import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
}

export default function ThermoChart({ diagram, height = 400, series }: ThermoChartProps) {
  const axisMap: Record<string, { x: string; y: string }> = {
    Ts: { x: 's (J/kg·K)', y: 'T (K)' },
    Pv: { x: 'v (m³/kg)', y: 'P (Pa)' },
    Ph: { x: 'h (J/kg)', y: 'P (Pa)' },
    Tv: { x: 'v (m³/kg)', y: 'T (K)' },
    Ps: { x: 's (J/kg·K)', y: 'P (Pa)' },
    Hs: { x: 's (J/kg·K)', y: 'h (J/kg)' },
  }

  const axis = axisMap[diagram] || axisMap['Ts']
  const [xKey, yKey] = diagram.toLowerCase() === 'hs' ? ['s', 'h'] : [diagram[1].toLowerCase(), diagram[0].toLowerCase()]

  // Flatten points into chart data
  const data = series.flatMap((s) =>
    s.points.map((p) => ({
      [xKey]: (p as Record<string, any>)[xKey],
      [yKey]: (p as Record<string, any>)[yKey],
      seriesName: s.name,
      color: s.color,
    }))
  )

  return (
    <div className="w-full bg-slate-950 rounded border border-slate-800 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey={xKey} label={{ value: axis.x, position: 'insideBottomRight', offset: -5 }} />
          <YAxis label={{ value: axis.y, angle: -90, position: 'insideLeft' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
          {series.map((s) => (
            <Line
              key={s.name}
              dataKey={yKey}
              stroke={s.color}
              dot={s.showDots}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
