import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useStore } from "../lib/store";
import { computeState } from "../lib/api";
import PropField from "../components/PropField";
import PropertyTable from "../components/PropertyTable";
import ThermoChart from "../components/ThermoChart";
import { fmt } from "../lib/format";
import { Lightning } from "@phosphor-icons/react";

const OPTS = { ideal_gas: ["P", "T", "v", "s"], real: ["P", "T", "v", "h", "s", "x"] };
const DEF = { ideal_gas: "Air", real: "Water" };

export default function StateCalculator() {
  const { t, L, units, substances } = useStore();
  const [model, setModel] = useState("real");
  const [substance, setSubstance] = useState("Water");
  const [prop1, setProp1] = useState({ name: "P", value: 1 });
  const [prop2, setProp2] = useState({ name: "T", value: 200 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const subsList = substances[model] || [];

  const onModel = (m) => {
    setModel(m);
    setSubstance(DEF[m]);
    setProp1({ name: "P", value: m === "real" ? 1 : 100 });
    setProp2({ name: "T", value: m === "real" ? 200 : 25 });
    setResult(null);
  };

  const run = async () => {
    setBusy(true);
    try {
      const body = {
        model, substance,
        prop1: { name: prop1.name, value: parseFloat(prop1.value), unit: unitOf(prop1.name, units) },
        prop2: { name: prop2.name, value: parseFloat(prop2.value), unit: unitOf(prop2.name, units) },
        units,
      };
      const d = await computeState(body);
      setResult(d);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("saveErr"));
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-px bg-slate-800 lg:grid-cols-[380px_1fr]">
      {/* INPUT PANEL */}
      <div className="bg-[#020617] p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t("nav_state")}</h2>
        <p className="mb-6 text-sm text-slate-500">{t("knownProps")}</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">{t("model")}</label>
        <Tabs value={model} onValueChange={onModel} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 rounded-sm bg-slate-900">
            <TabsTrigger value="ideal_gas" data-testid="model-ideal" className="rounded-sm text-xs data-[state=active]:bg-signal-red data-[state=active]:text-white">{t("ideal_gas")}</TabsTrigger>
            <TabsTrigger value="real" data-testid="model-real" className="rounded-sm text-xs data-[state=active]:bg-signal-red data-[state=active]:text-white">{t("real")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">{t("substance")}</label>
        <Select value={substance} onValueChange={setSubstance}>
          <SelectTrigger className="mb-5 h-10 rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid="substance-select"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72 border-slate-700 bg-slate-900">
            {subsList.map((s) => <SelectItem key={s.key} value={s.key}>{L(s.name)}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="space-y-3">
          <PropField options={OPTS[model]} prop={prop1} onChange={setProp1} units={units} testid="prop1" />
          <PropField options={OPTS[model]} prop={prop2} onChange={setProp2} units={units} testid="prop2" />
        </div>

        <Button onClick={run} disabled={busy} className="mt-6 w-full rounded-sm bg-signal-red font-semibold hover:bg-signal-red/90" data-testid="compute-state-btn">
          <Lightning size={16} weight="fill" className="mr-2" /> {busy ? t("calc") : t("computeState")}
        </Button>

        {result?.extra && Object.keys(result.extra).length > 0 && (
          <div className="mt-5 border border-slate-800 p-3 font-mono text-xs text-slate-400">
            {result.extra.R != null && <div>R = {fmt(result.extra.R)} J/kg·K</div>}
            {result.extra.cp != null && <div>cp = {fmt(result.extra.cp)} · cv = {fmt(result.extra.cv)} J/kg·K</div>}
            {result.extra.gamma != null && <div>γ = {fmt(result.extra.gamma)}</div>}
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div className="bg-[#020617] p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">{t("results")}</h3>
        {result ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
            <div className="flash"><PropertyTable state={result.state} units={units} /></div>
            <div className="border border-slate-800 p-3">
              <ThermoChart diagram="Ts" height={360} series={[{ name: "state", color: "#ff3366", points: [result.state], showDots: true, showLine: false, big: true }]} />
              <p className="mt-2 text-center text-xs text-slate-600">Piano T-s</p>
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 text-sm text-slate-600">
            {t("knownProps")} →
          </div>
        )}
      </div>
    </div>
  );
}

function unitOf(name, units) {
  const map = { P: units.P, T: units.T, v: "m3/kg", h: units.h, u: units.u, s: units.s, x: "" };
  return map[name];
}
