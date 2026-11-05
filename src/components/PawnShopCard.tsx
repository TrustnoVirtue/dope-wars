import { PAWN_ITEMS } from '../game/data'
import { pawnInventoryValue } from '../game/selectors'
import type { GameState, PawnItemId } from '../game/types'
import { money, quantity } from '../lib/format'
import { TagIcon } from './icons'
import { Badge, Button, Card, CardHeader } from './ui'

export function PawnShopCard({
  game,
  onPawn,
}: {
  game: GameState
  onPawn: (item: PawnItemId, qty: number) => void
}) {
  const disabled = game.status !== 'playing' || Boolean(game.pendingEvent)
  const owned = PAWN_ITEMS.filter((item) => game.pawnInventory[item.id] > 0)
  const total = pawnInventoryValue(game)

  return (
    <Card>
      <CardHeader
        icon={<TagIcon size={16} />}
        title="Pawn shop"
        subtitle="Trash in, cash out"
        action={
          owned.length > 0 ? (
            <Badge tone="good">{money(total)}</Badge>
          ) : (
            <Badge tone="neutral">Empty</Badge>
          )
        }
      />

      <div className="p-3">
        {owned.length === 0 ? (
          <p className="text-[10.5px] leading-snug text-[var(--muted)]">
            Nothing to pawn yet. Dumpster dive for junk.
          </p>
        ) : (
          <div className="space-y-1.5">
            {owned.map((item) => {
              const count = game.pawnInventory[item.id]
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {item.name}{' '}
                      <span className="text-[var(--muted)]">
                        x{quantity(count)}
                      </span>
                    </p>
                    <p className="truncate text-[10px] text-[var(--muted)]">
                      {money(item.value)} each
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => onPawn(item.id, 1)}
                    >
                      Pawn 1
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => onPawn(item.id, count)}
                    >
                      All
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {owned.length > 0 ? (
          <p className="mt-2 text-[10px] text-[var(--dim)]">
            Pawning takes no time. Junk counts toward net worth until sold.
          </p>
        ) : null}
      </div>
    </Card>
  )
}
