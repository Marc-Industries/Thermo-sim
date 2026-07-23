import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStore } from "../lib/store";
import { solveCycle } from "../lib/api";
import ThermoChart from "../components/ThermoChart";
import ProfessorSteps from "../components/ProfessorSteps";
import { fmt } from "../lib/format";
import { Gauge } from "@phosphor-icons/react";

const CYCLES = {
  it: { rankine: "Rankine (surriscaldato)", otto: "Otto", diesel: "Diesel", brayton: "Brayton-Joule", carnot: "Carnot", refrigeration: "Refrigerazione (compr. vapore)" },
  en: { rankine: "Rankine (superheated)", otto: "Otto", diesel: "Diesel", brayton: "Brayton-Joule", carnot: "Carnot", refrigeration: "Vapor-compression refrigeration" },
};

// field kinds: P,T,q,ratio,eta,gas,fluid
const FIELDS = {
  rankine: [["P_boiler", "pBoiler", "P"], ["P_cond", "pCond", "P"], ["T_turbine_in", "superheatT", "T"], ["eta_turbine", "etaT", "eta"], ["eta_pump", "etaP", "eta"]],
  otto: [["gas", "gas", "gas"], ["r", "compRatio", "ratio"], ["T1", "T1", "T"], ["P1", "P1", "P"], ["q_in", "qInInput", "q"]],
  diesel: [["gas", "gas", "gas"], ["r", "compRatio", "ratio"], ["T1", "T1", "T"], ["P1", "P1", "P"], ["q_in", "qInInput", "q"]],
  brayton: [["gas", "gas", "gas"], ["rp", "presRatio", "ratio"], ["T1", "T1", "T"], ["P1", "P1", "P"], ["T3", "T3", "T"], ["eta_comp", "etaC", "eta"], ["eta_turbine", "etaT", "eta"]],
  carnot: [["gas", "gas", "gas"], ["T_high", "tHigh", "T"], ["T_low", "tLow", "T"], ["q_in", "qInInput", "q"]],
  refrigeration: [["fluid", "fluid", "fluid"], ["P_evap", "pEvap", "P"], ["P_cond", "pCond2", "P"], ["eta_comp", "etaC", "eta"]],
};

const DEFAULTS = {
  rankine: { P_boiler: 80, P_cond: 0.1, T_turbine_in: 480, eta_turbine: 0.85, eta_pump: 0.9 },
  otto: { gas: "Air", r: 8, T1: 25, P1: 1, q_in: 1800 },
  diesel: { gas: "Air", r: 18, T1: 25, P1: 1, q_in: 1800 },
  brayton: { gas: "Air", rp: 10, T1: 25, P1: 1, T3: 1200, eta_comp: 0.85, eta_turbine: 0.88 },
  carnot: { gas: "Air", T_high: 727, T_low: 27, q_in: 1000 },
  refrigeration: { fluid: "R134a", P_evap: 1.2, P_cond: 9, eta_comp: 0.8 },
};

const PERF_LABELS = {
  eta: { it: "Rendimento η", en: "Efficiency η", pct: true },
  cop_r: { it: "COP frigorifero", en: "COP cooling" },
  cop_hp: { it: "COP pompa di calore", en: "COP heat pump" },
  w_net: { it: "Lavoro netto", en: "Net work", energy: true },
  w_turbine: { it: "Lavoro turbina", en: "Turbine work", energy: true },
  w_pump: { it: "Lavoro pompa", en: "Pump work", energy: true },
  w_in: { it: "Lavoro compressore", en: "Compressor work", energy: true },
  q_in: { it: "Calore assorbito", en: "Heat in", energy: true },
  q_out: { it: "Calore ceduto", en: "Heat out", energy: true },
  q_L: { it: "Effetto frigorifero", en: "Refrigeration effect", energy: true },
  q_H: { it: "Calore ceduto", en: "Heat rejected", energy: true },
  x_exit: { it: "Titolo allo scarico", en: "Exit quality" },
  cutoff_ratio: { it: "Rapporto di cutoff", en: "Cutoff ratio" },
  x_evap_in: { it: "Titolo ingr. evaporatore", en: "Evap. inlet quality" },
};

