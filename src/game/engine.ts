import {
  ACHIEVEMENT_BY_ID,
  ASSETS,
  ASSET_BY_ID,
  CAR_BY_ID,
  CAR_TRADE_IN_RATE,
  CHARACTER_BY_ID,
  DEALER_COMMISSION,
  DEALER_HIRE_COST,
  DEALER_MAX_PRICE_MULTIPLIER,
  DIFFICULTY_BY_ID,
  ENDLESS_DEBT_LIMIT,
  GOODS,
  GOOD_BY_ID,
  GROWABLE_BY_GOOD,
  GUN_BY_ID,
  HEAT_DECAY,
  LAB_TECH_WAGE,
  LOAN_CAP,
  LOAN_SHARK_EVENT_THRESHOLD,
  LOCATIONS,
  LOCATION_BY_ID,
  MAX_BUY_ORDERS,
  PAWN_ITEMS,
  PAWN_ITEM_BY_ID,
  PRICE_HISTORY_LIMIT,
  PRICE_TICK_REVERSION,
  PRICE_TICK_VOLATILITY,
  RECIPE_BY_ID,
  RUNNER_WAGE,
  START_DAY,
  UPGRADE_BY_ID,
  getPropertyConfig,
} from './data'
import { Rng, clamp } from './rng'
import {
  bankRate,
  capacity,
  capacityLeft,
  caretakerWage,
  characterOf,
  inventoryCount,
  netWorth,
  portfolioValue,
  priceAt,
  propertyById,
  storageLeft,
  travelDays,
} from './selectors'
import type {
  AssetId,
  AssetMarketState,
  AchievementId,
  CarId,
  CharacterClassId,
  Difficulty,
  EventData,
  EventKind,
  EventOption,
  GameAction,
  GameMode,
  GameState,
  Good,
  GoodId,
  GunId,
  LocationId,
  MarketState,
  PawnItemId,
  PendingEvent,
  PropertyState,
  PropertyTypeId,
  RecipeId,
  StartMode,
  UpgradeId,
} from './types'

export const SAVE_VERSION = 7

const MAX_LOG = 140

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function money(value: number): string {
  return usd.format(Math.round(value))
}

function makeInventory(): Record<GoodId, number> {
  return Object.fromEntries(GOODS.map((good) => [good.id, 0])) as Record<
    GoodId,
    number
  >
}

function makePawnInventory(): Record<PawnItemId, number> {
  return Object.fromEntries(PAWN_ITEMS.map((item) => [item.id, 0])) as Record<
    PawnItemId,
    number
  >
}

function addLog(
  state: GameState,
  tone: 'neutral' | 'good' | 'bad' | 'info',
  text: string,
): void {
  state.logSeq += 1
  state.log.unshift({
    id: state.logSeq,
    day: state.day,
    tone,
    text,
  })
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG
}

function createMarkets(rng: Rng): GameState['markets'] {
  const markets = {} as GameState['markets']

  for (const location of LOCATIONS) {
    const row = {} as Record<GoodId, MarketState>
    for (const good of GOODS) {
      const mod = location.mods[good.id]
      const low = good.min * mod
      const high = good.max * mod
      const history = Array.from({ length: 6 }, () =>
        Math.round(rng.range(low, high)),
      )
      const price = Math.round(rng.range(low, high))
      history[history.length - 1] = price
      const prev = history[history.length - 2] ?? price
      row[good.id] = {
        base: price,
        price,
        prev,
        history,
        modifier: null,
      }
    }
    markets[location.id] = row
  }

  return markets
}

function createAssetMarkets(rng: Rng): GameState['assetMarkets'] {
  const markets = {} as GameState['assetMarkets']

  for (const asset of ASSETS) {
    const history = Array.from({ length: 14 }, () =>
      Math.round(rng.range(asset.min, asset.max) * 100) / 100,
    )
    const price = history[history.length - 1]
    markets[asset.id] = {
      price,
      prev: history[history.length - 2] ?? price,
      history,
      anchor: price,
    }
  }

  return markets
}

export function createGame(
  difficulty: Difficulty = 'normal',
  seed: number = Rng.randomSeed(),
  mode: GameMode = 'classic',
  start: StartMode = 'standard',
  character: CharacterClassId | null = null,
): GameState {
  const config = DIFFICULTY_BY_ID[difficulty]
  const rng = new Rng(seed)
  const zero = start === 'zero'
  const characterConfig = character ? CHARACTER_BY_ID[character] : null
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: rng.getState(),
    eventSeq: 0,
    logSeq: 0,
    difficulty,
    mode,
    start,
    character,
    day: START_DAY,
    maxDays: config.maxDays,
    status: 'playing',
    ending: null,
    location: 'bronx',
    cash: zero ? 0 : config.startCash,
    bank: zero ? 0 : (characterConfig?.startBank ?? 0),
    debt: zero ? 0 : config.debt,
    inventory: makeInventory(),
    basis: makeInventory(),
    pawnInventory: makePawnInventory(),
    properties: [],
    gun: zero ? null : (characterConfig?.startGun ?? null),
    car: null,
    upgrades: [],
    heat: 0,
    markets: createMarkets(rng),
    assetMarkets: createAssetMarkets(rng),
    positions: {},
    log: [],
    pendingEvent: null,
    watchlist: [],
    buyOrders: [],
    boroughHopsLeft: 0,
    achievements: [],
    stats: {
      trades: 0,
      unitsBought: 0,
      unitsSold: 0,
      spent: 0,
      earned: 0,
      realizedProfit: 0,
      bestSale: 0,
      policeEncounters: 0,
      timesMugged: 0,
      cleanEscapes: 0,
      bestNetWorth: 0,
      roadTrips: 0,
      dives: 0,
      itemsPawned: 0,
      pawnEarnings: 0,
      propertiesBought: 0,
      harvests: 0,
      unitsGrown: 0,
      wagesPaid: 0,
      dealerSales: 0,
      dealerUnits: 0,
      dealerRevenue: 0,
      dealerFees: 0,
      cooks: 0,
      unitsCooked: 0,
      invested: 0,
      investmentEarnings: 0,
      assetTrades: 0,
    },
  }

  if (zero) {
    addLog(
      state,
      'neutral',
      `Day 1 — ${LOCATION_BY_ID.bronx.name}. No cash, no product, no debt. Nothing but an appetite.`,
    )
    addLog(
      state,
      'info',
      'Dumpster dive for junk, pawn it, and climb from the bottom. The shark will not lend you a dime.',
    )
  } else {
    addLog(
      state,
      'neutral',
      `Day 1 — ${LOCATION_BY_ID.bronx.name}. You have ${money(
        state.cash,
      )} and a ${money(state.debt)} debt to a very patient man.`,
    )
    addLog(
      state,
      'info',
      mode === 'endless'
        ? 'No final bell in this run. Keep the shark calm and retire a millionaire.'
        : 'Buy low, sell high, and make it to the final day with your debt paid.',
    )
  }

  state.rngState = rng.getState()
  sync(state)
  return state
}

function addHeat(state: GameState, raw: number): void {
  const config = DIFFICULTY_BY_ID[state.difficulty]
  const burner = state.upgrades.includes('burner') ? 0.7 : 1
  const character = characterOf(state)?.heatMultiplier ?? 1
  state.heat = clamp(
    state.heat + raw * config.heatMultiplier * burner * character,
    0,
    100,
  )
}

function removeGoods(state: GameState, goodId: GoodId, qty: number): number {
  const owned = state.inventory[goodId]
  const removed = Math.min(owned, Math.max(0, Math.floor(qty)))
  if (removed <= 0) return 0
  const basisRemoved = owned > 0 ? (state.basis[goodId] * removed) / owned : 0
  state.inventory[goodId] = owned - removed
  state.basis[goodId] = Math.max(0, state.basis[goodId] - basisRemoved)
  if (state.inventory[goodId] === 0) state.basis[goodId] = 0
  return removed
}

function unlock(state: GameState, id: AchievementId): void {
  if (state.achievements.includes(id)) return
  state.achievements.push(id)
  const achievement = ACHIEVEMENT_BY_ID[id]
  addLog(state, 'good', `Achievement unlocked — ${achievement.name}.`)
}

function sync(state: GameState): void {
  const worth = netWorth(state)
  state.stats.bestNetWorth = Math.max(state.stats.bestNetWorth, worth)

  if (state.stats.trades > 0) unlock(state, 'first_trade')
  if (state.bank >= 10_000) unlock(state, 'bank_10k')
  if (state.start === 'standard' && state.debt === 0) unlock(state, 'debt_free')
  if (worth >= 10_000) unlock(state, 'hustler')
  if (worth >= 100_000) unlock(state, 'operator')
  if (worth >= 500_000) unlock(state, 'kingpin')
  if (worth >= 1_000_000) unlock(state, 'millionaire')
  if (state.stats.bestSale >= 100_000) unlock(state, 'big_deal')
  if (state.gun === 'magnum') unlock(state, 'magnum')
  if (state.stats.cleanEscapes > 0) unlock(state, 'clean_getaway')
  if (state.mode === 'classic' && state.day >= state.maxDays) {
    unlock(state, 'survivor')
  }
  if (state.car) unlock(state, 'wheels')
  if (state.stats.roadTrips > 0) unlock(state, 'road_trip')
  if (state.day >= 50) unlock(state, 'long_haul')
  if (state.stats.dives > 0) unlock(state, 'dumpster_diver')
  if (state.stats.itemsPawned > 0) unlock(state, 'cash_for_trash')
  if (state.stats.propertiesBought > 0) unlock(state, 'home_owner')
  if (state.stats.harvests > 0) unlock(state, 'green_thumb')
  if (state.start === 'zero' && worth >= 100_000) unlock(state, 'from_nothing')
  if (state.stats.assetTrades > 0) unlock(state, 'first_investment')
  if (portfolioValue(state) >= 100_000) unlock(state, 'portfolio_100k')
  if (state.properties.some((property) => property.type === 'warehouse')) {
    unlock(state, 'warehouse_owner')
  }
  if (state.properties.length >= 5) unlock(state, 'property_tycoon')
}

