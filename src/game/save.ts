import {
  ASSETS,
  GOOD_BY_ID,
  GOODS,
  GROWABLE_BY_GOOD,
  LOCATIONS,
  PAWN_ITEMS,
} from './data'
import { SAVE_VERSION } from './engine'
import { Rng } from './rng'
import type {
  BuyOrder,
  GameState,
  GoodId,
  PropertyState,
  WatchEntry,
} from './types'

const SAVE_KEY = 'dope-wars:save:v1'

function emptyPawnInventory(): GameState['pawnInventory'] {
  return Object.fromEntries(PAWN_ITEMS.map((item) => [item.id, 0])) as GameState['pawnInventory']
}

function emptyGoods(): GameState['inventory'] {
  return Object.fromEntries(GOODS.map((good) => [good.id, 0])) as GameState['inventory']
}

function mergeGoods(value: unknown): GameState['inventory'] {
  const merged = emptyGoods()
  if (!value || typeof value !== 'object') return merged
  const record = value as Record<string, unknown>
  for (const good of GOODS) {
    const amount = record[good.id]
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      merged[good.id] = amount
    }
  }
  return merged
}

function migrateV2(parsed: Record<string, unknown>): Record<string, unknown> {
  const stats =
    parsed.stats && typeof parsed.stats === 'object'
      ? (parsed.stats as Record<string, unknown>)
      : {}

  return {
    ...parsed,
    version: 3,
    start: 'standard',
    pawnInventory: emptyPawnInventory(),
    safeHouses: {},
    stats: {
      ...stats,
      dives: 0,
      itemsPawned: 0,
      pawnEarnings: 0,
      safeHousesBought: 0,
      harvests: 0,
      unitsGrown: 0,
    },
  }
}

function normalizeCaretaker(value: unknown): PropertyState['caretaker'] {
  if (!value || typeof value !== 'object') return null
  const crop = (value as Record<string, unknown>).crop
  if (typeof crop !== 'string' || !GROWABLE_BY_GOOD[crop as GoodId]) return null
  return { crop: crop as GoodId }
}

function migrateProperties(parsed: Record<string, unknown>): PropertyState[] {
  const source = parsed.properties
  if (Array.isArray(source)) {
    return source.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const property = entry as Record<string, unknown>
      const location = property.location
      const type = property.type
      if (typeof location !== 'string' || typeof type !== 'string') return []
      return [
        {
          id:
            typeof property.id === 'string'
              ? property.id
              : `${location}:${type}`,
          location: location as PropertyState['location'],
          type: type as PropertyState['type'],
          stored: mergeGoods(property.stored),
          storedBasis: mergeGoods(property.storedBasis),
          grows: Array.isArray(property.grows)
            ? (property.grows as PropertyState['grows'])
            : [],
          caretaker: normalizeCaretaker(property.caretaker),
          dealer: null,
        },
      ]
    })
  }

  const legacy =
    parsed.safeHouses && typeof parsed.safeHouses === 'object'
      ? (parsed.safeHouses as Record<string, Record<string, unknown>>)
      : {}
  return Object.entries(legacy).flatMap(([location, house]) => {
    if (!house || typeof house !== 'object') return []
    return [
      {
        id: `${location}:stash`,
        location: location as PropertyState['location'],
        type: 'stash' as const,
        stored: mergeGoods(house.stored),
        storedBasis: mergeGoods(house.storedBasis),
        grows: Array.isArray(house.grows)
          ? (house.grows as PropertyState['grows'])
          : [],
        caretaker: null,
        dealer: null,
      },
    ]
  })
}

function normalizeDealer(value: unknown): PropertyState['dealer'] {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const good = record.good
  const minPrice = record.minPrice
  if (typeof good !== 'string' || !GOOD_BY_ID[good as GoodId]) return null
  if (
    typeof minPrice !== 'number' ||
    !Number.isFinite(minPrice) ||
    minPrice <= 0
  ) {
    return null
  }
  return { good: good as GoodId, minPrice: Math.floor(minPrice) }
}

function normalizeWatchEntry(value: unknown): WatchEntry | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const good = record.good
  const location = record.location
  const target = record.target
  const direction = record.direction
  if (typeof good !== 'string' || !GOOD_BY_ID[good as GoodId]) return null
  if (
    typeof location !== 'string' ||
    !LOCATIONS.some((entry) => entry.id === location)
  ) {
    return null
  }
  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) {
    return null
  }
  if (direction !== 'above' && direction !== 'below') return null
  return {
    good: good as GoodId,
    location: location as WatchEntry['location'],
    target: Math.floor(target),
    direction,
    armed: record.armed !== false,
  }
}

