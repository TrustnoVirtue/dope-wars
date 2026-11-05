import { useState } from 'react'
import {
  BOROUGHS,
  CAR_BY_ID,
  CITIES,
  GOOD_BY_ID,
  LOCATION_BY_ID,
} from '../game/data'
import { priceAt, travelDays } from '../game/selectors'
import type {
  BuyOrder,
  GameState,
  GoodId,
  Location,
  LocationId,
  WatchEntry,
} from '../game/types'
import { cn } from '../lib/cn'
import { money } from '../lib/format'
import { LockIcon, MapPinIcon, StarIcon } from './icons'
import { Button, Card } from './ui'

export function QuickTravel({
  game,
  onTravel,
  onDrive,
}: {
  game: GameState
  onTravel: (location: LocationId) => void
  onDrive: (location: LocationId) => void
}) {
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const inCity = LOCATION_BY_ID[game.location].kind === 'city'
  const car = game.car ? CAR_BY_ID[game.car] : null

  const renderChip = (location: Location, locked: boolean) => {
    const active = location.id === game.location
    const days = travelDays(game, location.id)
    return (
      <button
        key={location.id}
        type="button"
        disabled={active || disabled || locked}
        title={
          active
            ? `You are in ${location.name}`
            : locked
              ? `${location.name} needs a car`
              : `${location.name} — ${days} day${days === 1 ? '' : 's'}`
        }
        className={cn(
          'focus-ring flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40',
          active
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]',
        )}
        onClick={() =>
          inCity || location.kind === 'city'
            ? onDrive(location.id)
            : onTravel(location.id)
        }
      >
        {locked ? <LockIcon size={10} /> : null}
        {location.name}
        {!active && !locked ? (
          <span className="font-normal text-[var(--dim)]">{days}d</span>
        ) : null}
      </button>
    )
  }

  return (
    <Card className="flex items-center gap-3 px-3 py-2">
      <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        <MapPinIcon size={12} />
        Travel
      </span>
      <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
        {BOROUGHS.map((location) => renderChip(location, false))}
        {CITIES.map((location) => renderChip(location, !car))}
      </div>
    </Card>
  )
}

export function WatchlistBar({
  game,
  onSet,
  onClear,
}: {
  game: GameState
  onSet: (
    good: GoodId,
    location: LocationId,
    target: number,
    direction: 'above' | 'below',
  ) => void
  onClear: (good: GoodId, location: LocationId) => void
}) {
  if (game.watchlist.length === 0) return null
  const hit = game.watchlist.filter((entry) => !entry.armed).length

  return (
    <Card className="flex items-center gap-3 px-3 py-2">
      <span className="flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        <StarIcon size={12} filled={hit > 0} />
        Alerts
        {hit > 0 ? (
          <span className="rounded-full bg-[var(--warn-soft)] px-1.5 py-px text-[9px] font-bold text-[var(--warn)]">
            {hit}
          </span>
        ) : null}
      </span>
      <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
        {game.watchlist.map((entry) => (
          <WatchChip
            key={`${entry.location}:${entry.good}`}
            game={game}
            entry={entry}
            onSet={onSet}
            onClear={onClear}
          />
        ))}
      </div>
    </Card>
  )
}

