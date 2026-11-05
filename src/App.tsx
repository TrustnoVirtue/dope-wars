import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AchievementsModal } from './components/AchievementsModal'
import { BrokerPanel } from './components/BrokerPanel'
import { EndScreen } from './components/EndScreen'
import { EventModal } from './components/EventModal'
import { GameTabs, type GameTab, type GameTabId } from './components/GameTabs'
import { HelpModal } from './components/HelpModal'
import { LocationTabs } from './components/LocationTabs'
import { LogFeed } from './components/LogFeed'
import { MarketTable } from './components/MarketTable'
import {
  BuyOrdersBar,
  QuickTravel,
  WatchlistBar,
} from './components/MarketTools'
import { MenuModal } from './components/MenuModal'
import { BankCard, GarageCard, GearCard, LoanCard } from './components/Panels'
import { PawnShopCard } from './components/PawnShopCard'
import { PropertiesPanel } from './components/PropertiesPanel'
import { StartScreen } from './components/StartScreen'
import { StatusBar } from './components/StatusBar'
import { WorkersPanel } from './components/WorkersPanel'
import { Badge, Button } from './components/ui'
import {
  BOROUGHS,
  DIFFICULTY_BY_ID,
  GOODS,
  LOCATION_BY_ID,
  MAX_BUY_ORDERS,
  PRICE_TICK_MS,
} from './game/data'
import { createGame, reduce, SAVE_VERSION, tickGame } from './game/engine'
import { clearSave, loadGame, saveGame } from './game/save'
import {
  canRetire,
  goal,
  growPlotReady,
  netWorth,
  priceAt,
  propertiesAt,
} from './game/selectors'
import type {
  CharacterClassId,
  Difficulty,
  GameAction,
  GameMode,
  GameState,
  GoodId,
  StartMode,
} from './game/types'
import { money } from './lib/format'
import {
  BagIcon,
  ClockIcon,
  HomeIcon,
  LandmarkIcon,
  MapPinIcon,
  ShieldIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
} from './components/icons'

type Theme = 'dark' | 'light'
type Screen = 'title' | 'play'

const THEME_KEY = 'dope-wars:theme'
const UI_KEY = 'dope-wars:ui'
const SAVE_INTERVAL_MS = 2000

type PropertyPanelTab = 'stash' | 'grow' | 'lab'
type WorkersSection = 'caretakers' | 'dealers'

function boot() {
  return loadGame()
}

function readUiPrefs(): {
  propertyTabs: Record<string, PropertyPanelTab>
  workersSection: WorkersSection
} {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return { propertyTabs: {}, workersSection: 'caretakers' }
    const parsed = JSON.parse(raw) as {
      propertyTabs?: unknown
      workersSection?: unknown
    }
    const propertyTabs: Record<string, PropertyPanelTab> = {}
    if (parsed.propertyTabs && typeof parsed.propertyTabs === 'object') {
      for (const [key, value] of Object.entries(parsed.propertyTabs)) {
        if (value === 'stash' || value === 'grow' || value === 'lab') {
          propertyTabs[key] = value
        }
      }
    }
    return {
      propertyTabs,
      workersSection: parsed.workersSection === 'dealers' ? 'dealers' : 'caretakers',
    }
  } catch {
    return { propertyTabs: {}, workersSection: 'caretakers' }
  }
}

