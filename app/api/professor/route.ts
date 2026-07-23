import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const type = body.type || 'state'

    // Simple professor-mode report generator (Markdown)
    let md = '# Professor Mode Report\n\n'

    if (type === 'state') {
      const s = body.state || {}
      md += '## Stato termodinamico\n\n'
      md += `- P = ${s.P ?? '-'} Pa\n`
      md += `- T = ${s.T ?? '-'} K\n`
      md += `- v = ${s.v ?? '-'} m^3/kg\n`
      md += `- h = ${s.h ?? '-'} J/kg\n`
      md += `- s = ${s.s ?? '-'} J/kg·K\n\n`

      md += '### Passaggi (semplificati)\n\n'
      md += '1. Identificare le due proprietà note e scegliere equazioni di stato appropriate.\n'
      md += '2. Se gas ideale: usare PV = RT per trovare la terza proprietà mancante.\n'
      if (s.T && s.P) {
        md += `3. Calcolo esemplificativo: v = R*T/P (sostituire R della sostanza).\n`
      }
    } else if (type === 'cycle') {
      const cycle = body.cycle || []
      md += `## Analisi Ciclo (${cycle.length} stati)\n\n`
      cycle.forEach((st: any, i: number) => {
        md += `### Stato ${i + 1}\n - P = ${st.P ?? '-'} Pa\n - T = ${st.T ?? '-'} K\n - v = ${st.v ?? '-'} m^3/kg\n - h = ${st.h ?? '-'} J/kg\n - s = ${st.s ?? '-'} J/kg·K\n\n`
      })

      md += '## Approccio di soluzione (Rankine/Generico)\n\n'
      md += '1. Per ogni trasformazione 1→2: determinare se è isobara/isoterma/adiabatica/ecc.\n'
      md += '2. Calcolare lavoro W = ∫ P dv (o approssimazioni per trasformazioni semplici).\n'
      md += '3. Calcolare calori Q scambiati per ogni processo.\n'
      md += '4. Sommando lavori e calori ottenere W_net e Q_in; quindi rendimento η = W_net/Q_in.\n\n'

      md += '### Esempio simbolico (ciclo semplificato)\n\n'
      md += '\\begin{align*}\\nW_{1\\to2} &= \\int_{v_1}^{v_2} P(v)\\\,dv\\\\\\nQ_{in} &= h_3 - h_2\\\\\\n\\eta &= \\frac{W_{net}}{Q_{in}}\\\\\\n\\end{align*}\\n'
    } else {
      md += 'Unknown type'
    }

    return NextResponse.json({ markdown: md })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'professor error' }, { status: 500 })
  }
}
