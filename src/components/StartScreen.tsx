import { useState } from 'react'
import { CHARACTER_CLASSES, DIFFICULTIES } from '../game/data'
import type {
  CharacterClassId,
  Difficulty,
  GameMode,
  StartMode,
} from '../game/types'
import { cn } from '../lib/cn'
import { money } from '../lib/format'
import {
  ChevronRightIcon,
  ClockIcon,
  HelpIcon,
  MapPinIcon,
  TrashIcon,
} from './icons'
import { Badge, Button, Card } from './ui'

export function StartScreen({
  hasRun,
  onContinue,
  onStart,
  onHelp,
}: {
  hasRun: boolean
  onContinue: () => void
  onStart: (
    difficulty: Difficulty,
    seed?: number,
    mode?: GameMode,
    start?: StartMode,
    character?: CharacterClassId,
  ) => void
  onHelp: () => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [mode, setMode] = useState<GameMode>('classic')
  const [startMode, setStartMode] = useState<StartMode>('standard')
  const [character, setCharacter] = useState<CharacterClassId>('dropout')
  const [seed, setSeed] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)

  const selected = DIFFICULTIES.find((config) => config.id === difficulty)!
  const selectedCharacter = CHARACTER_CLASSES.find(
    (entry) => entry.id === character,
  )!
  const zero = startMode === 'zero'

  const start = () => {
    if (hasRun && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    const trimmed = seed.trim()
    const parsedSeed = trimmed === '' ? undefined : Number(trimmed)
    onStart(
      difficulty,
      Number.isFinite(parsedSeed) ? parsedSeed : undefined,
      mode,
      startMode,
      character,
    )
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-strong))] text-[var(--on-accent)] shadow-[0_8px_24px_-12px_var(--accent)]">
              <span className="text-[11px] font-black tracking-tighter">DW</span>
            </div>
            <span className="text-sm font-bold tracking-tight">Dope Wars</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onHelp}>
            <HelpIcon size={14} />
            How to play
          </Button>
        </header>

        <main className="flex flex-1 items-center py-10 lg:py-14">
          <div className="grid w-full gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14">
            <div>
              <Badge tone="accent" className="px-2.5 py-1">
                <MapPinIcon size={11} />
                New York City · one million · no debt
              </Badge>
              <h1 className="mt-5 text-[64px] font-black leading-[0.88] tracking-[-0.055em] sm:text-[86px] lg:text-[104px]">
                DOPE
                <br />
                <span className="text-[var(--accent)]">WARS</span>
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
                A modern take on the 1984 street-trading classic. Buy low in the
                outer boroughs, sell high in Manhattan, dodge the police, and pay
                off the loan shark before the clock runs out.
              </p>

              <div className="mt-7 grid max-w-lg grid-cols-3 gap-2">
                <Feature value="14" label="markets" />
                <Feature value="12" label="goods" />
                <Feature value="$1M" label="to win" />
              </div>

              {hasRun ? (
                <div className="mt-8">
                  <Button size="lg" onClick={onContinue}>
                    Continue run
                    <ChevronRightIcon size={16} />
                  </Button>
                </div>
              ) : null}
            </div>

            <Card className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Setup</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Start a run
                  </h2>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge tone={mode === 'endless' ? 'info' : 'neutral'}>
                    {mode === 'endless' ? 'Endless' : `${selected.maxDays} days`}
                  </Badge>
                  {zero ? <Badge tone="accent">From Zero</Badge> : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ModeButton
                  active={mode === 'classic'}
                  label="Classic"
                  hint="Race the clock"
                  onClick={() => {
                    setMode('classic')
                    setConfirmReplace(false)
                  }}
                />
                <ModeButton
                  active={mode === 'endless'}
                  label="Endless"
                  hint="No final day"
                  onClick={() => {
                    setMode('endless')
                    setConfirmReplace(false)
                  }}
                />
              </div>
              {mode === 'endless' ? (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--dim)]">
                  <ClockIcon size={11} className="mt-px shrink-0" />
                  No day limit. Retire a millionaire — or let the debt run too
                  far and the enforcers finish the run.
                </p>
              ) : null}

              <div className="mt-3">
                <p className="eyebrow">Start</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ModeButton
                    active={startMode === 'standard'}
                    label="Standard"
                    hint="Some cash, some debt"
                    onClick={() => {
                      setStartMode('standard')
                      setConfirmReplace(false)
                    }}
                  />
                  <ModeButton
                    active={startMode === 'zero'}
                    label="From Zero"
                    hint="No cash, no debt"
                    onClick={() => {
                      setStartMode('zero')
                      setConfirmReplace(false)
                    }}
                  />
                </div>
              </div>
              {zero ? (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--dim)]">
                  <TrashIcon size={11} className="mt-px shrink-0" />
                  Start with nothing: no cash, no product, no debt. Dumpster
                  dive, pawn junk, and grow your own. The shark will not extend
                  credit on a From Zero run.
                </p>
              ) : null}

              <div className="mt-3">
                <p className="eyebrow">Class</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CHARACTER_CLASSES.map((entry) => (
                    <ModeButton
                      key={entry.id}
                      active={character === entry.id}
                      label={entry.name}
                      hint={entry.tagline}
                      onClick={() => {
                        setCharacter(entry.id)
                        setConfirmReplace(false)
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
                  {selectedCharacter.description}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {DIFFICULTIES.map((config) => {
                  const active = config.id === difficulty
                  return (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => {
                        setDifficulty(config.id)
                        setConfirmReplace(false)
                      }}
                      className={cn(
                        'focus-ring flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                          active
                            ? 'border-[var(--accent)]'
                            : 'border-[var(--border-strong)]',
                        )}
                      >
                        {active ? (
                          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              active && 'text-[var(--accent)]',
                            )}
                          >
                            {config.label}
                          </span>
                          <span className="text-[10px] font-medium text-[var(--muted)]">
                            {zero ? '$0' : money(config.startCash)} ·{' '}
                            {mode === 'endless' ? 'endless' : `${config.maxDays} days`}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[var(--muted)]">
                          {zero
                            ? `No cash, no debt · ${config.capacity} load · heat x${config.heatMultiplier}`
                            : config.tagline}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2">
                <SummaryStat
                  label="Cash"
                  value={zero ? money(0) : money(selected.startCash)}
                />
                <SummaryStat
                  label="Debt"
                  value={zero ? money(0) : money(selected.debt)}
                />
                <SummaryStat
                  label="Interest"
                  value={
                    zero ? 'None' : `${Math.round(selected.interest * 100)}% / day`
                  }
                />
              </dl>

              <details className="group mt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)]">
                  Custom seed
                  <span className="text-[10px] text-[var(--dim)]">Optional</span>
                </summary>
                <label className="mt-2 flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 focus-within:border-[var(--accent)]">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Leave blank for a random city"
                    className="w-full min-w-0 bg-transparent text-xs font-medium outline-none placeholder:text-[var(--dim)]"
                    value={seed}
                    onChange={(event) =>
                      setSeed(event.target.value.replace(/[^\d]/g, ''))
                    }
                  />
                </label>
              </details>

              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={start}
                variant={confirmReplace ? 'danger' : 'primary'}
              >
                {hasRun
                  ? confirmReplace
                    ? 'Tap again to erase current run'
                    : 'Start a new run'
                  : zero
                    ? 'Start from zero'
                    : 'Start dealing'}
                {!confirmReplace ? <ChevronRightIcon size={16} /> : null}
              </Button>
              {hasRun ? (
                <p className="mt-2 text-center text-[10px] text-[var(--dim)]">
                  Starting new replaces your saved run. Continue is above.
                </p>
              ) : (
                <p className="mt-2 text-center text-[10px] text-[var(--dim)]">
                  Your run saves automatically in this browser.
                </p>
              )}
            </Card>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4 text-[10px] text-[var(--dim)]">
          <p>
            A fictional trading game inspired by the 1984 BBS classic. No
            real-world instructions.
          </p>
          <p>Keyboard: 1–8 locations · R to retire · ? for help</p>
        </footer>
      </div>
    </div>
  )
}

function Feature({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-lg font-bold tracking-tight text-[var(--accent)]">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
    </div>
  )
}

function ModeButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'focus-ring rounded-xl border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
      )}
    >
      <p
        className={cn(
          'text-xs font-semibold',
          active ? 'text-[var(--accent)]' : 'text-[var(--text)]',
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">{hint}</p>
    </button>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
