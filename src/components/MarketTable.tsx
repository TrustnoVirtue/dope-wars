import { GOODS, LOCATION_BY_ID, MAX_BUY_ORDERS } from '../game/data'
import {
  capacity,
  inventoryCount,
  marketAt,
  maxBuy,
} from '../game/selectors'
import type { GameState, Good, GoodId } from '../game/types'
import { cn } from '../lib/cn'
import { money, percent, quantity } from '../lib/format'
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BagIcon,
  StarIcon,
} from './icons'
import { Sparkline } from './Sparkline'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  QuantityStepper,
} from './ui'

export function MarketTable({
  game,
  onBuy,
  onSell,
  quantities,
  onQuantityChange,
  watchedGoods,
  orderedGoods,
  ordersFull,
  onToggleWatch,
  onPlaceOrder,
}: {
  game: GameState
  onBuy: (good: GoodId, qty: number) => void
  onSell: (good: GoodId, qty: number) => void
  quantities: Record<GoodId, number>
  onQuantityChange: (good: GoodId, qty: number) => void
  watchedGoods: readonly GoodId[]
  orderedGoods: readonly GoodId[]
  ordersFull: boolean
  onToggleWatch: (good: GoodId) => void
  onPlaceOrder: (good: GoodId, qty: number) => void
}) {
  const used = inventoryCount(game)
  const totalCapacity = capacity(game)
  const full = used >= totalCapacity
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)

  return (
    <Card className="xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
      <CardHeader
        className="shrink-0"
        icon={<BagIcon size={16} />}
        title="Market"
        subtitle={`${LOCATION_BY_ID[game.location].name} · prices move at the start of each day`}
        action={
          <Badge tone={full ? 'warn' : 'neutral'}>
            Load {quantity(used)} / {quantity(totalCapacity)}
          </Badge>
        }
      />

      {full ? (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--warn-soft)] px-4 py-2 text-[11px] font-medium text-[var(--warn)]">
          Your coat is full. Sell something before you buy more.
        </div>
      ) : null}

      <div className="divide-y divide-[var(--border)] xl:min-h-0 xl:flex-1 xl:overflow-x-auto xl:overflow-y-auto xl:scrollbar-slim">
        {GOODS.map((good) => (
          <MarketRow
            key={good.id}
            game={game}
            good={good}
            quantityValue={quantities[good.id]}
            onQuantityChange={(next) => onQuantityChange(good.id, next)}
            watched={watchedGoods.includes(good.id)}
            ordered={orderedGoods.includes(good.id)}
            ordersFull={ordersFull}
            onToggleWatch={() => onToggleWatch(good.id)}
            onPlaceOrder={() => onPlaceOrder(good.id, quantities[good.id])}
            onBuy={onBuy}
            onSell={onSell}
            disabled={disabled}
          />
        ))}
      </div>

    </Card>
  )
}

