export function convertToSI(propName: string, value: number, unit?: string): number {
  if (value === undefined || value === null || Number.isNaN(value)) throw new Error('Invalid numeric value')
  const u = (unit || '').toString()

  switch (propName) {
    case 'P': // Pressure
      if (!u || u === 'Pa' || u === 'pa') return value
      if (u === 'bar') return value * 1e5
      if (u === 'kPa') return value * 1e3
      if (u === 'MPa') return value * 1e6
      if (u === 'atm') return value * 101325
      if (u === 'psi') return value * 6894.757
      break

    case 'T': // Temperature
      if (!u || u === 'K' || u === 'k') return value
      if (u === 'C' || u === '°C' || u === 'c') return value + 273.15
      if (u === 'F' || u === '°F' || u === 'f') return (value - 32) * (5 / 9) + 273.15
      break

    case 'h':
    case 'u': // energy per mass
      if (!u || u === 'J/kg') return value
      if (u === 'kJ/kg') return value * 1000
      if (u === 'MJ/kg') return value * 1e6
      break

    case 's':
      if (!u || u === 'J/kg·K' || u === 'J/kgK') return value
      if (u === 'kJ/kg·K' || u === 'kJ/kgK') return value * 1000
      break

    case 'v':
      if (!u || u === 'm3/kg' || u === 'm³/kg') return value
      // cm3/g: 1 cm^3/g = 1e-3 m^3/kg
      if (u === 'cm3/g' || u === 'cm³/g' || u === 'cc/g') return value * 1e-3
      if (u === 'L/kg') return value * 1e-3
      break

    case 'x':
      // quality is unitless, assume 0..1 or percent
      if (u === '%' || u === 'percent') return value / 100
      return value

    default:
      return value
  }

  // fallback: return original value if unit unknown
  return value
}

export function normalizePayloadUnits(payload: {
  prop1: { name: string; value: number; unit?: string }
  prop2: { name: string; value: number; unit?: string }
  units?: Record<string, string>
}) {
  const prop1Unit = payload.prop1.unit || (payload.units?.[payload.prop1.name] ?? '')
  const prop2Unit = payload.prop2.unit || (payload.units?.[payload.prop2.name] ?? '')

  const p1 = { ...payload.prop1 }
  const p2 = { ...payload.prop2 }

  p1.value = convertToSI(p1.name, Number(p1.value), prop1Unit)
  p2.value = convertToSI(p2.name, Number(p2.value), prop2Unit)

  return { prop1: p1, prop2: p2 }
}