function tickMarkets(state: GameState, rng: Rng): void {
  for (const location of LOCATIONS) {
    for (const good of GOODS) {
      const market = state.markets[location.id][good.id]
      if (market.modifier) {
        market.modifier.days -= 1
        if (market.modifier.days <= 0) market.modifier = null
      }

      const mod = location.mods[good.id]
      const low = good.min * mod
      const high = good.max * mod
      let nextBase: number
      if (rng.chance(0.72)) {
        nextBase = clamp(
          market.base * (1 + rng.range(-0.24, 0.24)),
          low,
          high,
        )
      } else {
        nextBase = rng.range(low, high)
      }

      market.base = Math.max(1, Math.round(nextBase))
      market.prev = market.price
      market.price = Math.max(
        1,
        Math.round(market.base * (market.modifier?.value ?? 1)),
      )
      market.history.push(market.price)
      if (market.history.length > PRICE_HISTORY_LIMIT) market.history.shift()
    }
  }
}

function tickAssets(state: GameState, rng: Rng): void {
  for (const asset of ASSETS) {
    const market: AssetMarketState = state.assetMarkets[asset.id]
    const next = clamp(
      market.price * (1 + asset.drift + rng.range(-asset.volatility, asset.volatility)),
      asset.min,
      asset.max,
    )
    market.prev = market.price
    market.price = Math.max(0.01, Math.round(next * 100) / 100)
    market.anchor = market.price
    market.history.push(market.price)
    if (market.history.length > PRICE_HISTORY_LIMIT) market.history.shift()
  }

  if (rng.chance(0.08)) {
    const asset = rng.pick(ASSETS)
    const direction = rng.chance(0.5) ? 'climbs' : 'slides'
    addLog(
      state,
      'info',
      `Market wire �?" ${asset.name} ${direction} to ${money(state.assetMarkets[asset.id].price)}.`,
    )
  }
}

function endGame(
  state: GameState,
  ending: 'retired' | 'millionaire' | 'time' | 'debt',
): void {
  state.ending = ending
  state.status = ending === 'retired' || ending === 'millionaire' ? 'won' : 'lost'

  if (ending === 'retired') {
    addLog(
      state,
      'good',
      'You pay off the shark, pack a bag, and leave New York behind. You win.',
    )
  } else if (ending === 'millionaire') {
    addLog(
      state,
      'good',
      'The clock runs out with a million in your name. You disappear a legend.',
    )
  } else if (ending === 'debt') {
    addLog(
      state,
      'bad',
      'The loan shark finds you before you can skip town. The debt is paid in full.',
    )
  } else {
    addLog(
      state,
      'bad',
      'The final day arrives. You survived the streets, but not the game.',
    )
  }
}

function evaluateFinal(state: GameState): void {
  if (state.status !== 'playing') return
  if (state.debt > 0) {
    endGame(state, 'debt')
  } else if (netWorth(state) >= DIFFICULTY_BY_ID[state.difficulty].goal) {
    endGame(state, 'millionaire')
  } else {
    endGame(state, 'time')
  }
}

function advanceDays(
  state: GameState,
  rng: Rng,
  days: number,
  options: { relocate?: LocationId; layLow?: boolean } = {},
): void {
  if (state.status !== 'playing') return

  const totalDays = Math.max(1, Math.floor(days))
  const config = DIFFICULTY_BY_ID[state.difficulty]
  let debtInterestTotal = 0
  let bankInterestTotal = 0

  for (let index = 0; index < totalDays; index += 1) {
    if (state.mode === 'classic' && state.day >= state.maxDays) {
      evaluateFinal(state)
      return
    }

    state.day += 1
    state.boroughHopsLeft = state.car
      ? CAR_BY_ID[state.car].boroughHops
      : 0
    if (options.layLow && index === 0) {
      state.heat = Math.max(0, state.heat - 12)
    }

    tickMarkets(state, rng)
    tickAssets(state, rng)

    const debtInterest = Math.round(state.debt * config.interest)
    const bankInterest = Math.round(state.bank * bankRate(state))
    state.debt += debtInterest
    state.bank += bankInterest
    debtInterestTotal += debtInterest
    bankInterestTotal += bankInterest

    state.heat = Math.max(0, state.heat - HEAT_DECAY)

    const arriving = options.relocate && index === totalDays - 1
    if (arriving && options.relocate) {
      state.location = options.relocate
      addLog(
        state,
        'neutral',
        `Day ${state.day} — ${LOCATION_BY_ID[state.location].name}.`,
      )
    } else if (totalDays === 1) {
      addLog(
        state,
        'neutral',
        `Day ${state.day} — ${LOCATION_BY_ID[state.location].name}.`,
      )
    } else {
      addLog(state, 'neutral', `Day ${state.day} - on the road.`)
    }

    runWorkerWages(state)
    runCaretakers(state, rng)
    runLabs(state, rng)
    runRunners(state)
    runDealers(state)
    runBuyOrders(state)
    checkWatchlist(state)

    if (state.mode === 'classic' && state.day === state.maxDays) {
      addLog(state, 'info', 'Last day. The shark expects his money.')
    }

    if (state.mode === 'endless' && state.debt >= ENDLESS_DEBT_LIMIT) {
      addLog(
        state,
        'bad',
        `The debt passes ${money(ENDLESS_DEBT_LIMIT)}. The men in clean shoes stop asking nicely.`,
      )
      endGame(state, 'debt')
      return
    }
  }

  if (debtInterestTotal > 0 || bankInterestTotal > 0) {
    const parts: string[] = []
    if (debtInterestTotal > 0) {
      parts.push(`${money(debtInterestTotal)} added to your debt`)
    }
    if (bankInterestTotal > 0) {
      parts.push(`${money(bankInterestTotal)} earned in the bank`)
    }
    addLog(
      state,
      'info',
      totalDays === 1
        ? `Daily interest — ${parts.join(', ')}.`
        : `Interest over ${totalDays} days — ${parts.join(', ')}.`,
    )
  }

  sync(state)
  const eventMultiplier =
    (options.layLow ? 0.6 : 1) * (1 + (totalDays - 1) * 0.12)
  rollEvent(state, rng, eventMultiplier)
  sync(state)
}

function nextEvent(
  state: GameState,
  kind: EventKind,
  title: string,
  body: string,
  options: EventOption[],
  data: EventData = {},
): PendingEvent {
  state.eventSeq += 1
  return {
    id: `${kind}-${state.eventSeq}`,
    kind,
    title,
    body,
    options,
    data,
  }
}

function rollEvent(state: GameState, rng: Rng, chanceMultiplier: number): void {
  const config = DIFFICULTY_BY_ID[state.difficulty]
  if (!rng.chance(config.eventChance * chanceMultiplier)) return

  const owned = GOODS.filter((good) => state.inventory[good.id] > 0)
  const kind = rng.weighted<EventKind>([
    { value: 'police', weight: 8 + state.heat * 0.35 },
    { value: 'mugging', weight: state.cash > 150 ? 9 : 0 },
    { value: 'raid', weight: owned.length > 0 ? 4 + state.heat * 0.2 : 0 },
    { value: 'boom', weight: 8 },
    { value: 'crash', weight: 7 },
    { value: 'stash', weight: capacityLeft(state) > 0 ? 6 : 0 },
    { value: 'cash', weight: 5 },
    {
      value: 'shark',
      weight:
        state.debt >= LOAN_SHARK_EVENT_THRESHOLD ? 5 + state.debt / 4000 : 0,
    },
    { value: 'rival', weight: 5 },
    { value: 'heat', weight: state.heat > 50 ? 5 : 0 },
    { value: 'quiet', weight: state.heat > 20 ? 3 : 0 },
  ])

  switch (kind) {
    case 'police':
      triggerPolice(state)
      break
    case 'mugging':
      triggerMugging(state, rng)
      break
    case 'raid':
      triggerRaid(state, rng)
      break
    case 'boom':
      triggerMarketMove(state, rng, 'boom')
      break
    case 'crash':
      triggerMarketMove(state, rng, 'crash')
      break
    case 'stash':
      triggerStash(state, rng)
      break
    case 'cash':
      triggerFoundCash(state, rng)
      break
    case 'shark':
      triggerShark(state, rng)
      break
    case 'rival':
      triggerRival(state, rng)
      break
    case 'heat':
      addHeat(state, 12)
      addLog(state, 'bad', 'The block is hot. Every head turns when you walk by.')
      break
    case 'quiet':
      state.heat = Math.max(0, state.heat - 12)
      addLog(state, 'good', 'A quiet night. Nobody is looking for you.')
      break
  }
}

