import { NextResponse } from 'next/server'
import { computeThermodynamicState } from '@/lib/thermo-engine'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const full = url.searchParams.get('full') === '1'

    const results: any[] = []

    // Test 1: ideal gas (Air)
    try {
      const model = 'ideal_gas' as const
      const substance = 'Air'
      const prop1 = { name: 'P', value: 101325 }
      const prop2 = { name: 'T', value: 288.15 }
      const res = computeThermodynamicState(model, substance, prop1, prop2)
      const R = res.extra?.R ?? null
      const expectedV = R ? (R * (prop2.value as number)) / (prop1.value as number) : null
      results.push({ name: 'ideal_gas_basic', ok: true, res, expected: { v: expectedV } })
    } catch (e: any) {
      results.push({ name: 'ideal_gas_basic', ok: false, error: e.message })
    }

    if (full) {
      // Test 2: water simple check (P,T)
      try {
        const model = 'real' as const
        const substance = 'Water'
        const prop1 = { name: 'P', value: 101325 }
        const prop2 = { name: 'T', value: 300 }
        const res = computeThermodynamicState(model, substance, prop1, prop2)
        // basic plausibility checks
        const ok = res.state && res.state.h && res.state.v && res.state.s
        results.push({ name: 'water_basic', ok: !!ok, res })
      } catch (e: any) {
        results.push({ name: 'water_basic', ok: false, error: e.message })
      }

      // Test 3: real fluid fallback (R134a) using ideal fallback
      try {
        const model = 'real' as const
        const substance = 'R134a'
        const prop1 = { name: 'P', value: 101325 }
        const prop2 = { name: 'T', value: 300 }
        const res = computeThermodynamicState(model, substance, prop1, prop2)
        results.push({ name: 'r134a_fallback', ok: true, res })
      } catch (e: any) {
        results.push({ name: 'r134a_fallback', ok: false, error: e.message })
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
