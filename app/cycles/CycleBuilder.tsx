'use client'

import React, { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/Button'
import ThermoChart from '@/components/ThermoChart'
import { toast } from 'sonner'
import { analyzeCycle, CycleType } from '@/lib/thermo-engine'
import { generateProfessorReport } from '@/lib/professor'
import { convertFromSI, convertToSI } from '@/lib/units'

/**
 * Pick the units used to display cycle work / heat (W, Q) and per-state
 * properties (P, T, h, s, v, u, x). Defaults match what the user picked in
 * PropField for the *first* state in the cycle, falling back to SI.
 */
function deriveUnits(cycle: any[]): Record<string, string> {
  if (!cycle.length) return {}
  const first = cycle[0] as any
  return {
    P: first.output_units?.P || first._units?.P || 'Pa',
    T: first.output_units?.T || first._units?.T || 'K',
    v: first.output_units?.v || first._units?.v || 'm³/kg',
    h: first.output_units?.h || first._units?.h || 'J/kg',
    u: first.output_units?.u || first._units?.u || 'J/kg',
    s: first.output_units?.s || first._units?.s || 'J/(kg·K)',
    x: first.output_units?.x || first._units?.x || '',
    Power: 'W',
    Q: first.output_units?.h || first._units?.h || 'J/kg',
    W: first.output_units?.h || first._units?.h || 'J/kg',
  }
}

/** Convert a state in user units to SI for the engine. */
function stateToSI(s: any, units: Record<string, string>): any {
  const out: any = { ...s }
  for (const k of Object.keys(out)) {
    const v = out[k]
    const u = units[k]
    if (typeof v === 'number' && u) out[k] = convertToSI(k, v, u)
  }
  return out
}

/** Convert a scalar from SI to user unit. */
function fmtSI(key: string, value: number, units: Record<string, string>): string {
  const u = units[key]
  if (!u) return `${value.toFixed(2)}`
  const v = convertFromSI(key, value, u)
  return `${v.toFixed(2)} ${u}`.trim()
}

const CYCLE_TYPES: CycleType[] = ['rankine', 'rankine_superheated', 'rankine_reheat', 'otto', 'diesel', 'brayton', 'carnot']

export default function CycleBuilder() {
  const { t, cycle, addToCycle, clearCycle, currentState, setCycle, removeFromCycle, moveCycleItem } = useStore()
  const [selectedCycle, setSelectedCycle] = useState<CycleType>('rankine')
  const [diagram, setDiagram] = useState<'Ts' | 'Pv' | 'Ph' | 'Hs' | 'Tv' | 'Ps'>('Ts')
  const [report, setReport] = useState<{ markdown: string; latex: string; summary: string; steps: any[] } | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const dragIndex = useRef<number | null>(null)

  const cycleResult = React.useMemo(() => {
    if (cycle.length < 4) return null
    try {
      const units = deriveUnits(cycle as any[])
      const statesSI = (cycle as any[]).map((s) => stateToSI(s, units))
      const r = analyzeCycle(selectedCycle, statesSI as any)
      return { ...r, units }
    } catch (e: any) {
      return { error: e.message }
    }
  }, [cycle, selectedCycle])

  const addStateToCycle = () => {
    if (!currentState) {
      toast.error('Calcola prima uno stato nel tab Stato')
      return
    }
    addToCycle(currentState)
    toast.success(`Stato aggiunto al ciclo (${cycle.length + 1} punti)`)
  }

  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIndex.current === null) return
    const from = dragIndex.current
    const to = idx
    if (from !== to) moveCycleItem(from, to)
    dragIndex.current = null
  }

  const exportJSON = () => {
    try {
      const data = JSON.stringify({ cycle }, null, 2)
      triggerDownload(new Blob([data], { type: 'application/json' }), `cycle-${selectedCycle}.json`)
      toast.success('Snapshot esportato')
    } catch (e) {
      toast.error('Esportazione fallita')
    }
  }

  const importJSON = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const obj = JSON.parse(text)
      if (Array.isArray(obj.cycle)) {
        setCycle(obj.cycle)
        toast.success('Snapshot importato')
      } else {
        toast.error('Formato non valido')
      }
    } catch (e) {
      toast.error('Import fallita')
    }
  }

  const exportReport = async () => {
    try {
      const payload = { type: 'cycle', cycle: cycle as any }
      const res = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data?.markdown) {
        triggerDownload(new Blob([data.markdown], { type: 'text/markdown' }), `cycle-report-${selectedCycle}.md`)
        toast.success('Report Markdown scaricato')
      } else {
        toast.error('Export report fallito')
      }
    } catch (e) {
      toast.error('Export report fallito')
    }
  }

  const generateProfessor = async () => {
    if (cycle.length < 4) {
      toast.error('Servono almeno 4 stati per la Professor Mode')
      return
    }
    setReportBusy(true)
    try {
      const res = await fetch('/api/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cycle',
          cycle: selectedCycle,
          substance: (cycle[0] as any).substance || 'Water',
          model: (cycle[0] as any).model || 'real',
          states: cycle,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReport(data)
      toast.success('Report generato')
    } catch (e: any) {
      toast.error(e.message || 'Professor Mode fallita')
    } finally {
      setReportBusy(false)
    }
  }

  const downloadLatex = () => {
    if (!report?.latex) return
    triggerDownload(new Blob([report.latex], { type: 'text/x-tex' }), `professor-${selectedCycle}.tex`)
    toast.success('LaTeX scaricato')
  }

  const downloadPDF = async () => {
    if (!report?.latex) return
    try {
      const res = await fetch('/api/professor/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: report.latex, cycle: selectedCycle, markdown: report.markdown }),
      })
      const contentType = res.headers.get('content-type') || ''

      // Server returned a real PDF blob (LaTeX binary available).
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob()
        triggerDownload(blob, `professor-${selectedCycle}.pdf`)
        return
      }

      // Server returned JSON fallback — try in-browser PDF, then print preview.
      try {
        const { default: jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
        const margin = 48
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const maxWidth = pageWidth - 2 * margin

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(16)
        pdf.text(`Professor Mode — ${selectedCycle.toUpperCase()}`, margin, margin)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)

        let cursor = margin + 24
        const lineHeight = 14

        for (const step of report.steps) {
          if (cursor > pageHeight - margin - lineHeight * 4) {
            pdf.addPage()
            cursor = margin
          }
          pdf.setFont('helvetica', 'bold')
          pdf.text(step.title, margin, cursor)
          cursor += lineHeight
          pdf.setFont('helvetica', 'normal')
          const lines = pdf.splitTextToSize(step.explanation, maxWidth)
          for (const ln of lines) {
            if (cursor > pageHeight - margin - lineHeight) {
              pdf.addPage()
              cursor = margin
            }
            pdf.text(ln, margin, cursor)
            cursor += lineHeight
          }
          if (step.latex) {
            if (cursor > pageHeight - margin - lineHeight * 2) {
              pdf.addPage()
              cursor = margin
            }
            pdf.setFont('courier', 'normal')
            const tlines = pdf.splitTextToSize(step.latex, maxWidth)
            for (const ln of tlines) {
              if (cursor > pageHeight - margin - lineHeight) {
                pdf.addPage()
                cursor = margin
              }
              pdf.text(ln, margin, cursor)
              cursor += lineHeight
            }
            pdf.setFont('helvetica', 'normal')
          }
          if (step.numeric) {
            if (cursor > pageHeight - margin - lineHeight) {
              pdf.addPage()
              cursor = margin
            }
            pdf.setFont('helvetica', 'italic')
            pdf.text(step.numeric, margin, cursor)
            cursor += lineHeight
            pdf.setFont('helvetica', 'normal')
          }
          cursor += lineHeight * 0.5
        }

        pdf.setFont('helvetica', 'bold')
        if (cursor > pageHeight - margin - lineHeight * 3) {
          pdf.addPage()
          cursor = margin
        }
        pdf.text(report.summary, margin, cursor)

        pdf.save(`professor-${selectedCycle}.pdf`)
        toast.success('PDF generato nel browser')
        return
      } catch (jsPdfErr: any) {
        // Last resort: open a print preview window with MathJax.
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(`<html><head><title>Thermo Lab ${selectedCycle}</title><script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script></head><body style="font-family:system-ui;padding:2cm;background:white;color:black">${reportMarkdownToHTML(report.markdown)}</body></html>`)
          w.document.close()
          setTimeout(() => w.print(), 800)
        }
        toast.error('PDF non disponibile — usa Stampa dal browser')
      }
    } catch (e: any) {
      toast.error('PDF rendering fallback: ' + (e.message || 'errore'))
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1 bg-slate-800 lg:grid-cols-[320px_1fr]">
      <div className="bg-slate-950 p-6">
        <h2 className="mb-1 font-head text-xl font-bold">{t('nav_cycle')}</h2>
        <p className="mb-6 text-sm text-slate-500">Costruisci cicli termodinamici</p>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Tipo Ciclo</label>
        <select
          value={selectedCycle}
          onChange={(e) => setSelectedCycle(e.target.value as CycleType)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {CYCLE_TYPES.map((c) => (
            <option key={c} value={c}>{c.toUpperCase().replace(/_/g, ' ')}</option>
          ))}
        </select>

        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Diagramma</label>
        <select
          value={diagram}
          onChange={(e) => setDiagram(e.target.value as any)}
          className="mb-5 h-10 w-full rounded-sm border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300"
        >
          {['Ts', 'Pv', 'Ph', 'Hs', 'Tv', 'Ps'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <div className="space-y-2 mb-4">
          <Button onClick={addStateToCycle} className="w-full" variant="default">
            Aggiungi Stato corrente
          </Button>
          <Button onClick={() => clearCycle()} className="w-full" variant="outline">
            Cancella Ciclo
          </Button>
        </div>

        <div className="border border-slate-700 p-3 rounded text-xs mb-4">
          <p className="text-slate-400">Punti nel ciclo: <span className="font-bold text-signal-red">{cycle.length}</span></p>
        </div>

        <div className="flex gap-2 mb-3">
          <Button onClick={exportJSON} className="flex-1">Esporta JSON</Button>
          <label className="flex-1">
            <input type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0] ?? null)} className="hidden" />
            <Button className="w-full">Importa JSON</Button>
          </label>
        </div>

        <div className="space-y-2">
          <Button onClick={exportReport} className="w-full">Esporta Report (Markdown)</Button>
          <Button onClick={generateProfessor} disabled={reportBusy} className="w-full bg-signal-blue hover:bg-signal-blue/80">
            {reportBusy ? 'Generazione…' : 'Professor Mode (analitico)'}
          </Button>
        </div>
      </div>

      <div className="bg-slate-950 p-6">
        <h3 className="mb-4 font-head text-base font-bold text-slate-300">Ciclo {selectedCycle.toUpperCase().replace(/_/g, ' ')}</h3>
        {cycle.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            <ThermoChart
              diagram={diagram}
              height={320}
              units={(() => {
                const u = deriveUnits(cycle as any[])
                const ax = {
                  Ts: { x: 's', y: 'T' },
                  Pv: { x: 'v', y: 'P' },
                  Ph: { x: 'h', y: 'P' },
                  Tv: { x: 'v', y: 'T' },
                  Ps: { x: 's', y: 'P' },
                  Hs: { x: 's', y: 'h' },
                }[diagram]
                return { x: u[ax.x], y: u[ax.y], convertFromSI: false }
              })()}
              series={[
                {
                  name: 'ciclo',
                  color: '#ff3366',
                  points: cycle,
                  showDots: true,
                  showLine: true,
                },
              ]}
            />

            {cycleResult && !('error' in cycleResult) && (
              <div className="grid grid-cols-2 gap-2 border border-slate-700 p-3 rounded text-sm">
                <div><span className="text-slate-500">W net:</span> <span className="font-mono text-signal-red">{fmtSI('W', cycleResult.Wnet, cycleResult.units)}</span></div>
                <div><span className="text-slate-500">Q in:</span> <span className="font-mono text-signal-blue">{fmtSI('Q', cycleResult.Qin, cycleResult.units)}</span></div>
                <div><span className="text-slate-500">Q out:</span> <span className="font-mono text-signal-blue">{fmtSI('Q', cycleResult.Qout, cycleResult.units)}</span></div>
                <div><span className="text-slate-500">η:</span> <span className="font-mono text-emerald-400">{cycleResult.eta.toFixed(4)}</span></div>
              </div>
            )}

            <div className="space-y-2">
              {cycle.map((st: any, idx: number) => {
                const units = deriveUnits(cycle as any[])
                const pStr = st.P !== undefined ? fmtSI('P', st.P, units) : '–'
                const tStr = st.T !== undefined ? fmtSI('T', st.T, units) : '–'
                return (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, idx)}
                  className="flex items-center justify-between gap-2 border border-slate-700 p-2 rounded bg-slate-900/40"
                >
                  <div className="text-xs">
                    <div className="font-semibold">Stato {idx + 1}</div>
                    <div className="text-slate-400">P: {pStr}, T: {tStr}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => removeFromCycle(idx)} variant="outline">Rimuovi</Button>
                  </div>
                </div>
              )})}
            </div>

            {report && (
              <div className="border border-slate-700 p-4 rounded bg-slate-900/40">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-head text-base font-bold text-slate-300">Professor Mode Report</h4>
                  <div className="flex gap-2">
                    <Button onClick={downloadLatex} variant="outline">Scarica LaTeX</Button>
                    <Button onClick={downloadPDF} variant="outline">Scarica PDF</Button>
                  </div>
                </div>
                <p className="text-sm text-emerald-400 mb-2">{report.summary}</p>
                <div className="max-h-80 overflow-y-auto text-sm text-slate-300 space-y-3">
                  {report.steps.map((s, i) => (
                    <div key={i} className="border-b border-slate-800 pb-2">
                      <p className="font-semibold text-slate-200">{s.title}</p>
                      <p className="text-slate-400 text-xs">{s.explanation}</p>
                      <pre className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{s.latex}</pre>
                      {s.numeric && <p className="text-xs text-signal-blue mt-1">{s.numeric}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center border border-dashed border-slate-800 rounded text-sm text-slate-600">
            Calcola uno stato nel tab Stato, poi torna qui per costruire il ciclo →
          </div>
        )}
      </div>
    </div>
  )
}

/** Minimal Markdown → HTML for the print fallback. */
function reportMarkdownToHTML(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\$\$([\s\S]+?)\$\$/g, '<pre style="background:#f5f5f5;padding:0.5em">$1</pre>')
    .replace(/\$([^\$]+)\$/g, '<i>$1</i>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^([^<].*)$/gm, '<p>$1</p>')
}

/** Save a Blob as a file download in the user's browser. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
