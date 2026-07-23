import { NextResponse } from 'next/server'
import { computeThermodynamicState } from '@/lib/thermo-engine'

export async function GET() {
  try {
    // Simple self-check: ideal gas Air at 101325 Pa and 288.15 K
    const model = 'ideal_gas' as const
    const substance = 'Air'
    const prop1 = { name: 'P', value: 101325 }
    const prop2 = { name: 'T', value: 288.15 }

    const res = computeThermodynamicState(model, substance, prop1, prop2)

    // expected v = R*T/P
    const R = res.extra?.R ?? null
    const expectedV = R ? (R * (prop2.value as number)) / (prop1.value as number) : null

    return NextResponse.json({
      ok: true,
      check: 'ideal_gas_basic',
      input: { model, substance, prop1, prop2 },
      result: res,
      expected: { v: expectedV },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
