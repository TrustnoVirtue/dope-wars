import { useState, type ReactNode } from 'react'
import {
  CARS,
  CAR_BY_ID,
  CAR_TRADE_IN_RATE,
  DIFFICULTY_BY_ID,
  GUNS,
  LOAN_CAP,
  LOAN_SHARK_EVENT_THRESHOLD,
  UPGRADES,
  UPGRADE_BY_ID,
} from '../game/data'
import {
  bankRate,
  canBorrow,
  capacity,
  capacityBreakdown,
  inventoryCount,
  portfolioValue,
} from '../game/selectors'
import type { CarId, GameState, GunId, UpgradeId } from '../game/types'
import { cn } from '../lib/cn'
import { money, quantity } from '../lib/format'
import {
  BagIcon,
  CarIcon,
  CheckIcon,
  CrosshairIcon,
  LandmarkIcon,
  LockIcon,
  ScaleIcon,
  ShieldIcon,
} from './icons'
import { Badge, Button, CollapsibleCard } from './ui'

function parseAmount(value: string): number {
  const amount = Math.floor(Number(value))
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function AmountField({
  value,
  onChange,
  label,
  placeholder = '0',
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 focus-within:border-[var(--accent)]">
      <span className="text-xs font-semibold text-[var(--dim)]">$</span>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:text-[var(--dim)]"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
      />
    </label>
  )
}

function QuickAmount({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function BankCard({
  game,
  onDeposit,
  onWithdraw,
}: {
  game: GameState
  onDeposit: (amount: number) => void
  onWithdraw: (amount: number) => void
}) {
  const [value, setValue] = useState('')
  const amount = parseAmount(value)
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)

  return (
    <CollapsibleCard
      defaultOpen
      icon={<LandmarkIcon size={16} />}
      title="Bank"
      subtitle={`Mugger-proof cash · ${Math.round(bankRate(game) * 1000) / 10}% / day`}
      action={<Badge tone="info">{money(game.bank)}</Badge>}
    >
      <div className="p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Balance</p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
              {money(game.bank)}
            </p>
          </div>
          <p className="pb-0.5 text-[11px] text-[var(--muted)]">
            Cash {money(game.cash)}
          </p>
        </div>

        <div className="mt-3 flex gap-2">
          <AmountField
            value={value}
            onChange={setValue}
            label="Bank amount"
            placeholder="Amount"
          />
          <Button
            variant="primary"
            size="md"
            className="px-3"
            disabled={disabled || amount <= 0 || amount > game.cash}
            onClick={() => {
              onDeposit(amount)
              setValue('')
            }}
          >
            Deposit
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="px-3"
            disabled={disabled || amount <= 0 || amount > game.bank}
            onClick={() => {
              onWithdraw(amount)
              setValue('')
            }}
          >
            Withdraw
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <QuickAmount onClick={() => setValue('1000')}>$1k</QuickAmount>
          <QuickAmount
            onClick={() => setValue(String(Math.floor(game.cash)))}
            disabled={game.cash <= 0}
          >
            All cash
          </QuickAmount>
          <QuickAmount
            onClick={() => setValue(String(Math.floor(game.bank)))}
            disabled={game.bank <= 0}
          >
            All bank
          </QuickAmount>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
              Portfolio
            </p>
            <p className="mt-0.5 text-xs font-semibold tabular-nums">
              {money(portfolioValue(game))}
            </p>
          </div>
          <p className="text-[10px] text-[var(--muted)]">
            Stocks & crypto below
          </p>
        </div>
      </div>
    </CollapsibleCard>
  )
}

export function LoanCard({
  game,
  onBorrow,
  onRepay,
}: {
  game: GameState
  onBorrow: (amount: number) => void
  onRepay: (amount: number) => void
}) {
  const [value, setValue] = useState('')
  const amount = parseAmount(value)
  const config = DIFFICULTY_BY_ID[game.difficulty]
  const interest = Math.round(game.debt * config.interest)
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const creditOpen = canBorrow(game)
  const maxBorrow = creditOpen ? Math.max(0, LOAN_CAP - game.debt) : 0
  const danger = game.debt >= LOAN_SHARK_EVENT_THRESHOLD

  return (
    <CollapsibleCard
      defaultOpen
      className={danger ? 'border-[var(--bad)]' : undefined}
      icon={<ScaleIcon size={16} />}
      title="Loan shark"
      subtitle={
        creditOpen
          ? `${money(game.debt)} owed · ${Math.round(config.interest * 100)}% daily`
          : 'No credit on this run'
      }
      action={
        creditOpen ? (
          <Badge tone={danger ? 'bad' : 'neutral'}>
            Cap {money(LOAN_CAP)}
          </Badge>
        ) : (
          <Badge tone="neutral">No credit</Badge>
        )
      }
    >
      <div className="p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Owed</p>
            <p
              className={cn(
                'mt-1 text-xl font-semibold tracking-tight tabular-nums',
                game.debt > 0 ? 'text-[var(--bad)]' : 'text-[var(--good)]',
              )}
            >
              {money(game.debt)}
            </p>
          </div>
          <div className="pb-0.5 text-right text-[11px] text-[var(--muted)]">
            <p>Next charge</p>
            <p className="font-semibold tabular-nums text-[var(--text)]">
              {money(interest)}
            </p>
          </div>
        </div>

        {danger ? (
          <p className="mt-2 rounded-lg bg-[var(--bad-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--bad)]">
            The shark is losing patience. Pay something down before the enforcers
            visit.
          </p>
        ) : null}

        {!creditOpen ? (
          <p className="mt-2 rounded-lg bg-[var(--surface-3)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)]">
            The shark does not lend to ghosts. From Zero runs carry no credit
            line — bootstrap through scavenging, pawning, and growing.
          </p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <AmountField
            value={value}
            onChange={setValue}
            label="Loan amount"
            placeholder="Amount"
          />
          <Button
            variant="primary"
            size="md"
            className="px-3"
            disabled={disabled || amount <= 0 || amount > game.cash || amount > game.debt}
            onClick={() => {
              onRepay(amount)
              setValue('')
            }}
          >
            Repay
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="px-3"
            disabled={disabled || amount <= 0 || amount > maxBorrow}
            onClick={() => {
              onBorrow(amount)
              setValue('')
            }}
          >
            Borrow
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <QuickAmount onClick={() => setValue('1000')}>$1k</QuickAmount>
          <QuickAmount
            onClick={() =>
              setValue(String(Math.max(0, Math.min(game.cash, game.debt))))
            }
            disabled={game.debt <= 0 || game.cash <= 0}
          >
            Max repay
          </QuickAmount>
          <QuickAmount
            onClick={() => setValue(String(maxBorrow))}
            disabled={maxBorrow <= 0}
          >
            Max borrow
          </QuickAmount>
        </div>
      </div>
    </CollapsibleCard>
  )
}

export function GarageCard({
  game,
  onBuyCar,
}: {
  game: GameState
  onBuyCar: (car: CarId) => void
}) {
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const current = game.car ? CAR_BY_ID[game.car] : null
  const tradeIn = current ? Math.floor(current.cost * CAR_TRADE_IN_RATE) : 0

  return (
    <CollapsibleCard
      defaultOpen
      icon={<CarIcon size={16} />}
      title="Garage"
      subtitle="A ride unlocks the cities"
      action={
        current ? (
          <Badge tone="good">{current.name}</Badge>
        ) : (
          <Badge tone="neutral">No ride</Badge>
        )
      }
    >

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow">Current ride</p>
            <p className="mt-1 text-sm font-semibold">
              {current ? current.name : 'On foot'}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {current
                ? `Road time x${current.timeFactor.toFixed(2)}${
                    current.capacity ? ` · ${quantity(current.capacity)} load` : ''
                  } · ${current.boroughHops} same-day hop${current.boroughHops === 1 ? '' : 's'}/day`
                : 'City markets stay locked until you buy a car.'}
            </p>
          </div>
          {current ? (
            <Badge tone="good">
              <CheckIcon size={10} />
              In use
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 space-y-1.5">
          {CARS.map((car) => {
            const owned = game.car === car.id
            const due = Math.max(0, car.cost - (owned ? 0 : tradeIn))
            return (
              <div
                key={car.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{car.name}</p>
                  <p className="truncate text-[10px] text-[var(--muted)]">
                    {car.blurb}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--dim)]">
                    Road time x{car.timeFactor.toFixed(2)}
                    {car.capacity ? ` · ${quantity(car.capacity)} load` : ''}
                    {` · ${car.boroughHops} hop${car.boroughHops === 1 ? '' : 's'}/day`}
                  </p>
                </div>
                {owned ? (
                  <Badge tone="good">
                    <CheckIcon size={10} />
                    Owned
                  </Badge>
                ) : (
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={disabled || game.cash < due}
                    onClick={() => onBuyCar(car.id)}
                  >
                    {current ? `Trade · ${money(due)}` : money(due)}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-[10px] text-[var(--dim)]">
          Trade-ins fetch half the old car&apos;s sticker price.
        </p>
      </div>
    </CollapsibleCard>
  )
}

export function GearCard({
  game,
  onBuyGun,
  onBuyUpgrade,
}: {
  game: GameState
  onBuyGun: (gun: GunId) => void
  onBuyUpgrade: (upgrade: UpgradeId) => void
}) {
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const used = inventoryCount(game)
  const total = capacity(game)
  const breakdown = capacityBreakdown(game)

  return (
    <CollapsibleCard
      defaultOpen
      icon={<ShieldIcon size={16} />}
      title="Gear"
      subtitle="Protection and capacity"
      action={
        <Badge tone={used >= total ? 'warn' : 'neutral'}>
          <BagIcon size={10} />
          {quantity(used)} / {quantity(total)}
        </Badge>
      }
    >

      <div className="p-4">
        <div className="mb-3 grid grid-cols-4 gap-1.5">
          <CapacityPart label="Base" value={breakdown.base} />
          <CapacityPart label="Class" value={breakdown.classBonus} />
          <CapacityPart label="Gear" value={breakdown.gear} />
          <CapacityPart label="Car" value={breakdown.car} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Sidearm</p>
            <p className="mt-1 text-sm font-semibold">
              {game.gun ? (
                <span className="flex items-center gap-1.5">
                  <CrosshairIcon size={14} className="text-[var(--accent)]" />
                  {GUNS.find((gun) => gun.id === game.gun)?.name}
                </span>
              ) : (
                'Unarmed'
              )}
            </p>
          </div>
          {game.gun === 'magnum' ? <Badge tone="good">Heavy</Badge> : null}
        </div>

        <div className="mt-3 space-y-1.5">
          {GUNS.map((gun) => {
            const equipped = game.gun === gun.id
            return (
              <div
                key={gun.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{gun.name}</p>
                  <p className="truncate text-[10px] text-[var(--muted)]">
                    {gun.blurb}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[var(--dim)]">
                    Defense {Math.round(gun.defense * 100)}% · Confiscation{' '}
                    {Math.round(gun.risk * 100)}%
                  </p>
                </div>
                {equipped ? (
                  <Badge tone="good">
                    <CheckIcon size={10} />
                    Equipped
                  </Badge>
                ) : (
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={disabled || game.cash < gun.cost}
                    onClick={() => onBuyGun(gun.id)}
                  >
                    {money(gun.cost)}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <p className="eyebrow">Upgrades</p>
          <div className="mt-2 space-y-1.5">
            {UPGRADES.map((upgrade) => {
              const owned = game.upgrades.includes(upgrade.id)
              const requiresMissing = Boolean(
                upgrade.requires && !game.upgrades.includes(upgrade.requires),
              )
              const carMissing =
                upgrade.carRequirement !== undefined &&
                (!game.car ||
                  (upgrade.carRequirement !== 'any' &&
                    game.car !== upgrade.carRequirement))
              const requiresName = upgrade.requires
                ? UPGRADE_BY_ID[upgrade.requires].name
                : upgrade.carRequirement === 'any'
                  ? 'any car'
                  : upgrade.carRequirement
                    ? CAR_BY_ID[upgrade.carRequirement].name
                    : null
              const locked = requiresMissing || carMissing
              return (
                <div
                  key={upgrade.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{upgrade.name}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">
                      {locked ? `Requires ${requiresName}` : upgrade.blurb}
                    </p>
                  </div>
                  {owned ? (
                    <Badge tone="good">
                      <CheckIcon size={10} />
                      Owned
                    </Badge>
                  ) : locked ? (
                    <Badge tone="neutral">
                      <LockIcon size={10} />
                      Locked
                    </Badge>
                  ) : (
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={disabled || game.cash < upgrade.cost}
                      onClick={() => onBuyUpgrade(upgrade.id)}
                    >
                      {money(upgrade.cost)}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  )
}

function CapacityPart({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-1">
      <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--dim)]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold tabular-nums">
        {value > 0 ? `+${value}` : value}
      </p>
    </div>
  )
}
