import { NextRequest, NextResponse } from 'next/server'
import { computeThermodynamicState } from '@/lib/thermo-engine'
import { normalizePayloadUnits, convertFromSI, unitsFor } from '@/lib/units'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { model, substance, prop1, prop2, units } = body

    if (!model || !substance || !prop1 || !prop2) {
      return NextResponse.json(
        { detail: 'Missing required fields: model, substance, prop1, prop2' },
        { status: 400 }
      )
    }

    if (!['ideal_gas', 'ideal_gas_cp_t', 'real'].includes(model)) {
      return NextResponse.json({ detail: `Unknown model: ${model}` }, { status: 400 })
    }

    // Step 1: normalise user input to SI for the engine.
    const normalized = normalizePayloadUnits({ prop1, prop2, units })

    // Step 2: compute the full state in SI.
    const result = computeThermodynamicState(model as any, substance, normalized.prop1, normalized.prop2)

    // Step 3: convert each derived property back to the user's chosen unit
    // (or the canonical SI unit if no choice was made). The returned state is
    // now in user-friendly units — what they typed is what they see.
    const outputUnits = resultUnitsFor(model, units, prop1, prop2)
    const stateOut: Record<string, number | string> = {}
    for (const [k, v] of Object.entries(result.state)) {
      if (typeof v === 'number' && outputUnits[k]) {
        stateOut[k] = convertFromSI(k, v, outputUnits[k])
      } else {
        stateOut[k] = v
      }
    }

    return NextResponse.json({ ...result, state: stateOut, output_units: outputUnits })
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Calculation error' },
      { status: 500 }
    )
  }
}

/**
 * Decide which unit each property should be displayed in. Priority:
 *   1. The unit the user explicitly picked for that property — either via the
 *      `units` map (legacy) or via `prop1.unit`/`prop2.unit` directly.
 *   2. The canonical SI unit for that property.
 */
function resultUnitsFor(
  model: string,
  units: Record<string, string> | undefined,
  prop1: { name: string; unit?: string },
  prop2: { name: string; unit?: string },
): Record<string, string> {
  // Build a complete user-units map from whatever sources we have.
  const userPicked: Record<string, string> = {}
  if (prop1?.unit) userPicked[prop1.name] = prop1.unit
  if (prop2?.unit) userPicked[prop2.name] = prop2.unit
  if (units) Object.assign(userPicked, units)

  const props = ['P', 'T', 'v', 'h', 'u', 's', 'x']
  const out: Record<string, string> = {}
  for (const p of props) {
    const allowed = new Set(unitsFor(p))
    const explicit = userPicked[p]
    if (explicit && allowed.has(explicit)) {
      out[p] = explicit
      continue
    }
    // Default: first non-empty SI-allowed unit (usually Pa, K, m³/kg, J/kg, …)
    out[p] = unitsFor(p)[0] || ''
  }
  return out
}