function triggerPolice(state: GameState): void {
  state.stats.policeEncounters += 1
  const bribeMultiplier = characterOf(state)?.bribeMultiplier ?? 1
  const bribeCost = Math.min(
    state.cash,
    Math.max(
      50,
      Math.round(
        (150 + state.cash * 0.08 + state.heat * 4) * bribeMultiplier,
      ),
    ),
  )
  const fine = Math.round(350 + state.cash * 0.05)
  const hasProduct = GOODS.some((good) => state.inventory[good.id] > 0)
  const canBribe = bribeCost > 0 && state.cash >= bribeCost

  state.pendingEvent = nextEvent(
    state,
    'police',
    'Blue lights',
    'Two officers box you in on the corner. They have not cuffed you yet. One of them is already looking at your coat.',
    [
      {
        id: 'bribe',
        label: `Bribe the officer · ${money(bribeCost)}`,
        hint: 'Cools your heat by 25 and keeps your record clean.',
        tone: 'primary',
        disabled: !canBribe,
      },
      {
        id: 'run',
        label: 'Run for it',
        hint: 'Roughly 50/50. A gun helps. A fine hurts.',
        tone: 'neutral',
      },
      {
        id: 'cooperate',
        label: 'Cooperate',
        hint: hasProduct
          ? 'They take a chunk of product, and your heat drops to zero.'
          : 'They write you up and take a small fine.',
        tone: 'danger',
      },
    ],
    { bribeCost, fine },
  )
}

function triggerMugging(state: GameState, rng: Rng): void {
  state.stats.timesMugged += 1
  const demand = Math.max(
    20,
    Math.round(state.cash * rng.range(0.18, 0.32)),
  )
  const gunText = state.gun
    ? 'You feel the weight of your piece under your jacket.'
    : 'You have nothing but your hands.'

  state.pendingEvent = nextEvent(
    state,
    'mugging',
    'Alley tax',
    `Two kids step out of a doorway with a knife and a lot of nerve. They want what is in your pockets. ${gunText}`,
    [
      {
        id: 'hand-over',
        label: `Hand it over · ${money(Math.min(state.cash, demand))}`,
        hint: 'Lose cash, keep blood and product.',
        tone: 'primary',
      },
      {
        id: 'resist',
        label: 'Fight back',
        hint: state.gun
          ? 'Your gun gives you a real chance. Vest helps too.'
          : 'Risky without a gun. A vest helps.',
        tone: 'danger',
      },
    ],
    { demand },
  )
}

function triggerShark(state: GameState, rng: Rng): void {
  const demand = Math.min(
    state.cash,
    Math.max(50, Math.round(state.debt * rng.range(0.06, 0.09))),
  )
  const canPay = demand > 0 && state.cash >= demand

  state.pendingEvent = nextEvent(
    state,
    'shark',
    'The vig is due',
    'Two men in clean shoes find you. They do not raise their voices. One of them mentions the debt, and your name, in the same sentence.',
    [
      {
        id: 'pay-vig',
        label: `Pay the vig · ${money(demand)}`,
        hint: 'Keeps the enforcers calm for now.',
        tone: 'primary',
        disabled: !canPay,
      },
      {
        id: 'stall',
        label: 'Stall for time',
        hint: 'They might take product instead. Or worse.',
        tone: 'danger',
      },
    ],
    { demand },
  )
}

function triggerMarketMove(
  state: GameState,
  rng: Rng,
  kind: 'boom' | 'crash',
): void {
  const good = rng.pick(GOODS)
  const value = kind === 'boom' ? rng.range(1.5, 2) : rng.range(0.5, 0.7)
  const days = rng.int(1, 2)
  const market = state.markets[state.location][good.id]
  market.modifier = {
    value,
    days,
    label: kind === 'boom' ? 'Shortage' : 'Flooded',
  }
  market.price = Math.max(1, Math.round(market.base * value))
  if (market.history.length > 0) {
    market.history[market.history.length - 1] = market.price
  }

  if (kind === 'boom') {
    addLog(
      state,
      'good',
      `Word on the street: ${good.name} is scarce in ${LOCATION_BY_ID[state.location].name}. Prices jump for ${days} day${days > 1 ? 's' : ''}.`,
    )
  } else {
    addLog(
      state,
      'bad',
      `A bad batch floods ${LOCATION_BY_ID[state.location].name}. ${good.name} prices collapse for ${days} day${days > 1 ? 's' : ''}.`,
    )
  }
}

function triggerStash(state: GameState, rng: Rng): void {
  const available = capacityLeft(state)
  if (available <= 0) {
    triggerFoundCash(state, rng)
    return
  }

  const good = rng.weighted(
    GOODS.map((item) => ({
      value: item,
      weight: Math.max(1, 7 - item.tier),
    })),
  )
  const baseQty =
    good.tier <= 2 ? rng.int(4, 10) : good.tier === 3 ? rng.int(2, 5) : rng.int(1, 2)
  const qty = Math.min(available, baseQty)
  if (qty <= 0) {
    triggerFoundCash(state, rng)
    return
  }

  state.inventory[good.id] += qty
  addLog(
    state,
    'good',
    `You find a duffel bag with ${qty} ${good.name} inside. No owner in sight.`,
  )
}

function triggerFoundCash(state: GameState, rng: Rng): void {
  const amount = Math.round(rng.range(100, 450) * (1 + state.day / 10))
  state.cash += amount
  addLog(
    state,
    'good',
    `You find ${money(amount)} folded into an old jacket at the back of a closet.`,
  )
}

function triggerRaid(state: GameState, rng: Rng): void {
  const owned = GOODS.filter((good) => state.inventory[good.id] > 0)
  if (owned.length === 0) return
  const good = rng.pick(owned)
  const qty = Math.max(
    1,
    Math.ceil(state.inventory[good.id] * rng.range(0.3, 0.5)),
  )
  const removed = removeGoods(state, good.id, qty)
  state.heat = Math.max(0, state.heat - 20)

  let extra = ''
  if (state.gun && rng.chance(0.3)) {
    state.gun = null
    extra = ' They also find your piece.'
  }

  addLog(
    state,
    'bad',
    `A raid sweeps ${LOCATION_BY_ID[state.location].name}. They take ${removed} ${good.name}.${extra}`,
  )
}

function triggerRival(state: GameState, rng: Rng): void {
  const owned = GOODS.filter((good) => state.inventory[good.id] > 0)
  const good = rng.pick(owned.length > 0 ? owned : GOODS)
  const market = state.markets[state.location][good.id]
  market.modifier = { value: 0.65, days: 1, label: 'Undercut' }
  market.price = Math.max(1, Math.round(market.base * 0.65))
  if (market.history.length > 0) {
    market.history[market.history.length - 1] = market.price
  }
  addLog(
    state,
    'bad',
    `A rival dealer undercuts you in ${LOCATION_BY_ID[state.location].name}. ${good.name} prices drop.`,
  )
}

function resolveEventChoice(
  state: GameState,
  event: PendingEvent,
  optionId: string,
  rng: Rng,
): boolean {
  switch (event.kind) {
    case 'police':
      return resolvePolice(state, event, optionId, rng)
    case 'mugging':
      return resolveMugging(state, event, optionId, rng)
    case 'shark':
      return resolveShark(state, event, optionId, rng)
    default:
      return true
  }
}

function resolvePolice(
  state: GameState,
  event: PendingEvent,
  optionId: string,
  rng: Rng,
): boolean {
  if (optionId === 'bribe') {
    const cost = event.data.bribeCost ?? 0
    if (cost <= 0 || state.cash < cost) return false
    state.cash -= cost
    state.heat = Math.max(0, state.heat - 25)
    state.stats.cleanEscapes += 1
    addLog(
      state,
      'good',
      `You grease the officer with ${money(cost)}. He suddenly remembers a call he has to make.`,
    )
    return true
  }

  if (optionId === 'run') {
    const gunBonus = state.gun ? GUN_BY_ID[state.gun].defense * 0.18 : 0
    const defenseBonus = characterOf(state)?.defenseBonus ?? 0
    const chance = clamp(
      0.52 + gunBonus + defenseBonus * 0.18 - state.heat * 0.0025,
      0.2,
      0.85,
    )
    if (rng.chance(chance)) {
      addHeat(state, 8)
      state.stats.cleanEscapes += 1
      addLog(state, 'good', 'You duck through a stairwell and lose them.')
      return true
    }

    const fine = Math.min(state.cash, event.data.fine ?? 0)
    state.cash -= fine
    addHeat(state, 15)
    let extra = ''
    if (state.gun && rng.chance(0.35)) {
      state.gun = null
      extra = ' They take your piece as evidence.'
    }
    addLog(
      state,
      'bad',
      `They catch you two blocks later. Fine: ${money(fine)}.${extra}`,
    )
    return true
  }

  if (optionId === 'cooperate') {
    const owned = GOODS.filter((good) => state.inventory[good.id] > 0)
    if (owned.length > 0) {
      const good = rng.pick(owned)
      const qty = Math.max(
        1,
        Math.ceil(state.inventory[good.id] * rng.range(0.3, 0.55)),
      )
      removeGoods(state, good.id, qty)
      addLog(state, 'bad', `You keep your hands where they can see them. They take ${qty} ${good.name}.`)
    } else {
      const fine = Math.min(state.cash, Math.round((event.data.fine ?? 0) / 2))
      state.cash -= fine
      addLog(
        state,
        'bad',
        `You keep your mouth shut. They write you up for ${money(fine)} and let you walk.`,
      )
    }
    state.heat = 0
    if (state.gun && rng.chance(0.4)) {
      state.gun = null
      addLog(state, 'bad', 'They also confiscate your piece.')
    }
    return true
  }

  return false
}

