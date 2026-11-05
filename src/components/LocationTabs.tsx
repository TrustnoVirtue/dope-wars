import { BOROUGHS, CAR_BY_ID, CITIES, LOCATION_BY_ID } from '../game/data'
import { travelDays } from '../game/selectors'
import type { GameState, Location, LocationId } from '../game/types'
import { cn } from '../lib/cn'
import {
  ChevronRightIcon,
  ClockIcon,
  LockIcon,
  MapPinIcon,
  TrashIcon,
} from './icons'
import { Button, Card, CardHeader } from './ui'

function driveLabel(days: number): string {
  return `${days} day${days === 1 ? '' : 's'} drive`
}

export function LocationTabs({
  game,
  onTravel,
  onDrive,
  onLayLow,
  onDive,
}: {
  game: GameState
  onTravel: (location: LocationId) => void
  onDrive: (location: LocationId) => void
  onLayLow: () => void
  onDive: () => void
}) {
  const current = LOCATION_BY_ID[game.location]
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const car = game.car ? CAR_BY_ID[game.car] : null
  const inCity = current.kind === 'city'

  return (
    <Card>
      <CardHeader
        icon={<MapPinIcon size={16} />}
        title={current.name}
        subtitle={`${current.region} · ${current.knownFor}`}
        action={
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={onDive}
              disabled={disabled}
              title="Spend a day digging through trash for pawnable junk"
            >
              <TrashIcon size={14} />
              <span className="hidden sm:inline">Dumpster dive</span>
              <span className="sm:hidden">Dive</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onLayLow}
              disabled={disabled}
              title="Spend a day in place and cool your heat"
            >
              <ClockIcon size={14} />
              <span className="hidden sm:inline">Lay low</span>
              <span className="sm:hidden">Wait</span>
            </Button>
          </div>
        }
      />

      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">Boroughs</p>
          <p className="text-[10px] text-[var(--dim)]">
            {inCity ? 'Driving back takes road time' : 'One day per hop'}
          </p>
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
          {BOROUGHS.map((location) => {
            const active = location.id === game.location
            const days = inCity ? travelDays(game, location.id) : 1
            return (
              <TravelChip
                key={location.id}
                location={location}
                active={active}
                disabled={disabled}
                locked={false}
                meta={`${days}d`}
                subtitle={
                  active
                    ? location.knownFor
                    : inCity
                      ? driveLabel(days)
                      : 'Travel · 1 day'
                }
                onClick={() => (inCity ? onDrive(location.id) : onTravel(location.id))}
              />
            )
          })}
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">Cities</p>
          <p className="text-[10px] text-[var(--dim)]">
            {car ? `Driving the ${car.name}` : 'Buy a car in the garage to unlock'}
          </p>
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible">
          {CITIES.map((location) => {
            const active = location.id === game.location
            const locked = !car
            const days = travelDays(game, location.id)
            return (
              <TravelChip
                key={location.id}
                location={location}
                active={active}
                disabled={disabled}
                locked={locked}
                wide
                meta={`${days}d`}
                subtitle={
                  active
                    ? location.knownFor
                    : locked
                      ? 'Buy a car to reach'
                      : driveLabel(days)
                }
                onClick={() => onDrive(location.id)}
              />
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function TravelChip({
  location,
  active,
  disabled,
  locked,
  subtitle,
  meta,
  wide = false,
  onClick,
}: {
  location: Location
  active: boolean
  disabled: boolean
  locked: boolean
  subtitle: string
  meta?: string
  wide?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={active || disabled || locked}
      onClick={onClick}
      title={`${location.name} — ${subtitle}`}
      aria-label={
        active
          ? `You are in ${location.name}`
          : locked
            ? `${location.name} is locked until you buy a car`
            : `Travel to ${location.name}`
      }
      className={cn(
        'focus-ring min-w-[124px] rounded-xl border px-2.5 py-2 text-left transition-colors',
        wide && 'min-w-[140px]',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] disabled:opacity-50',
        locked && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            'truncate text-xs font-semibold',
            active ? 'text-[var(--accent)]' : 'text-[var(--text)]',
          )}
        >
          {location.name}
        </span>
        {active ? (
          <span className="shrink-0 rounded-full bg-[var(--accent)] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--on-accent)]">
            Here
          </span>
        ) : locked ? (
          <LockIcon size={12} className="shrink-0 text-[var(--dim)]" />
        ) : (
          <>
            <span className="shrink-0 text-[9px] font-semibold tabular-nums text-[var(--dim)]">
              {meta}
            </span>
            <ChevronRightIcon size={12} className="shrink-0 text-[var(--dim)]" />
          </>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[var(--muted)]">
        {subtitle}
      </p>
    </button>
  )
}
