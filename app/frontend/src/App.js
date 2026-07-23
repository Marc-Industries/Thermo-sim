import React, { useState } from "react";
import "@/App.css";
import { Toaster } from "sonner";
import { StoreProvider, useStore } from "./lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Thermometer, Function, ArrowsClockwise, ChartLine, Gauge } from "@phosphor-icons/react";
import StateCalculator from "./pages/StateCalculator";
import ProcessAnalysis from "./pages/ProcessAnalysis";
import CycleBuilder from "./pages/CycleBuilder";
import Diagrams from "./pages/Diagrams";

const NAV = [
  { key: "state", icon: Thermometer, label: "nav_state", Comp: StateCalculator },
  { key: "process", icon: ArrowsClockwise, label: "nav_process", Comp: ProcessAnalysis },
  { key: "cycle", icon: Gauge, label: "nav_cycle", Comp: CycleBuilder },
  { key: "diagram", icon: ChartLine, label: "nav_diagram", Comp: Diagrams },
];

function Shell() {
  const { t, lang, setLang, unitSystem, setUnitSystem, unitSystems } = useStore();
  const [tab, setTab] = useState("state");
  const Active = NAV.find((n) => n.key === tab).Comp;

  return (
    <div className="App min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#050a17]">
        <div className="flex flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-signal-red">
              <Function size={20} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="font-head text-lg font-black leading-none tracking-tight">
                THERMONATOR <span className="text-signal-red">PRO</span>
              </h1>
              <p className="mt-0.5 text-[11px] text-slate-500">{t("appTagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={unitSystem} onValueChange={setUnitSystem}>
              <SelectTrigger className="h-9 w-40 rounded-sm border-slate-700 bg-slate-900/60 text-xs" data-testid="unit-system-select"><SelectValue /></SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900">
                {unitSystems && Object.keys(unitSystems).map((k) => (
                  <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-sm border border-slate-700">
              {["it", "en"].map((l) => (
                <button key={l} onClick={() => setLang(l)} data-testid={`lang-${l}`}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${lang === l ? "bg-signal-red text-white" : "bg-slate-900/60 text-slate-400 hover:text-slate-200"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <nav className="flex gap-0 overflow-x-auto px-5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)} data-testid={`tab-${n.key}`}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${active ? "border-signal-red text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <Icon size={16} weight={active ? "fill" : "regular"} /> {t(n.label)}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-[1500px]">
        <Active />
      </main>
      <footer className="border-t border-slate-800 px-5 py-4 text-center text-xs text-slate-600">
        Thermonator Pro · CoolProp {`\u00b7`} IAPWS-IF97 · Ideal-gas & real-fluid engine
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
