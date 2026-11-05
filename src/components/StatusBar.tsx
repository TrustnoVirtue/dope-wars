import {
  CHARACTER_BY_ID,
  DIFFICULTY_BY_ID,
  ENDLESS_DEBT_LIMIT,
} from '../game/data'
import type { GameState } from '../game/types'
import { netWorth } from '../game/selectors'
import { cn } from '../lib/cn'
import { heatColor, heatLabel, money } from '../lib/format'
import { FlameIcon, MenuIcon, MoonIcon, SunIcon } from './icons'
import { Badge, IconButton, Meter } from './ui'

export function StatusBar({
  game,
  theme,
  onToggleTheme,
  onOpenMenu,
}: {
  game: GameState
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onOpenMenu: () => void
}) {
  const worth = netWorth(game)
  const config = DIFFICULTY_BY_ID[game.difficulty]
  const endless = game.mode === 'endless'
  const zero = game.start === 'zero'
  const dayProgress = (game.day / game.maxDays) * 100
  const lastDays = !endless && game.day >= game.maxDays
  const character = game.character ? CHARACTER_BY_ID[game.character] : null

  return (
    <header className="topbar shrink-0 border-b border-[var(--border)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1720px] px-3 sm:px-5 lg:px-8">
        <div className="flex items-center gap-3 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-strong))] text-[var(--on-accent)] shadow-[0_8px_24px_-12px_var(--accent)]">
            <span className="text-[13px] font-black tracking-tighter">DW</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="whitespace-nowrap text-[15px] font-bold tracking-tight">
                Dope Wars
              </h1>
              <div className="hidden items-center gap-2 sm:flex">
                <Badge tone={lastDays ? 'warn' : 'accent'}>{config.label}</Badge>
                {endless ? <Badge tone="info">Endless</Badge> : null}
                {zero ? <Badge tone="info">From Zero</Badge> : null}
                {character ? (
                  <Badge tone="neutral">{character.name}</Badge>
                ) : null}
              </div>
              <span className="hidden text-[11px] text-[var(--muted)] md:inline">
                New York City
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={cn(
                  'shrink-0 text-[11px] font-medium tabular-nums',
                  endless ? 'w-auto' : 'w-[74px]',
                  lastDays ? 'text-[var(--warn)]' : 'text-[var(--muted)]',
                )}
              >
                Day {game.day}
                {endless ? '' : ` / ${game.maxDays}`}
              </span>
              <Badge
                tone={endless ? 'info' : lastDays ? 'warn' : 'accent'}
                className="sm:hidden"
              >
                {zero
                  ? endless
                    ? 'Zero · Endless'
                    : `Zero · ${config.label}`
                  : endless
                    ? `${config.label} · Endless`
                    : config.label}
              </Badge>
              {endless ? null : (
                <Meter
                  value={dayProgress}
                  height={4}
                  className="w-24 sm:w-40"
                  color={lastDays ? 'var(--warn)' : 'var(--accent)'}
                  label="Day progress"
                />
              )}
              <span className="hidden text-[11px] text-[var(--dim)] lg:inline">
                {game.status === 'playing' ? currentHint(game) : 'Game over'}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <StatChip
              label="Net worth"
              value={money(worth)}
              valueClassName={worth >= 0 ? 'text-[var(--accent)]' : 'text-[var(--bad)]'}
              className="min-w-[100px]"
            />
            <StatChip label="Cash" value={money(game.cash)} />
            <StatChip label="Bank" value={money(game.bank)} />
            <StatChip
              label="Debt"
              value={money(game.debt)}
              valueClassName={game.debt > 0 ? 'text-[var(--bad)]' : 'text-[var(--good)]'}
            />
            <HeatChip heat={game.heat} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <IconButton label="Toggle theme" onClick={onToggleTheme}>
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </IconButton>
            <IconButton label="Open menu" onClick={onOpenMenu}>
              <MenuIcon size={17} />
            </IconButton>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pb-3 lg:hidden">
          <StatChip
            compact
            label="Worth"
            value={money(worth)}
            valueClassName={worth >= 0 ? 'text-[var(--accent)]' : 'text-[var(--bad)]'}
          />
          <StatChip compact label="Cash" value={money(game.cash)} />
          <StatChip compact label="Bank" value={money(game.bank)} />
          <StatChip
            compact
            label="Debt"
            value={money(game.debt)}
            valueClassName={game.debt > 0 ? 'text-[var(--bad)]' : 'text-[var(--good)]'}
          />
          <HeatChip compact heat={game.heat} />
        </div>
      </div>
    </header>
  )
}

function StatChip({
  label,
  value,
  valueClassName,
  className,
  compact = false,
}: {
  label: string
  value: string
  valueClassName?: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-1.5',
        compact ? 'px-1.5' : 'px-2.5',
        className,
      )}
    >
      <p
        className={cn(
          'truncate font-semibold uppercase text-[var(--muted)]',
          compact
            ? 'text-[8px] tracking-[0.08em]'
            : 'text-[9px] tracking-[0.12em]',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 truncate font-semibold leading-none tabular-nums',
          compact ? 'text-[11px]' : 'text-[13px]',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  )
}

function HeatChip({ heat, compact = false }: { heat: number; compact?: boolean }) {
  const rounded = Math.round(heat)
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-1.5',
        compact ? 'px-1.5' : 'min-w-[96px] px-2.5',
      )}
      title={`Heat: ${heatLabel(heat)}. High heat means more police attention.`}
    >
      <div className="flex items-center justify-between gap-1">
        <p
          className={cn(
            'flex min-w-0 items-center gap-1 font-semibold uppercase text-[var(--muted)]',
            compact
              ? 'text-[8px] tracking-[0.06em]'
              : 'text-[9px] tracking-[0.12em]',
          )}
        >
          <FlameIcon size={compact ? 9 : 10} />
          Heat
        </p>
        <span
          className={cn(
            'shrink-0 font-semibold tabular-nums',
            compact ? 'text-[9px]' : 'text-[10px]',
          )}
          style={{ color: heatColor(heat) }}
        >
          {rounded}
        </span>
      </div>
      <Meter
        value={heat}
        height={compact ? 3 : 4}
        className={cn('w-full', compact ? 'mt-1' : 'mt-1.5')}
        color={heatColor(heat)}
        label="Heat"
      />
    </div>
  )
}

function currentHint(game: GameState): string {
  if (game.mode === 'endless') {
    if (game.debt >= ENDLESS_DEBT_LIMIT * 0.8) return 'The shark is closing in'
    if (game.start === 'zero' && game.stats.dives === 0) {
      return 'Nothing but a dumpster and an idea'
    }
    if (game.heat >= 65) return 'The block is hot — lay low'
    return `${game.day} day${game.day === 1 ? '' : 's'} deep and counting`
  }
  if (game.start === 'zero' && game.stats.dives === 0) {
    return 'Nothing but a dumpster and an idea'
  }
  if (game.debt >= 20_000) return 'The shark is losing patience'
  if (game.heat >= 65) return 'The block is hot — lay low'
  if (game.day >= game.maxDays) return 'Last chance to settle up'
  return `${game.maxDays - game.day} day${game.maxDays - game.day === 1 ? '' : 's'} left`
}
