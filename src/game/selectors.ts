import {
  ASSET_BY_ID,
  BANK_RATE,
  CAR_BY_ID,
  CARETAKER_WAGE_PER_SLOT,
  CHARACTER_BY_ID,
  DIFFICULTY_BY_ID,
  GOODS,
  LOCATION_BY_ID,
  PAWN_ITEM_BY_ID,
  UPGRADE_BY_ID,
  getPropertyConfig,
} from './data'
import type {
  AssetId,
  AssetPosition,
  CharacterClass,
  GameState,
  GoodId,
  GrowPlot,
  LocationId,
  MarketState,
  PawnItemId,
  PropertyConfig,
  PropertyState,
  PropertyTypeId,
  UpgradeId,
} from './types'

export function marketAt(
  state: GameState,
  location: LocationId,
  good: GoodId,
): MarketState {
  return state.markets[location][good]
}

export function priceAt(
  state: GameState,
  location: LocationId,
  good: GoodId,
): number {
  return marketAt(state, location, good).price
}

export function inventoryCount(state: GameState): number {
  return GOODS.reduce((sum, good) => sum + state.inventory[good.id], 0)
}

export function characterOf(state: GameState): CharacterClass | null {
  return state.character ? CHARACTER_BY_ID[state.character] : null
}

export function isUpgradeActive(
  state: GameState,
  upgradeId: UpgradeId,
): boolean {
  const upgrade = UPGRADE_BY_ID[upgradeId]
  if (!upgrade) return false
  if (!upgrade.carRequirement) return true
  if (!state.car) return false
  if (upgrade.carRequirement === 'any') return true
  return state.car === upgrade.carRequirement
}

export interface CapacityBreakdown {
  base: number
  classBonus: number
  gear: number
  car: number
  total: number
}

export function capacityBreakdown(state: GameState): CapacityBreakdown {
  const base = DIFFICULTY_BY_ID[state.difficulty].capacity
  const classBonus = characterOf(state)?.capacityBonus ?? 0
  const gear = state.upgrades.reduce((sum, upgradeId) => {
    if (!isUpgradeActive(state, upgradeId)) return sum
    return sum + (UPGRADE_BY_ID[upgradeId].capacity ?? 0)
  }, 0)
  const car = state.car ? (CAR_BY_ID[state.car].capacity ?? 0) : 0
  return {
    base,
    classBonus,
    gear,
    car,
    total: base + classBonus + gear + car,
  }
}

export function capacity(state: GameState): number {
  return capacityBreakdown(state).total
}

export function travelDays(state: GameState, target: LocationId): number {
  const from = LOCATION_BY_ID[state.location]
  const to = LOCATION_BY_ID[target]
  if (!from || !to) return 1
  if (from.kind === 'borough' && to.kind === 'borough') return 1
  if (from.id === to.id) return 1
  const base = from.distance + to.distance
  const factor = state.car ? CAR_BY_ID[state.car].timeFactor : 1
  return Math.max(1, Math.ceil(base * factor))
}

export function capacityLeft(state: GameState): number {
  return Math.max(0, capacity(state) - inventoryCount(state))
}

export function inventoryValue(state: GameState): number {
  return GOODS.reduce(
    (sum, good) =>
      sum + state.inventory[good.id] * priceAt(state, state.location, good.id),
    0,
  )
}

export function pawnInventoryValue(state: GameState): number {
  return Object.entries(state.pawnInventory).reduce(
    (sum, [id, count]) => sum + PAWN_ITEM_BY_ID[id as PawnItemId].value * count,
    0,
  )
}

export function propertiesAt(
  state: GameState,
  location: LocationId = state.location,
): PropertyState[] {
  return state.properties.filter((property) => property.location === location)
}

export function propertyById(
  state: GameState,
  propertyId: string,
): PropertyState | undefined {
  return state.properties.find((property) => property.id === propertyId)
}

export function propertyConfig(property: PropertyState): PropertyConfig {
  return getPropertyConfig(property.location, property.type)
}

export function hasPropertyType(
  state: GameState,
  location: LocationId,
  type: PropertyTypeId,
): boolean {
  return state.properties.some(
    (property) => property.location === location && property.type === type,
  )
}

export function storedCount(property: PropertyState): number {
  return GOODS.reduce((sum, good) => sum + property.stored[good.id], 0)
}

export function storageLeft(property: PropertyState): number {
  return Math.max(0, propertyConfig(property).storage - storedCount(property))
}

export function caretakerWage(property: PropertyState): number {
  if (!property.caretaker) return 0
  return propertyConfig(property).growSlots * CARETAKER_WAGE_PER_SLOT
}

export function storedInventoryValue(state: GameState): number {
  return state.properties.reduce(
    (total, property) =>
      total +
      GOODS.reduce(
        (sum, good) =>
          sum +
          property.stored[good.id] *
            priceAt(state, property.location, good.id),
        0,
      ),
    0,
  )
}

export function growPlotReady(plot: GrowPlot, day: number): boolean {
  return day >= plot.readyDay
}

export function assetPriceAt(state: GameState, asset: AssetId): number {
  return state.assetMarkets[asset].price
}

export function positionAt(
  state: GameState,
  asset: AssetId,
): AssetPosition | undefined {
  return state.positions[asset]
}

export function positionValue(state: GameState, asset: AssetId): number {
  const position = positionAt(state, asset)
  if (!position) return 0
  return position.units * assetPriceAt(state, asset)
}

export function portfolioValue(state: GameState): number {
  return Object.keys(ASSET_BY_ID).reduce(
    (sum, id) => sum + positionValue(state, id as AssetId),
    0,
  )
}

export function portfolioBasis(state: GameState): number {
  return Object.values(state.positions).reduce(
    (sum, position) => sum + (position?.basis ?? 0),
    0,
  )
}

export function portfolioProfit(state: GameState): number {
  return portfolioValue(state) - portfolioBasis(state)
}

export function bankRate(state: GameState): number {
  return BANK_RATE + (characterOf(state)?.bankRateBonus ?? 0)
}

export function netWorth(state: GameState): number {
  return (
    state.cash +
    state.bank +
    inventoryValue(state) +
    storedInventoryValue(state) +
    pawnInventoryValue(state) +
    portfolioValue(state) -
    state.debt
  )
}

export function canRetire(state: GameState): boolean {
  return (
    state.status === 'playing' &&
    state.debt === 0 &&
    state.day >= 1 &&
    netWorth(state) >= DIFFICULTY_BY_ID[state.difficulty].goal
  )
}

export function canBorrow(state: GameState): boolean {
  return state.start !== 'zero'
}

export function goal(state: GameState): number {
  return DIFFICULTY_BY_ID[state.difficulty].goal
}

export function maxBuy(
  state: GameState,
  good: GoodId,
  location: LocationId = state.location,
): number {
  const price = Math.max(1, priceAt(state, location, good))
  return Math.max(
    0,
    Math.min(capacityLeft(state), Math.floor(state.cash / price)),
  )
}

export function rankForNetWorth(value: number): {
  label: string
  description: string
} {
  if (value < 0) {
    return { label: 'In the red', description: 'The city ate you alive.' }
  }
  if (value < 10_000) {
    return { label: 'Corner boy', description: 'Small money, long nights.' }
  }
  if (value < 100_000) {
    return { label: 'Hustler', description: 'You have a name on the block.' }
  }
  if (value < 500_000) {
    return { label: 'Operator', description: 'People answer when you call.' }
  }
  if (value < 1_000_000) {
    return { label: 'Kingpin', description: 'The whole borough knows you.' }
  }
  return { label: 'Millionaire', description: 'You made it out.' }
}
