import { NextResponse } from 'next/server'
import { analyzeCycle, CycleType } from '@/lib/thermo-engine'

export const runtime = 'nodejs'

/**
 * Cycle analysis endpoint.
 *
 * Body:
 *   { type, states, polytropic_n?, pump_isentropic?, turbine_isentropic? }
 *
 * Returns:
 *   { Wnet, Qin, Qout, eta, COP?, perProcess, extra }
 *
 * Mirrors the engine `analyzeCycle` function used directly by the UI today.
 * This route exists so the client (and other consumers) can rely on a single
 * REST surface for all thermodynamic computations.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, states, polytropic_n, pump_isentropic, turbine_isentropic } = body || {}
    if (!type || !Array.isArray(states)) {
      return NextResponse.json(
        { error: 'type and states[] are required' },
        { status: 400 }
      )
    }
    const valid: CycleType[] = [
      'rankine',
      'rankine_superheated',
      'rankine_reheat',
      'otto',
      'diesel',
      'brayton',
      'carnot',
    ]
    if (!valid.includes(type)) {
      return NextResponse.json(
        { error: `unknown cycle type: ${type}. Allowed: ${valid.join(', ')}` },
        { status: 400 }
      )
    }
    const result = analyzeCycle(type, states, {
      polytropic_n,
      pump_isentropic,
      turbine_isentropic,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'analyze-cycle failed' }, { status: 500 })
  }
}