function resolveMugging(
  state: GameState,
  event: PendingEvent,
  optionId: string,
  rng: Rng,
): boolean {
  if (optionId === 'hand-over') {
    const loss = Math.min(state.cash, event.data.demand ?? 0)
    state.cash -= loss
    addHeat(state, 3)
    addLog(
      state,
      'bad',
      `You hand over ${money(loss)}. They jog away before your heart slows down.`,
    )
    return true
  }

  if (optionId === 'resist') {
    const gunBonus = state.gun ? GUN_BY_ID[state.gun].defense * 0.5 : 0
    const vestBonus = state.upgrades.includes('vest') ? 0.1 : 0
    const defenseBonus = characterOf(state)?.defenseBonus ?? 0
    const chance = clamp(
      0.35 + gunBonus + vestBonus + defenseBonus * 0.5 - state.heat * 0.001,
      0.15,
      0.9,
    )

    if (rng.chance(chance)) {
      const loot = rng.int(60, 400)
      state.cash += loot
      addHeat(state, 6)
      addLog(
        state,
        'good',
        `You catch one with a right hook. The other runs. You pocket ${money(loot)} for your trouble.`,
      )
      return true
    }

    const vestFactor = state.upgrades.includes('vest') ? 0.5 : 1
    const loss = Math.min(
      state.cash,
      Math.round(state.cash * rng.range(0.35, 0.55) * vestFactor),
    )
    state.cash -= loss
    addHeat(state, 10)
    addLog(
      state,
      'bad',
      `A boot catches your ribs. They take ${money(loss)} and leave you in the gutter.`,
    )
    return true
  }

  return false
}

function resolveShark(
  state: GameState,
  event: PendingEvent,
  optionId: string,
  rng: Rng,
): boolean {
  if (optionId === 'pay-vig') {
    const cost = event.data.demand ?? 0
    if (cost <= 0 || state.cash < cost) return false
    state.cash -= cost
    addLog(
      state,
      'info',
      `You pay ${money(cost)} toward the vig. The men in clean shoes leave without a word.`,
    )
    return true
  }

  if (optionId === 'stall') {
    const chance = 0.45 + (state.gun ? 0.1 : 0)
    if (rng.chance(chance)) {
      addHeat(state, 5)
      addLog(
        state,
        'info',
        'You promise them a payment next week. They stare at you a little too long, then leave.',
      )
      return true
    }

    const cashLoss = Math.min(
      state.cash,
      Math.round(state.cash * rng.range(0.15, 0.3)),
    )
    state.cash -= cashLoss
    const owned = GOODS.filter((good) => state.inventory[good.id] > 0)
    let productLine = ''
    if (owned.length > 0) {
      const good = rng.pick(owned)
      const qty = Math.max(
        1,
        Math.ceil(state.inventory[good.id] * rng.range(0.15, 0.3)),
      )
      removeGoods(state, good.id, qty)
      productLine = ` and ${qty} ${good.name}`
    }
    addHeat(state, 10)
    addLog(
      state,
      'bad',
      `They take ${money(cashLoss)}${productLine} as a reminder. You do not argue.`,
    )
    return true
  }

  return false
}

function applyBuy(state: GameState, goodId: GoodId, rawQty: number): void {
  const qty = Math.floor(rawQty)
  if (!Number.isFinite(qty) || qty <= 0) return
  const good = GOOD_BY_ID[goodId]
  const price = priceAt(state, state.location, goodId)
  const cost = price * qty

  if (state.cash < cost) return
  if (inventoryCount(state) + qty > capacity(state)) return

  state.cash -= cost
  state.inventory[goodId] += qty
  state.basis[goodId] += cost
  state.stats.trades += 1
  state.stats.unitsBought += qty
  state.stats.spent += cost
  addHeat(state, 1 + Math.sqrt(qty * price) / 140)
  addLog(
    state,
    'neutral',
    `Bought ${qty} ${good.name} at ${money(price)} each — ${money(cost)} total.`,
  )
  sync(state)
}

function applySell(state: GameState, goodId: GoodId, rawQty: number): void {
  const qty = Math.floor(rawQty)
  if (!Number.isFinite(qty) || qty <= 0) return
  const owned = state.inventory[goodId]
  if (qty > owned) return

  const good = GOOD_BY_ID[goodId]
  const price = priceAt(state, state.location, goodId)
  const revenue = price * qty
  const avgCost = owned > 0 ? state.basis[goodId] / owned : 0
  const profit = revenue - avgCost * qty

  removeGoods(state, goodId, qty)
  state.cash += revenue
  state.stats.trades += 1
  state.stats.unitsSold += qty
  state.stats.earned += revenue
  state.stats.realizedProfit += Math.round(profit)
  state.stats.bestSale = Math.max(state.stats.bestSale, revenue)
  addHeat(state, 1 + Math.sqrt(qty * price) / 140)
  addLog(
    state,
    profit >= 0 ? 'good' : 'bad',
    `Sold ${qty} ${good.name} at ${money(price)} each — ${money(revenue)} total, ${money(profit)} profit.`,
  )
  sync(state)
}

function applyDeposit(state: GameState, rawAmount: number): void {
  const amount = Math.floor(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > state.cash) return
  state.cash -= amount
  state.bank += amount
  addLog(state, 'info', `Deposited ${money(amount)} into the bank.`)
  sync(state)
}

function applyWithdraw(state: GameState, rawAmount: number): void {
  const amount = Math.floor(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > state.bank) return
  state.cash += amount
  state.bank -= amount
  addLog(state, 'info', `Withdrew ${money(amount)} from the bank.`)
  sync(state)
}

function applyBorrow(state: GameState, rawAmount: number): void {
  if (state.start === 'zero') return
  const amount = Math.floor(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) return
  if (state.debt + amount > LOAN_CAP) return
  state.cash += amount
  state.debt += amount
  addLog(
    state,
    'bad',
    `Borrowed ${money(amount)} from the shark. The debt is now ${money(state.debt)}.`,
  )
  sync(state)
}

function applyRepay(state: GameState, rawAmount: number): void {
  const amount = Math.floor(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) return
  if (amount > state.cash || amount > state.debt) return
  state.cash -= amount
  state.debt -= amount
  addLog(
    state,
    state.debt === 0 ? 'good' : 'info',
    state.debt === 0
      ? `You pay the last ${money(amount)}. The debt is gone.`
      : `Repaid ${money(amount)}. Debt left: ${money(state.debt)}.`,
  )
  sync(state)
}

function applyBuyGun(state: GameState, gunId: GunId): void {
  const gun = GUN_BY_ID[gunId]
  if (!gun || state.gun === gunId) return
  if (state.cash < gun.cost) return
  state.cash -= gun.cost
  state.gun = gunId
  addLog(state, 'info', `Bought a ${gun.name} for ${money(gun.cost)}.`)
  sync(state)
}

function applyBuyUpgrade(state: GameState, upgradeId: UpgradeId): void {
  const upgrade = UPGRADE_BY_ID[upgradeId]
  if (!upgrade || state.upgrades.includes(upgradeId)) return
  if (upgrade.requires && !state.upgrades.includes(upgrade.requires)) return
  if (upgrade.carRequirement) {
    if (!state.car) return
    if (upgrade.carRequirement !== 'any' && state.car !== upgrade.carRequirement) {
      return
    }
  }
  if (state.cash < upgrade.cost) return
  state.cash -= upgrade.cost
  state.upgrades.push(upgradeId)
  addLog(state, 'info', `Bought ${upgrade.name} for ${money(upgrade.cost)}.`)
  sync(state)
}

function applyBuyCar(state: GameState, carId: CarId): void {
  const car = CAR_BY_ID[carId]
  if (!car || state.car === carId) return
  const oldCar = state.car ? CAR_BY_ID[state.car] : null
  const tradeIn = oldCar
    ? Math.floor(oldCar.cost * CAR_TRADE_IN_RATE)
    : 0
  const due = Math.max(0, car.cost - tradeIn)
  if (state.cash < due) return

  state.cash -= due
  state.car = carId
  state.boroughHopsLeft = car.boroughHops
  addLog(
    state,
    'info',
    oldCar
      ? `Traded the ${oldCar.name} plus ${money(due)} for a ${car.name}. ${car.boroughHops} same-day hop${car.boroughHops === 1 ? '' : 's'} a day.`
      : `Bought a ${car.name} for ${money(car.cost)}. The city just got smaller — ${car.boroughHops} same-day hop${car.boroughHops === 1 ? '' : 's'} a day.`,
  )
  sync(state)
}

function newProperty(
  location: LocationId,
  type: PropertyTypeId,
): PropertyState {
  return {
    id: `${location}:${type}`,
    location,
    type,
    stored: makeInventory(),
    storedBasis: makeInventory(),
    grows: [],
    caretaker: null,
    dealer: null,
    runner: false,
    cooks: [],
    labTech: null,
  }
}

function applyDumpsterDive(state: GameState, rng: Rng): void {
  state.stats.dives += 1
  const rolled = rng.chance(0.25) ? 3 : rng.chance(0.6) ? 2 : 1
  const count = Math.max(characterOf(state)?.dumpsterMin ?? 1, rolled)
  const found: string[] = []
  for (let index = 0; index < count; index += 1) {
    const item = rng.weighted(
      PAWN_ITEMS.map((entry) => ({ value: entry, weight: entry.weight })),
    )
    state.pawnInventory[item.id] += 1
    found.push(item.name)
  }
  addLog(
    state,
    'good',
    `You climb into a dumpster and come out with ${found.join(', ')}.`,
  )
  sync(state)
  advanceDays(state, rng, 1)
}