function MarketRow({
  game,
  good,
  quantityValue,
  onQuantityChange,
  watched,
  ordered,
  ordersFull,
  onToggleWatch,
  onPlaceOrder,
  onBuy,
  onSell,
  disabled,
}: {
  game: GameState
  good: Good
  quantityValue: number
  onQuantityChange: (next: number) => void
  watched: boolean
  ordered: boolean
  ordersFull: boolean
  onToggleWatch: () => void
  onPlaceOrder: () => void
  onBuy: (good: GoodId, qty: number) => void
  onSell: (good: GoodId, qty: number) => void
  disabled: boolean
}) {
  const market = marketAt(game, game.location, good.id)
  const price = market.price
  const delta =
    market.prev > 0 ? ((price - market.prev) / market.prev) * 100 : 0
  const trendColor = delta >= 0 ? 'var(--good)' : 'var(--bad)'
  const owned = game.inventory[good.id]
  const cost = price * quantityValue
  const canBuy =
    !disabled &&
    quantityValue > 0 &&
    cost <= game.cash &&
    inventoryCount(game) + quantityValue <= capacity(game)
  const canSell = !disabled && quantityValue > 0 && quantityValue <= owned
  const maxAffordable = maxBuy(game, good.id)
  const buyReason =
    quantityValue <= 0
      ? 'Choose a quantity'
      : cost > game.cash
        ? 'Not enough cash'
        : inventoryCount(game) + quantityValue > capacity(game)
          ? 'Not enough room'
          : undefined

  return (
    <>
      <div className="hidden flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-1.5 lg:flex">
        <div className="min-w-[112px] flex-[1]">
          <div className="flex items-center gap-2" title={good.blurb}>
            <span className="text-sm font-semibold tracking-tight">
              {good.name}
            </span>
            <TierDots tier={good.tier} />
            <button
              type="button"
              aria-pressed={watched}
              title={
                watched
                  ? 'Remove price alert'
                  : 'Alert me when this price moves'
              }
              className={cn(
                'focus-ring rounded-md p-0.5 transition-colors',
                watched
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--dim)] hover:text-[var(--text)]',
              )}
              onClick={onToggleWatch}
            >
              <StarIcon size={13} filled={watched} />
            </button>
          </div>
        </div>

        <div className="flex min-w-[120px] flex-[1.1] items-center gap-3">
          <Sparkline
            values={market.history}
            color={trendColor}
            className="h-5 w-[44px]"
          />
          <div>
            <p className="text-sm font-semibold leading-none tabular-nums">
              {money(price)}
            </p>
            <p
              className="mt-1 flex items-center gap-0.5 text-[10px] font-medium tabular-nums"
              style={{ color: trendColor }}
            >
              {delta >= 0 ? (
                <ArrowUpRightIcon size={11} />
              ) : (
                <ArrowDownRightIcon size={11} />
              )}
              {percent(delta)}
            </p>
          </div>
        </div>

        <div className="w-11 shrink-0">
          <p className="text-sm font-semibold tabular-nums">{quantity(owned)}</p>
          <p className="text-[10px] text-[var(--dim)]">units</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <QuantityStepper
            value={quantityValue}
            onChange={onQuantityChange}
            className="min-w-[84px] shrink-0"
            label={`${good.name} quantity`}
          />
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              title="Max buy"
              className="text-[9px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onQuantityChange(Math.max(1, maxAffordable))}
              disabled={maxAffordable < 1}
            >
              Max
            </button>
            <button
              type="button"
              title="Sell all"
              className="text-[9px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onQuantityChange(Math.max(0, owned))}
              disabled={owned === 0}
            >
              All
            </button>
            <button
              type="button"
              title={
                ordered
                  ? 'Limit order is active for this good'
                  : ordersFull
                    ? `Limit of ${MAX_BUY_ORDERS} orders reached`
                    : `Auto-buy at ${money(price)} or better`
              }
              className={cn(
                'text-[9px] font-semibold transition-colors hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40',
                ordered ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
              )}
              onClick={onPlaceOrder}
              disabled={ordersFull && !ordered}
            >
              Limit
            </button>
          </div>
        </div>

        <div className="flex min-w-[150px] flex-[1.1] gap-1.5">
          <TradeButton
            label="Buy"
            value={money(cost)}
            tone="buy"
            disabled={!canBuy}
            title={buyReason}
            onClick={() => onBuy(good.id, quantityValue)}
          />
          <TradeButton
            label="Sell"
            value={money(price * quantityValue)}
            tone="sell"
            disabled={!canSell}
            title={quantityValue > owned ? 'Not enough product' : undefined}
            onClick={() => onSell(good.id, quantityValue)}
          />
        </div>
      </div>

      <div className="px-4 py-3 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">
                {good.name}
              </span>
              <TierDots tier={good.tier} />
              <button
                type="button"
                aria-pressed={watched}
                title={
                  watched
                    ? 'Remove price alert'
                    : 'Alert me when this price moves'
                }
                className={cn(
                  'focus-ring rounded-md p-0.5 transition-colors',
                  watched
                    ? 'text-[var(--gold)]'
                    : 'text-[var(--dim)] hover:text-[var(--text)]',
                )}
                onClick={onToggleWatch}
              >
                <StarIcon size={13} filled={watched} />
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">{good.blurb}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold leading-none tabular-nums">
              {money(price)}
            </p>
            <p
              className="mt-1 flex items-center justify-end gap-0.5 text-[10px] font-medium tabular-nums"
              style={{ color: trendColor }}
            >
              {delta >= 0 ? (
                <ArrowUpRightIcon size={11} />
              ) : (
                <ArrowDownRightIcon size={11} />
              )}
              {percent(delta)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Sparkline
            values={market.history}
            color={trendColor}
            className="h-7 w-24"
          />
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span>
              Owned{' '}
              <span className="font-semibold tabular-nums text-[var(--text)]">
                {quantity(owned)}
              </span>
            </span>
            <span>
              Max{' '}
              <span className="font-semibold tabular-nums text-[var(--text)]">
                {quantity(maxAffordable)}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <QuantityStepper
            value={quantityValue}
            onChange={onQuantityChange}
            className="min-w-[112px] shrink-0"
            label={`${good.name} quantity`}
          />
          <div className="flex flex-1 gap-1.5">
            <TradeButton
              label="Buy"
              value={money(cost)}
              tone="buy"
              disabled={!canBuy}
              title={buyReason}
              onClick={() => onBuy(good.id, quantityValue)}
            />
            <TradeButton
              label="Sell"
              value={money(price * quantityValue)}
              tone="sell"
              disabled={!canSell}
              title={quantityValue > owned ? 'Not enough product' : undefined}
              onClick={() => onSell(good.id, quantityValue)}
            />
          </div>
        </div>
        <div className="mt-1.5 flex gap-3">
          <button
            type="button"
            className="text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onQuantityChange(Math.max(1, maxAffordable))}
            disabled={maxAffordable < 1}
          >
            Max buy
          </button>
          <button
            type="button"
            className="text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onQuantityChange(Math.max(0, owned))}
            disabled={owned === 0}
          >
            Sell all
          </button>
          <button
            type="button"
            className={cn(
              'text-[10px] font-medium transition-colors hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40',
              ordered ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
            )}
            onClick={onPlaceOrder}
            disabled={ordersFull && !ordered}
          >
            Limit buy
          </button>
        </div>
      </div>
    </>
  )
}

function TradeButton({
  label,
  value,
  tone,
  disabled,
  title,
  onClick,
}: {
  label: string
  value: string
  tone: 'buy' | 'sell'
  disabled: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <Button
      variant={tone === 'buy' ? 'primary' : 'secondary'}
      size="sm"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'h-9 flex-1 flex-col gap-0.5 px-2',
        tone === 'sell' && 'text-[var(--good)] hover:border-[var(--good)]',
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-70">
        {label}
      </span>
      <span className="text-[11px] font-semibold tabular-nums">{value}</span>
    </Button>
  )
}

function TierDots({ tier }: { tier: number }) {
  return (
    <span
      className="flex items-center gap-[3px]"
      title={`Heat tier ${tier} of 5 — higher tiers attract more attention`}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn(
            'h-1 w-1.5 rounded-full',
            step <= tier
              ? tier >= 4
                ? 'bg-[var(--bad)]'
                : tier === 3
                  ? 'bg-[var(--warn)]'
                  : 'bg-[var(--muted)]'
              : 'bg-[var(--border-strong)]',
          )}
        />
      ))}
    </span>
  )
}
