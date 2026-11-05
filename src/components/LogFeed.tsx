import type { GameState, Tone } from '../game/types'
import { cn } from '../lib/cn'
import { InfoIcon } from './icons'
import { Card, CardHeader } from './ui'

const toneColors: Record<Tone, string> = {
  neutral: 'var(--muted)',
  info: 'var(--info)',
  good: 'var(--good)',
  bad: 'var(--bad)',
}

export function LogFeed({
  game,
  className,
}: {
  game: GameState
  className?: string
}) {
  return (
    <Card className={cn('flex min-h-0 flex-col', className)}>
      <CardHeader
        icon={<InfoIcon size={16} />}
        title="The street"
        subtitle="Everything, as it happens"
      />
      <div className="scrollbar-slim max-h-[320px] overflow-y-auto px-4 py-2 lg:max-h-[480px]">
        {game.log.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--muted)]">
            Nothing has happened yet.
          </p>
        ) : (
          <ol className="divide-y divide-[var(--border)]">
            {game.log.map((entry) => (
              <li key={entry.id} className="flex gap-2.5 py-2.5">
                <span
                  className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: toneColors[entry.tone] }}
                />
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--dim)]">
                    Day {entry.day}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
                    {entry.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}