function normalizeBuyOrder(value: unknown): BuyOrder | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const good = record.good
  const location = record.location
  const qty = record.qty
  const maxPrice = record.maxPrice
  const remaining = record.remaining
  if (typeof good !== 'string' || !GOOD_BY_ID[good as GoodId]) return null
  if (
    typeof location !== 'string' ||
    !LOCATIONS.some((entry) => entry.id === location)
  ) {
    return null
  }
  if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) return null
  if (
    typeof maxPrice !== 'number' ||
    !Number.isFinite(maxPrice) ||
    maxPrice <= 0
  ) {
    return null
  }
  const total = Math.floor(qty)
  const left =
    typeof remaining === 'number' && Number.isFinite(remaining)
      ? Math.min(Math.floor(remaining), total)
      : total
  if (left <= 0) return null
  return {
    id: `${location}:${good}`,
    location: location as BuyOrder['location'],
    good: good as GoodId,
    qty: total,
    maxPrice: Math.floor(maxPrice),
    remaining: left,
  }
}

function normalizePropertiesV6(parsed: Record<string, unknown>): PropertyState[] {
  const source = parsed.properties
  if (!Array.isArray(source)) return []
  return source.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const property = entry as Record<string, unknown>
    const location = property.location
    const type = property.type
    if (typeof location !== 'string' || typeof type !== 'string') return []
    return [
      {
        id:
          typeof property.id === 'string'
            ? property.id
            : `${location}:${type}`,
        location: location as PropertyState['location'],
        type: type as PropertyState['type'],
        stored: mergeGoods(property.stored),
        storedBasis: mergeGoods(property.storedBasis),
        grows: Array.isArray(property.grows)
          ? (property.grows as PropertyState['grows'])
          : [],
        caretaker: normalizeCaretaker(property.caretaker),
        dealer: normalizeDealer(property.dealer),
      },
    ]
  })
}

function migrateMarkets(
  parsed: Record<string, unknown>,
  rng: Rng,
): GameState['markets'] {
  const existing =
    parsed.markets && typeof parsed.markets === 'object'
      ? (parsed.markets as Record<string, Record<string, Record<string, unknown>>>)
      : {}
  const markets = {} as GameState['markets']

  for (const location of LOCATIONS) {
    const row = {} as GameState['markets'][typeof location.id]
    for (const good of GOODS) {
      const current = existing[location.id]?.[good.id]
      if (current && typeof current.price === 'number') {
        const history = Array.isArray(current.history)
          ? current.history.filter(
              (value): value is number =>
                typeof value === 'number' && Number.isFinite(value),
            )
          : []
        const price = Math.max(1, Math.round(current.price))
        row[good.id] = {
          base:
            typeof current.base === 'number'
              ? Math.max(1, Math.round(current.base))
              : price,
          price,
          prev:
            typeof current.prev === 'number'
              ? Math.max(1, Math.round(current.prev))
              : price,
          history: history.length > 0 ? history : [price],
          modifier:
            current.modifier && typeof current.modifier === 'object'
              ? (current.modifier as GameState['markets'][typeof location.id][typeof good.id]['modifier'])
              : null,
        }
      } else {
        const low = good.min * location.mods[good.id]
        const high = good.max * location.mods[good.id]
        const history = Array.from({ length: 6 }, () =>
          Math.round(rng.range(low, high)),
        )
        const price = history[history.length - 1]
        row[good.id] = {
          base: price,
          price,
          prev: history[history.length - 2] ?? price,
          history,
          modifier: null,
        }
      }
    }
    markets[location.id] = row
  }

  return markets
}

function migrateAssets(
  parsed: Record<string, unknown>,
  rng: Rng,
): GameState['assetMarkets'] {
  const existing =
    parsed.assetMarkets && typeof parsed.assetMarkets === 'object'
      ? (parsed.assetMarkets as Record<string, Record<string, unknown>>)
      : {}
  const markets = {} as GameState['assetMarkets']

  for (const asset of ASSETS) {
    const current = existing[asset.id]
    if (current && typeof current.price === 'number') {
      const history = Array.isArray(current.history)
        ? current.history.filter(
            (value): value is number =>
              typeof value === 'number' && Number.isFinite(value),
          )
        : []
      const price = Math.max(0.01, Math.round(current.price * 100) / 100)
      markets[asset.id] = {
        price,
        prev:
          typeof current.prev === 'number'
            ? Math.max(0.01, Math.round(current.prev * 100) / 100)
            : price,
        history: history.length > 0 ? history : [price],
        anchor:
          typeof current.anchor === 'number' && Number.isFinite(current.anchor)
            ? Math.max(0.01, Math.round(current.anchor * 100) / 100)
            : price,
      }
    } else {
      const history = Array.from(
        { length: 14 },
        () => Math.round(rng.range(asset.min, asset.max) * 100) / 100,
      )
      const price = history[history.length - 1]
      markets[asset.id] = {
        price,
        prev: history[history.length - 2] ?? price,
        history,
        anchor: price,
      }
    }
  }

  return markets
}

