import { useEffect } from 'react'
import type { EventKind, PendingEvent } from '../game/types'
import { cn } from '../lib/cn'
import {
  ChevronRightIcon,
  ScaleIcon,
  ShieldIcon,
  CrosshairIcon,
} from './icons'
import { Badge, Modal } from './ui'

function meta(kind: EventKind) {
  switch (kind) {
    case 'police':
      return {
        label: 'Police',
        tone: 'info' as const,
        color: 'var(--info)',
        icon: <ShieldIcon size={18} />,
      }
    case 'mugging':
      return {
        label: 'Mugging',
        tone: 'bad' as const,
        color: 'var(--bad)',
        icon: <CrosshairIcon size={18} />,
      }
    case 'shark':
      return {
        label: 'Loan shark',
        tone: 'warn' as const,
        color: 'var(--warn)',
        icon: <ScaleIcon size={18} />,
      }
    default:
      return {
        label: 'Event',
        tone: 'neutral' as const,
        color: 'var(--muted)',
        icon: <ShieldIcon size={18} />,
      }
  }
}

export function EventModal({
  event,
  onChoose,
}: {
  event: PendingEvent
  onChoose: (optionId: string) => void
}) {
  const eventMeta = meta(event.kind)

  useEffect(() => {
    const handleKey = (keyboardEvent: KeyboardEvent) => {
      const index = Number(keyboardEvent.key) - 1
      const option = event.options[index]
      if (option && !option.disabled) onChoose(option.id)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [event, onChoose])

  return (
    <Modal dismissible={false} labelledBy="event-title" className="sm:max-w-md">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border)]"
            style={{
              color: eventMeta.color,
              background: `color-mix(in srgb, ${eventMeta.color} 10%, var(--surface-2))`,
            }}
          >
            {eventMeta.icon}
          </div>
          <div className="min-w-0">
            <Badge tone={eventMeta.tone}>{eventMeta.label}</Badge>
            <h2
              id="event-title"
              className="mt-1.5 text-lg font-semibold tracking-tight"
            >
              {event.title}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {event.body}
        </p>

        <div className="mt-5 space-y-2">
          {event.options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              disabled={option.disabled}
              onClick={() => onChoose(option.id)}
              className={cn(
                'focus-ring group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-40',
                option.tone === 'primary' &&
                  'hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]',
                option.tone === 'danger' &&
                  'hover:border-[var(--bad)] hover:bg-[var(--bad-soft)]',
              )}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[10px] font-bold text-[var(--muted)] group-hover:text-[var(--text)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-xs font-semibold',
                    option.tone === 'primary' && 'text-[var(--accent)]',
                    option.tone === 'danger' && 'text-[var(--bad)]',
                  )}
                >
                  {option.label}
                </span>
                {option.hint ? (
                  <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[var(--muted)]">
                    {option.hint}
                  </span>
                ) : null}
              </span>
              <ChevronRightIcon
                size={14}
                className="shrink-0 text-[var(--dim)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--muted)]"
              />
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-[var(--dim)]">
          Press 1–{event.options.length} to choose. There is no walking away.
        </p>
      </div>
    </Modal>
  )
}