function applyPawn(state: GameState, itemId: PawnItemId, rawQty: number): void {
  const qty = Math.floor(rawQty)
  if (!Number.isFinite(qty) || qty <= 0) return
  const item = PAWN_ITEM_BY_ID[itemId]
  if (!item) return
  const owned = state.pawnInventory[itemId] ?? 0
  if (qty > owned) return

  const revenue = item.value * qty
  state.pawnInventory[itemId] = owned - qty
  state.cash += revenue
  state.stats.itemsPawned += qty
  state.stats.pawnEarnings += revenue
  addLog(
    state,
    'good',
    `Pawned ${qty} ${item.name}${qty === 1 ? '' : 's'} for ${money(revenue)}.`,
  )
  sync(state)
}

function applyBuyProperty(
  state: GameState,
  propertyType: PropertyTypeId,
): void {
  const config = getPropertyConfig(state.location, propertyType)
  if (
    state.properties.some(
      (property) => property.id === `${state.location}:${propertyType}`,
    )
  ) {
    return
  }
  if (state.cash < config.cost) return

  state.cash -= config.cost
  state.properties.push(newProperty(state.location, propertyType))
  state.stats.propertiesBought += 1
  addLog(
    state,
    'good',
    `Bought a ${config.name} in ${LOCATION_BY_ID[state.location].name} for ${money(config.cost)} — ${config.storage} stash units and ${config.growSlots} grow slot${config.growSlots === 1 ? '' : 's'}.`,
  )
  sync(state)
}

function applyDepositStash(
  state: GameState,
  propertyId: string,
  goodId: GoodId,
  rawQty: number,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const qty = Math.floor(rawQty)
  if (!Number.isFinite(qty) || qty <= 0) return
  const owned = state.inventory[goodId]
  if (qty > owned) return
  if (qty > storageLeft(property)) return

  const basisMoved = owned > 0 ? (state.basis[goodId] * qty) / owned : 0
  state.inventory[goodId] = owned - qty
  state.basis[goodId] = Math.max(0, state.basis[goodId] - basisMoved)
  if (state.inventory[goodId] === 0) state.basis[goodId] = 0
  property.stored[goodId] += qty
  property.storedBasis[goodId] += basisMoved
  addLog(
    state,
    'info',
    `Stashed ${qty} ${GOOD_BY_ID[goodId].name} in the ${getPropertyConfig(property.location, property.type).name}.`,
  )
  sync(state)
}

function applyWithdrawStash(
  state: GameState,
  propertyId: string,
  goodId: GoodId,
  rawQty: number,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const qty = Math.floor(rawQty)
  if (!Number.isFinite(qty) || qty <= 0) return
  const stored = property.stored[goodId]
  if (qty > stored) return
  if (inventoryCount(state) + qty > capacity(state)) return

  const basisMoved =
    stored > 0 ? (property.storedBasis[goodId] * qty) / stored : 0
  property.stored[goodId] = stored - qty
  property.storedBasis[goodId] = Math.max(
    0,
    property.storedBasis[goodId] - basisMoved,
  )
  if (property.stored[goodId] === 0) property.storedBasis[goodId] = 0
  state.inventory[goodId] += qty
  state.basis[goodId] += basisMoved
  addLog(
    state,
    'info',
    `Pulled ${qty} ${GOOD_BY_ID[goodId].name} out of the ${getPropertyConfig(property.location, property.type).name}.`,
  )
  sync(state)
}

function applyPlant(
  state: GameState,
  propertyId: string,
  goodId: GoodId,
  rng: Rng,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const config = getPropertyConfig(property.location, property.type)
  if (property.grows.length >= config.growSlots) return
  const growable = GROWABLE_BY_GOOD[goodId]
  if (!growable) return
  const character = characterOf(state)
  const seedCost = Math.max(
    1,
    Math.round(growable.seedCost * (character?.seedCostMultiplier ?? 1)),
  )
  if (state.cash < seedCost) return

  const baseYield = rng.int(growable.minYield, growable.maxYield)
  const yieldQty = Math.max(
    1,
    Math.round(baseYield * (character?.growYieldMultiplier ?? 1)),
  )
  state.cash -= seedCost
  property.grows.push({
    good: goodId,
    plantedDay: state.day,
    readyDay: state.day + growable.days,
    yield: yieldQty,
    seedCost,
  })
  addLog(
    state,
    'info',
    `Planted ${GOOD_BY_ID[goodId].name} in the ${config.name}. Ready in ${growable.days} day${growable.days === 1 ? '' : 's'}.`,
  )
  sync(state)
}

function applyHarvest(
  state: GameState,
  propertyId: string,
  slot: number,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const config = getPropertyConfig(property.location, property.type)
  const plot = property.grows[slot]
  if (!plot) return
  if (state.day < plot.readyDay) return
  if (plot.yield > storageLeft(property)) return

  property.stored[plot.good] += plot.yield
  property.storedBasis[plot.good] += plot.seedCost
  property.grows.splice(slot, 1)
  state.stats.harvests += 1
  state.stats.unitsGrown += plot.yield
  addLog(
    state,
    'good',
    `Harvested ${plot.yield} ${GOOD_BY_ID[plot.good].name} from the ${config.name}.`,
  )
  sync(state)
}

function applyHireCaretaker(
  state: GameState,
  propertyId: string,
  goodId: GoodId,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const config = getPropertyConfig(property.location, property.type)
  if (config.growSlots <= 0) return
  const growable = GROWABLE_BY_GOOD[goodId]
  if (!growable) return
  if (property.caretaker?.crop === goodId) return

  const wasHired = Boolean(property.caretaker)
  property.caretaker = { crop: goodId }
  addLog(
    state,
    'info',
    wasHired
      ? `The caretaker at the ${config.name} switches to ${GOOD_BY_ID[goodId].name}.`
      : `Hired a caretaker for the ${config.name}. They will keep ${GOOD_BY_ID[goodId].name} growing for ${money(caretakerWage(property))} per day.`,
  )
  sync(state)
}

function applyFireCaretaker(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location || !property.caretaker)
    return
  const config = getPropertyConfig(property.location, property.type)
  property.caretaker = null
  addLog(
    state,
    'info',
    `Let the caretaker at the ${config.name} go. The grow slots are yours again.`,
  )
  sync(state)
}

function dealerMinPrice(
  state: GameState,
  location: LocationId,
  goodId: GoodId,
  raw: number,
): number | null {
  const minPrice = Math.floor(raw)
  if (!Number.isFinite(minPrice) || minPrice <= 0) return null
  const base = state.markets[location][goodId]?.base ?? 0
  if (base > 0 && minPrice > base * DEALER_MAX_PRICE_MULTIPLIER) return null
  return minPrice
}

function applyHireDealer(
  state: GameState,
  propertyId: string,
  goodId: GoodId,
  rawMinPrice: number,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  if (!GOOD_BY_ID[goodId]) return
  const minPrice = dealerMinPrice(state, property.location, goodId, rawMinPrice)
  if (minPrice === null) return
  const config = getPropertyConfig(property.location, property.type)
  const isNew = !property.dealer
  if (isNew) {
    if (state.cash < DEALER_HIRE_COST) return
    state.cash -= DEALER_HIRE_COST
  }
  property.dealer = { good: goodId, minPrice }
  addLog(
    state,
    'info',
    isNew
      ? `Hired a dealer for the ${config.name} — ${money(DEALER_HIRE_COST)} up front and ${Math.round(DEALER_COMMISSION * 100)}% per sale, moving ${GOOD_BY_ID[goodId].name} at ${money(minPrice)} or better.`
      : `Dealer at the ${config.name} now moves ${GOOD_BY_ID[goodId].name} at ${money(minPrice)} or better.`,
  )
  sync(state)
}

function applySetDealerPrice(
  state: GameState,
  propertyId: string,
  rawMinPrice: number,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location || !property.dealer) return
  const minPrice = dealerMinPrice(
    state,
    property.location,
    property.dealer.good,
    rawMinPrice,
  )
  if (minPrice === null) return
  property.dealer.minPrice = minPrice
  addLog(
    state,
    'info',
    `Dealer target updated to ${money(minPrice)} for ${GOOD_BY_ID[property.dealer.good].name}.`,
  )
  sync(state)
}

function applyFireDealer(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location || !property.dealer) return
  const config = getPropertyConfig(property.location, property.type)
  property.dealer = null
  addLog(state, 'info', `Let the dealer at the ${config.name} go.`)
  sync(state)
}

function applyHireRunner(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location || property.runner) return
  const config = getPropertyConfig(property.location, property.type)
  if (config.storage <= 0) return
  property.runner = true
  addLog(
    state,
    'info',
    `Hired a runner for the ${config.name} — ${money(RUNNER_WAGE)} a day to haul goods in from your coat and other local spots.`,
  )
  sync(state)
}

function applyFireRunner(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location || !property.runner) return
  const config = getPropertyConfig(property.location, property.type)
  property.runner = false
  addLog(state, 'info', `Let the runner at the ${config.name} go.`)
  sync(state)
}

function applyCook(
  state: GameState,
  propertyId: string,
  recipeId: RecipeId,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const config = getPropertyConfig(property.location, property.type)
  if (config.cookSlots <= 0 || property.cooks.length >= config.cookSlots) return
  const recipe = RECIPE_BY_ID[recipeId]
  if (!recipe) return
  if (property.stored[recipe.input] < recipe.inputQty) return
  if (!beginCook(state, property, recipeId)) return
  addLog(
    state,
    'info',
    `Started a ${GOOD_BY_ID[recipe.output].name} batch in the ${config.name} — ready in ${recipe.days} days.`,
  )
  sync(state)
}

