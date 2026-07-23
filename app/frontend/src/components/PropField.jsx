import React from "react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { unitFor } from "../lib/format";
import { useStore } from "../lib/store";

const NAMES = {
  it: { P: "Pressione P", T: "Temperatura T", v: "Volume spec. v", h: "Entalpia h", s: "Entropia s", x: "Titolo x" },
  en: { P: "Pressure P", T: "Temperature T", v: "Spec. volume v", h: "Enthalpy h", s: "Entropy s", x: "Quality x" },
};

export default function PropField({ options, prop, onChange, units, testid }) {
  const { lang } = useStore();
  return (
    <div className="flex gap-2">
      <Select value={prop.name} onValueChange={(name) => onChange({ ...prop, name })}>
        <SelectTrigger className="h-10 w-[52%] rounded-sm border-slate-700 bg-slate-900/60 text-sm" data-testid={`${testid}-name`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-900">
          {options.map((o) => (
            <SelectItem key={o} value={o}>{NAMES[lang][o]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <Input
          type="number" value={prop.value}
          onChange={(e) => onChange({ ...prop, value: e.target.value })}
          className="h-10 rounded-sm border-slate-700 bg-slate-900/60 pr-14 font-mono text-sm"
          data-testid={`${testid}-value`}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-500">
          {prop.name === "x" ? "" : unitFor(units, prop.name)}
        </span>
      </div>
    </div>
  );
}
