import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const type = body.type || 'state'

    function stateToMarkdown(s: any, idx?: number) {
      const title = idx !== undefined ? `State ${idx + 1}` : 'State'
      return `### ${title}\n\n- P: ${s.P ?? '-'} Pa\n- T: ${s.T ?? '-'} K\n- v: ${s.v ?? '-'} m³/kg\n- h: ${s.h ?? '-'} J/kg\n- s: ${s.s ?? '-'} J/kg·K\n- phase: ${s.phase ?? '-'}\n`}

    function stateToLatex(s: any, idx?: number) {
      const title = idx !== undefined ? `State~${idx+1}` : 'State'
      return `\\subsection*{${title}}\\\n\\begin{itemize}\\n\\item P = ${s.P ?? '-'}~\\mathrm{Pa}\\n\\item T = ${s.T ?? '-'}~\\mathrm{K}\\n\\item v = ${s.v ?? '-'}~\\mathrm{m^3/kg}\\n\\item h = ${s.h ?? '-'}~\\mathrm{J/kg}\\n\\item s = ${s.s ?? '-'}~\\mathrm{J/(kg\\,K)}\\n\\item phase = ${s.phase ?? '-'}\\n\\end{itemize}\\n`}

    let markdown = '# Thermo Lab Report\n\n'
    let latex = '\\section*{Thermo Lab Report}\\n\\n'

    if (type === 'state') {
      const s = body.state
      markdown += stateToMarkdown(s)
      latex += stateToLatex(s)
    } else if (type === 'cycle') {
      const cycle = body.cycle || []
      markdown += `## Cycle (${cycle.length} states)\\n\\n`
      latex += `\\section*{Cycle (${cycle.length} states)}\\n\\n`
      cycle.forEach((s: any, i: number) => {
        markdown += stateToMarkdown(s, i) + '\\n'
        latex += stateToLatex(s, i) + '\\n'
      })
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }

    return NextResponse.json({ markdown, latex })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'export error' }, { status: 500 })
  }
}
