import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../lib/cn'

export type GameTabId =
  | 'market'
  | 'street'
  | 'bank'
  | 'properties'
  | 'workers'
  | 'loadout'

export interface GameTab {
  id: GameTabId
  label: string
  icon: ReactNode
  badge?: {
    text: string
    tone: 'neutral' | 'accent' | 'good' | 'bad' | 'warn'
  }
  title?: string
}

const badgeTones = {
  neutral: 'bg-[var(--surface-3)] text-[var(--muted)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  good: 'bg-[var(--good-soft)] text-[var(--good)]',
  bad: 'bg-[var(--bad-soft)] text-[var(--bad)]',
  warn: 'bg-[var(--warn-soft)] text-[var(--warn)]',
}

export function GameTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly GameTab[]
  active: GameTabId
  onChange: (id: GameTabId) => void
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return
    event.preventDefault()
    const buttons = [
      ...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      ) ?? []),
    ]
    const index = buttons.indexOf(event.currentTarget)
    if (index < 0) return
    const next =
      key === 'ArrowRight'
        ? (index + 1) % buttons.length
        : key === 'ArrowLeft'
          ? (index - 1 + buttons.length) % buttons.length
          : key === 'Home'
            ? 0
            : buttons.length - 1
    const button = buttons[next]
    const id = button?.dataset.tab as GameTabId | undefined
    if (!id) return
    onChange(id)
    button.focus()
  }

  return (
    <div className="topbar border-b border-[var(--border)] backdrop-blur-xl">
      <div
        role="tablist"
        aria-label="Sections"
        className="no-scrollbar mx-auto flex w-full max-w-[1720px] gap-1 overflow-x-auto px-3 sm:px-5 lg:px-8"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab={tab.id}
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              title={tab.title}
              className={cn(
                'focus-ring flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs',
                selected
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]',
              )}
              onClick={() => onChange(tab.id)}
              onKeyDown={handleKeyDown}
            >
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums',
                    badgeTones[tab.badge.tone],
                  )}
                >
                  {tab.badge.text}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
