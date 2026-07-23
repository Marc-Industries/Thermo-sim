import { NextRequest, NextResponse } from 'next/server'
import { computeThermodynamicState } from '@/lib/thermo-engine'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { model, substance, prop1, prop2 } = body

    if (!model || !substance || !prop1 || !prop2) {
      return NextResponse.json(
        { detail: 'Missing required fields: model, substance, prop1, prop2' },
        { status: 400 }
      )
    }

    const result = computeThermodynamicState(model, substance, prop1, prop2)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Calculation error' },
      { status: 500 }
    )
  }
}