function initialQuantities(): Record<GoodId, number> {
  return Object.fromEntries(GOODS.map((good) => [good.id, 1])) as Record<
    GoodId,
    number
  >
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export default function App() {
  const [bootState] = useState(boot)
  const [game, setGame] = useState<GameState | null>(bootState)
  const [screen, setScreen] = useState<Screen>(bootState ? 'play' : 'title')
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [tab, setTab] = useState<GameTabId>('market')
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [quantities, setQuantities] =
    useState<Record<GoodId, number>>(initialQuantities)
  const [propertyTabs, setPropertyTabs] = useState<Record<string, PropertyPanelTab>>(
    () => readUiPrefs().propertyTabs,
  )
  const [workersSection, setWorkersSection] = useState<WorkersSection>(
    () => readUiPrefs().workersSection,
  )

  useEffect(() => {
    try {
      localStorage.setItem(
        UI_KEY,
        JSON.stringify({ propertyTabs, workersSection }),
      )
    } catch {
      // UI preferences are optional.
    }
  }, [propertyTabs, workersSection])

  const immediateSave = useRef(true)

  const act = useCallback((action: GameAction) => {
    immediateSave.current = true
    setGame((current) => (current ? reduce(current, action) : current))
  }, [])

  const setQuantity = useCallback((good: GoodId, qty: number) => {
    setQuantities((current) => ({ ...current, [good]: qty }))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Non-essential preference.
    }
  }, [theme])

  const pendingSave = useRef<GameState | null>(null)
  const lastSave = useRef(0)

  useEffect(() => {
    if (!game) return
    pendingSave.current = game
    const elapsed = Date.now() - lastSave.current
    if (immediateSave.current || elapsed >= SAVE_INTERVAL_MS) {
      immediateSave.current = false
      saveGame(game)
      lastSave.current = Date.now()
      return
    }
    const timeout = window.setTimeout(() => {
      if (pendingSave.current) {
        saveGame(pendingSave.current)
        lastSave.current = Date.now()
      }
    }, SAVE_INTERVAL_MS - elapsed)
    return () => window.clearTimeout(timeout)
  }, [game])

  useEffect(() => {
    const flush = () => {
      if (pendingSave.current) saveGame(pendingSave.current)
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [])

  const liveRunning =
    screen === 'play' &&
    Boolean(game) &&
    game?.status === 'playing' &&
    !game?.pendingEvent &&
    !menuOpen &&
    !helpOpen &&
    !achievementsOpen

  useEffect(() => {
    if (!liveRunning) return
    const timer: { current: number | null } = { current: null }
    const start = () => {
      if (timer.current !== null) return
      timer.current = window.setInterval(() => {
        immediateSave.current = false
        setGame((current) => (current ? tickGame(current) : current))
      }, PRICE_TICK_MS)
    }
    const stop = () => {
      if (timer.current === null) return
      window.clearInterval(timer.current)
      timer.current = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (document.visibilityState === 'visible') start()
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [liveRunning])

  const startNew = (
    difficulty: Difficulty,
    seed?: number,
    mode: GameMode = 'classic',
    start: StartMode = 'standard',
    character: CharacterClassId | null = null,
  ) => {
    immediateSave.current = true
    setGame(createGame(difficulty, seed, mode, start, character))
    setScreen('play')
    setTab('market')
    setHelpOpen(false)
    setMenuOpen(false)
    setAchievementsOpen(false)
    window.scrollTo({ top: 0 })
  }

  const playAgain = () => {
    if (!game) return
    startNew(game.difficulty, undefined, game.mode, game.start, game.character)
  }

  const goToTitle = (clearRun: boolean) => {
    setMenuOpen(false)
    setTab('market')
    if (clearRun) {
      clearSave()
      setGame(null)
    }
    setScreen('title')
  }

  useEffect(() => {
    if (
      screen !== 'play' ||
      !game ||
      game.status !== 'playing' ||
      game.pendingEvent ||
      menuOpen ||
      helpOpen ||
      achievementsOpen
    ) {
      return
    }

    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key >= '1' && event.key <= '8') {
        const location = BOROUGHS[Number(event.key) - 1]
        if (location) {
          const inCity = LOCATION_BY_ID[game.location].kind === 'city'
          act(
            inCity
              ? { type: 'drive', location: location.id }
              : { type: 'travel', location: location.id },
          )
        }
        return
      }
      if (event.key.toLowerCase() === 'r' && canRetire(game)) {
        act({ type: 'retire' })
        return
      }
      if (event.key.toLowerCase() === 'd') {
        act({ type: 'dumpsterDive' })
        return
      }
      if (event.key.toLowerCase() === 'm') {
        setMenuOpen(true)
        return
      }
      if (event.key === '?') {
        setHelpOpen(true)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [screen, game, menuOpen, helpOpen, achievementsOpen, act])

  if (screen === 'title' || !game) {
    return (
      <>
        <StartScreen
          hasRun={Boolean(game)}
          onContinue={() => setScreen('play')}
          onStart={startNew}
          onHelp={() => setHelpOpen(true)}
        />
        {helpOpen ? <HelpModal onClose={() => setHelpOpen(false)} /> : null}
      </>
    )
  }

  if (game.status !== 'playing') {
    return (
      <>
        <EndScreen
          game={game}
          onPlayAgain={playAgain}
          onTitle={() => goToTitle(true)}
        />
        {helpOpen ? <HelpModal onClose={() => setHelpOpen(false)} /> : null}
      </>
    )
  }

  const retireReady = canRetire(game)
  const config = DIFFICULTY_BY_ID[game.difficulty]
  const localProperties = propertiesAt(game)
  const localReady = localProperties.reduce(
    (sum, property) =>
      sum + property.grows.filter((plot) => growPlotReady(plot, game.day)).length,
    0,
  )
  const payrollCount = game.properties.filter(
    (property) => property.caretaker,
  ).length
  const alertCount = game.watchlist.filter((entry) => !entry.armed).length
  const watchedHere = game.watchlist
    .filter((entry) => entry.location === game.location)
    .map((entry) => entry.good)
  const orderedHere = game.buyOrders
    .filter((order) => order.location === game.location)
    .map((order) => order.good)

  const tabs: GameTab[] = [
    {
      id: 'market',
      label: 'Market',
      icon: <BagIcon size={14} />,
      title: 'Buy low, sell high',
      badge:
        alertCount > 0
          ? { text: String(alertCount), tone: 'warn' }
          : undefined,
    },
    {
      id: 'street',
      label: 'Street',
      icon: <MapPinIcon size={14} />,
      title: 'Travel, dumpster dive, pawn, and read the log',
    },
    {
      id: 'bank',
      label: 'Bank',
      icon: <LandmarkIcon size={14} />,
      title: 'Bank, loan shark, and broker',
      badge:
        game.debt > 0
          ? { text: money(game.debt), tone: 'bad' }
          : undefined,
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: <HomeIcon size={14} />,
      title: 'Stash product and grow crops',
      badge:
        localReady > 0
          ? { text: String(localReady), tone: 'good' }
          : undefined,
    },
    {
      id: 'workers',
      label: 'Workers',
      icon: <UsersIcon size={14} />,
      title: 'Hire caretakers to automate grows',
      badge:
        payrollCount > 0
          ? { text: String(payrollCount), tone: 'accent' }
          : undefined,
    },
    {
      id: 'loadout',
      label: 'Loadout',
      icon: <ShieldIcon size={14} />,
      title: 'Cars, guns, and gear',
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)] xl:h-dvh xl:min-h-0 xl:overflow-hidden">
      <div className="sticky top-0 z-30">
        <StatusBar
          game={game}
          theme={theme}
          onToggleTheme={() =>
            setTheme((value) => (value === 'dark' ? 'light' : 'dark'))
          }
          onOpenMenu={() => setMenuOpen(true)}
        />
        <GameTabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {game.start === 'zero' && game.cash === 0 && game.stats.dives === 0 ? (
        <div className="zero-intro mx-auto w-full max-w-[1720px] px-3 pt-3 sm:px-5 lg:px-8">
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">
                <TrashIcon size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold">You have nothing.</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Dumpster dive for something to pawn, then start stacking.
                  Nothing here is beneath you yet.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => act({ type: 'dumpsterDive' })}
            >
              Dumpster dive
            </Button>
          </div>
        </div>
      ) : null}

      {retireReady ? (
        <div className="mx-auto w-full max-w-[1720px] px-3 pt-3 sm:px-5 lg:px-8">
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">
                <TrophyIcon size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">
                  You can retire.
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Your debt is clear and your net worth is above {money(goal(game))}.
                  Walk away with the win.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => act({ type: 'retire' })}>
              Retire now · {money(netWorth(game))}
            </Button>
          </div>
        </div>
      ) : game.mode === 'classic' && game.day >= game.maxDays ? (
        <div className="mx-auto w-full max-w-[1720px] px-3 pt-3 sm:px-5 lg:px-8">
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--warn)] bg-[var(--warn-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--warn)]">
                <ClockIcon size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--warn)]">
                  Final day.
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Settle up and end the run. If you still owe the shark, it will
                  not go well.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => act({ type: 'layLow' })}
            >
              End the run
            </Button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1720px] flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 xl:min-h-0 xl:overflow-hidden xl:py-3">
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="mx-auto w-full max-w-[1200px] xl:h-full xl:min-h-0"
        >
          {tab === 'market' ? (
            <div className="flex flex-col gap-3 xl:h-full xl:min-h-0">
              <QuickTravel
                game={game}
                onTravel={(location) => act({ type: 'travel', location })}
                onDrive={(location) => act({ type: 'drive', location })}
              />
              <WatchlistBar
                game={game}
                onSet={(good, location, target, direction) =>
                  act({ type: 'setWatch', good, location, target, direction })
                }
                onClear={(good, location) =>
                  act({ type: 'clearWatch', good, location })
                }
              />
              <BuyOrdersBar
                game={game}
                onUpdate={(order, maxPrice) =>
                  act({
                    type: 'placeBuyOrder',
                    good: order.good,
                    location: order.location,
                    qty: order.remaining,
                    maxPrice,
                  })
                }
                onCancel={(id) => act({ type: 'cancelBuyOrder', id })}
              />
              <div className="xl:min-h-0 xl:flex-1">
                <MarketTable
                  game={game}
                  onBuy={(good, qty) => act({ type: 'buy', good, qty })}
                  onSell={(good, qty) => act({ type: 'sell', good, qty })}
                  quantities={quantities}
                  onQuantityChange={setQuantity}
                  watchedGoods={watchedHere}
                  orderedGoods={orderedHere}
                  ordersFull={game.buyOrders.length >= MAX_BUY_ORDERS}
                  onToggleWatch={(good) => {
                    if (watchedHere.includes(good)) {
                      act({ type: 'clearWatch', good, location: game.location })
                      return
                    }
                    const price = priceAt(game, game.location, good)
                    act({
                      type: 'setWatch',
                      good,
                      location: game.location,
                      target: Math.max(1, Math.ceil(price * 1.05)),
                      direction: 'above',
                    })
                  }}
                  onPlaceOrder={(good, qty) =>
                    act({
                      type: 'placeBuyOrder',
                      good,
                      location: game.location,
                      qty,
                      maxPrice: priceAt(game, game.location, good),
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          {tab === 'street' ? (
            <TabScroll>
              <div className="space-y-3">
                <LocationTabs
                  game={game}
                  onTravel={(location) => act({ type: 'travel', location })}
                  onDrive={(location) => act({ type: 'drive', location })}
                  onLayLow={() => act({ type: 'layLow' })}
                  onDive={() => act({ type: 'dumpsterDive' })}
                />
                <div className="grid gap-3 lg:grid-cols-2">
                  <PawnShopCard
                    game={game}
                    onPawn={(item, qty) => act({ type: 'pawn', item, qty })}
                  />
                  <LogFeed game={game} />
                </div>
              </div>
            </TabScroll>
          ) : null}

          {tab === 'bank' ? (
            <TabScroll>
              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <BankCard
                    game={game}
                    onDeposit={(amount) => act({ type: 'deposit', amount })}
                    onWithdraw={(amount) => act({ type: 'withdraw', amount })}
                  />
                  <LoanCard
                    game={game}
                    onBorrow={(amount) => act({ type: 'borrow', amount })}
                    onRepay={(amount) => act({ type: 'repay', amount })}
                  />
                </div>
                <BrokerPanel
                  game={game}
                  onInvest={(asset, amount) =>
                    act({ type: 'invest', asset, amount })
                  }
                  onDivest={(asset, amount) =>
                    act({ type: 'divest', asset, amount })
                  }
                />
              </div>
            </TabScroll>
          ) : null}

          {tab === 'properties' ? (
            <TabScroll>
              <PropertiesPanel
                game={game}
                onBuy={(propertyType) =>
                  act({ type: 'buyProperty', propertyType })
                }
                onDeposit={(propertyId, good, qty) =>
                  act({ type: 'depositStash', propertyId, good, qty })
                }
                onWithdraw={(propertyId, good, qty) =>
                  act({ type: 'withdrawStash', propertyId, good, qty })
                }
                onPlant={(propertyId, good) =>
                  act({ type: 'plant', propertyId, good })
                }
                onHarvest={(propertyId, slot) =>
                  act({ type: 'harvest', propertyId, slot })
                }
                onHire={(propertyId, good) =>
                  act({ type: 'hireCaretaker', propertyId, good })
                }
                onFire={(propertyId) =>
                  act({ type: 'fireCaretaker', propertyId })
                }
                onDepositAll={(propertyId) =>
                  act({ type: 'depositStashAll', propertyId })
                }
                onWithdrawAll={(propertyId) =>
                  act({ type: 'withdrawStashAll', propertyId })
                }
                onHireRunner={(propertyId) =>
                  act({ type: 'hireRunner', propertyId })
                }
                onFireRunner={(propertyId) =>
                  act({ type: 'fireRunner', propertyId })
                }
                onCook={(propertyId, recipe) =>
                  act({ type: 'cook', propertyId, recipe })
                }
                onHireLabTech={(propertyId, recipe) =>
                  act({ type: 'hireLabTech', propertyId, recipe })
                }
                onFireLabTech={(propertyId) =>
                  act({ type: 'fireLabTech', propertyId })
                }
                tabs={propertyTabs}
                onTabChange={(propertyId, propertyTab) =>
                  setPropertyTabs((current) => ({
                    ...current,
                    [propertyId]: propertyTab,
                  }))
                }
              />
            </TabScroll>
          ) : null}

          {tab === 'workers' ? (
            <TabScroll>
              <WorkersPanel
                game={game}
                section={workersSection}
                onSectionChange={setWorkersSection}
                onHire={(propertyId, good) =>
                  act({ type: 'hireCaretaker', propertyId, good })
                }
                onFire={(propertyId) =>
                  act({ type: 'fireCaretaker', propertyId })
                }
                onHireDealer={(propertyId, good, minPrice) =>
                  act({ type: 'hireDealer', propertyId, good, minPrice })
                }
                onSetDealerPrice={(propertyId, minPrice) =>
                  act({ type: 'setDealerPrice', propertyId, minPrice })
                }
                onFireDealer={(propertyId) =>
                  act({ type: 'fireDealer', propertyId })
                }
              />
            </TabScroll>
          ) : null}

          {tab === 'loadout' ? (
            <TabScroll>
              <div className="grid gap-3 lg:grid-cols-2">
                <GarageCard
                  game={game}
                  onBuyCar={(car) => act({ type: 'buyCar', car })}
                />
                <GearCard
                  game={game}
                  onBuyGun={(gun) => act({ type: 'buyGun', gun })}
                  onBuyUpgrade={(upgrade) =>
                    act({ type: 'buyUpgrade', upgrade })
                  }
                />
              </div>
            </TabScroll>
          ) : null}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1720px] shrink-0 flex-wrap items-center justify-between gap-2 px-3 pb-8 text-[10px] text-[var(--dim)] sm:px-5 lg:px-8 xl:pb-3">
        <p>
          {config.label}
          {game.mode === 'endless' ? ' endless' : ''}
          {game.start === 'zero' ? ' from zero' : ''} run · 1–8 boroughs · D
          dumpster dive · R retire · M menu · ? help
        </p>
        <p>
          Auto-saved · <Badge tone="neutral">v{SAVE_VERSION}</Badge>
        </p>
      </footer>

      {menuOpen ? (
        <MenuModal
          game={game}
          theme={theme}
          onClose={() => setMenuOpen(false)}
          onToggleTheme={() =>
            setTheme((value) => (value === 'dark' ? 'light' : 'dark'))
          }
          onOpenHelp={() => {
            setMenuOpen(false)
            setHelpOpen(true)
          }}
          onOpenAchievements={() => {
            setMenuOpen(false)
            setAchievementsOpen(true)
          }}
          onQuit={() => goToTitle(false)}
          onRetire={() => {
            act({ type: 'retire' })
            setMenuOpen(false)
          }}
          onImportSave={(restored) => {
            immediateSave.current = true
            setGame(restored)
            setMenuOpen(false)
            setTab('market')
          }}
        />
      ) : null}

      {helpOpen ? <HelpModal onClose={() => setHelpOpen(false)} /> : null}

      {achievementsOpen ? (
        <AchievementsModal game={game} onClose={() => setAchievementsOpen(false)} />
      ) : null}

      {game.pendingEvent ? (
        <EventModal
          event={game.pendingEvent}
          onChoose={(option) => act({ type: 'resolveEvent', option })}
        />
      ) : null}
    </div>
  )
}

function TabScroll({ children }: { children: ReactNode }) {
  return (
    <div className="xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1 xl:scrollbar-slim">
      {children}
    </div>
  )
}
