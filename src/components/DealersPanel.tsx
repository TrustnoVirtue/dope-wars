import { useState } from 'react'
import {
  DEALER_COMMISSION,
  DEALER_HIRE_COST,
  DEALER_MAX_PRICE_MULTIPLIER,
  GOODS,
  GOOD_BY_ID,
  LOCATION_BY_ID,
} from '../game/data'
import { priceAt, propertyConfig } from '../game/selectors'
import type { GameState, GoodId, PropertyState } from '../game/types'
import { money, quantity } from '../lib/format'
import { UsersIcon } from './icons'
import { Badge, Button, CardHeader } from './ui'

export function DealersSection({
  game,
  onHire,
  onSetPrice,
  onFire,
}: {
  game: GameState
  onHire: (propertyId: string, good: GoodId, minPrice: number) => void
  onSetPrice: (propertyId: string, minPrice: number) => void
  onFire: (propertyId: string) => void
}) {
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const staffed = game.properties.filter((property) => property.dealer)
  const storedValue = staffed.reduce((sum, property) => {
    const dealer = property.dealer!
    return (
      sum + property.stored[dealer.good] * priceAt(game, property.location, dealer.good)
    )
  }, 0)

  return (
    <div className="space-y-3">
      <section className="card rounded-2xl">
        <CardHeader
          icon={<UsersIcon size={16} />}
          title="Dealers"
          subtitle="Park product in a property and set a minimum price — they move it when the market pays."
          action={
            <Badge tone={staffed.length > 0 ? 'good' : 'neutral'}>
              {staffed.length} working
            </Badge>
          }
        />
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat label="Dealers" value={String(staffed.length)} />
            <SummaryStat
              label="Stock value"
              value={money(Math.round(storedValue))}
            />
            <SummaryStat
              label="Cut per sale"
              value={`${Math.round(DEALER_COMMISSION * 100)}%`}
            />
          </div>
          <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
            Hiring costs {money(DEALER_HIRE_COST)} and takes{' '}
            {Math.round(DEALER_COMMISSION * 100)}% of every sale. When the price
            in the property&apos;s location meets your target, the dealer sells
            the whole stash of that good on the spot. Hire or retarget while
            standing at the property.
          </p>
        </div>
      </section>

      {game.properties.length === 0 ? (
        <section className="card rounded-2xl">
          <div className="p-6 text-center">
            <p className="text-sm font-semibold">No properties yet.</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Buy a property in the Properties tab, stash product there, then
              hire a dealer to move it.
            </p>
          </div>
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {game.properties.map((property) => (
            <DealerCard
              key={property.id}
              property={property}
              game={game}
              disabled={disabled}
              onHire={onHire}
              onSetPrice={onSetPrice}
              onFire={onFire}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DealerCard({
  property,
  game,
  disabled,
  onHire,
  onSetPrice,
  onFire,
}: {
  property: PropertyState
  game: GameState
  disabled: boolean
  onHire: (propertyId: string, good: GoodId, minPrice: number) => void
  onSetPrice: (propertyId: string, minPrice: number) => void
  onFire: (propertyId: string) => void
}) {
  const config = propertyConfig(property)
  const dealer = property.dealer
  const local = property.location === game.location
  const firstStored =
    GOODS.find((good) => property.stored[good.id] > 0)?.id ?? 'weed'
  const [good, setGood] = useState<GoodId>(dealer?.good ?? firstStored)
  const [target, setTarget] = useState(() =>
    String(dealer?.minPrice ?? priceAt(game, property.location, good)),
  )
  const currentPrice = priceAt(game, property.location, good)
  const storedQty = property.stored[good]
  const targetValue = Math.floor(Number(target))
  const maxTarget = Math.floor(
    game.markets[property.location][good].base * DEALER_MAX_PRICE_MULTIPLIER,
  )
  const targetValid = targetValue > 0 && targetValue <= maxTarget
  const wouldSell =
    Boolean(dealer) &&
    storedQty > 0 &&
    targetValid &&
    currentPrice >= targetValue
  const name = GOOD_BY_ID[good].name
  const location = LOCATION_BY_ID[property.location]

  const status = !dealer
    ? `${quantity(storedQty)} ${name} stored · no dealer`
    : storedQty <= 0
      ? `Waiting for ${name} in the stash`
      : wouldSell
        ? `Selling ${quantity(storedQty)} ${name} on the next tick`
        : `${quantity(storedQty)} ${name} stored · waiting for ${money(dealer.minPrice)}`

  return (
    <section className="card rounded-2xl">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{config.name}</p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {location.name} · {quantity(property.stored[good])} {name} stashed
          </p>
        </div>
        <Badge tone={dealer ? (wouldSell ? 'good' : 'neutral') : 'neutral'}>
          {dealer ? (wouldSell ? 'Selling' : 'Dealer hired') : 'No dealer'}
        </Badge>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <SummaryStat label="Now" value={money(currentPrice)} />
          <SummaryStat
            label={dealer ? 'Target' : 'Hire cost'}
            value={dealer ? money(dealer.minPrice) : money(DEALER_HIRE_COST)}
          />
          <SummaryStat label="Stashed" value={quantity(storedQty)} />
        </div>

        <p className="mt-2 text-[10px] text-[var(--muted)]">
          {dealer ? status : `${status}. `}
          {local ? '' : ` Travel to ${location.name} to change this dealer.`}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Product</span>
            <select
              aria-label={`${config.name} dealer product`}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-xs font-semibold outline-none focus:border-[var(--accent)] disabled:opacity-40"
              value={good}
              disabled={!local}
              onChange={(event) => {
                const next = event.target.value as GoodId
                setGood(next)
                setTarget(String(priceAt(game, property.location, next)))
              }}
            >
              {GOODS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="eyebrow">Minimum price</span>
            <div className="mt-1.5 flex items-center gap-1.5">
              <label className="flex h-8 min-w-0 flex-1 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 focus-within:border-[var(--accent)]">
                <span className="text-[10px] font-semibold text-[var(--dim)]">
                  $
                </span>
                <input
                  aria-label={`${config.name} dealer minimum`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full min-w-0 bg-transparent text-xs font-semibold tabular-nums outline-none"
                  value={target}
                  disabled={!local}
                  onChange={(event) =>
                    setTarget(event.target.value.replace(/[^\d]/g, ''))
                  }
                />
              </label>
              <Button
                size="xs"
                variant="secondary"
                disabled={!local}
                onClick={() => setTarget(String(Math.floor(currentPrice)))}
              >
                Now
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={!local}
                onClick={() =>
                  setTarget(String(Math.ceil(currentPrice * 1.1)))
                }
              >
                +10%
              </Button>
            </div>
            {targetValid ? null : (
              <p className="mt-1 text-[9px] text-[var(--bad)]">
                Target must be between $1 and {money(maxTarget)}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5">
          {dealer ? (
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
            variant={dealer ? 'secondary' : 'primary'}
            disabled={
              disabled ||
              !local ||
              !targetValid ||
              (!dealer && game.cash < DEALER_HIRE_COST)
            }
            onClick={() =>
              dealer
                ? onSetPrice(property.id, targetValue)
                : onHire(property.id, good, targetValue)
            }
          >
            {dealer ? 'Save target' : `Hire · ${money(DEALER_HIRE_COST)}`}
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
