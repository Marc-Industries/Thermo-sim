import { NextResponse } from 'next/server'
import { computeThermodynamicState, analyzeCycle } from '@/lib/thermo-engine'
import { generateProfessorReport } from '@/lib/professor'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const full = url.searchParams.get('full') === '1'

    const results: any[] = []

    // Test 1: ideal gas (Air)
    try {
      const model = 'ideal_gas' as const
      const substance = 'Aria'
      const prop1 = { name: 'P', value: 101325 }
      const prop2 = { name: 'T', value: 288.15 }
      const res = computeThermodynamicState(model, substance, prop1, prop2)
      const R = (res.extra?.R as number) ?? null
      const expectedV = R ? (R * (prop2.value as number)) / (prop1.value as number) : null
      results.push({ name: 'ideal_gas_basic', ok: true, res, expected: { v: expectedV } })
    } catch (e: any) {
      results.push({ name: 'ideal_gas_basic', ok: false, error: e.message })
    }

    if (full) {
      // Test 2: cp(T) ideal gas (Aria)
      try {
        const r = computeThermodynamicState('ideal_gas_cp_t', 'Aria', { name: 'P', value: 101325 }, { name: 'T', value: 500 })
        const ok = r.state?.h && r.state.h > 0 && r.state.s
        results.push({ name: 'ideal_gas_cp_t', ok: !!ok, res: r })
      } catch (e: any) {
        results.push({ name: 'ideal_gas_cp_t', ok: false, error: e.message })
      }

      // Test 3: water real
      try {
        const r = computeThermodynamicState('real', 'Water', { name: 'P', value: 101325 }, { name: 'T', value: 300 })
        const ok = r.state && r.state.h && r.state.v && r.state.s
        results.push({ name: 'water_basic', ok: !!ok, res: r })
      } catch (e: any) {
        results.push({ name: 'water_basic', ok: false, error: e.message })
      }

      // Test 4: water two-phase detection
      try {
        const r = computeThermodynamicState('real', 'Water', { name: 'P', value: 101325 }, { name: 'T', value: 373.15 })
        const ok = r.state?.phase === 'two-phase'
        results.push({ name: 'water_two_phase', ok: !!ok, res: r })
      } catch (e: any) {
        results.push({ name: 'water_two_phase', ok: false, error: e.message })
      }

      // Test 5: cycle analysis
      try {
        const states = [
          { P: 10000, T: 319, v: 0.00101, h: 191800, u: 191790, s: 0.6492, phase: 'liquid' },
          { P: 8000000, T: 320, v: 0.00101, h: 199800, u: 191720, s: 0.6492, phase: 'liquid (compressed)' },
          { P: 8000000, T: 568, v: 0.03078, h: 2758000, u: 2511800, s: 5.7450, phase: 'gas' },
          { P: 10000, T: 319, v: 0.03078, h: 1922500, u: 1922400, s: 5.7450, phase: 'two-phase' },
        ]
        const cyc = analyzeCycle('rankine', states)
        const ok = cyc.eta > 0 && cyc.Wnet > 0
        results.push({ name: 'rankine_cycle', ok, res: cyc })
      } catch (e: any) {
        results.push({ name: 'rankine_cycle', ok: false, error: e.message })
      }

      // Test 6: professor mode
      try {
        const out = generateProfessorReport({
          type: 'cycle',
          cycle: 'rankine',
          substance: 'Water',
          model: 'real',
          states: [
            { P: 10000, T: 319, v: 0.00101, h: 191800, u: 191790, s: 0.6492, phase: 'liquid' },
            { P: 8000000, T: 320, v: 0.00101, h: 199800, u: 191720, s: 0.6492, phase: 'liquid (compressed)' },
            { P: 8000000, T: 568, v: 0.03078, h: 2758000, u: 2511800, s: 5.7450, phase: 'gas' },
            { P: 10000, T: 319, v: 0.03078, h: 1922500, u: 1922400, s: 5.7450, phase: 'two-phase' },
          ],
        })
        const ok = out.latex.includes('\\eta') && out.steps.length > 0
        results.push({ name: 'professor_mode', ok, summary: out.summary })
      } catch (e: any) {
        results.push({ name: 'professor_mode', ok: false, error: e.message })
      }

      // Test 7: rankine_superheated cycle
      try {
        const states = [
          { P: 10000, T: 319, v: 0.00101, h: 191800, u: 191790, s: 0.6492, phase: 'liquid' },
          { P: 8000000, T: 320, v: 0.00101, h: 199800, u: 191720, s: 0.6492, phase: 'liquid (compressed)' },
          { P: 8000000, T: 773, v: 0.0418, h: 3140000, u: 2806000, s: 6.3630, phase: 'gas (superheated)' },
          { P: 10000, T: 319, v: 0.03078, h: 1922500, u: 1922400, s: 5.7450, phase: 'two-phase' },
        ]
        const cyc = analyzeCycle('rankine_superheated', states)
        const ok = cyc.eta > 0 && cyc.Wnet > 0
        results.push({ name: 'rankine_superheated', ok, res: cyc })
      } catch (e: any) {
        results.push({ name: 'rankine_superheated', ok: false, error: e.message })
      }

      // Test 8: rankine_reheat cycle
      try {
        const states = [
          { P: 10000, T: 319, v: 0.00101, h: 191800, u: 191790, s: 0.6492, phase: 'liquid' },
          { P: 8000000, T: 320, v: 0.00101, h: 199800, u: 191720, s: 0.6492, phase: 'liquid (compressed)' },
          { P: 8000000, T: 773, v: 0.0418, h: 3140000, u: 2806000, s: 6.3630, phase: 'gas (superheated)' },
          { P: 4000000, T: 568, v: 0.0498, h: 2890000, u: 2691000, s: 6.5980, phase: 'gas' },
          { P: 4000000, T: 773, v: 0.0632, h: 3340000, u: 3087000, s: 6.9290, phase: 'gas (superheated)' },
          { P: 10000, T: 319, v: 0.03078, h: 1922500, u: 1922400, s: 5.7450, phase: 'two-phase' },
        ]
        const cyc = analyzeCycle('rankine_reheat', states)
        const ok = cyc.eta > 0 && cyc.Wnet > 0
        results.push({ name: 'rankine_reheat', ok, res: cyc })
      } catch (e: any) {
        results.push({ name: 'rankine_reheat', ok: false, error: e.message })
      }

      // Test 9: professor mode for reheat
      try {
        const out = generateProfessorReport({
          type: 'cycle',
          cycle: 'rankine_reheat',
          substance: 'Water',
          model: 'real',
          states: [
            { P: 10000, T: 319, v: 0.00101, h: 191800, u: 191790, s: 0.6492, phase: 'liquid' },
            { P: 8000000, T: 320, v: 0.00101, h: 199800, u: 191720, s: 0.6492, phase: 'liquid (compressed)' },
            { P: 8000000, T: 773, v: 0.0418, h: 3140000, u: 2806000, s: 6.3630, phase: 'gas (superheated)' },
            { P: 4000000, T: 568, v: 0.0498, h: 2890000, u: 2691000, s: 6.5980, phase: 'gas' },
            { P: 4000000, T: 773, v: 0.0632, h: 3340000, u: 3087000, s: 6.9290, phase: 'gas (superheated)' },
            { P: 10000, T: 319, v: 0.03078, h: 1922500, u: 1922400, s: 5.7450, phase: 'two-phase' },
          ],
        })
        const ok = out.steps.length >= 4 && /reheat/i.test(out.markdown)
        results.push({ name: 'professor_reheat', ok, summary: out.summary })
      } catch (e: any) {
        results.push({ name: 'professor_reheat', ok: false, error: e.message })
      }

      // Test 10: real-fluid state from (P, h) without T — exercises the iteration path
      try {
        const r = computeThermodynamicState(
          'real',
          'Water',
          { name: 'P', value: 1000000 },
          { name: 'h', value: 762000 }
        )
        const ok = r.state && typeof r.state.T === 'number' && r.state.phase
        results.push({ name: 'real_fluid_P_h', ok: !!ok, res: r })
      } catch (e: any) {
        results.push({ name: 'real_fluid_P_h', ok: false, error: e.message })
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
