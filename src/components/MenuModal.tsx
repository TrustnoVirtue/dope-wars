import { useState, type ReactNode } from 'react'
import { ACHIEVEMENTS, DIFFICULTY_BY_ID } from '../game/data'
import { deserializeGame, serializeGame } from '../game/save'
import { canRetire, netWorth } from '../game/selectors'
import type { GameState } from '../game/types'
import { cn } from '../lib/cn'
import { money } from '../lib/format'
import {
  ChevronDownIcon,
  CloseIcon,
  HelpIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  TrophyIcon,
} from './icons'
import { Badge, Button, Modal } from './ui'

export function MenuModal({
  game,
  theme,
  onClose,
  onToggleTheme,
  onOpenHelp,
  onOpenAchievements,
  onQuit,
  onRetire,
  onImportSave,
}: {
  game: GameState
  theme: 'dark' | 'light'
  onClose: () => void
  onToggleTheme: () => void
  onOpenHelp: () => void
  onOpenAchievements: () => void
  onQuit: () => void
  onRetire: () => void
  onImportSave: (state: GameState) => void
}) {
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [backup, setBackup] = useState('')
  const [message, setMessage] = useState('')
  const config = DIFFICULTY_BY_ID[game.difficulty]
  const retireReady = canRetire(game)

  const copySave = async () => {
    const raw = serializeGame(game)
    setBackup(raw)
    try {
      await navigator.clipboard.writeText(raw)
      setMessage('Save copied to clipboard.')
    } catch {
      setMessage('Copy blocked — select the text below and copy it manually.')
    }
  }

  const importSave = () => {
    const restored = deserializeGame(backup.trim())
    if (!restored) {
      setMessage('That save could not be read.')
      return
    }
    onImportSave(restored)
    setMessage('Save imported.')
  }

  return (
    <Modal onClose={onClose} labelledBy="menu-title" className="sm:max-w-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Paused</p>
            <h2 id="menu-title" className="mt-1 text-lg font-semibold tracking-tight">
              Menu
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {config.label} ·{' '}
              {game.start === 'zero' ? 'From Zero · ' : ''}
              {game.mode === 'endless'
                ? `Endless · Day ${game.day}`
                : `Day ${game.day} of ${game.maxDays}`}{' '}
              · Net worth {money(netWorth(game))}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 px-0">
            <CloseIcon size={16} />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {retireReady ? (
          <div className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--accent)]">
              You have a million and a clean ledger.
            </p>
            <p className="mt-0.5 text-[10.5px] text-[var(--muted)]">
              Walk away now with the win.
            </p>
            <Button variant="primary" size="sm" className="mt-2.5 w-full" onClick={onRetire}>
              <LogOutIcon size={14} />
              Retire now · {money(netWorth(game))}
            </Button>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <MenuButton icon={<HelpIcon size={16} />} label="How to play" onClick={onOpenHelp} />
          <MenuButton
            icon={<TrophyIcon size={16} />}
            label="Achievements"
            onClick={onOpenAchievements}
            right={
              <Badge tone="neutral">
                {game.achievements.length} / {ACHIEVEMENTS.length}
              </Badge>
            }
          />
          <MenuButton
            icon={theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={onToggleTheme}
          />
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            className="focus-ring flex w-full items-center justify-between rounded-lg text-[11px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            onClick={() => setBackupOpen((value) => !value)}
          >
            Save backup
            <ChevronDownIcon
              size={14}
              className={cn('transition-transform', backupOpen && 'rotate-180')}
            />
          </button>
          {backupOpen ? (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    void copySave()
                  }}
                >
                  Copy save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={importSave}
                >
                  Import
                </Button>
              </div>
              <textarea
                aria-label="Save backup"
                className="h-24 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 font-mono text-[10px] leading-snug text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                placeholder="Paste a save here to import it."
                value={backup}
                onChange={(event) => setBackup(event.target.value)}
              />
              {message ? (
                <p className="text-[10px] text-[var(--muted)]">{message}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <Button
            variant={confirmQuit ? 'danger' : 'outline'}
            className={cn('w-full', confirmQuit && 'animate-pulse')}
            onClick={() => {
              if (!confirmQuit) {
                setConfirmQuit(true)
                return
              }
              onQuit()
            }}
          >
            <LogOutIcon size={14} />
            {confirmQuit ? 'Tap again to quit to title' : 'Quit to title'}
          </Button>
          <p className="mt-2 text-center text-[10px] text-[var(--dim)]">
            Your run is saved automatically.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function MenuButton({
  icon,
  label,
  right,
  onClick,
}: {
  icon: ReactNode
  label: string
  right?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
    >
      <span className="text-[var(--muted)]">{icon}</span>
      <span className="flex-1 text-xs font-semibold">{label}</span>
      {right}
    </button>
  )
}
