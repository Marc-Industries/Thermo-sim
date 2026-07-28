import { NextResponse } from 'next/server'
import { analyzeProcess } from '@/lib/thermo-engine'

export const runtime = 'nodejs'

/**
 * Process analysis endpoint.
 *
 * Body:
 *   { model, substance, state1, state2, process, polytropic_n? }
 *
 * Returns:
 *   { W, Q, extra }
 *
 * Mirrors the engine `analyzeProcess` function used directly by the UI today.
 * This route exists so the client (and other consumers) can rely on a single
 * REST surface for all thermodynamic computations.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { model, substance, state1, state2, process, polytropic_n } = body || {}
    if (!model || !substance || !state1 || !state2 || !process) {
      return NextResponse.json(
        { error: 'model, substance, state1, state2, process are required' },
        { status: 400 }
      )
    }
    const result = analyzeProcess(model, substance, state1, state2, process, polytropic_n)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'analyze-process failed' }, { status: 500 })
  }
}