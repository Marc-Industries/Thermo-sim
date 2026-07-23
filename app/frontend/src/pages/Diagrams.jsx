import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStore } from "../lib/store";
import { getDome } from "../lib/api";
import ThermoChart from "../components/ThermoChart";
import { fmt } from "../lib/format";

export default function Diagrams() {
  const { t, L, units, substances } = useStore();
  const [fluid, setFluid] = useState("Water");
  const [diagram, setDiagram] = useState("Ts");
  const [dome, setDome] = useState(null);

  useEffect(() => {
    let active = true;
    getDome(fluid, units)
      .then((d) => active && setDome(d))
      .catch(() => { setDome(null); toast.error(t("saveErr")); });
    return () => { active = false; };
  }, [fluid, units]);

  const series = dome ? [
    { name: "liquido", color: "#00e5ff", points: dome.liquid, strokeWidth: 2 },
    { name: "vapore", color: "#ff3366", points: dome.vapor, strokeWidth: 2 },
    { name: "critico", color: "#fbbf24", points: [dome.critical], showLine: false, big: true },
  ] : [];

  return (
    <div className="grid grid-cols-1 gap-px bg-slate-800 lg:grid-cols-[380px_1fr]">
      <div className="bg-[#020617] p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t("nav_diagram")}</h2>
        <p className="mb-6 text-sm text-slate-500">{t("showDome")}</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">{t("fluid")}</label>
        <Select value={fluid} onValueChange={setFluid}>
          <SelectTrigger className="mb-4 h-10 rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid="diagram-fluid"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72 border-slate-700 bg-slate-900">{substances.real.map((s) => <SelectItem key={s.key} value={s.key}>{L(s.name)}</SelectItem>)}</SelectContent>
        </Select>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">{t("selectDiagram")}</label>
        <Select value={diagram} onValueChange={setDiagram}>
          <SelectTrigger className="h-10 rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid="diagram-plane"><SelectValue /></SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-900">{["Ts", "Pv", "Ph", "hs", "Tv"].map((d) => <SelectItem key={d} value={d}>{d[0]}-{d.slice(1)}</SelectItem>)}</SelectContent>
        </Select>

        {dome?.critical && (
          <div className="mt-6 border-l-2 border-signal-amber bg-slate-900/40 p-3 font-mono text-xs text-slate-400">
            <div className="mb-1 text-signal-amber">Punto critico / Critical point</div>
            <div>T = {fmt(dome.critical.T)} {`°${units.T}`.replace("°K", "K")}</div>
            <div>P = {fmt(dome.critical.P)} {units.P}</div>
            <div>v = {fmt(dome.critical.v)} m³/kg</div>
          </div>
        )}
      </div>

      <div className="bg-[#020617] p-6">
        <div className="border border-slate-800 p-3">
          <div className="mb-2 font-head text-sm text-slate-300">{diagram[0]}-{diagram.slice(1)} · {L(substances.real.find((s) => s.key === fluid)?.name)}</div>
          {dome ? <ThermoChart diagram={diagram} height={480} series={series} /> : <div className="flex h-[480px] items-center justify-center text-sm text-slate-600">{t("calc")}</div>}
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-4 rounded-sm bg-signal-cyan" /> liq. sat.</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-4 rounded-sm bg-signal-red" /> vap. sat.</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-signal-amber" /> {"critico"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
