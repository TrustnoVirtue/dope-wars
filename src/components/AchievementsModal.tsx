import { ACHIEVEMENTS } from '../game/data'
import type { GameState } from '../game/types'
import { cn } from '../lib/cn'
import { CheckIcon, CloseIcon, LockIcon, TrophyIcon } from './icons'
import { Badge, Button, Meter, Modal } from './ui'

export function AchievementsModal({
  game,
  onClose,
}: {
  game: GameState
  onClose: () => void
}) {
  const unlocked = new Set(game.achievements)
  const progress = (game.achievements.length / ACHIEVEMENTS.length) * 100

  return (
    <Modal onClose={onClose} labelledBy="achievements-title" className="sm:max-w-2xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--gold)]">
              <TrophyIcon size={18} />
            </span>
            <div>
              <h2
                id="achievements-title"
                className="text-lg font-semibold tracking-tight"
              >
                Achievements
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {game.achievements.length} of {ACHIEVEMENTS.length} unlocked
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={onClose}>
            <CloseIcon size={16} />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Meter value={progress} color="var(--gold)" className="flex-1" height={6} />
          <Badge tone="neutral">{Math.round(progress)}%</Badge>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((achievement) => {
            const done = unlocked.has(achievement.id)
            return (
              <div
                key={achievement.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
                  done
                    ? 'border-[var(--border-strong)] bg-[var(--surface-2)]'
                    : 'border-[var(--border)] bg-[var(--surface)] opacity-65',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
                    done
                      ? 'bg-[var(--good-soft)] text-[var(--good)]'
                      : 'bg-[var(--surface-3)] text-[var(--dim)]',
                  )}
                >
                  {done ? <CheckIcon size={13} /> : <LockIcon size={12} />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{achievement.name}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--muted)]">
                    {achievement.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <Button variant="primary" className="mt-5 w-full" onClick={onClose}>
          Back to the street
        </Button>
      </div>
    </Modal>
  )
}