function migrateV3(parsed: Record<string, unknown>): Record<string, unknown> {
  const stats =
    parsed.stats && typeof parsed.stats === 'object'
      ? (parsed.stats as Record<string, unknown>)
      : {}
  const seed =
    typeof parsed.seed === 'number' && Number.isFinite(parsed.seed)
      ? parsed.seed
      : 1
  const rng = new Rng(seed)
  const positions =
    parsed.positions && typeof parsed.positions === 'object'
      ? parsed.positions
      : {}

  const migrated = {
    ...parsed,
    version: 4,
    character: parsed.character ?? null,
    inventory: mergeGoods(parsed.inventory),
    basis: mergeGoods(parsed.basis),
    pawnInventory: emptyPawnInventory(),
    properties: migrateProperties(parsed),
    markets: migrateMarkets(parsed, rng),
    assetMarkets: migrateAssets(parsed, rng),
    positions,
    stats: {
      ...stats,
      propertiesBought:
        stats.propertiesBought ?? stats.safeHousesBought ?? 0,
      wagesPaid: stats.wagesPaid ?? 0,
      dealerSales: stats.dealerSales ?? 0,
      dealerUnits: stats.dealerUnits ?? 0,
      dealerRevenue: stats.dealerRevenue ?? 0,
      dealerFees: stats.dealerFees ?? 0,
      invested: stats.invested ?? 0,
      investmentEarnings: stats.investmentEarnings ?? 0,
      assetTrades: stats.assetTrades ?? 0,
    },
  }

  if (parsed.pawnInventory && typeof parsed.pawnInventory === 'object') {
    migrated.pawnInventory = {
      ...emptyPawnInventory(),
      ...(parsed.pawnInventory as GameState['pawnInventory']),
    }
  }

  return migrated
}

function migrateV4(parsed: Record<string, unknown>): Record<string, unknown> {
  const stats =
    parsed.stats && typeof parsed.stats === 'object'
      ? (parsed.stats as Record<string, unknown>)
      : {}

  return {
    ...parsed,
    version: 5,
    properties: migrateProperties(parsed),
    stats: {
      ...stats,
      wagesPaid: stats.wagesPaid ?? 0,
      dealerSales: stats.dealerSales ?? 0,
      dealerUnits: stats.dealerUnits ?? 0,
      dealerRevenue: stats.dealerRevenue ?? 0,
      dealerFees: stats.dealerFees ?? 0,
    },
  }
}

function migrateV5(parsed: Record<string, unknown>): Record<string, unknown> {
  const stats =
    parsed.stats && typeof parsed.stats === 'object'
      ? (parsed.stats as Record<string, unknown>)
      : {}
  const seed =
    typeof parsed.seed === 'number' && Number.isFinite(parsed.seed)
      ? parsed.seed
      : 1

  const watchlist = Array.isArray(parsed.watchlist)
    ? parsed.watchlist.flatMap((entry) => {
        const normalized = normalizeWatchEntry(entry)
        return normalized ? [normalized] : []
      })
    : []
  const buyOrders = Array.isArray(parsed.buyOrders)
    ? parsed.buyOrders.flatMap((entry) => {
        const normalized = normalizeBuyOrder(entry)
        return normalized ? [normalized] : []
      })
    : []

  return {
    ...parsed,
    version: SAVE_VERSION,
    properties: normalizePropertiesV6(parsed),
    assetMarkets: migrateAssets(parsed, new Rng(seed)),
    watchlist,
    buyOrders,
    stats: {
      ...stats,
      wagesPaid: stats.wagesPaid ?? 0,
      dealerSales: stats.dealerSales ?? 0,
      dealerUnits: stats.dealerUnits ?? 0,
      dealerRevenue: stats.dealerRevenue ?? 0,
      dealerFees: stats.dealerFees ?? 0,
    },
  }
}

export function serializeGame(state: GameState): string {
  return JSON.stringify(state)
}

export function deserializeGame(raw: string | null): GameState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') return null

    let candidate: Record<string, unknown> = parsed
    if (candidate.version === 2) candidate = migrateV2(candidate)
    if (candidate.version === 3) candidate = migrateV3(candidate)
    if (candidate.version === 4) candidate = migrateV4(candidate)
    if (candidate.version === 5) candidate = migrateV5(candidate)
    if (candidate.version !== SAVE_VERSION) return null

    if (!candidate.markets || !candidate.inventory || !candidate.stats) return null
    if (!candidate.pawnInventory || !candidate.properties) return null
    if (!candidate.assetMarkets || !candidate.positions) return null
    if (!candidate.watchlist || !candidate.buyOrders) return null
    if (candidate.start !== 'standard' && candidate.start !== 'zero') return null
    if (typeof candidate.day !== 'number' || typeof candidate.cash !== 'number') {
      return null
    }
    if (
      candidate.status !== 'playing' &&
      candidate.status !== 'won' &&
      candidate.status !== 'lost'
    ) {
      return null
    }
    return candidate as unknown as GameState
  } catch {
    return null
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeGame(state))
  } catch {
    // Storage can be unavailable in private mode; the run still works in memory.
  }
}

export function loadGame(): GameState | null {
  try {
    return deserializeGame(localStorage.getItem(SAVE_KEY))
  } catch {
    return null
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null
  } catch {
    return false
  }
}
