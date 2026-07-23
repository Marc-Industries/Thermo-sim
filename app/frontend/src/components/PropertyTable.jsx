import React from "react";
import { fmt, unitFor } from "../lib/format";
import { useStore } from "../lib/store";

const ROWS = [
  ["P", "P"], ["T", "T"], ["v", "v"], ["u", "u"], ["h", "h"], ["s", "s"],
];

export default function PropertyTable({ state, units, highlight }) {
  const { t, L } = useStore();
  if (!state) return null;
  return (
    <div className="border border-slate-800" data-testid="state-property-table">
      <table className="w-full text-sm">
        <tbody className="font-mono">
          {ROWS.map(([k, sym]) => (
            <tr key={k} className="border-b border-slate-800/70 hover:bg-slate-800/40">
              <td className="w-16 border-r border-slate-800/70 px-3 py-2 text-slate-400">{sym}</td>
              <td className={`px-3 py-2 text-right ${highlight === k ? "text-signal-red" : "text-slate-100"}`} data-testid={`prop-${k}`}>
                {fmt(state[k])}
              </td>
              <td className="w-24 px-3 py-2 text-left text-xs text-slate-500">{unitFor(units, k)}</td>
            </tr>
          ))}
          {state.x !== null && state.x !== undefined && (
            <tr className="border-b border-slate-800/70 bg-signal-amber/5">
              <td className="border-r border-slate-800/70 px-3 py-2 text-signal-amber">x</td>
              <td className="px-3 py-2 text-right text-signal-amber" data-testid="prop-x">{fmt(state.x)}</td>
              <td className="px-3 py-2 text-left text-xs text-slate-500">—</td>
            </tr>
          )}
        </tbody>
      </table>
      {state.phase && (
        <div className="border-t border-slate-800 bg-slate-900/60 px-3 py-2 text-xs" data-testid="state-phase">
          <span className="text-slate-500">{t("phase")}: </span>
          <span className="font-medium text-signal-cyan">{L(state.phase)}</span>
        </div>
      )}
    </div>
  );
}
