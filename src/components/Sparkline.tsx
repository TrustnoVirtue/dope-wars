import { cn } from '../lib/cn'

export function Sparkline({
  values,
  color = 'var(--muted)',
  className,
}: {
  values: readonly number[]
  color?: string
  className?: string
}) {
  const safeValues = values.length > 0 ? values : [0]
  const min = Math.min(...safeValues)
  const max = Math.max(...safeValues)
  const span = max - min || 1
  const lastIndex = safeValues.length - 1
  const points = safeValues.map((value, index) => {
    const x = lastIndex === 0 ? 50 : (index / lastIndex) * 100
    const y = 3 + (1 - (value - min) / span) * 26
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
  })
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')
  const area = `${line} L${points[points.length - 1]!.x},32 L${points[0]!.x},32 Z`
  const last = points[points.length - 1]!

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('h-6 w-20 shrink-0', className)}
    >
      <path d={area} fill={color} opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="2.2" fill={color} />
    </svg>
  )
}
