export const GOOD_IDS = [
  'ludes',
  'cigarettes',
  'speed',
  'hash',
  'weed',
  'shrooms',
  'benzos',
  'acid',
  'ketamine',
  'meth',
  'heroin',
  'cocaine',
] as const
export type GoodId = (typeof GOOD_IDS)[number]

export const LOCATION_IDS = [
  'bronx',
  'harlem',
  'queens',
  'brooklyn',
  'coney',
  'gowanus',
  'manhattan',
  'staten',
  'newark',
  'philly',
  'boston',
  'chicago',
  'miami',
  'vegas',
] as const
export type LocationId = (typeof LOCATION_IDS)[number]

export const DIFFICULTY_IDS = ['easy', 'normal', 'hard'] as const
export type Difficulty = (typeof DIFFICULTY_IDS)[number]

export const GAME_MODES = ['classic', 'endless'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const START_MODES = ['standard', 'zero'] as const
export type StartMode = (typeof START_MODES)[number]

export const PAWN_ITEM_IDS = [
  'copper',
  'radio',
  'vcr',
  'bicycle',
  'lamp',
  'drill',
  'clubs',
  'silver',
  'watch',
  'coat',
] as const
export type PawnItemId = (typeof PAWN_ITEM_IDS)[number]

export const CAR_IDS = ['beater', 'coupe', 'van', 'sports'] as const
export type CarId = (typeof CAR_IDS)[number]

export const GUN_IDS = [
  'switchblade',
  'revolver',
  'magnum',
  'shotgun',
  'machine_pistol',
] as const
export type GunId = (typeof GUN_IDS)[number]

export const UPGRADE_IDS = [
  'backpack',
  'duffel',
  'trunk',
  'roofrack',
  'cargocage',
  'vest',
  'burner',
] as const
export type UpgradeId = (typeof UPGRADE_IDS)[number]

export const PROPERTY_TYPE_IDS = [
  'crashpad',
  'stash',
  'growhouse',
  'warehouse',
  'lab',
] as const
export type PropertyTypeId = (typeof PROPERTY_TYPE_IDS)[number]

export const CHARACTER_IDS = [
  'dropout',
  'prisoner',
  'trust_fund',
  'chemist',
  'ex_cop',
] as const
export type CharacterClassId = (typeof CHARACTER_IDS)[number]

export const ASSET_IDS = [
  'vltn',
  'nxus',
  'rdx',
  'kore',
  'brx',
  'dope',
  'ghst',
  'znet',
] as const
export type AssetId = (typeof ASSET_IDS)[number]

export type AssetKind = 'stock' | 'crypto'

export type EventKind =
  | 'police'
  | 'mugging'
  | 'shark'
  | 'raid'
  | 'boom'
  | 'crash'
  | 'stash'
  | 'cash'
  | 'rival'
  | 'heat'
  | 'quiet'

export type Tone = 'neutral' | 'good' | 'bad' | 'info'

export type GameStatus = 'playing' | 'won' | 'lost'

export type Ending = 'retired' | 'millionaire' | 'time' | 'debt'

export type AchievementId =
  | 'first_trade'
  | 'bank_10k'
  | 'debt_free'
  | 'hustler'
  | 'operator'
  | 'kingpin'
  | 'millionaire'
  | 'big_deal'
  | 'magnum'
  | 'clean_getaway'
  | 'survivor'
  | 'wheels'
  | 'road_trip'
  | 'long_haul'
  | 'dumpster_diver'
  | 'cash_for_trash'
  | 'home_owner'
  | 'green_thumb'
  | 'from_nothing'
  | 'first_investment'
  | 'portfolio_100k'
  | 'warehouse_owner'
  | 'property_tycoon'

export type LocationKind = 'borough' | 'city'

export interface Car {
  id: CarId
  name: string
  cost: number
  timeFactor: number
  blurb: string
  capacity?: number
  boroughHops: number
}

export type RecipeId = 'meth' | 'ketamine'

export interface Recipe {
  id: RecipeId
  name: string
  input: GoodId
  inputQty: number
  output: GoodId
  outputQty: number
  days: number
  heat: number
  risk: number
  blurb: string
}

export interface Good {
  id: GoodId
  name: string
  min: number
  max: number
  tier: number
  blurb: string
}

export interface PawnItem {
  id: PawnItemId
  name: string
  value: number
  weight: number
  blurb: string
}

export interface Growable {
  good: GoodId
  label: string
  seedCost: number
  days: number
  minYield: number
  maxYield: number
  blurb: string
}

export interface SafeHouseConfig {
  location: LocationId
  name: string
  cost: number
  storage: number
  growSlots: number
  blurb: string
}

export interface PropertyTypeConfig {
  id: PropertyTypeId
  name: string
  costMultiplier: number
  storageMultiplier: number
  growSlots: number | null
  cookSlots: number
  blurb: string
}

export interface PropertyConfig {
  location: LocationId
  type: PropertyTypeId
  name: string
  cost: number
  storage: number
  growSlots: number
  cookSlots: number
  blurb: string
}

export interface GrowPlot {
  good: GoodId
  plantedDay: number
  readyDay: number
  yield: number
  seedCost: number
}

export interface CookPlot {
  recipe: RecipeId
  startedDay: number
  readyDay: number
  inputBasis: number
}

export interface CaretakerState {
  crop: GoodId
}

export interface DealerState {
  good: GoodId
  minPrice: number
}

export interface PropertyState {
  id: string
  location: LocationId
  type: PropertyTypeId
  stored: Record<GoodId, number>
  storedBasis: Record<GoodId, number>
  grows: GrowPlot[]
  caretaker: CaretakerState | null
  dealer: DealerState | null
  runner: boolean
  cooks: CookPlot[]
  labTech: RecipeId | null
}

export interface WatchEntry {
  good: GoodId
  location: LocationId
  target: number
  direction: 'above' | 'below'
  armed: boolean
}

export interface BuyOrder {
  id: string
  location: LocationId
  good: GoodId
  qty: number
  maxPrice: number
  remaining: number
}

export interface Location {
  id: LocationId
  name: string
  region: string
  blurb: string
  knownFor: string
  kind: LocationKind
  distance: number
  mods: Record<GoodId, number>
}

export interface DifficultyConfig {
  id: Difficulty
  label: string
  tagline: string
  startCash: number
  debt: number
  maxDays: number
  interest: number
  capacity: number
  heatMultiplier: number
  eventChance: number
  goal: number
}

export interface Gun {
  id: GunId
  name: string
  cost: number
  defense: number
  risk: number
  blurb: string
}

export interface Upgrade {
  id: UpgradeId
  name: string
  cost: number
  blurb: string
  requires?: UpgradeId
  carRequirement?: 'any' | CarId
  capacity?: number
}

export interface Achievement {
  id: AchievementId
  name: string
  description: string
}

export interface CharacterClass {
  id: CharacterClassId
  name: string
  tagline: string
  description: string
  capacityBonus: number
  defenseBonus: number
  heatMultiplier: number
  bribeMultiplier: number
  bankRateBonus: number
  growYieldMultiplier: number
  seedCostMultiplier: number
  brokerFeeMultiplier: number
  cookBonus: number
  dumpsterMin: number
  startBank: number
  startGun: GunId | null
}

export interface Asset {
  id: AssetId
  ticker: string
  name: string
  kind: AssetKind
  min: number
  max: number
  volatility: number
  drift: number
  fee: number
  blurb: string
}

export interface PriceModifier {
  value: number
  days: number
  label: string
}

export interface MarketState {
  base: number
  price: number
  prev: number
  history: number[]
  modifier: PriceModifier | null
}

export interface AssetMarketState {
  price: number
  prev: number
  history: number[]
  anchor: number
}

export interface AssetPosition {
  units: number
  basis: number
}

export interface LogEntry {
  id: number
  day: number
  tone: Tone
  text: string
}

export interface Stats {
  trades: number
  unitsBought: number
  unitsSold: number
  spent: number
  earned: number
  realizedProfit: number
  bestSale: number
  policeEncounters: number
  timesMugged: number
  cleanEscapes: number
  bestNetWorth: number
  roadTrips: number
  dives: number
  itemsPawned: number
  pawnEarnings: number
  propertiesBought: number
  harvests: number
  unitsGrown: number
  wagesPaid: number
  dealerSales: number
  dealerUnits: number
  dealerRevenue: number
  dealerFees: number
  cooks: number
  unitsCooked: number
  invested: number
  investmentEarnings: number
  assetTrades: number
}

export interface EventOption {
  id: string
  label: string
  hint?: string
  tone?: 'primary' | 'danger' | 'neutral'
  disabled?: boolean
}

export interface EventData {
  bribeCost?: number
  fine?: number
  demand?: number
  good?: GoodId
  value?: number
  days?: number
  qty?: number
  amount?: number
}

export interface PendingEvent {
  id: string
  kind: EventKind
  title: string
  body: string
  options: EventOption[]
  data: EventData
}

export interface GameState {
  version: number
  seed: number
  rngState: number
  eventSeq: number
  logSeq: number
  difficulty: Difficulty
  mode: GameMode
  start: StartMode
  character: CharacterClassId | null
  day: number
  maxDays: number
  status: GameStatus
  ending: Ending | null
  location: LocationId
  cash: number
  bank: number
  debt: number
  inventory: Record<GoodId, number>
  basis: Record<GoodId, number>
  pawnInventory: Record<PawnItemId, number>
  properties: PropertyState[]
  gun: GunId | null
  car: CarId | null
  upgrades: UpgradeId[]
  heat: number
  markets: Record<LocationId, Record<GoodId, MarketState>>
  assetMarkets: Record<AssetId, AssetMarketState>
  positions: Partial<Record<AssetId, AssetPosition>>
  log: LogEntry[]
  pendingEvent: PendingEvent | null
  watchlist: WatchEntry[]
  buyOrders: BuyOrder[]
  boroughHopsLeft: number
  achievements: AchievementId[]
  stats: Stats
}

export type GameAction =
  | { type: 'travel'; location: LocationId }
  | { type: 'drive'; location: LocationId }
  | { type: 'layLow' }
  | { type: 'buy'; good: GoodId; qty: number }
  | { type: 'sell'; good: GoodId; qty: number }
  | { type: 'deposit'; amount: number }
  | { type: 'withdraw'; amount: number }
  | { type: 'borrow'; amount: number }
  | { type: 'repay'; amount: number }
  | { type: 'invest'; asset: AssetId; amount: number }
  | { type: 'divest'; asset: AssetId; amount: number }
  | { type: 'buyGun'; gun: GunId }
  | { type: 'buyCar'; car: CarId }
  | { type: 'buyUpgrade'; upgrade: UpgradeId }
  | { type: 'dumpsterDive' }
  | { type: 'pawn'; item: PawnItemId; qty: number }
  | { type: 'buyProperty'; propertyType: PropertyTypeId }
  | { type: 'depositStash'; propertyId: string; good: GoodId; qty: number }
  | { type: 'withdrawStash'; propertyId: string; good: GoodId; qty: number }
  | { type: 'plant'; propertyId: string; good: GoodId }
  | { type: 'harvest'; propertyId: string; slot: number }
  | { type: 'hireCaretaker'; propertyId: string; good: GoodId }
  | { type: 'fireCaretaker'; propertyId: string }
  | { type: 'hireDealer'; propertyId: string; good: GoodId; minPrice: number }
  | { type: 'setDealerPrice'; propertyId: string; minPrice: number }
  | { type: 'fireDealer'; propertyId: string }
  | { type: 'depositStashAll'; propertyId: string }
  | { type: 'withdrawStashAll'; propertyId: string }
  | { type: 'hireRunner'; propertyId: string }
  | { type: 'fireRunner'; propertyId: string }
  | { type: 'cook'; propertyId: string; recipe: RecipeId }
  | { type: 'hireLabTech'; propertyId: string; recipe: RecipeId }
  | { type: 'fireLabTech'; propertyId: string }
  | {
      type: 'setWatch'
      good: GoodId
      location: LocationId
      target: number
      direction: 'above' | 'below'
    }
  | { type: 'clearWatch'; good: GoodId; location: LocationId }
  | {
      type: 'placeBuyOrder'
      good: GoodId
      location: LocationId
      qty: number
      maxPrice: number
    }
  | { type: 'cancelBuyOrder'; id: string }
  | { type: 'resolveEvent'; option: string }
  | { type: 'retire' }
