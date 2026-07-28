import { NextResponse } from 'next/server'
import { generateProfessorReport } from '@/lib/professor'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const out = generateProfessorReport(body)
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'professor error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  // Quick smoke endpoint: returns a Rankine sample so the GitHub Action can
  // produce a PDF artefact without a live client.
  const url = new URL(req.url)
  const cycle = url.searchParams.get('cycle') || 'rankine'
  const sample = sampleRankine()
  const out = generateProfessorReport({
    type: 'cycle',
    cycle: cycle as any,
    substance: 'Water',
    model: 'real',
    states: sample,
  })
  return NextResponse.json(out)
}

function sampleRankine() {
  return [
    { P: 10000, T: 319, v: 0.00101, h: 191800, u: 191790, s: 0.6492, phase: 'liquid' },
    { P: 8000000, T: 320, v: 0.00101, h: 199800, u: 191720, s: 0.6492, phase: 'liquid (compressed)' },
    { P: 8000000, T: 568, v: 0.03078, h: 2758000, u: 2511800, s: 5.7450, phase: 'gas' },
    { P: 10000, T: 319, v: 0.03078, h: 1922500, u: 1922400, s: 5.7450, phase: 'two-phase' },
  ]
}
