import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  CHARACTER_BY_ID,
  DIFFICULTY_BY_ID,
} from '../game/data'
import {
  netWorth,
  portfolioValue,
  rankForNetWorth,
} from '../game/selectors'
import type { GameState } from '../game/types'
import { cn } from '../lib/cn'
import { money, quantity } from '../lib/format'
import { FlameIcon, TrophyIcon } from './icons'
import { Badge, Button, Card } from './ui'

const endingCopy: Record<
  NonNullable<GameState['ending']>,
  { title: string; subtitle: string }
> = {
  retired: {
    title: 'Retired.',
    subtitle:
      'You paid off the shark, packed a bag, and walked away with the million. The city keeps your tab open, but you are gone.',
  },
  millionaire: {
    title: 'Millionaire.',
    subtitle:
      'The final day arrives and the ledger is clean. You did it — seven figures, no debt, and a one-way ticket out of New York.',
  },
  time: {
    title: "Time's up.",
    subtitle:
      'You survived the run, but the money was not there. The city moves on. Maybe the next run goes differently.',
  },
  debt: {
    title: 'Paid in full.',
    subtitle:
      'The shark caught up before you could leave. There is no negotiating with a man who brings enforcers.',
  },
}

export function EndScreen({
  game,
  onPlayAgain,
  onTitle,
}: {
  game: GameState
  onPlayAgain: () => void
  onTitle: () => void
}) {
  const won = game.status === 'won'
  const worth = netWorth(game)
  const rank = rankForNetWorth(worth)
  const config = DIFFICULTY_BY_ID[game.difficulty]
  const copy = game.ending ? endingCopy[game.ending] : endingCopy.time

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-strong))] text-[var(--on-accent)] shadow-[0_8px_24px_-12px_var(--accent)]">
              <span className="text-[11px] font-black tracking-tighter">DW</span>
            </div>
            <span className="text-sm font-bold tracking-tight">Dope Wars</span>
          </div>
          <Badge tone={won ? 'good' : 'bad'}>
            {won ? 'Run complete' : 'Run over'}
          </Badge>
        </header>

        <main className="flex flex-1 items-center py-8">
          <Card className="w-full overflow-hidden">
            <div
              className={cn(
                'border-b border-[var(--border)] px-5 py-7 sm:px-8 sm:py-9',
                won ? 'bg-[var(--accent-soft)]' : 'bg-[var(--bad-soft)]',
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'grid h-12 w-12 shrink-0 place-items-center rounded-2xl border',
                    won
                      ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]'
                      : 'border-[var(--bad)] bg-[var(--surface)] text-[var(--bad)]',
                  )}
                >
                  {won ? <TrophyIcon size={22} /> : <FlameIcon size={22} />}
                </div>
                <div className="min-w-0">
                  <p className="eyebrow">
                    {config.label} —{' '}
                    {game.start === 'zero' ? 'From Zero · ' : ''}
                    {game.character
                      ? `${CHARACTER_BY_ID[game.character].name} · `
                      : ''}
                    {game.mode === 'endless'
                      ? `Endless · Day ${game.day}`
                      : `Day ${game.day} of ${game.maxDays}`}
                  </p>
                  <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                    {copy.title}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                    {copy.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="eyebrow">Final net worth</p>
                  <p
                    className={cn(
                      'mt-1 text-3xl font-bold tracking-tight tabular-nums',
                      won ? 'text-[var(--accent)]' : 'text-[var(--text)]',
                    )}
                  >
                    {money(worth)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Final rank</p>
                  <p className="mt-1 text-sm font-semibold">{rank.label}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {rank.description}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Goal</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {money(config.goal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <EndStat label="Cash" value={money(game.cash)} />
                <EndStat label="Bank" value={money(game.bank)} />
                <EndStat
                  label="Debt"
                  value={money(game.debt)}
                  tone={game.debt > 0 ? 'bad' : 'good'}
                />
                <EndStat
                  label="Realized profit"
                  value={money(game.stats.realizedProfit)}
                  tone={game.stats.realizedProfit >= 0 ? 'good' : 'bad'}
                />
                <EndStat label="Best sale" value={money(game.stats.bestSale)} />
                <EndStat
                  label="Trades"
                  value={quantity(game.stats.trades)}
                />
                <EndStat
                  label="Police stops"
                  value={quantity(game.stats.policeEncounters)}
                />
                <EndStat
                  label="Days survived"
                  value={
                    game.mode === 'endless'
                      ? quantity(game.day)
                      : `${game.day} / ${game.maxDays}`
                  }
                />
                <EndStat
                  label="Road trips"
                  value={quantity(game.stats.roadTrips)}
                />
                <EndStat label="Dumpster dives" value={quantity(game.stats.dives)} />
                <EndStat
                  label="Items pawned"
                  value={quantity(game.stats.itemsPawned)}
                />
                <EndStat
                  label="Properties"
                  value={quantity(game.stats.propertiesBought)}
                />
                <EndStat
                  label="Harvests"
                  value={quantity(game.stats.harvests)}
                />
                <EndStat
                  label="Wages paid"
                  value={money(game.stats.wagesPaid)}
                />
                <EndStat
                  label="Portfolio"
                  value={money(portfolioValue(game))}
                />
                <EndStat
                  label="Investment P/L"
                  value={money(game.stats.investmentEarnings)}
                  tone={game.stats.investmentEarnings >= 0 ? 'good' : 'bad'}
                />
                <EndStat
                  label="Asset trades"
                  value={quantity(game.stats.assetTrades)}
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow">Achievements</p>
                  <Badge tone="neutral">
                    {game.achievements.length} / {ACHIEVEMENTS.length}
                  </Badge>
                </div>
                {game.achievements.length === 0 ? (
                  <p className="mt-2 text-[11px] text-[var(--muted)]">
                    No achievements this run. The street is a harsh teacher.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {game.achievements.map((id) => (
                      <Badge key={id} tone="accent">
                        {ACHIEVEMENT_BY_ID[id].name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button variant="primary" size="lg" className="sm:flex-1" onClick={onPlayAgain}>
                  Play again
                </Button>
                <Button variant="secondary" size="lg" className="sm:flex-1" onClick={onTitle}>
                  Title screen
                </Button>
              </div>
            </div>
          </Card>
        </main>

        <footer className="border-t border-[var(--border)] pt-4 text-[10px] text-[var(--dim)]">
          A fictional trading game inspired by the 1984 BBS classic. No
          real-world instructions.
        </footer>
      </div>
    </div>
  )
}

function EndStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
          tone === 'bad' && 'text-[var(--bad)]',
          tone === 'good' && 'text-[var(--good)]',
        )}
      >
        {value}
      </p>
    </div>
  )
}
