import React, { createContext, useContext, useEffect, useState } from "react";
import { getSubstances, getUnits } from "./api";

const DICT = {
  it: {
    appTagline: "Suite di calcolo, analisi e visualizzazione termodinamica",
    nav_state: "Stati", nav_process: "Trasformazioni", nav_cycle: "Cicli", nav_diagram: "Diagrammi",
    model: "Modello sostanza", substance: "Sostanza", ideal_gas: "Gas ideale (cp cost.)", real: "Fluido reale (CoolProp)",
    unitSystem: "Sistema di unità", language: "Lingua",
    computeState: "Calcola stato", knownProps: "Due proprietà note", property: "Proprietà",
    value: "Valore", results: "Risultati", phase: "Fase",
    process: "Trasformazione", state1: "Stato 1", state2: "Stato 2", analyze: "Analizza trasformazione",
    heat: "Calore Q", work: "Lavoro W", du: "Δu", dh: "Δh", ds: "Δs",
    cycle: "Ciclo", cycleType: "Tipo di ciclo", solve: "Risolvi ciclo", performance: "Prestazioni",
    efficiency: "Rendimento η", wnet: "Lavoro netto", qin: "Q assorbito", qout: "Q ceduto",
    cop_r: "COP frigo", cop_hp: "COP pompa di calore", winCompr: "Lavoro compressore",
    professor: "Professor Mode — svolgimento", exportLatex: "Esporta LaTeX", exportPython: "Esporta Python",
    diagram: "Diagramma", selectDiagram: "Piano", showDome: "Curva di saturazione",
    node: "Nodo", quality: "Titolo x", noReal: "Seleziona un fluido reale per la curva di saturazione.",
    params: "Parametri", calc: "Calcolo...", saveErr: "Errore nel calcolo. Controlla i dati inseriti.",
    superheatT: "T ingresso turbina", pBoiler: "P caldaia", pCond: "P condensatore",
    etaT: "η turbina", etaP: "η pompa", etaC: "η compressore",
    compRatio: "Rapporto di compressione r", presRatio: "Rapporto di pressione rp",
    T1: "T1 aspirazione", P1: "P1 aspirazione", qInInput: "Calore fornito q_in",
    T3: "T3 max (ingr. turbina)", tHigh: "T sorgente calda", tLow: "T sorgente fredda",
    pEvap: "P evaporatore", pCond2: "P condensatore", fluid: "Fluido refrigerante", gas: "Gas di lavoro",
    cutoff: "Rapporto di cutoff", exitQuality: "Titolo allo scarico",
  },
  en: {
    appTagline: "Thermodynamics computation, analysis & visualization suite",
    nav_state: "States", nav_process: "Processes", nav_cycle: "Cycles", nav_diagram: "Diagrams",
    model: "Substance model", substance: "Substance", ideal_gas: "Ideal gas (const. cp)", real: "Real fluid (CoolProp)",
    unitSystem: "Unit system", language: "Language",
    computeState: "Compute state", knownProps: "Two known properties", property: "Property",
    value: "Value", results: "Results", phase: "Phase",
    process: "Process", state1: "State 1", state2: "State 2", analyze: "Analyze process",
    heat: "Heat Q", work: "Work W", du: "Δu", dh: "Δh", ds: "Δs",
    cycle: "Cycle", cycleType: "Cycle type", solve: "Solve cycle", performance: "Performance",
    efficiency: "Efficiency η", wnet: "Net work", qin: "Heat in", qout: "Heat out",
    cop_r: "COP cooling", cop_hp: "COP heat pump", winCompr: "Compressor work",
    professor: "Professor Mode — derivation", exportLatex: "Export LaTeX", exportPython: "Export Python",
    diagram: "Diagram", selectDiagram: "Plane", showDome: "Saturation dome",
    node: "Node", quality: "Quality x", noReal: "Select a real fluid to draw the saturation dome.",
    params: "Parameters", calc: "Computing...", saveErr: "Computation error. Check your inputs.",
    superheatT: "Turbine inlet T", pBoiler: "Boiler P", pCond: "Condenser P",
    etaT: "Turbine η", etaP: "Pump η", etaC: "Compressor η",
    compRatio: "Compression ratio r", presRatio: "Pressure ratio rp",
    T1: "Intake T1", P1: "Intake P1", qInInput: "Heat added q_in",
    T3: "Max T3 (turbine inlet)", tHigh: "Hot reservoir T", tLow: "Cold reservoir T",
    pEvap: "Evaporator P", pCond2: "Condenser P", fluid: "Refrigerant", gas: "Working gas",
    cutoff: "Cutoff ratio", exitQuality: "Exit quality",
  },
};

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("tp_lang") || "it");
  const [unitSystem, setUnitSystem] = useState(localStorage.getItem("tp_units") || "SI_C_bar");
  const [substances, setSubstances] = useState({ ideal_gas: [], real: [] });
  const [unitSystems, setUnitSystems] = useState(null);

  useEffect(() => {
    getSubstances().then(setSubstances).catch(() => {});
    getUnits().then((d) => setUnitSystems(d.systems)).catch(() => {});
  }, []);
  useEffect(() => localStorage.setItem("tp_lang", lang), [lang]);
  useEffect(() => localStorage.setItem("tp_units", unitSystem), [unitSystem]);

  const units = unitSystems ? unitSystems[unitSystem] : { P: "bar", T: "C", v: "m3/kg", h: "kJ/kg", u: "kJ/kg", s: "kJ/kg.K" };
  const t = (k) => (DICT[lang][k] ?? k);
  const L = (obj) => (obj ? obj[lang] ?? obj.en ?? obj.it : "");

  return (
    <Ctx.Provider value={{ lang, setLang, unitSystem, setUnitSystem, units, unitSystems, substances, t, L }}>
      {children}
    </Ctx.Provider>
  );
}
