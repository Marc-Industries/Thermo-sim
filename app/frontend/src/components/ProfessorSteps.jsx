import React from "react";
import Latex from "react-latex-next";
import { Download } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { useStore } from "../lib/store";
import { exportDoc } from "../lib/api";

export default function ProfessorSteps({ steps, title }) {
  const { lang, t, L } = useStore();
  if (!steps || steps.length === 0) return null;

  const doExport = async (fmt) => {
    const data = await exportDoc({ title, steps, lang, fmt });
    const blob = new Blob([data.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-slate-800 bg-[#080b16]" data-testid="professor-mode">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="font-head text-base font-bold text-signal-cyan">{t("professor")}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-sm border-slate-700 text-xs" onClick={() => doExport("latex")} data-testid="export-latex-btn">
            <Download size={14} className="mr-1" /> {t("exportLatex")}
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-sm border-slate-700 text-xs" onClick={() => doExport("python")} data-testid="export-python-btn">
            <Download size={14} className="mr-1" /> {t("exportPython")}
          </Button>
        </div>
      </div>
      <ol className="divide-y divide-slate-800/70">
        {steps.map((s, i) => (
          <li key={i} className="px-4 py-3 rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-signal-red/15 font-mono text-[11px] text-signal-red">{i + 1}</span>
              <span className="text-sm text-slate-300">{L(s.title)}</span>
            </div>
            <div className="overflow-x-auto pl-7 text-slate-100">
              <Latex>{`$$${s.latex}$$`}</Latex>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
