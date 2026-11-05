import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'
import { ChevronDownIcon, MinusIcon, PlusIcon } from './icons'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'outline'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-[var(--accent)] text-[var(--on-accent)] shadow-sm hover:bg-[var(--accent-strong)]',
  secondary:
    'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  ghost:
    'border border-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  danger:
    'border border-transparent bg-[var(--bad)] text-white shadow-sm hover:brightness-110',
  success:
    'border border-transparent bg-[var(--good)] text-[var(--on-good)] shadow-sm hover:brightness-105',
  outline:
    'border border-[var(--border-strong)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
}

const buttonSizes: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 rounded-lg px-2 text-[11px]',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-xl px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--surface-3)] disabled:text-[var(--muted)] disabled:shadow-none',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={cn('card rounded-2xl', className)}>{children}</section>
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function CollapsibleCard({
  icon,
  title,
  subtitle,
  action,
  children,
  defaultOpen = false,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={cn('card rounded-2xl', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ChevronDownIcon
            size={15}
            className={cn(
              'text-[var(--dim)] transition-transform',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>
      {open ? (
        <div className="border-t border-[var(--border)]">{children}</div>
      ) : null}
    </section>
  )
}

type BadgeTone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'info'

const badgeTones: Record<BadgeTone, string> = {
  neutral:
    'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]',
  accent:
    'border-transparent bg-[var(--accent-soft)] text-[var(--accent)]',
  good: 'border-transparent bg-[var(--good-soft)] text-[var(--good)]',
  bad: 'border-transparent bg-[var(--bad-soft)] text-[var(--bad)]',
  warn: 'border-transparent bg-[var(--warn-soft)] text-[var(--warn)]',
  info: 'border-transparent bg-[var(--info-soft)] text-[var(--info)]',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Modal({
  children,
  onClose,
  dismissible = true,
  labelledBy,
  className,
}: {
  children: ReactNode
  onClose?: () => void
  dismissible?: boolean
  labelledBy?: string
  className?: string
}) {
  useEffect(() => {
    if (!dismissible || !onClose) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dismissible, onClose])

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'card animate-rise max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl sm:max-w-lg sm:rounded-2xl',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function Meter({
  value,
  max = 100,
  color = 'var(--accent)',
  className,
  height = 6,
  label,
}: {
  value: number
  max?: number
  color?: string
  className?: string
  height?: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-[var(--surface-3)]',
        className,
      )}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 999_999,
  className,
  label = 'Quantity',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  className?: string
  label?: string
}) {
  const set = (next: number) => {
    const safe = Math.max(min, Math.min(max, Math.floor(next) || 0))
    onChange(safe)
  }

  return (
    <div
      className={cn(
        'flex h-9 items-stretch overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)] focus-within:border-[var(--accent)]',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        className="grid w-8 shrink-0 place-items-center text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)] disabled:opacity-30"
        onClick={() => set(value - 1)}
        disabled={value <= min}
      >
        <MinusIcon size={14} />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        size={1}
        className="w-full min-w-0 bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none"
        value={value === 0 ? '' : value}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, '')
          set(digits === '' ? 0 : Number(digits))
        }}
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        className="grid w-8 shrink-0 place-items-center text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)] disabled:opacity-30"
        onClick={() => set(value + 1)}
        disabled={value >= max}
      >
        <PlusIcon size={14} />
      </button>
    </div>
  )
}

export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Truncate({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn('block truncate', className)}>{children}</span>
}