function applyHireLabTech(
  state: GameState,
  propertyId: string,
  recipeId: RecipeId,
): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  const config = getPropertyConfig(property.location, property.type)
  if (config.cookSlots <= 0) return
  const recipe = RECIPE_BY_ID[recipeId]
  if (!recipe) return
  if (property.labTech === recipeId) return
  property.labTech = recipeId
  addLog(
    state,
    'info',
    `Hired a lab tech for the ${config.name} — ${money(LAB_TECH_WAGE)} a day to cook ${GOOD_BY_ID[recipe.output].name} whenever ingredients are stocked.`,
  )
  sync(state)
}

function applyFireLabTech(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location || !property.labTech) return
  const config = getPropertyConfig(property.location, property.type)
  property.labTech = null
  addLog(state, 'info', `Let the lab tech at the ${config.name} go.`)
  sync(state)
}

function applyDepositStashAll(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  let moved = 0
  for (const good of GOODS) {
    const qty = Math.min(state.inventory[good.id], storageLeft(property))
    if (qty <= 0) continue
    const owned = state.inventory[good.id]
    const basisMoved = owned > 0 ? (state.basis[good.id] * qty) / owned : 0
    state.inventory[good.id] -= qty
    state.basis[good.id] = Math.max(0, state.basis[good.id] - basisMoved)
    property.stored[good.id] += qty
    property.storedBasis[good.id] += basisMoved
    moved += qty
  }
  if (moved <= 0) return
  const config = getPropertyConfig(property.location, property.type)
  addLog(
    state,
    'info',
    `Stored ${moved} unit${moved === 1 ? '' : 's'} in the ${config.name}.`,
  )
  sync(state)
}

function applyWithdrawStashAll(state: GameState, propertyId: string): void {
  const property = propertyById(state, propertyId)
  if (!property || property.location !== state.location) return
  let moved = 0
  let space = capacityLeft(state)
  for (const good of GOODS) {
    const qty = Math.min(property.stored[good.id], space)
    if (qty <= 0) continue
    const stored = property.stored[good.id]
    const basisMoved =
      stored > 0 ? (property.storedBasis[good.id] * qty) / stored : 0
    property.stored[good.id] -= qty
    property.storedBasis[good.id] = Math.max(
      0,
      property.storedBasis[good.id] - basisMoved,
    )
    state.inventory[good.id] += qty
    state.basis[good.id] += basisMoved
    space -= qty
    moved += qty
  }
  if (moved <= 0) return
  const config = getPropertyConfig(property.location, property.type)
  addLog(
    state,
    'info',
    `Took ${moved} unit${moved === 1 ? '' : 's'} out of the ${config.name}.`,
  )
  sync(state)
}

function applySetWatch(
  state: GameState,
  goodId: GoodId,
  location: LocationId,
  rawTarget: number,
  direction: 'above' | 'below',
): void {
  if (!GOOD_BY_ID[goodId] || !LOCATION_BY_ID[location]) return
  const target = Math.floor(rawTarget)
  if (!Number.isFinite(target) || target <= 0) return
  const existing = state.watchlist.find(
    (entry) => entry.good === goodId && entry.location === location,
  )
  if (existing) {
    existing.target = target
    existing.direction = direction
    existing.armed = true
    return
  }
  if (state.watchlist.length >= 12) return
  state.watchlist.push({
    good: goodId,
    location,
    target,
    direction,
    armed: true,
  })
}

function applyClearWatch(
  state: GameState,
  goodId: GoodId,
  location: LocationId,
): void {
  state.watchlist = state.watchlist.filter(
    (entry) => !(entry.good === goodId && entry.location === location),
  )
}

function applyPlaceBuyOrder(
  state: GameState,
  goodId: GoodId,
  location: LocationId,
  rawQty: number,
  rawMaxPrice: number,
): void {
  if (!GOOD_BY_ID[goodId] || !LOCATION_BY_ID[location]) return
  const qty = Math.floor(rawQty)
  const maxPrice = Math.floor(rawMaxPrice)
  if (!Number.isFinite(qty) || qty <= 0) return
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) return
  const id = `${location}:${goodId}`
  const existing = state.buyOrders.find((order) => order.id === id)
  if (existing) {
    existing.qty = qty
    existing.maxPrice = maxPrice
    existing.remaining = qty
  } else {
    if (state.buyOrders.length >= MAX_BUY_ORDERS) return
    state.buyOrders.push({
      id,
      location,
      good: goodId,
      qty,
      maxPrice,
      remaining: qty,
    })
  }
  addLog(
    state,
    'info',
    `Limit order set — ${qty} ${GOOD_BY_ID[goodId].name} at ${money(maxPrice)} or better in ${LOCATION_BY_ID[location].name}.`,
  )
  sync(state)
}

function applyCancelBuyOrder(state: GameState, id: string): void {
  const order = state.buyOrders.find((entry) => entry.id === id)
  if (!order) return
  state.buyOrders = state.buyOrders.filter((entry) => entry.id !== id)
  addLog(
    state,
    'info',
    `Cancelled the limit order for ${GOOD_BY_ID[order.good].name}.`,
  )
  sync(state)
}

function payDailyWage(state: GameState, wage: number): boolean {
  if (state.cash + state.bank < wage) return false
  const fromCash = Math.min(state.cash, wage)
  state.cash -= fromCash
  state.bank -= wage - fromCash
  state.stats.wagesPaid += wage
  return true
}

function runWorkerWages(state: GameState): void {
  let paid = 0

  for (const property of state.properties) {
    const config = getPropertyConfig(property.location, property.type)

    if (property.caretaker) {
      const wage = caretakerWage(property)
      if (config.growSlots <= 0 || wage <= 0) {
        property.caretaker = null
      } else if (payDailyWage(state, wage)) {
        paid += wage
      } else {
        property.caretaker = null
        addLog(
          state,
          'bad',
          `The caretaker at the ${config.name} quit after missing a ${money(wage)} wage payment.`,
        )
      }
    }

    if (property.runner) {
      if (payDailyWage(state, RUNNER_WAGE)) {
        paid += RUNNER_WAGE
      } else {
        property.runner = false
        addLog(
          state,
          'bad',
          `The runner at the ${config.name} quit after missing a ${money(RUNNER_WAGE)} wage payment.`,
        )
      }
    }

    if (property.labTech) {
      if (payDailyWage(state, LAB_TECH_WAGE)) {
        paid += LAB_TECH_WAGE
      } else {
        property.labTech = null
        addLog(
          state,
          'bad',
          `The lab tech at the ${config.name} quit after missing a ${money(LAB_TECH_WAGE)} wage payment.`,
        )
      }
    }
  }

  if (paid > 0) {
    addLog(state, 'info', `Paid ${money(paid)} in worker wages.`)
  }
}

function runCaretakers(state: GameState, rng: Rng): void {
  let harvests = 0
  let unitsHarvested = 0
  let planted = 0
  let waiting = 0
  const character = characterOf(state)

  for (const property of state.properties) {
    if (!property.caretaker) continue
    const config = getPropertyConfig(property.location, property.type)
    const growable = GROWABLE_BY_GOOD[property.caretaker.crop]
    if (!growable) {
      property.caretaker = null
      continue
    }

    for (let slot = property.grows.length - 1; slot >= 0; slot -= 1) {
      const plot = property.grows[slot]
      if (!plot || state.day < plot.readyDay) continue
      if (plot.yield > storageLeft(property)) {
        waiting += 1
        continue
      }
      property.stored[plot.good] += plot.yield
      property.storedBasis[plot.good] += plot.seedCost
      property.grows.splice(slot, 1)
      state.stats.harvests += 1
      state.stats.unitsGrown += plot.yield
      harvests += 1
      unitsHarvested += plot.yield
    }

    const seedCost = Math.max(
      1,
      Math.round(growable.seedCost * (character?.seedCostMultiplier ?? 1)),
    )
    while (property.grows.length < config.growSlots) {
      if (state.cash < seedCost) break
      if (storageLeft(property) < growable.minYield) break
      const baseYield = rng.int(growable.minYield, growable.maxYield)
      const yieldQty = Math.max(
        1,
        Math.round(baseYield * (character?.growYieldMultiplier ?? 1)),
      )
      state.cash -= seedCost
      property.grows.push({
        good: growable.good,
        plantedDay: state.day,
        readyDay: state.day + growable.days,
        yield: yieldQty,
        seedCost,
      })
      planted += 1
    }
  }

  if (harvests > 0 || planted > 0) {
    const parts: string[] = []
    if (harvests > 0) {
      parts.push(
        `harvested ${unitsHarvested} unit${unitsHarvested === 1 ? '' : 's'} from ${harvests} crop${harvests === 1 ? '' : 's'}`,
      )
    }
    if (planted > 0) {
      parts.push(`planted ${planted} crop${planted === 1 ? '' : 's'}`)
    }
    addLog(state, 'good', `Caretakers ${parts.join(' and ')}.`)
  }
  if (waiting > 0) {
    addLog(
      state,
      'info',
      `Caretakers left ${waiting} crop${waiting === 1 ? '' : 's'} waiting - storage is full.`,
    )
  }
}

function beginCook(
  state: GameState,
  property: PropertyState,
  recipeId: RecipeId,
): boolean {
  const recipe = RECIPE_BY_ID[recipeId]
  if (!recipe) return false
  const stored = property.stored[recipe.input]
  if (stored < recipe.inputQty) return false
  const basisMoved =
    stored > 0 ? (property.storedBasis[recipe.input] * recipe.inputQty) / stored : 0
  property.stored[recipe.input] -= recipe.inputQty
  property.storedBasis[recipe.input] = Math.max(
    0,
    property.storedBasis[recipe.input] - basisMoved,
  )
  property.cooks.push({
    recipe: recipe.id,
    startedDay: state.day,
    readyDay: state.day + recipe.days,
    inputBasis: basisMoved,
  })
  addHeat(state, recipe.heat)
  return true
}