function WatchChip({
  game,
  entry,
  onSet,
  onClear,
}: {
  game: GameState
  entry: WatchEntry
  onSet: (
    good: GoodId,
    location: LocationId,
    target: number,
    direction: 'above' | 'below',
  ) => void
  onClear: (good: GoodId, location: LocationId) => void
}) {
  const [target, setTarget] = useState(String(entry.target))
  const price = priceAt(game, entry.location, entry.good)
  const name = GOOD_BY_ID[entry.good].name
  const apply = (direction: 'above' | 'below' = entry.direction) => {
    const value = Math.floor(Number(target))
    if (value > 0) onSet(entry.good, entry.location, value, direction)
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5',
        entry.armed
          ? 'border-[var(--border)] bg-[var(--surface-2)]'
          : 'border-[var(--warn)] bg-[var(--warn-soft)]',
      )}
    >
      <div className="leading-tight">
        <p className="text-[10px] font-semibold">
          {name}
          <span className="font-normal text-[var(--muted)]">
            {' '}
            · {LOCATION_BY_ID[entry.location].name}
          </span>
        </p>
        <p className="text-[9px] text-[var(--muted)]">
          now {money(price)} · {entry.armed ? 'watching' : 'hit'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={
            entry.direction === 'above'
              ? 'Alert when price rises to the target'
              : 'Alert when price falls to the target'
          }
          className="focus-ring rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[10px] font-bold text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() =>
            apply(entry.direction === 'above' ? 'below' : 'above')
          }
        >
          {entry.direction === 'above' ? '≥' : '≤'}
        </button>
        <label className="flex h-7 w-[74px] items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 focus-within:border-[var(--accent)]">
          <span className="text-[9px] font-semibold text-[var(--dim)]">$</span>
          <input
            aria-label={`${name} alert target`}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full min-w-0 bg-transparent text-[10px] font-semibold tabular-nums outline-none"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value.replace(/[^\d]/g, ''))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') apply()
            }}
          />
        </label>
        <Button size="xs" variant="secondary" onClick={() => apply()}>
          Set
        </Button>
        <Button
          size="xs"
          variant="ghost"
          title={`Remove ${name} alert`}
          onClick={() => onClear(entry.good, entry.location)}
        >
          ×
        </Button>
      </div>
    </div>
  )
}

export function BuyOrdersBar({
  game,
  onUpdate,
  onCancel,
}: {
  game: GameState
  onUpdate: (order: BuyOrder, maxPrice: number) => void
  onCancel: (id: string) => void
}) {
  if (game.buyOrders.length === 0) return null

  return (
    <Card className="flex items-center gap-3 px-3 py-2">
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        Limit buys
      </span>
      <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
        {game.buyOrders.map((order) => (
          <OrderChip
            key={order.id}
            game={game}
            order={order}
            onUpdate={onUpdate}
            onCancel={onCancel}
          />
        ))}
      </div>
    </Card>
  )
}

function OrderChip({
  game,
  order,
  onUpdate,
  onCancel,
}: {
  game: GameState
  order: BuyOrder
  onUpdate: (order: BuyOrder, maxPrice: number) => void
  onCancel: (id: string) => void
}) {
  const [maxPrice, setMaxPrice] = useState(String(order.maxPrice))
  const price = priceAt(game, order.location, order.good)
  const name = GOOD_BY_ID[order.good].name
  const filling = price <= order.maxPrice

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5',
        filling
          ? 'border-[var(--good)] bg-[var(--good-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-2)]',
      )}
    >
      <div className="leading-tight">
        <p className="text-[10px] font-semibold">
          {name}
          <span className="font-normal text-[var(--muted)]">
            {' '}
            · {LOCATION_BY_ID[order.location].name}
          </span>
        </p>
        <p className="text-[9px] text-[var(--muted)]">
          {order.remaining} / {order.qty} left · now {money(price)} ·{' '}
          {filling ? 'filling' : 'waiting'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <label className="flex h-7 w-[74px] items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 focus-within:border-[var(--accent)]">
          <span className="text-[9px] font-semibold text-[var(--dim)]">≤$</span>
          <input
            aria-label={`${name} order max price`}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full min-w-0 bg-transparent text-[10px] font-semibold tabular-nums outline-none"
            value={maxPrice}
            onChange={(event) =>
              setMaxPrice(event.target.value.replace(/[^\d]/g, ''))
            }
          />
        </label>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => {
            const value = Math.floor(Number(maxPrice))
            if (value > 0) onUpdate(order, value)
          }}
        >
          Set
        </Button>
        <Button
          size="xs"
          variant="ghost"
          title={`Cancel ${name} order`}
          onClick={() => onCancel(order.id)}
        >
          ×
        </Button>
      </div>
    </div>
  )
}
