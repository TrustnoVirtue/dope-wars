import { useState } from 'react'
import {
  CARETAKER_WAGE_PER_SLOT,
  GOOD_BY_ID,
  GOODS,
  GROWABLES,
  LOCATION_BY_ID,
  PROPERTY_TYPES,
  getPropertyConfig,
} from '../game/data'
import {
  capacity,
  caretakerWage,
  growPlotReady,
  hasPropertyType,
  inventoryCount,
  propertiesAt,
  propertyConfig,
  storageLeft,
  storedCount,
} from '../game/selectors'
import type {
  GameState,
  GoodId,
  GrowPlot,
  PropertyConfig,
  PropertyState,
  PropertyTypeId,
} from '../game/types'
import { cn } from '../lib/cn'
import { money, quantity } from '../lib/format'
import { HomeIcon, SproutIcon } from './icons'
import { Badge, Button, CardHeader, QuantityStepper } from './ui'

export function PropertiesPanel({
  game,
  onBuy,
  onDeposit,
  onWithdraw,
  onPlant,
  onHarvest,
  onHire,
  onFire,
  onDepositAll,
  onWithdrawAll,
}: {
  game: GameState
  onBuy: (type: PropertyTypeId) => void
  onDeposit: (propertyId: string, good: GoodId, qty: number) => void
  onWithdraw: (propertyId: string, good: GoodId, qty: number) => void
  onPlant: (propertyId: string, good: GoodId) => void
  onHarvest: (propertyId: string, slot: number) => void
  onHire: (propertyId: string, good: GoodId) => void
  onFire: (propertyId: string) => void
  onDepositAll: (propertyId: string) => void
  onWithdrawAll: (propertyId: string) => void
}) {
  const local = propertiesAt(game)
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const location = LOCATION_BY_ID[game.location]
  const storage = local.reduce(
    (sum, property) => sum + propertyConfig(property).storage,
    0,
  )
  const stored = local.reduce((sum, property) => sum + storedCount(property), 0)
  const ready = local.reduce(
    (sum, property) =>
      sum + property.grows.filter((plot) => growPlotReady(plot, game.day)).length,
    0,
  )
  const staffed = local.filter((property) => property.caretaker)
  const wages = staffed.reduce(
    (sum, property) => sum + caretakerWage(property),
    0,
  )

  return (
    <div className="space-y-3">
      <section className="card rounded-2xl">
        <CardHeader
          icon={<HomeIcon size={16} />}
          title="Properties"
          subtitle={`${location.name} — ${local.length} of 4 types owned`}
          action={
            local.length > 0 ? (
              <Badge tone={ready > 0 ? 'good' : 'neutral'}>
                {ready > 0 ? `${ready} ready` : `${local.length} / 4`}
              </Badge>
            ) : (
              <Badge tone="neutral">None here</Badge>
            )
          }
        />

        <div className="p-4">
          {local.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-3 py-4 text-center text-xs text-[var(--muted)]">
              No properties here yet. Buy one below to store product and grow.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SummaryStat
                  label="Stored here"
                  value={`${quantity(stored)} / ${quantity(storage)}`}
                />
                <SummaryStat label="Crops ready" value={quantity(ready)} />
                <SummaryStat
                  label="Payroll"
                  value={
                    staffed.length > 0
                      ? `${money(wages)} / day`
                      : 'No caretakers'
                  }
                />
              </div>

              <div className="mt-3 space-y-3">
                {local.map((property) => (
                  <PropertyPanel
                    key={property.id}
                    property={property}
                    game={game}
                    disabled={disabled}
                    onDeposit={onDeposit}
                    onWithdraw={onWithdraw}
                    onPlant={onPlant}
                    onHarvest={onHarvest}
                    onHire={onHire}
                    onFire={onFire}
                    onDepositAll={onDepositAll}
                    onWithdrawAll={onWithdrawAll}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card rounded-2xl">
        <CardHeader
          icon={<HomeIcon size={16} />}
          title={`Buy in ${location.name}`}
          subtitle="One of each type per location. Property purchases are sunk costs."
        />
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROPERTY_TYPES.map((type) => {
            const config = getPropertyConfig(game.location, type.id)
            const owned = hasPropertyType(game, game.location, type.id)
            return (
              <div
                key={type.id}
                className={cn(
                  'rounded-xl border bg-[var(--surface-2)] px-3 py-2.5',
                  owned
                    ? 'border-[var(--good)]'
                    : 'border-[var(--border)]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{config.name}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                      {config.blurb}
                    </p>
                  </div>
                  {owned ? <Badge tone="good">Owned</Badge> : null}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-[var(--dim)]">
                    {quantity(config.storage)} stash · {config.growSlots} grow
                  </p>
                  {owned ? null : (
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={disabled || game.cash < config.cost}
                      onClick={() => onBuy(type.id)}
                    >
                      {money(config.cost)}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
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

function PropertyPanel({
  property,
  game,
  disabled,
  onDeposit,
  onWithdraw,
  onPlant,
  onHarvest,
  onHire,
  onFire,
  onDepositAll,
  onWithdrawAll,
}: {
  property: PropertyState
  game: GameState
  disabled: boolean
  onDeposit: (propertyId: string, good: GoodId, qty: number) => void
  onWithdraw: (propertyId: string, good: GoodId, qty: number) => void
  onPlant: (propertyId: string, good: GoodId) => void
  onHarvest: (propertyId: string, slot: number) => void
  onHire: (propertyId: string, good: GoodId) => void
  onFire: (propertyId: string) => void
  onDepositAll: (propertyId: string) => void
  onWithdrawAll: (propertyId: string) => void
}) {
  const [tab, setTab] = useState<'stash' | 'grow'>('stash')
  const [crop, setCrop] = useState<GoodId>(property.caretaker?.crop ?? 'weed')
  const config = propertyConfig(property)
  const readySlots = property.grows
    .map((plot, index) => (growPlotReady(plot, game.day) ? index : -1))
    .filter((index) => index >= 0)
  const canGrow = config.growSlots > 0

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{config.name}</p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            Stash {quantity(storedCount(property))} / {quantity(config.storage)}
            {canGrow
              ? ` · Grow ${property.grows.length} / ${config.growSlots}`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {property.dealer ? (
            <Badge tone="neutral">
              Dealer · {GOOD_BY_ID[property.dealer.good].name} @{' '}
              {money(property.dealer.minPrice)}
            </Badge>
          ) : null}
          {readySlots.length > 0 ? (
            <Badge tone="good">{readySlots.length} ready</Badge>
          ) : null}
        </div>
      </div>

      {canGrow ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <TabButton active={tab === 'stash'} onClick={() => setTab('stash')}>
            Stash
          </TabButton>
          <TabButton active={tab === 'grow'} onClick={() => setTab('grow')}>
            Grow
          </TabButton>
        </div>
      ) : null}

      {tab === 'stash' ? (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-[var(--muted)]">
              Move product between your coat and this stash.
            </p>
            <div className="flex gap-1.5">
              <Button
                size="xs"
                variant="secondary"
                disabled={
                  disabled ||
                  inventoryCount(game) <= 0 ||
                  storageLeft(property) <= 0
                }
                onClick={() => onDepositAll(property.id)}
              >
                Store all
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={
                  disabled ||
                  storedCount(property) <= 0 ||
                  capacity(game) - inventoryCount(game) <= 0
                }
                onClick={() => onWithdrawAll(property.id)}
              >
                Take all
              </Button>
            </div>
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {GOODS.map((good) => (
            <StashRow
              key={good.id}
              good={good.id}
              name={good.name}
              propertyId={property.id}
              stored={property.stored[good.id]}
              carried={game.inventory[good.id]}
              space={storageLeft(property)}
              carrySpace={capacity(game) - inventoryCount(game)}
              disabled={disabled}
              onDeposit={onDeposit}
              onWithdraw={onWithdraw}
            />
          ))}
          </div>
        </>
      ) : (
        <div className="mt-2 space-y-1.5">
          <CaretakerPanel
            property={property}
            config={config}
            crop={crop}
            disabled={disabled}
            onCropChange={setCrop}
            onHire={onHire}
            onFire={onFire}
          />
          {readySlots.length > 1 ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--good)] bg-[var(--good-soft)] px-3 py-2">
              <p className="text-[11px] font-medium text-[var(--good)]">
                {readySlots.length} crops are ready.
              </p>
              <Button
                size="xs"
                variant="success"
                onClick={() => {
                  for (const slot of [...readySlots].reverse()) {
                    onHarvest(property.id, slot)
                  }
                }}
              >
                Harvest all
              </Button>
            </div>
          ) : null}

          {Array.from({ length: config.growSlots }, (_, slot) => (
            <GrowRow
              key={slot}
              slot={slot}
              plot={property.grows[slot]}
              propertyId={property.id}
              game={game}
              disabled={disabled}
              onPlant={onPlant}
              onHarvest={onHarvest}
            />
          ))}
          <p className="pt-1 text-[10px] text-[var(--dim)]">
            Seeds cost cash up front. Harvested crops land in this stash.
          </p>
        </div>
      )}
    </section>
  )
}

function CaretakerPanel({
  property,
  config,
  crop,
  disabled,
  onCropChange,
  onHire,
  onFire,
}: {
  property: PropertyState
  config: PropertyConfig
  crop: GoodId
  disabled: boolean
  onCropChange: (good: GoodId) => void
  onHire: (propertyId: string, good: GoodId) => void
  onFire: (propertyId: string) => void
}) {
  const wage = config.growSlots * CARETAKER_WAGE_PER_SLOT
  const hired = Boolean(property.caretaker)
  const unchanged = hired && property.caretaker?.crop === crop

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Automation</p>
          <p className="mt-0.5 text-xs font-semibold">Caretaker</p>
        </div>
        <Badge tone={hired ? 'good' : 'neutral'}>
          {hired ? `${money(wage)} / day` : 'Not hired'}
        </Badge>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
        Plants, harvests into this stash, and replants automatically. Wages are
        paid daily from cash, then bank. Miss a payment and they quit. Harvests
        pause while the stash is full.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {GROWABLES.map((growable) => {
          const selected = crop === growable.good
          return (
            <button
              key={growable.good}
              type="button"
              aria-pressed={selected}
              className={cn(
                'focus-ring rounded-lg border px-2.5 py-2 text-left transition-colors',
                selected
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]',
              )}
              onClick={() => onCropChange(growable.good)}
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

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--dim)]">
          {config.growSlots} grow slot{config.growSlots === 1 ? '' : 's'} ·{' '}
          {money(wage)} / day
        </p>
        <div className="flex items-center gap-1.5">
          {hired ? (
            <Button
              size="xs"
              variant="secondary"
              disabled={disabled}
              onClick={() => onFire(property.id)}
            >
              Let go
            </Button>
          ) : null}
          <Button
            size="xs"
            variant="primary"
            disabled={disabled || unchanged}
            onClick={() => onHire(property.id, crop)}
          >
            {hired ? 'Set crop' : 'Hire'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TabButton({
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
        'focus-ring rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)]',
      )}
    >
      {children}
    </button>
  )
}

function StashRow({
  good,
  name,
  propertyId,
  stored,
  carried,
  space,
  carrySpace,
  disabled,
  onDeposit,
  onWithdraw,
}: {
  good: GoodId
  name: string
  propertyId: string
  stored: number
  carried: number
  space: number
  carrySpace: number
  disabled: boolean
  onDeposit: (propertyId: string, good: GoodId, qty: number) => void
  onWithdraw: (propertyId: string, good: GoodId, qty: number) => void
}) {
  const [value, setValue] = useState(1)
  const maxDeposit = Math.min(carried, space, value)
  const maxWithdraw = Math.min(stored, carrySpace, value)

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold">{name}</p>
        <p className="shrink-0 text-[9px] text-[var(--muted)]">
          Carry {quantity(carried)} · Stash {quantity(stored)}
        </p>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <QuantityStepper
          value={value}
          onChange={setValue}
          min={0}
          className="w-[92px] shrink-0"
          label={`${name} transfer quantity`}
        />
        <Button
          size="xs"
          variant="secondary"
          className="flex-1 px-1"
          disabled={disabled || maxDeposit <= 0}
          onClick={() => onDeposit(propertyId, good, value)}
        >
          In
        </Button>
        <Button
          size="xs"
          variant="secondary"
          className="flex-1 px-1"
          disabled={disabled || maxWithdraw <= 0}
          onClick={() => onWithdraw(propertyId, good, value)}
        >
          Out
        </Button>
      </div>
    </div>
  )
}

function GrowRow({
  slot,
  plot,
  propertyId,
  game,
  disabled,
  onPlant,
  onHarvest,
}: {
  slot: number
  plot: GrowPlot | undefined
  propertyId: string
  game: GameState
  disabled: boolean
  onPlant: (propertyId: string, good: GoodId) => void
  onHarvest: (propertyId: string, slot: number) => void
}) {
  if (plot) {
    const ready = growPlotReady(plot, game.day)
    const name = GOODS.find((good) => good.id === plot.good)?.name ?? plot.good
    return (
      <div
        className={cn(
          'rounded-xl border px-3 py-2',
          ready
            ? 'border-[var(--good)] bg-[var(--good-soft)]'
            : 'border-[var(--border)] bg-[var(--surface-2)]',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold">{name}</p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {ready
                ? `Ready — ${quantity(plot.yield)} units`
                : `Ready in ${plot.readyDay - game.day} day${plot.readyDay - game.day === 1 ? '' : 's'}`}
            </p>
          </div>
          {ready ? (
            <Button
              size="xs"
              variant="success"
              disabled={disabled}
              onClick={() => onHarvest(propertyId, slot)}
            >
              Harvest
            </Button>
          ) : (
            <Badge tone="neutral">
              <SproutIcon size={10} />
              Growing
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        Empty slot
      </p>
      <div className="mt-1.5 space-y-1.5">
        {GROWABLES.map((growable) => (
          <div
            key={growable.good}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold">
                {growable.label}
              </p>
              <p className="truncate text-[9px] text-[var(--muted)]">
                {money(growable.seedCost)} · {growable.days} days ·{' '}
                {growable.minYield}–{growable.maxYield} units
              </p>
            </div>
            <Button
              size="xs"
              variant="secondary"
              disabled={disabled || game.cash < growable.seedCost}
              onClick={() => onPlant(propertyId, growable.good)}
            >
              Plant
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