function runLabs(state: GameState, rng: Rng): void {
  const character = characterOf(state)

  for (const property of state.properties) {
    const config = getPropertyConfig(property.location, property.type)
    if (config.cookSlots <= 0) {
      if (property.cooks.length > 0) property.cooks = []
      if (property.labTech) property.labTech = null
      continue
    }

    for (let slot = property.cooks.length - 1; slot >= 0; slot -= 1) {
      const cook = property.cooks[slot]
      const recipe = RECIPE_BY_ID[cook.recipe]
      if (!cook || !recipe || state.day < cook.readyDay) continue
      property.cooks.splice(slot, 1)
      if (rng.chance(recipe.risk)) {
        addHeat(state, recipe.heat * 1.5)
        addLog(
          state,
          'bad',
          `A ${GOOD_BY_ID[recipe.output].name} batch blew up in the ${config.name}. The lab survives; the product does not.`,
        )
        continue
      }
      const outputQty = recipe.outputQty + (character?.cookBonus ?? 0)
      property.stored[recipe.output] += outputQty
      property.storedBasis[recipe.output] += cook.inputBasis
      state.stats.cooks += 1
      state.stats.unitsCooked += outputQty
      addLog(
        state,
        'good',
        `Cooked ${outputQty} ${GOOD_BY_ID[recipe.output].name} in the ${config.name}.`,
      )
    }

    const tech = property.labTech
    if (tech) {
      let started = 0
      while (property.cooks.length < config.cookSlots) {
        if (!beginCook(state, property, tech)) break
        started += 1
      }
      if (started > 0) {
        addLog(
          state,
          'info',
          `The lab tech at the ${config.name} started ${started} batch${started === 1 ? '' : 'es'} of ${GOOD_BY_ID[RECIPE_BY_ID[tech].output].name}.`,
        )
      }
    }
  }
}

function runRunners(state: GameState): void {
  for (const property of state.properties) {
    if (!property.runner) continue
    if (property.location !== state.location) continue
    const config = getPropertyConfig(property.location, property.type)
    let moved = 0

    for (const good of GOODS) {
      const qty = Math.min(state.inventory[good.id], storageLeft(property))
      if (qty <= 0) continue
      const owned = state.inventory[good.id]
      const basisMoved = owned > 0 ? (state.basis[good.id] * qty) / owned : 0
      state.inventory[good.id] -= qty
      state.basis[good.id] = Math.max(0, state.basis[good.id] - basisMoved)
      property.stored[good.id] += qty
      property.storedBasis[good.id] += basisMoved
      moved += qty
    }

    for (const other of state.properties) {
      if (other === property || other.location !== property.location) continue
      for (const good of GOODS) {
        const qty = Math.min(other.stored[good.id], storageLeft(property))
        if (qty <= 0) continue
        const stored = other.stored[good.id]
        const basisMoved =
          stored > 0 ? (other.storedBasis[good.id] * qty) / stored : 0
        other.stored[good.id] -= qty
        other.storedBasis[good.id] = Math.max(
          0,
          other.storedBasis[good.id] - basisMoved,
        )
        property.stored[good.id] += qty
        property.storedBasis[good.id] += basisMoved
        moved += qty
      }
    }

    if (moved > 0) {
      addLog(
        state,
        'info',
        `Your runner moved ${moved} unit${moved === 1 ? '' : 's'} into the ${config.name}.`,
      )
    }
  }
}

function tickLivePrices(state: GameState, rng: Rng): void {
  for (const location of LOCATIONS) {
    for (const good of GOODS) {
      const market = state.markets[location.id][good.id]
      const anchor = Math.max(1, market.base * (market.modifier?.value ?? 1))
      const next =
        market.price *
          (1 + rng.range(-PRICE_TICK_VOLATILITY, PRICE_TICK_VOLATILITY)) +
        (anchor - market.price) * PRICE_TICK_REVERSION
      market.prev = market.price
      market.price = Math.max(
        1,
        Math.round(clamp(next, market.base * 0.45, market.base * 2.2)),
      )
      market.history.push(market.price)
      if (market.history.length > PRICE_HISTORY_LIMIT) market.history.shift()
    }
  }

  for (const asset of ASSETS) {
    const market = state.assetMarkets[asset.id]
    const next =
      market.price *
        (1 + rng.range(-PRICE_TICK_VOLATILITY, PRICE_TICK_VOLATILITY)) +
      (market.anchor - market.price) * PRICE_TICK_REVERSION
    market.prev = market.price
    market.price = Math.max(
      0.01,
      Math.round(clamp(next, asset.min, asset.max) * 100) / 100,
    )
    market.history.push(market.price)
    if (market.history.length > PRICE_HISTORY_LIMIT) market.history.shift()
  }
}

function runDealers(state: GameState): void {
  for (const property of state.properties) {
    const dealer = property.dealer
    if (!dealer) continue
    const qty = property.stored[dealer.good]
    if (qty <= 0) continue
    const price = priceAt(state, property.location, dealer.good)
    if (price < dealer.minPrice) continue

    const revenue = price * qty
    const fee = Math.round(revenue * DEALER_COMMISSION)
    const net = revenue - fee
    const basisMoved = property.storedBasis[dealer.good]
    const profit = net - basisMoved

    property.stored[dealer.good] = 0
    property.storedBasis[dealer.good] = 0
    state.cash += net
    state.stats.trades += 1
    state.stats.unitsSold += qty
    state.stats.earned += revenue
    state.stats.realizedProfit += Math.round(profit)
    state.stats.bestSale = Math.max(state.stats.bestSale, revenue)
    state.stats.dealerSales += 1
    state.stats.dealerUnits += qty
    state.stats.dealerRevenue += revenue
    state.stats.dealerFees += fee
    addHeat(state, 1 + Math.sqrt(qty * price) / 200)
    addLog(
      state,
      profit >= 0 ? 'good' : 'bad',
      `Your dealer moved ${qty} ${GOOD_BY_ID[dealer.good].name} in ${LOCATION_BY_ID[property.location].name} at ${money(price)} each — ${money(net)} after a ${money(fee)} cut.`,
    )
  }
}

function runBuyOrders(state: GameState): void {
  for (const order of state.buyOrders) {
    if (order.remaining <= 0) continue
    const price = priceAt(state, order.location, order.good)
    if (price > order.maxPrice) continue
    const affordable = Math.floor(state.cash / price)
    const qty = Math.min(order.remaining, affordable, capacityLeft(state))
    if (qty <= 0) continue

    const cost = price * qty
    state.cash -= cost
    state.inventory[order.good] += qty
    state.basis[order.good] += cost
    state.stats.trades += 1
    state.stats.unitsBought += qty
    state.stats.spent += cost
    order.remaining -= qty
    addHeat(state, 1 + Math.sqrt(qty * price) / 140)
    addLog(
      state,
      'info',
      `Limit order filled — bought ${qty} ${GOOD_BY_ID[order.good].name} at ${money(price)} each (${money(cost)}).`,
    )
  }
  state.buyOrders = state.buyOrders.filter((order) => order.remaining > 0)
}

function checkWatchlist(state: GameState): void {
  for (const entry of state.watchlist) {
    if (!entry.armed) continue
    const price = priceAt(state, entry.location, entry.good)
    const hit =
      entry.direction === 'above'
        ? price >= entry.target
        : price <= entry.target
    if (!hit) continue
    entry.armed = false
    addLog(
      state,
      'info',
      `Price alert — ${GOOD_BY_ID[entry.good].name} in ${LOCATION_BY_ID[entry.location].name} is ${money(price)} (target ${entry.direction === 'above' ? '≥' : '≤'} ${money(entry.target)}).`,
    )
  }
}

export function tickGame(state: GameState): GameState {
  if (state.status !== 'playing' || state.pendingEvent) return state
  const next = structuredClone(state)
  const rng = new Rng(next.rngState)
  tickLivePrices(next, rng)
  runDealers(next)
  runBuyOrders(next)
  checkWatchlist(next)
  next.rngState = rng.getState()
  sync(next)
  return next
}

function applyInvest(
  state: GameState,
  assetId: AssetId,
  rawAmount: number,
): void {
  const asset = ASSET_BY_ID[assetId]
  const market = state.assetMarkets[assetId]
  const amount = Math.floor(rawAmount)
  if (!asset || !market) return
  if (!Number.isFinite(amount) || amount <= 0 || amount > state.bank) return

  const feeMultiplier = characterOf(state)?.brokerFeeMultiplier ?? 1
  const fee = amount * asset.fee * feeMultiplier
  const units = (amount - fee) / market.price
  if (units <= 0) return

  const existing = state.positions[assetId]
  state.positions[assetId] = {
    units: (existing?.units ?? 0) + units,
    basis: (existing?.basis ?? 0) + amount,
  }
  state.bank -= amount
  state.stats.invested += amount
  state.stats.assetTrades += 1
  addLog(
    state,
    'info',
    `Bought ${units.toFixed(4)} ${asset.ticker} for ${money(amount)}.`,
  )
  sync(state)
}

