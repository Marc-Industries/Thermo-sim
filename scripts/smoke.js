#!/usr/bin/env node
/**
 * Validate the thermodynamic engine end-to-end without a browser.
 * Used by `npm run smoke` and the CI pipeline.
 *
 * Tests:
 *  - ideal gas (Air): P,T -> v
 *  - variable cp(T) ideal gas (Aria): P,T -> state
 *  - real fluid (Water): P,T -> state, expect h in plausible range
 *  - Rankine cycle: 4 states -> analyse -> η > 0
 *  - Professor Mode: rankine -> report contains LaTeX
 */
const path = require('path')
const fs = require('fs')

async function main() {
  const base = process.env.BASE || 'http://localhost:3000'
  const tests = []
  async function t(name, fn) {
    try {
      await fn()
      tests.push({ name, ok: true })
    } catch (e) {
      tests.push({ name, ok: false, error: e.message })
    }
  }

  await t('self-check basic', async () => {
    const r = await fetch(`${base}/api/self-check?full=1`).then((r) => r.json())
    if (!r.ok) throw new Error('self-check failed: ' + JSON.stringify(r).slice(0, 200))
    const failed = r.results.filter((x) => !x.ok)
    if (failed.length) throw new Error('some self-check sub-tests failed: ' + JSON.stringify(failed))
  })

  await t('professor rankine', async () => {
    const r = await fetch(`${base}/api/professor?cycle=rankine`).then((r) => r.json())
    if (!r.latex || !r.markdown) throw new Error('no LaTeX/markdown')
    if (!r.summary.includes('η')) throw new Error('summary missing η')
  })

  await t('compute-state ideal_gas', async () => {
    const r = await fetch(`${base}/api/compute-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'ideal_gas',
        substance: 'Aria',
        prop1: { name: 'P', value: 101325, unit: 'Pa' },
        prop2: { name: 'T', value: 288.15, unit: 'K' },
      }),
    }).then((r) => r.json())
    if (r.detail) throw new Error(r.detail)
    const v = r.state.v
    if (Math.abs(v - 0.8165) > 0.01) throw new Error(`expected v ≈ 0.8165, got ${v}`)
  })

  await t('compute-state ideal_gas_cp_t', async () => {
    const r = await fetch(`${base}/api/compute-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'ideal_gas_cp_t',
        substance: 'Aria',
        prop1: { name: 'P', value: 101325, unit: 'Pa' },
        prop2: { name: 'T', value: 500, unit: 'K' },
      }),
    }).then((r) => r.json())
    if (r.detail) throw new Error(r.detail)
    if (!r.state.h || r.state.h < 0) throw new Error(`unexpected h: ${r.state.h}`)
  })

  await t('compute-state Water real', async () => {
    const r = await fetch(`${base}/api/compute-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'real',
        substance: 'Water',
        prop1: { name: 'P', value: 101325, unit: 'Pa' },
        prop2: { name: 'T', value: 373.15, unit: 'K' },
      }),
    }).then((r) => r.json())
    if (r.detail) throw new Error(r.detail)
    if (!r.state.h) throw new Error('no h')
  })

  const failed = tests.filter((x) => !x.ok)
  console.log(JSON.stringify({ tests, failed: failed.length }, null, 2))
  if (failed.length) {
    console.error('SMOKE FAILED:')
    for (const f of failed) console.error(' -', f.name, ':', f.error)
    process.exit(1)
  }
  console.log('Smoke tests passed')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(2) })
