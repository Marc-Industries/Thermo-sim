import React from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
} from "recharts";

const AXIS = {
  Pv: { x: "v", y: "P", xl: "v [m³/kg]", yl: "P" },
  Ts: { x: "s", y: "T", xl: "s [kJ/kg·K]", yl: "T" },
  Ph: { x: "h", y: "P", xl: "h [kJ/kg]", yl: "P" },
  hs: { x: "s", y: "h", xl: "s [kJ/kg·K]", yl: "h [kJ/kg]" },
  Tv: { x: "v", y: "T", xl: "v [m³/kg]", yl: "T" },
  PT: { x: "T", y: "P", xl: "T", yl: "P" },
};

const axisStyle = { fill: "#94a3b8", fontFamily: "JetBrains Mono", fontSize: 11 };

export default function ThermoChart({ diagram, series, height = 460 }) {
  const ax = AXIS[diagram] || AXIS.Pv;
  const toXY = (pts) =>
    pts
      .map((p) => ({ x: p[ax.x], y: p[ax.y] }))
      .filter((d) => d.x != null && d.y != null && !Number.isNaN(d.x) && !Number.isNaN(d.y));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 16, right: 28, bottom: 34, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          type="number" dataKey="x" name={ax.x} tick={axisStyle} stroke="#334155"
          domain={["auto", "auto"]} tickFormatter={(v) => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(1) : Number(v.toPrecision(3)))}
        >
          <Label value={ax.xl} position="bottom" offset={12} style={{ fill: "#64748b", fontFamily: "JetBrains Mono", fontSize: 12 }} />
        </XAxis>
        <YAxis
          type="number" dataKey="y" name={ax.y} tick={axisStyle} stroke="#334155" width={62}
          domain={["auto", "auto"]} tickFormatter={(v) => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(1) : Number(v.toPrecision(3)))}
        >
          <Label value={ax.yl} angle={-90} position="left" style={{ fill: "#64748b", fontFamily: "JetBrains Mono", fontSize: 12, textAnchor: "middle" }} />
        </YAxis>
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontFamily: "JetBrains Mono", fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v) => Number(v).toPrecision(4)}
        />
        {series.map((s) => (
          <Scatter
            key={s.name}
            name={s.name}
            data={toXY(s.points)}
            fill={s.color}
            line={s.showLine !== false ? { stroke: s.color, strokeWidth: s.strokeWidth || 2 } : false}
            lineJointType="monotoneX"
            shape={s.showDots ? "circle" : (props) => (s.big ? <circle cx={props.cx} cy={props.cy} r={5} fill={s.color} stroke="#020617" strokeWidth={2} /> : null)}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