function applyDivest(
  state: GameState,
  assetId: AssetId,
  rawAmount: number,
): void {
  const asset = ASSET_BY_ID[assetId]
  const market = state.assetMarkets[assetId]
  const position = state.positions[assetId]
  const amount = Math.floor(rawAmount)
  if (!asset || !market || !position) return
  if (!Number.isFinite(amount) || amount <= 0) return

  const units = Math.min(position.units, amount / market.price)
  if (units <= 0) return
  const proceeds = units * market.price
  const feeMultiplier = characterOf(state)?.brokerFeeMultiplier ?? 1
  const fee = proceeds * asset.fee * feeMultiplier
  const net = Math.max(0, proceeds - fee)
  const basisRemoved =
    position.units > 0 ? (position.basis * units) / position.units : 0
  const realized = net - basisRemoved

  const remainingUnits = position.units - units
  if (remainingUnits <= 0.000001) {
    delete state.positions[assetId]
  } else {
    state.positions[assetId] = {
      units: remainingUnits,
      basis: Math.max(0, position.basis - basisRemoved),
    }
  }

  state.bank += net
  state.stats.investmentEarnings += Math.round(realized)
  state.stats.assetTrades += 1
  addLog(
    state,
    realized >= 0 ? 'good' : 'bad',
    `Sold ${units.toFixed(4)} ${asset.ticker} for ${money(net)} net, ${money(realized)} profit.`,
  )
  sync(state)
}

export function reduce(state: GameState, action: GameAction): GameState {
  if (state.status !== 'playing') return state

  if (state.pendingEvent && action.type !== 'resolveEvent') return state

  const isActionValid = (() => {
    switch (action.type) {
      case 'buy':
      case 'sell':
      case 'pawn':
      case 'depositStash':
      case 'withdrawStash':
        return Number.isFinite(action.qty) && Math.floor(action.qty) > 0
      case 'hireCaretaker':
        return (
          typeof action.propertyId === 'string' &&
          Boolean(GROWABLE_BY_GOOD[action.good])
        )
      case 'fireCaretaker':
      case 'fireDealer':
      case 'fireRunner':
      case 'fireLabTech':
      case 'depositStashAll':
      case 'withdrawStashAll':
        return typeof action.propertyId === 'string'
      case 'hireRunner':
        return typeof action.propertyId === 'string'
      case 'cook':
        return (
          typeof action.propertyId === 'string' &&
          Boolean(RECIPE_BY_ID[action.recipe])
        )
      case 'hireLabTech':
        return (
          typeof action.propertyId === 'string' &&
          Boolean(RECIPE_BY_ID[action.recipe])
        )
      case 'hireDealer':
        return (
          typeof action.propertyId === 'string' &&
          Boolean(GOOD_BY_ID[action.good]) &&
          Number.isFinite(action.minPrice) &&
          Math.floor(action.minPrice) > 0
        )
      case 'setDealerPrice':
        return (
          typeof action.propertyId === 'string' &&
          Number.isFinite(action.minPrice) &&
          Math.floor(action.minPrice) > 0
        )
      case 'setWatch':
        return (
          Boolean(GOOD_BY_ID[action.good]) &&
          Boolean(LOCATION_BY_ID[action.location]) &&
          Number.isFinite(action.target) &&
          Math.floor(action.target) > 0 &&
          (action.direction === 'above' || action.direction === 'below')
        )
      case 'clearWatch':
        return (
          Boolean(GOOD_BY_ID[action.good]) &&
          Boolean(LOCATION_BY_ID[action.location])
        )
      case 'placeBuyOrder':
        return (
          Boolean(GOOD_BY_ID[action.good]) &&
          Boolean(LOCATION_BY_ID[action.location]) &&
          Number.isFinite(action.qty) &&
          Math.floor(action.qty) > 0 &&
          Number.isFinite(action.maxPrice) &&
          Math.floor(action.maxPrice) > 0
        )
      case 'cancelBuyOrder':
        return typeof action.id === 'string'
      case 'deposit':
      case 'withdraw':
      case 'borrow':
      case 'repay':
      case 'invest':
      case 'divest':
        return Number.isFinite(action.amount) && Math.floor(action.amount) > 0
      case 'harvest':
        return Number.isFinite(action.slot) && Math.floor(action.slot) >= 0
      default:
        return true
    }
  })()
  if (!isActionValid) return state

  const next = structuredClone(state)
  const rng = new Rng(next.rngState)

  switch (action.type) {
    case 'buy':
      applyBuy(next, action.good, action.qty)
      break
    case 'sell':
      applySell(next, action.good, action.qty)
      break
    case 'deposit':
      applyDeposit(next, action.amount)
      break
    case 'withdraw':
      applyWithdraw(next, action.amount)
      break
    case 'borrow':
      applyBorrow(next, action.amount)
      break
    case 'repay':
      applyRepay(next, action.amount)
      break
    case 'invest':
      applyInvest(next, action.asset, action.amount)
      break
    case 'divest':
      applyDivest(next, action.asset, action.amount)
      break
    case 'buyGun':
      applyBuyGun(next, action.gun)
      break
    case 'buyUpgrade':
      applyBuyUpgrade(next, action.upgrade)
      break
    case 'buyCar':
      applyBuyCar(next, action.car)
      break
    case 'dumpsterDive':
      applyDumpsterDive(next, rng)
      break
    case 'pawn':
      applyPawn(next, action.item, action.qty)
      break
    case 'buyProperty':
      applyBuyProperty(next, action.propertyType)
      break
    case 'depositStash':
      applyDepositStash(next, action.propertyId, action.good, action.qty)
      break
    case 'withdrawStash':
      applyWithdrawStash(next, action.propertyId, action.good, action.qty)
      break
    case 'plant':
      applyPlant(next, action.propertyId, action.good, rng)
      break
    case 'harvest':
      applyHarvest(next, action.propertyId, action.slot)
      break
    case 'hireCaretaker':
      applyHireCaretaker(next, action.propertyId, action.good)
      break
    case 'fireCaretaker':
      applyFireCaretaker(next, action.propertyId)
      break
    case 'hireDealer':
      applyHireDealer(next, action.propertyId, action.good, action.minPrice)
      break
    case 'setDealerPrice':
      applySetDealerPrice(next, action.propertyId, action.minPrice)
      break
    case 'fireDealer':
      applyFireDealer(next, action.propertyId)
      break
    case 'hireRunner':
      applyHireRunner(next, action.propertyId)
      break
    case 'fireRunner':
      applyFireRunner(next, action.propertyId)
      break
    case 'cook':
      applyCook(next, action.propertyId, action.recipe)
      break
    case 'hireLabTech':
      applyHireLabTech(next, action.propertyId, action.recipe)
      break
    case 'fireLabTech':
      applyFireLabTech(next, action.propertyId)
      break
    case 'depositStashAll':
      applyDepositStashAll(next, action.propertyId)
      break
    case 'withdrawStashAll':
      applyWithdrawStashAll(next, action.propertyId)
      break
    case 'setWatch':
      applySetWatch(
        next,
        action.good,
        action.location,
        action.target,
        action.direction,
      )
      break
    case 'clearWatch':
      applyClearWatch(next, action.good, action.location)
      break
    case 'placeBuyOrder':
      applyPlaceBuyOrder(
        next,
        action.good,
        action.location,
        action.qty,
        action.maxPrice,
      )
      break
    case 'cancelBuyOrder':
      applyCancelBuyOrder(next, action.id)
      break
    case 'travel': {
      if (action.location === next.location) return state
      const target = LOCATION_BY_ID[action.location]
      const origin = LOCATION_BY_ID[next.location]
      if (!target || !origin) return state
      if (target.kind === 'city' || origin.kind === 'city') return state
      if (next.car && next.boroughHopsLeft > 0) {
        next.boroughHopsLeft -= 1
        next.location = action.location
        addLog(
          next,
          'info',
          `You cut across town to ${target.name} — no day lost.`,
        )
        break
      }
      addLog(next, 'info', `You leave ${origin.name} for ${target.name}.`)
      advanceDays(next, rng, 1, { relocate: action.location })
      break
    }
    case 'drive': {
      if (action.location === next.location) return state
      const target = LOCATION_BY_ID[action.location]
      const origin = LOCATION_BY_ID[next.location]
      if (!target || !origin) return state
      const car = next.car ? CAR_BY_ID[next.car] : null
      if (!car) return state
      const days = travelDays(next, action.location)
      next.stats.roadTrips += 1
      addLog(
        next,
        'info',
        `You drive the ${car.name} from ${origin.name} to ${target.name} — ${days} day${days === 1 ? '' : 's'} on the road.`,
      )
      advanceDays(next, rng, days, { relocate: action.location })
      break
    }
    case 'layLow': {
      addLog(next, 'info', 'You lie low for a day and let the heat die down.')
      advanceDays(next, rng, 1, { layLow: true })
      break
    }
    case 'resolveEvent': {
      const event = next.pendingEvent
      if (!event) return state
      const option = event.options.find((item) => item.id === action.option)
      if (!option || option.disabled) return state
      const resolved = resolveEventChoice(next, event, action.option, rng)
      if (!resolved) return state
      next.pendingEvent = null
      sync(next)
      break
    }
    case 'retire': {
      if (next.debt > 0) return state
      if (netWorth(next) < DIFFICULTY_BY_ID[next.difficulty].goal) return state
      endGame(next, 'retired')
      break
    }
  }

  next.rngState = rng.getState()
  sync(next)
  return next
}

export function makePriceLabel(good: Good, market: MarketState): string {
  if (!market.modifier) return ''
  return `${market.modifier.label}: ${good.name} x${market.modifier.value.toFixed(2)}`
}
