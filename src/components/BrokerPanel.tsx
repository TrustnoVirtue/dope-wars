import { useState } from 'react'
import { ASSETS } from '../game/data'
import {
  assetPriceAt,
  bankRate,
  portfolioBasis,
  portfolioProfit,
  portfolioValue,
  positionAt,
  positionValue,
} from '../game/selectors'
import type { Asset, AssetId, GameState } from '../game/types'
import { cn } from '../lib/cn'
import { money } from '../lib/format'
import { ArrowDownRightIcon, ArrowUpRightIcon, LandmarkIcon } from './icons'
import { Sparkline } from './Sparkline'
import { Badge, Button, CardHeader } from './ui'

const priceFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function price(value: number): string {
  return priceFormat.format(value)
}

function parseAmount(value: string): number {
  const amount = Math.floor(Number(value))
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

export function BrokerPanel({
  game,
  onInvest,
  onDivest,
}: {
  game: GameState
  onInvest: (asset: AssetId, amount: number) => void
  onDivest: (asset: AssetId, amount: number) => void
}) {
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const value = portfolioValue(game)
  const basis = portfolioBasis(game)
  const profit = portfolioProfit(game)
  const stocks = ASSETS.filter((asset) => asset.kind === 'stock')
  const crypto = ASSETS.filter((asset) => asset.kind === 'crypto')

  return (
    <section className="card rounded-2xl">
      <CardHeader
        icon={<LandmarkIcon size={16} />}
        title="Broker"
        subtitle="Instant trades from your bank. The market moves each day."
        action={<Badge tone={profit >= 0 ? 'good' : 'bad'}>{money(value)}</Badge>}
      />
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BrokerStat label="Bank" value={money(game.bank)} />
          <BrokerStat label="Portfolio" value={money(value)} />
          <BrokerStat label="Cost basis" value={money(basis)} />
          <BrokerStat
            label="Unrealized P/L"
            value={money(profit)}
            tone={profit >= 0 ? 'good' : 'bad'}
          />
        </div>

        <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
          Bank interest pays {Math.round(bankRate(game) * 1000) / 10}% per day.
          Stock fees are 0.25–0.30%; crypto fees are 1.0–1.2%. Trust Fund Kid
          halves broker fees. Fractional units are allowed.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AssetGroup
            title="Stocks"
            assets={stocks}
            game={game}
            disabled={disabled}
            onInvest={onInvest}
            onDivest={onDivest}
          />
          <AssetGroup
            title="Crypto"
            assets={crypto}
            game={game}
            disabled={disabled}
            onInvest={onInvest}
            onDivest={onDivest}
          />
        </div>

        <p className="mt-4 text-[10px] text-[var(--dim)]">
          Portfolio value counts toward net worth. Selling returns proceeds to
          your bank and realizes the gain or loss.
        </p>
      </div>
    </section>
  )
}

function BrokerStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 truncate text-sm font-semibold tabular-nums',
          tone === 'good' && 'text-[var(--good)]',
          tone === 'bad' && 'text-[var(--bad)]',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function AssetGroup({
  title,
  assets,
  game,
  disabled,
  onInvest,
  onDivest,
}: {
  title: string
  assets: readonly Asset[]
  game: GameState
  disabled: boolean
  onInvest: (asset: AssetId, amount: number) => void
  onDivest: (asset: AssetId, amount: number) => void
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <div className="mt-2 space-y-2">
        {assets.map((asset) => (
          <AssetRow
            key={asset.id}
            asset={asset}
            game={game}
            disabled={disabled}
            onInvest={onInvest}
            onDivest={onDivest}
          />
        ))}
      </div>
    </div>
  )
}

function AssetRow({
  asset,
  game,
  disabled,
  onInvest,
  onDivest,
}: {
  asset: Asset
  game: GameState
  disabled: boolean
  onInvest: (asset: AssetId, amount: number) => void
  onDivest: (asset: AssetId, amount: number) => void
}) {
  const [value, setValue] = useState('')
  const market = game.assetMarkets[asset.id]
  const currentPrice = assetPriceAt(game, asset.id)
  const position = positionAt(game, asset.id)
  const holding = positionValue(game, asset.id)
  const delta =
    market.prev > 0 ? ((currentPrice - market.prev) / market.prev) * 100 : 0
  const trend = delta >= 0 ? 'var(--good)' : 'var(--bad)'
  const amount = parseAmount(value)
  const canBuy = !disabled && amount > 0 && amount <= game.bank
  const canSell = !disabled && amount > 0 && Boolean(position)

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">{asset.ticker}</span>
            <span className="truncate text-[10px] text-[var(--muted)]">
              {asset.name}
            </span>
            <Badge tone="neutral">{asset.fee * 100}% fee</Badge>
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">{asset.blurb}</p>
        </div>
        <div className="flex items-center gap-3">
          <Sparkline values={market.history} color={trend} className="h-6 w-16" />
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{price(currentPrice)}</p>
            <p
              className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-medium tabular-nums"
              style={{ color: trend }}
            >
              {delta >= 0 ? (
                <ArrowUpRightIcon size={10} />
              ) : (
                <ArrowDownRightIcon size={10} />
              )}
              {delta.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--muted)]">
          {position
            ? `${position.units.toFixed(4)} units · ${money(holding)} value`
            : 'No position'}
        </p>
        <div className="flex items-center gap-1.5">
          <label className="flex h-8 w-[104px] items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 focus-within:border-[var(--accent)]">
            <span className="text-[10px] font-semibold text-[var(--dim)]">$</span>
            <input
              aria-label={`${asset.ticker} amount`}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Amount"
              className="w-full min-w-0 bg-transparent text-xs font-semibold tabular-nums outline-none placeholder:text-[var(--dim)]"
              value={value}
              onChange={(event) =>
                setValue(event.target.value.replace(/[^\d]/g, ''))
              }
            />
          </label>
          <Button
            size="xs"
            variant="secondary"
            disabled={disabled || game.bank <= 0}
            onClick={() => setValue(String(Math.floor(game.bank)))}
          >
            Max
          </Button>
          <Button
            size="xs"
            variant="primary"
            disabled={!canBuy}
            onClick={() => {
              onInvest(asset.id, amount)
              setValue('')
            }}
          >
            Buy
          </Button>
          <Button
            size="xs"
            variant="secondary"
            disabled={!canSell}
            className="text-[var(--good)]"
            onClick={() => {
              onDivest(asset.id, amount)
              setValue('')
            }}
          >
            Sell
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={disabled || !position}
            onClick={() => setValue(String(Math.max(1, Math.floor(holding))))}
          >
            All
          </Button>
        </div>
      </div>
    </div>
  )
}