export default function CycleBuilder() {
  const { t, L, lang, units, substances } = useStore();
  const [cycle, setCycle] = useState("rankine");
  const [params, setParams] = useState(DEFAULTS.rankine);
  const [diagram, setDiagram] = useState("Ts");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  const onCycle = (c) => { setCycle(c); setParams(DEFAULTS[c]); setRes(null); setDiagram(c === "refrigeration" ? "Ph" : "Ts"); };
  const setP = (k, v) => setParams((p) => ({ ...p, [k]: v }));

  const unitLabel = (kind) => (kind === "P" ? units.P : kind === "T" ? `°${units.T}`.replace("°K", "K") : kind === "q" ? units.h : "");

  const run = async () => {
    setBusy(true);
    try {
      const numeric = {};
      Object.entries(params).forEach(([k, v]) => { numeric[k] = ["gas", "fluid"].includes(k) ? v : parseFloat(v); });
      const d = await solveCycle({ cycle_type: cycle, params: numeric, units });
      setRes(d);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("saveErr")); setRes(null);
    } finally { setBusy(false); }
  };

  const perfEntries = res ? Object.entries(res.performance).filter(([k]) => PERF_LABELS[k] && res.performance[k] != null) : [];
  const domeSeries = res?.dome ? [
    { name: "liq", color: "#00e5ff", points: res.dome.liquid, showLine: true, strokeWidth: 1.4 },
    { name: "vap", color: "#00e5ff", points: res.dome.vapor, showLine: true, strokeWidth: 1.4 },
  ] : [];
  const nodeSeries = res ? res.nodes.map((n, i) => ({ name: `${i + 1}`, color: "#ff3366", points: [n], showLine: false, big: true })) : [];

  return (
    <div className="grid grid-cols-1 gap-px bg-slate-800 lg:grid-cols-[380px_1fr]">
      <div className="bg-[#020617] p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t("nav_cycle")}</h2>
        <p className="mb-6 text-sm text-slate-500">{t("cycleType")}</p>

        <Select value={cycle} onValueChange={onCycle}>
          <SelectTrigger className="mb-5 h-11 rounded-sm border-slate-700 bg-slate-900/60" data-testid="cycle-type-select"><SelectValue /></SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-900">{Object.keys(CYCLES[lang]).map((c) => <SelectItem key={c} value={c}>{CYCLES[lang][c]}</SelectItem>)}</SelectContent>
        </Select>

        <div className="mb-6 space-y-3">
          {FIELDS[cycle].map(([key, labelKey, kind]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-slate-500">{t(labelKey)}</label>
              {kind === "gas" || kind === "fluid" ? (
                <Select value={params[key]} onValueChange={(v) => setP(key, v)}>
                  <SelectTrigger className="h-10 rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid={`cycle-field-${key}`}><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72 border-slate-700 bg-slate-900">
                    {(kind === "gas" ? substances.ideal_gas : substances.real).map((s) => <SelectItem key={s.key} value={s.key}>{L(s.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Input type="number" value={params[key]} onChange={(e) => setP(key, e.target.value)} className="h-10 rounded-sm border-slate-700 bg-slate-900/60 pr-16 font-mono text-sm" data-testid={`cycle-field-${key}`} />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-500">{unitLabel(kind)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button onClick={run} disabled={busy} className="w-full rounded-sm bg-signal-red font-semibold hover:bg-signal-red/90" data-testid="solve-cycle-btn">
          <Gauge size={16} className="mr-2" /> {busy ? t("calc") : t("solve")}
        </Button>
      </div>

      <div className="bg-[#020617] p-6">
        {res ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-px bg-slate-800 md:grid-cols-4 xl:grid-cols-5">
              {perfEntries.map(([k, v]) => {
                const meta = PERF_LABELS[k];
                const display = meta.pct ? `${(v * 100).toFixed(2)} %` : fmt(v);
                return (
                  <div key={k} className="bg-[#0b1220] p-3" data-testid={`perf-${k}`}>
                    <div className="text-[11px] uppercase text-slate-500">{meta[lang]}</div>
                    <div className="mt-1 font-mono text-lg text-signal-red">{display}</div>
                    <div className="font-mono text-[10px] text-slate-600">{meta.energy ? units.h : ""}</div>
                  </div>
                );
              })}
            </div>

            <div className="border border-slate-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-head text-sm text-slate-300">{CYCLES[lang][cycle]}</span>
                <Select value={diagram} onValueChange={setDiagram}>
                  <SelectTrigger className="h-8 w-28 rounded-sm border-slate-700 bg-slate-900/60 text-xs" data-testid="cycle-diagram-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">{["Ts", "Pv", "Ph", "hs"].map((d) => <SelectItem key={d} value={d}>{d[0]}-{d.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <ThermoChart diagram={diagram} height={420} series={[
                ...domeSeries,
                { name: "cycle", color: "#fbbf24", points: [...res.path, res.path[0]], strokeWidth: 2 },
                ...nodeSeries,
              ]} />
            </div>

            <ProfessorSteps steps={res.steps} title={CYCLES[lang][cycle]} />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 text-sm text-slate-600">{t("solve")} →</div>
        )}
      </div>
    </div>
  );
}
