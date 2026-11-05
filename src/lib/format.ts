const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat('en-US')

export function money(value: number): string {
  return currency.format(Math.round(value))
}

export function quantity(value: number): string {
  return number.format(Math.round(value))
}

export function percent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export function shortMoney(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) {
    return `${value < 0 ? '-' : ''}$${(absolute / 1_000_000).toFixed(2)}M`
  }
  if (absolute >= 10_000) {
    return `${value < 0 ? '-' : ''}$${Math.round(absolute / 1_000)}k`
  }
  return money(value)
}

export function heatColor(heat: number): string {
  if (heat >= 65) return 'var(--bad)'
  if (heat >= 35) return 'var(--warn)'
  return 'var(--good)'
}

export function heatLabel(heat: number): string {
  if (heat >= 75) return 'Burning'
  if (heat >= 50) return 'Hot'
  if (heat >= 25) return 'Warm'
  return 'Low'
}

export function plural(value: number, singular: string, pluralWord?: string): string {
  return value === 1 ? singular : pluralWord ?? `${singular}s`
}
