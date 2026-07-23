import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useStore } from "../lib/store";
import { analyzeProcess } from "../lib/api";
import PropField from "../components/PropField";
import PropertyTable from "../components/PropertyTable";
import ThermoChart from "../components/ThermoChart";
import ProfessorSteps from "../components/ProfessorSteps";
import { fmt, unitFor } from "../lib/format";
import { ArrowsLeftRight } from "@phosphor-icons/react";

const OPTS = { ideal_gas: ["P", "T", "v", "s"], real: ["P", "T", "v", "h", "s", "x"] };
const PROCESSES = {
  it: { isochoric: "Isocora (v=cost)", isobaric: "Isobara (P=cost)", isothermal: "Isoterma (T=cost)", isentropic: "Adiabatica/Isentropica", polytropic: "Politropica (Pvⁿ=cost)" },
  en: { isochoric: "Isochoric (v=const)", isobaric: "Isobaric (P=const)", isothermal: "Isothermal (T=const)", isentropic: "Adiabatic/Isentropic", polytropic: "Polytropic (Pvⁿ=const)" },
};
const DEF = { ideal_gas: "Air", real: "Water" };

export default function ProcessAnalysis() {
  const { t, L, lang, units, substances } = useStore();
  const [model, setModel] = useState("ideal_gas");
  const [substance, setSubstance] = useState("Air");
  const [process, setProcess] = useState("isothermal");
  const [s1, setS1] = useState([{ name: "P", value: 100 }, { name: "T", value: 300 }]);
  const [s2, setS2] = useState([{ name: "P", value: 500 }, { name: "T", value: 300 }]);
  const [diagram, setDiagram] = useState("Pv");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  const subsList = substances[model] || [];
  const onModel = (m) => { setModel(m); setSubstance(DEF[m]); setRes(null); };

  const run = async () => {
    setBusy(true);
    try {
      const enc = (arr) => arr.map((p) => ({ name: p.name, value: parseFloat(p.value), unit: unitOf(p.name, units) }));
      const d = await analyzeProcess({ model, substance, process, state1: enc(s1), state2: enc(s2), units });
      setRes(d);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("saveErr")); setRes(null);
    } finally { setBusy(false); }
  };

  const setS = (setter, arr, idx, v) => { const c = [...arr]; c[idx] = v; setter(c); };

  const metrics = res && [
    ["Q", t("heat"), res.results.Q, units.h, "#ff3366"],
    ["W", t("work"), res.results.W, units.h, "#fbbf24"],
    ["du", t("du"), res.results.du, units.h, "#94a3b8"],
    ["dh", t("dh"), res.results.dh, units.h, "#94a3b8"],
    ["ds", t("ds"), res.results.ds, "kJ/kg·K", "#00e5ff"],
  ];

  return (
    <div className="grid grid-cols-1 gap-px bg-slate-800 lg:grid-cols-[380px_1fr]">
      <div className="bg-[#020617] p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t("nav_process")}</h2>
        <p className="mb-6 text-sm text-slate-500">{t("state1")} → {t("state2")}</p>

        <Tabs value={model} onValueChange={onModel} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 rounded-sm bg-slate-900">
            <TabsTrigger value="ideal_gas" data-testid="pmodel-ideal" className="rounded-sm text-xs data-[state=active]:bg-signal-red data-[state=active]:text-white">{t("ideal_gas")}</TabsTrigger>
            <TabsTrigger value="real" data-testid="pmodel-real" className="rounded-sm text-xs data-[state=active]:bg-signal-red data-[state=active]:text-white">{t("real")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Select value={substance} onValueChange={setSubstance}>
            <SelectTrigger className="h-10 rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid="process-substance"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72 border-slate-700 bg-slate-900">{subsList.map((s) => <SelectItem key={s.key} value={s.key}>{L(s.name)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={process} onValueChange={setProcess}>
            <SelectTrigger className="h-10 rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid="process-type"><SelectValue /></SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">{Object.keys(PROCESSES[lang]).map((k) => <SelectItem key={k} value={k}>{PROCESSES[lang][k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="mb-3 border-l-2 border-signal-cyan pl-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t("state1")}</div>
          <div className="space-y-2">
            <PropField options={OPTS[model]} prop={s1[0]} onChange={(v) => setS(setS1, s1, 0, v)} units={units} testid="s1-p1" />
            <PropField options={OPTS[model]} prop={s1[1]} onChange={(v) => setS(setS1, s1, 1, v)} units={units} testid="s1-p2" />
          </div>
        </div>
        <div className="mb-4 border-l-2 border-signal-red pl-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t("state2")}</div>
          <div className="space-y-2">
            <PropField options={OPTS[model]} prop={s2[0]} onChange={(v) => setS(setS2, s2, 0, v)} units={units} testid="s2-p1" />
            <PropField options={OPTS[model]} prop={s2[1]} onChange={(v) => setS(setS2, s2, 1, v)} units={units} testid="s2-p2" />
          </div>
        </div>

        <Button onClick={run} disabled={busy} className="w-full rounded-sm bg-signal-red font-semibold hover:bg-signal-red/90" data-testid="analyze-process-btn">
          <ArrowsLeftRight size={16} className="mr-2" /> {busy ? t("calc") : t("analyze")}
        </Button>
      </div>

      <div className="bg-[#020617] p-6">
        {res ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-5">
              {metrics.map(([k, label, val, unit, color]) => (
                <div key={k} className="bg-[#0b1220] p-3" data-testid={`metric-${k}`}>
                  <div className="text-[11px] uppercase text-slate-500">{label}</div>
                  <div className="mt-1 font-mono text-lg" style={{ color }}>{fmt(val)}</div>
                  <div className="font-mono text-[10px] text-slate-600">{unit}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <div className="border border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-head text-sm text-slate-300">{L(res.process_name)}</span>
                  <Select value={diagram} onValueChange={setDiagram}>
                    <SelectTrigger className="h-8 w-28 rounded-sm border-slate-700 bg-slate-900/60 text-xs" data-testid="process-diagram-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900">
                      {["Pv", "Ts", "Ph", "hs", "Tv"].map((d) => <SelectItem key={d} value={d}>{d.replace("v", "-v").replace("s", "-s").replace("h", "-h").replace("T", "T").replace("P", "P")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <ThermoChart diagram={diagram} height={340} series={[
                  { name: "path", color: "#fbbf24", points: res.path, strokeWidth: 2 },
                  { name: "1", color: "#00e5ff", points: [res.state1], showLine: false, big: true },
                  { name: "2", color: "#ff3366", points: [res.state2], showLine: false, big: true },
                ]} />
              </div>
              <div className="space-y-3">
                <PropertyTable state={res.state1} units={units} />
                <PropertyTable state={res.state2} units={units} />
              </div>
            </div>

            <ProfessorSteps steps={res.steps} title={`${t("nav_process")} — ${L(res.process_name)}`} />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 text-sm text-slate-600">{t("analyze")} →</div>
        )}
      </div>
    </div>
  );
}

function unitOf(name, units) {
  const map = { P: units.P, T: units.T, v: "m3/kg", h: units.h, u: units.u, s: units.s, x: "" };
  return map[name];
}
