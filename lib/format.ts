export function fmt(num: number | undefined, decimals = 2): string {
  if (num === undefined || num === null) return '—'
  return num.toFixed(decimals)
}

export function formatValue(value: number, unit: string, decimals = 2): string {
  return `${fmt(value, decimals)} ${unit}`
}
