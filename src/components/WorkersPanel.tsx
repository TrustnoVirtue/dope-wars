import { useState } from 'react'
import {
  CARETAKER_WAGE_PER_SLOT,
  GOOD_BY_ID,
  GROWABLE_BY_GOOD,
  GROWABLES,
  LOCATION_BY_ID,
} from '../game/data'
import {
  caretakerWage,
  characterOf,
  growPlotReady,
  propertyConfig,
} from '../game/selectors'
import type { GameState, GoodId, PropertyState } from '../game/types'
import { cn } from '../lib/cn'
import { money } from '../lib/format'
import { DealersSection } from './DealersPanel'
import { UsersIcon } from './icons'
import { Badge, Button, CardHeader } from './ui'

export function WorkersPanel({
  game,
  onHire,
  onFire,
  onHireDealer,
  onSetDealerPrice,
  onFireDealer,
}: {
  game: GameState
  onHire: (propertyId: string, good: GoodId) => void
  onFire: (propertyId: string) => void
  onHireDealer: (propertyId: string, good: GoodId, minPrice: number) => void
  onSetDealerPrice: (propertyId: string, minPrice: number) => void
  onFireDealer: (propertyId: string) => void
}) {
  const [section, setSection] = useState<'caretakers' | 'dealers'>('caretakers')
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const growProperties = game.properties.filter(
    (property) => propertyConfig(property).growSlots > 0,
  )
  const staffed = growProperties.filter((property) => property.caretaker)
  const wages = staffed.reduce(
    (sum, property) => sum + caretakerWage(property),
    0,
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <SegmentButton
          active={section === 'caretakers'}
          onClick={() => setSection('caretakers')}
        >
          Caretakers
        </SegmentButton>
        <SegmentButton
          active={section === 'dealers'}
          onClick={() => setSection('dealers')}
        >
          Dealers
        </SegmentButton>
      </div>

      {section === 'dealers' ? (
        <DealersSection
          game={game}
          onHire={onHireDealer}
          onSetPrice={onSetDealerPrice}
          onFire={onFireDealer}
        />
      ) : (
        <>
      <section className="card rounded-2xl">
        <CardHeader
          icon={<UsersIcon size={16} />}
          title="Caretakers"
          subtitle="Caretakers plant, harvest, and replant every grow slot — even while you travel."
          action={
            <Badge tone={staffed.length > 0 ? 'good' : 'neutral'}>
              {staffed.length} on payroll
            </Badge>
          }
        />
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat
              label="Caretakers"
              value={`${staffed.length} / ${growProperties.length}`}
            />
            <SummaryStat
              label="Daily wages"
              value={wages > 0 ? `${money(wages)} / day` : '$0'}
            />
            <SummaryStat
              label="Wage source"
              value={game.bank > 0 ? 'Cash, then bank' : 'Cash only'}
            />
          </div>

          <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
            Hire or change staff while standing at the property, then they keep
            working after you leave. Wages are charged at the start of each day
            from cash first, then bank. A caretaker quits if the wage cannot be
            paid. Harvests pause while the property stash is full, and
            replanting waits on seed money.
          </p>
        </div>
      </section>

      {growProperties.length === 0 ? (
        <section className="card rounded-2xl">
          <div className="p-6 text-center">
            <p className="text-sm font-semibold">No grow properties yet.</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Buy a crash pad, stash house, or grow house in the Properties tab
              to hire your first caretaker.
            </p>
          </div>
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {growProperties.map((property) => (
            <WorkerCard
              key={property.id}
              property={property}
              game={game}
              disabled={disabled}
              onHire={onHire}
              onFire={onFire}
            />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  )
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'focus-ring rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)]',
      )}
    >
      {children}
    </button>
  )
}

function WorkerCard({
  property,
  game,
  disabled,
  onHire,
  onFire,
}: {
  property: PropertyState
  game: GameState
  disabled: boolean
  onHire: (propertyId: string, good: GoodId) => void
  onFire: (propertyId: string) => void
}) {
  const config = propertyConfig(property)
  const [crop, setCrop] = useState<GoodId>(property.caretaker?.crop ?? 'weed')
  const hired = Boolean(property.caretaker)
  const unchanged = hired && property.caretaker?.crop === crop
  const wage = config.growSlots * CARETAKER_WAGE_PER_SLOT
  const ready = property.grows.filter((plot) =>
    growPlotReady(plot, game.day),
  ).length
  const nextReady = property.grows.reduce((soonest, plot) => {
    if (growPlotReady(plot, game.day)) return soonest
    const days = plot.readyDay - game.day
    return soonest === null || days < soonest ? days : soonest
  }, null as number | null)
  const location = LOCATION_BY_ID[property.location]
  const character = characterOf(game)
  const seedCost = Math.max(
    1,
    Math.round(
      (GROWABLE_BY_GOOD[crop]?.seedCost ?? 0) *
        (character?.seedCostMultiplier ?? 1),
    ),
  )
  const local = property.location === game.location

  return (
    <section className="card rounded-2xl">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{config.name}</p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {location.name} · {config.growSlots} grow slot
            {config.growSlots === 1 ? '' : 's'}
          </p>
        </div>
        <Badge tone={hired ? 'good' : 'neutral'}>
          {hired ? 'Active' : 'Idle'}
        </Badge>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <SummaryStat
            label="Growing"
            value={`${property.grows.length} / ${config.growSlots}`}
          />
          <SummaryStat label="Ready" value={String(ready)} />
          <SummaryStat label="Wage" value={`${money(wage)} / day`} />
        </div>

        <p className="mt-2 text-[10px] text-[var(--muted)]">
          {hired
            ? ready > 0
              ? `${ready} crop${ready === 1 ? '' : 's'} ready to harvest.`
              : nextReady !== null && nextReady > 0
                ? `Next harvest in ${nextReady} day${nextReady === 1 ? '' : 's'}.`
                : property.grows.length === 0
                  ? game.cash < seedCost
                    ? `Waiting on ${money(seedCost)} for seeds.`
                    : 'Empty slots — plants at the start of the next day.'
                  : 'Auto-fills open slots at the start of each day.'
            : 'No caretaker hired. Slots sit empty until you plant them.'}
          {local
            ? ''
            : ` Travel to ${location.name} to change this worker.`}
        </p>

        <div className="mt-3">
          <p className="eyebrow">Crop</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {GROWABLES.map((growable) => {
              const selected = crop === growable.good
              return (
                <button
                  key={growable.good}
                  type="button"
                  aria-pressed={selected}
                  disabled={!local}
                  className={cn(
                    'focus-ring rounded-lg border px-2.5 py-2 text-left transition-colors disabled:opacity-40',
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
                  )}
                  onClick={() => setCrop(growable.good)}
                >
                  <p
                    className={cn(
                      'text-[11px] font-semibold',
                      selected && 'text-[var(--accent)]',
                    )}
                  >
                    {GOOD_BY_ID[growable.good].name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[var(--muted)]">
                    {money(growable.seedCost)} seed · {growable.days} days
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5">
          {hired ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled || !local}
              onClick={() => onFire(property.id)}
            >
              Let go
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={hired ? 'secondary' : 'primary'}
            disabled={disabled || !local || unchanged}
            onClick={() => onHire(property.id, crop)}
          >
            {hired ? 'Set crop' : 'Hire caretaker'}
          </Button>
        </div>
      </div>
    </section>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}
