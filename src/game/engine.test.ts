import { describe, expect, it } from 'vitest'
import {
  DEALER_COMMISSION,
  DEALER_HIRE_COST,
  DIFFICULTIES,
  ENDLESS_DEBT_LIMIT,
  GOODS,
  LOCATIONS,
  RUNNER_WAGE,
} from './data'
import { createGame, reduce, SAVE_VERSION, tickGame } from './engine'
import { deserializeGame, serializeGame } from './save'
import { bankRate, capacity, netWorth, priceAt } from './selectors'
import type { GameState } from './types'

function stableGame(seed = 42): GameState {
  return createGame('normal', seed)
}

describe('createGame', () => {
  it('sets up the classic normal run', () => {
    const state = createGame('normal', 1)
    expect(state.day).toBe(1)
    expect(state.maxDays).toBe(30)
    expect(state.cash).toBe(2000)
    expect(state.debt).toBe(5500)
    expect(state.location).toBe('bronx')
    expect(state.status).toBe('playing')
    expect(capacity(state)).toBe(100)
    expect(GOODS.every((good) => state.inventory[good.id] === 0)).toBe(true)
  })

  it('creates a market for every location and good', () => {
    const state = createGame('normal', 7)
    for (const location of LOCATIONS) {
      for (const good of GOODS) {
        const market = state.markets[location.id][good.id]
        expect(market.price).toBeGreaterThan(0)
        expect(market.history.length).toBeGreaterThan(0)
      }
    }
  })

  it('is deterministic for a seed', () => {
    expect(createGame('normal', 1234)).toEqual(createGame('normal', 1234))
  })

  it('applies difficulty settings', () => {
    for (const config of DIFFICULTIES) {
      const state = createGame(config.id, 1)
      expect(state.cash).toBe(config.startCash)
      expect(state.debt).toBe(config.debt)
      expect(state.maxDays).toBe(config.maxDays)
      expect(capacity(state)).toBe(config.capacity)
    }
  })
})

describe('trading', () => {
  it('buys goods and tracks basis, cash, and stats', () => {
    const state = stableGame()
    const price = priceAt(state, 'bronx', 'ludes')
    const next = reduce(state, { type: 'buy', good: 'ludes', qty: 10 })

    expect(next.inventory.ludes).toBe(10)
    expect(next.cash).toBe(state.cash - price * 10)
    expect(next.basis.ludes).toBe(price * 10)
    expect(next.stats.trades).toBe(1)
    expect(next.stats.unitsBought).toBe(10)
    expect(next.achievements).toContain('first_trade')
  })

  it('refuses buys that exceed available cash', () => {
    const state = stableGame()
    const qty = Math.floor(state.cash / priceAt(state, 'bronx', 'ludes')) + 1
    const next = reduce(state, { type: 'buy', good: 'ludes', qty })
    expect(next.inventory.ludes).toBe(0)
    expect(next.cash).toBe(state.cash)
  })

  it('refuses buys beyond capacity', () => {
    const state = stableGame()
    state.cash = 1_000_000
    const next = reduce(state, {
      type: 'buy',
      good: 'ludes',
      qty: capacity(state) + 1,
    })
    expect(next.inventory.ludes).toBe(0)
  })

  it('sells goods for a profit and clears basis', () => {
    const state = stableGame()
    const bought = reduce(state, { type: 'buy', good: 'ludes', qty: 10 })
    const salePrice = priceAt(bought, bought.location, 'ludes')
    const sold = reduce(bought, { type: 'sell', good: 'ludes', qty: 10 })

    expect(sold.inventory.ludes).toBe(0)
    expect(sold.basis.ludes).toBe(0)
    expect(sold.cash).toBe(bought.cash + salePrice * 10)
    expect(sold.stats.trades).toBe(2)
    expect(sold.stats.bestSale).toBe(salePrice * 10)
  })

  it('refuses to sell more than is owned', () => {
    const state = stableGame()
    const bought = reduce(state, { type: 'buy', good: 'ludes', qty: 5 })
    const sold = reduce(bought, { type: 'sell', good: 'ludes', qty: 6 })
    expect(sold.inventory.ludes).toBe(5)
  })
})

describe('money', () => {
  it('deposits and withdraws safely', () => {
    const state = stableGame()
    state.cash = 1000
    const deposited = reduce(state, { type: 'deposit', amount: 400 })
    expect(deposited.cash).toBe(600)
    expect(deposited.bank).toBe(400)

    const withdrawn = reduce(deposited, { type: 'withdraw', amount: 250 })
    expect(withdrawn.cash).toBe(850)
    expect(withdrawn.bank).toBe(150)
  })

  it('borrows and repays within the loan cap', () => {
    const state = stableGame()
    const borrowed = reduce(state, { type: 'borrow', amount: 1000 })
    expect(borrowed.cash).toBe(state.cash + 1000)
    expect(borrowed.debt).toBe(state.debt + 1000)

    const overBorrowed = reduce(borrowed, { type: 'borrow', amount: 20_000 })
    expect(overBorrowed.debt).toBe(borrowed.debt)

    const repaid = reduce(borrowed, { type: 'repay', amount: 1000 })
    expect(repaid.cash).toBe(borrowed.cash - 1000)
    expect(repaid.debt).toBe(state.debt)
  })

  it('charges debt interest and pays bank interest each day', () => {
    const state = stableGame()
    state.bank = 1000
    state.debt = 5000
    const next = reduce(state, { type: 'travel', location: 'manhattan' })

    expect(next.day).toBe(2)
    expect(next.location).toBe('manhattan')
    expect(next.bank).toBeGreaterThanOrEqual(1010)
    expect(next.debt).toBeGreaterThanOrEqual(5500)
  })
})

describe('travel and time', () => {
  it('advances the day and cools heat when lying low', () => {
    const state = stableGame()
    state.heat = 50
    const next = reduce(state, { type: 'layLow' })
    expect(next.day).toBe(2)
    expect(next.heat).toBeLessThanOrEqual(45)
  })

  it('does not travel to the same location', () => {
    const state = stableGame()
    expect(reduce(state, { type: 'travel', location: 'bronx' })).toBe(state)
  })
})

describe('modes', () => {
  it('creates a classic run by default', () => {
    const state = createGame('normal', 11)
    expect(state.mode).toBe('classic')
  })

  it('has no final bell in an endless run', () => {
    const state = createGame('normal', 11, 'endless')
    expect(state.mode).toBe('endless')
    state.day = 400
    state.debt = 0
    const next = reduce(state, { type: 'layLow' })
    expect(next.status).toBe('playing')
    expect(next.day).toBe(401)
  })

  it('ends an endless run when the debt runs away', () => {
    const state = createGame('normal', 11, 'endless')
    state.debt = ENDLESS_DEBT_LIMIT - 100
    const next = reduce(state, { type: 'layLow' })
    expect(next.status).toBe('lost')
    expect(next.ending).toBe('debt')
  })
})

describe('cars and cities', () => {
  it('locks city travel without a car', () => {
    const state = stableGame()
    expect(reduce(state, { type: 'drive', location: 'newark' })).toBe(state)
    expect(reduce(state, { type: 'travel', location: 'newark' })).toBe(state)
  })

  it('buys a car and drives to Newark in car time', () => {
    const state = stableGame()
    state.cash = 10_000
    const bought = reduce(state, { type: 'buyCar', car: 'coupe' })
    expect(bought.car).toBe('coupe')
    expect(bought.cash).toBe(2500)
    expect(bought.achievements).toContain('wheels')

    const drove = reduce(bought, { type: 'drive', location: 'newark' })
    expect(drove.location).toBe('newark')
    expect(drove.day).toBe(2)
    expect(drove.stats.roadTrips).toBe(1)
    expect(drove.achievements).toContain('road_trip')
  })

  it('drives back from a city to a borough', () => {
    const state = stableGame()
    state.cash = 50_000
    const bought = reduce(state, { type: 'buyCar', car: 'sports' })
    const there = reduce(bought, { type: 'drive', location: 'miami' })
    expect(there.location).toBe('miami')
    expect(there.day).toBe(1 + Math.ceil(6 * 0.55))

    const back = reduce(there, { type: 'drive', location: 'bronx' })
    expect(back.location).toBe('bronx')
  })

  it('gives the cargo van extra capacity', () => {
    const state = stableGame()
    state.cash = 20_000
    const bought = reduce(state, { type: 'buyCar', car: 'van' })
    expect(bought.car).toBe('van')
    expect(capacity(bought)).toBe(220)
  })

  it('trades in the old car at half price', () => {
    const state = stableGame()
    state.cash = 20_000
    const beater = reduce(state, { type: 'buyCar', car: 'beater' })
    const coupe = reduce(beater, { type: 'buyCar', car: 'coupe' })
    expect(coupe.car).toBe('coupe')
    expect(coupe.cash).toBe(20_000 - 2500 - (7500 - 1250))
  })
})

describe('gear', () => {
  it('buys a gun', () => {
    const state = stableGame()
    state.cash = 5000
    const next = reduce(state, { type: 'buyGun', gun: 'revolver' })
    expect(next.gun).toBe('revolver')
    expect(next.cash).toBe(4500)
  })

  it('enforces upgrade requirements and capacity', () => {
    const state = stableGame()
    state.cash = 50_000

    const trunkOnly = reduce(state, { type: 'buyUpgrade', upgrade: 'trunk' })
    expect(trunkOnly.upgrades).not.toContain('trunk')

    const duffel = reduce(state, { type: 'buyUpgrade', upgrade: 'duffel' })
    expect(capacity(duffel)).toBe(150)

    const trunk = reduce(duffel, { type: 'buyUpgrade', upgrade: 'trunk' })
    expect(capacity(trunk)).toBe(250)
  })
})

describe('events', () => {
  it('resolves a police bribe', () => {
    const state = stableGame()
    state.cash = 1000
    state.heat = 40
    state.pendingEvent = {
      id: 'police-test',
      kind: 'police',
      title: 'Blue lights',
      body: 'Test',
      options: [
        {
          id: 'bribe',
          label: 'Bribe',
          tone: 'primary',
        },
      ],
      data: { bribeCost: 200 },
    }

    const next = reduce(state, { type: 'resolveEvent', option: 'bribe' })
    expect(next.cash).toBe(800)
    expect(next.heat).toBe(15)
    expect(next.pendingEvent).toBeNull()
    expect(next.stats.cleanEscapes).toBe(1)
    expect(next.achievements).toContain('clean_getaway')
  })

  it('blocks other actions while an event is pending', () => {
    const state = stableGame()
    state.pendingEvent = {
      id: 'police-test',
      kind: 'police',
      title: 'Blue lights',
      body: 'Test',
      options: [{ id: 'bribe', label: 'Bribe' }],
      data: { bribeCost: 100 },
    }
    expect(reduce(state, { type: 'layLow' })).toBe(state)
  })
})

describe('end game', () => {
  it('retires early with a million and no debt', () => {
    const state = stableGame()
    state.cash = 1_100_000
    state.debt = 0
    const next = reduce(state, { type: 'retire' })
    expect(next.status).toBe('won')
    expect(next.ending).toBe('retired')
  })

  it('does not retire with outstanding debt', () => {
    const state = stableGame()
    state.cash = 2_000_000
    const next = reduce(state, { type: 'retire' })
    expect(next.status).toBe('playing')
    expect(next.debt).toBe(state.debt)
  })

  it('wins at the final bell with a million and no debt', () => {
    const state = stableGame()
    state.day = state.maxDays
    state.cash = 2_000_000
    state.debt = 0
    const next = reduce(state, { type: 'layLow' })
    expect(next.status).toBe('won')
    expect(next.ending).toBe('millionaire')
  })

  it('loses at the final bell with debt remaining', () => {
    const state = stableGame()
    state.day = state.maxDays
    const next = reduce(state, { type: 'layLow' })
    expect(next.status).toBe('lost')
    expect(next.ending).toBe('debt')
  })

  it('loses at the final bell under a million', () => {
    const state = stableGame()
    state.day = state.maxDays
    state.debt = 0
    const next = reduce(state, { type: 'layLow' })
    expect(next.status).toBe('lost')
    expect(next.ending).toBe('time')
    expect(netWorth(next)).toBeLessThan(1_000_000)
  })
})

describe('from zero start', () => {
  it('starts with no cash, no debt, and no assets', () => {
    const state = createGame('normal', 5, 'classic', 'zero')
    expect(state.start).toBe('zero')
    expect(state.cash).toBe(0)
    expect(state.bank).toBe(0)
    expect(state.debt).toBe(0)
    expect(state.car).toBeNull()
    expect(state.gun).toBeNull()
    expect(state.upgrades).toEqual([])
    expect(state.properties).toEqual([])
    expect(GOODS.every((good) => state.inventory[good.id] === 0)).toBe(true)
    expect(state.achievements).not.toContain('debt_free')
  })

  it('blocks borrowing in a zero run', () => {
    const state = createGame('normal', 5, 'classic', 'zero')
    const next = reduce(state, { type: 'borrow', amount: 1000 })
    expect(next.cash).toBe(0)
    expect(next.debt).toBe(0)
  })

  it('still allows borrowing in a standard run', () => {
    const state = stableGame()
    const next = reduce(state, { type: 'borrow', amount: 1000 })
    expect(next.cash).toBe(state.cash + 1000)
    expect(next.debt).toBe(state.debt + 1000)
  })

  it('sets the from_nothing achievement at $100k', () => {
    const state = createGame('normal', 5, 'classic', 'zero')
    state.pawnInventory.watch = 400
    const next = reduce(state, { type: 'pawn', item: 'watch', qty: 400 })
    expect(netWorth(next)).toBeGreaterThanOrEqual(100_000)
    expect(next.achievements).toContain('from_nothing')
  })
})

describe('dumpster diving and pawning', () => {
  it('finds pawnable items and spends the day', () => {
    const state = stableGame()
    const next = reduce(state, { type: 'dumpsterDive' })
    const found = Object.values(next.pawnInventory).reduce(
      (sum, count) => sum + count,
      0,
    )
    expect(found).toBeGreaterThan(0)
    expect(next.day).toBe(state.day + 1)
    expect(next.stats.dives).toBe(1)
    expect(next.achievements).toContain('dumpster_diver')
  })

  it('pawns items for cash without advancing the day', () => {
    const state = stableGame()
    state.pawnInventory.watch = 2
    const next = reduce(state, { type: 'pawn', item: 'watch', qty: 2 })
    expect(next.pawnInventory.watch).toBe(0)
    expect(next.cash).toBe(state.cash + 580)
    expect(next.day).toBe(state.day)
    expect(next.stats.itemsPawned).toBe(2)
    expect(next.stats.pawnEarnings).toBe(580)
    expect(next.achievements).toContain('cash_for_trash')
  })

  it('refuses to pawn more than is owned', () => {
    const state = stableGame()
    state.pawnInventory.copper = 1
    const next = reduce(state, { type: 'pawn', item: 'copper', qty: 5 })
    expect(next.pawnInventory.copper).toBe(1)
    expect(next.cash).toBe(state.cash)
  })
})

describe('properties and stashing', () => {
  it('buys a stash house and tracks the achievement', () => {
    const state = stableGame()
    state.cash = 5000
    const next = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const property = next.properties.find(
      (entry) => entry.id === 'bronx:stash',
    )
    expect(property).toBeDefined()
    expect(next.cash).toBe(3800)
    expect(next.stats.propertiesBought).toBe(1)
    expect(next.achievements).toContain('home_owner')
  })

  it('refuses a duplicate type but allows another property type', () => {
    const state = stableGame()
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const again = reduce(bought, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    expect(again.cash).toBe(3800)
    expect(again.stats.propertiesBought).toBe(1)

    const crashpad = reduce(again, {
      type: 'buyProperty',
      propertyType: 'crashpad',
    })
    expect(crashpad.cash).toBe(3200)
    expect(crashpad.stats.propertiesBought).toBe(2)
    expect(crashpad.properties).toHaveLength(2)
  })

  it('moves product and basis into and out of the stash', () => {
    const state = stableGame()
    state.cash = 5000
    state.inventory.ludes = 10
    state.basis.ludes = 100
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const deposited = reduce(bought, {
      type: 'depositStash',
      propertyId: 'bronx:stash',
      good: 'ludes',
      qty: 4,
    })
    expect(deposited.inventory.ludes).toBe(6)
    expect(deposited.basis.ludes).toBe(60)
    const house = deposited.properties.find(
      (entry) => entry.id === 'bronx:stash',
    )!
    expect(house.stored.ludes).toBe(4)
    expect(house.storedBasis.ludes).toBe(40)

    const withdrawn = reduce(deposited, {
      type: 'withdrawStash',
      propertyId: 'bronx:stash',
      good: 'ludes',
      qty: 2,
    })
    expect(withdrawn.inventory.ludes).toBe(8)
    expect(withdrawn.basis.ludes).toBe(80)
    expect(
      withdrawn.properties.find((entry) => entry.id === 'bronx:stash')!.stored
        .ludes,
    ).toBe(2)
  })

  it('counts stashed product and pawnables in net worth', () => {
    const state = stableGame()
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    bought.properties[0]!.stored.weed = 4
    bought.pawnInventory.watch = 1
    const stashValue = 4 * priceAt(bought, 'bronx', 'weed')
    expect(netWorth(bought)).toBe(bought.cash + stashValue + 290 - bought.debt)
  })

  it('only manages the stash while standing in that location', () => {
    const state = stableGame()
    state.cash = 5000
    state.inventory.ludes = 10
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    bought.location = 'manhattan'
    const next = reduce(bought, {
      type: 'depositStash',
      propertyId: 'bronx:stash',
      good: 'ludes',
      qty: 4,
    })
    expect(next.inventory.ludes).toBe(10)
    expect(
      next.properties.find((entry) => entry.id === 'bronx:stash')!.stored.ludes,
    ).toBe(0)
  })
})

describe('growing', () => {
  it('plants seeds, waits, and harvests into the stash', () => {
    const state = stableGame()
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const planted = reduce(bought, {
      type: 'plant',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const house = planted.properties.find(
      (entry) => entry.id === 'bronx:stash',
    )!
    const plot = house.grows[0]
    expect(plot).toBeDefined()
    expect(planted.cash).toBe(3800 - 150)
    expect(plot!.readyDay).toBe(planted.day + 3)
    expect(plot!.yield).toBeGreaterThanOrEqual(6)
    expect(plot!.yield).toBeLessThanOrEqual(10)

    planted.day = plot!.readyDay
    const harvested = reduce(planted, {
      type: 'harvest',
      propertyId: 'bronx:stash',
      slot: 0,
    })
    const harvestedHouse = harvested.properties.find(
      (entry) => entry.id === 'bronx:stash',
    )!
    expect(harvestedHouse.grows).toHaveLength(0)
    expect(harvestedHouse.stored.weed).toBe(plot!.yield)
    expect(harvestedHouse.storedBasis.weed).toBe(150)
    expect(harvested.stats.harvests).toBe(1)
    expect(harvested.stats.unitsGrown).toBe(plot!.yield)
    expect(harvested.achievements).toContain('green_thumb')
  })

  it('will not plant without seed money or an open slot', () => {
    const state = stableGame()
    state.cash = 1000
    expect(
      reduce(state, { type: 'plant', propertyId: 'bronx:stash', good: 'weed' })
        .properties,
    ).toHaveLength(0)

    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const first = reduce(bought, {
      type: 'plant',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const second = reduce(first, {
      type: 'plant',
      propertyId: 'bronx:stash',
      good: 'shrooms',
    })
    expect(
      second.properties.find((entry) => entry.id === 'bronx:stash')!.grows,
    ).toHaveLength(1)
  })

  it('blocks harvest when the stash is full', () => {
    const state = stableGame()
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const planted = reduce(bought, {
      type: 'plant',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const house = planted.properties.find(
      (entry) => entry.id === 'bronx:stash',
    )!
    const plot = house.grows[0]!
    house.stored.ludes = 80
    planted.day = plot.readyDay
    const harvested = reduce(planted, {
      type: 'harvest',
      propertyId: 'bronx:stash',
      slot: 0,
    })
    expect(
      harvested.properties.find((entry) => entry.id === 'bronx:stash')!.grows,
    ).toHaveLength(1)
    expect(
      harvested.properties.find((entry) => entry.id === 'bronx:stash')!.stored
        .weed,
    ).toBe(0)
  })
})

describe('caretakers', () => {
  it('hires and fires a caretaker at the property', () => {
    const state = stableGame()
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })

    const wrongLocation = reduce(
      { ...bought, location: 'manhattan' },
      {
        type: 'hireCaretaker',
        propertyId: 'bronx:stash',
        good: 'weed',
      },
    )
    expect(wrongLocation.properties[0]!.caretaker).toBeNull()

    const hired = reduce(bought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    expect(hired.properties[0]!.caretaker).toEqual({ crop: 'weed' })
    expect(hired.cash).toBe(bought.cash)

    const switched = reduce(hired, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'shrooms',
    })
    expect(switched.properties[0]!.caretaker).toEqual({ crop: 'shrooms' })

    const fired = reduce(switched, {
      type: 'fireCaretaker',
      propertyId: 'bronx:stash',
    })
    expect(fired.properties[0]!.caretaker).toBeNull()
  })

  it('pays wages, harvests ready crops, and replants while time passes', () => {
    const state = stableGame(11)
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })

    const firstDay = reduce(hired, { type: 'layLow' })
    const planted = firstDay.properties[0]!
    expect(firstDay.stats.wagesPaid).toBe(50)
    expect(planted.caretaker).toEqual({ crop: 'weed' })
    expect(planted.grows).toHaveLength(1)
    const plot = planted.grows[0]!

    firstDay.day = plot.readyDay
    const worked = reduce(firstDay, { type: 'layLow' })
    const tended = worked.properties[0]!
    expect(worked.stats.wagesPaid).toBe(100)
    expect(worked.stats.harvests).toBe(1)
    expect(worked.stats.unitsGrown).toBeGreaterThanOrEqual(plot.yield)
    expect(tended.stored.weed).toBeGreaterThanOrEqual(plot.yield)
    expect(tended.grows).toHaveLength(1)
    expect(tended.grows[0]!.plantedDay).toBe(worked.day)
    expect(tended.grows[0]!.readyDay).toBe(worked.day + 3)
  })

  it('quits without pay and pauses when storage is full', () => {
    const unpaidState = stableGame(12)
    unpaidState.cash = 5000
    const bought = reduce(unpaidState, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    hired.cash = 0
    hired.bank = 0
    const unpaid = reduce(hired, { type: 'layLow' })
    expect(unpaid.properties[0]!.caretaker).toBeNull()
    expect(unpaid.properties[0]!.grows).toHaveLength(0)
    expect(unpaid.stats.wagesPaid).toBe(0)

    const fullState = stableGame(13)
    fullState.cash = 5000
    const fullBought = reduce(fullState, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const fullHired = reduce(fullBought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const growing = reduce(fullHired, { type: 'layLow' })
    const fullProperty = growing.properties[0]!
    fullProperty.stored.ludes = 80
    growing.day = fullProperty.grows[0]!.readyDay
    const blocked = reduce(growing, { type: 'layLow' })
    expect(blocked.properties[0]!.caretaker).not.toBeNull()
    expect(blocked.properties[0]!.stored.weed).toBe(0)
    expect(blocked.properties[0]!.grows).toHaveLength(1)
  })

  it('uses the chemist seed discount and yield bonus', () => {
    const state = createGame('normal', 14, 'classic', 'standard', 'chemist')
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const planted = reduce(hired, { type: 'layLow' })
    const plot = planted.properties[0]!.grows[0]!
    expect(planted.cash).toBe(3630)
    expect(plot.yield).toBeGreaterThanOrEqual(8)
    expect(plot.yield).toBeLessThanOrEqual(13)
  })
})

describe('character classes', () => {
  it('applies class passives and standard starting grants', () => {
    const dropout = createGame('normal', 1, 'classic', 'standard', 'dropout')
    expect(dropout.character).toBe('dropout')
    expect(capacity(dropout)).toBe(125)

    const prisoner = createGame(
      'normal',
      1,
      'classic',
      'standard',
      'prisoner',
    )
    expect(prisoner.gun).toBe('switchblade')

    const trust = createGame(
      'normal',
      1,
      'classic',
      'standard',
      'trust_fund',
    )
    expect(trust.bank).toBe(2000)
    expect(bankRate(trust)).toBeGreaterThan(bankRate(dropout))
  })

  it('suppresses starting grants in a from-zero run', () => {
    const prisoner = createGame('normal', 1, 'classic', 'zero', 'prisoner')
    expect(prisoner.gun).toBeNull()
    expect(prisoner.cash).toBe(0)

    const trust = createGame('normal', 1, 'classic', 'zero', 'trust_fund')
    expect(trust.bank).toBe(0)
  })

  it('gives the dropout at least two finds per dive', () => {
    const state = createGame('normal', 3, 'classic', 'standard', 'dropout')
    const next = reduce(state, { type: 'dumpsterDive' })
    const found = Object.values(next.pawnInventory).reduce(
      (sum, count) => sum + count,
      0,
    )
    expect(found).toBeGreaterThanOrEqual(2)
  })

  it('gives the chemist cheaper seeds and bigger yields', () => {
    const state = createGame('normal', 5, 'classic', 'standard', 'chemist')
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const planted = reduce(bought, {
      type: 'plant',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const plot = planted.properties.find(
      (entry) => entry.id === 'bronx:stash',
    )!.grows[0]!
    expect(planted.cash).toBe(3680)
    expect(plot.yield).toBeGreaterThanOrEqual(8)
    expect(plot.yield).toBeLessThanOrEqual(13)
  })

  it('halves broker fees for the trust fund kid', () => {
    const normal = createGame('normal', 42)
    const trust = createGame(
      'normal',
      42,
      'classic',
      'standard',
      'trust_fund',
    )
    normal.bank = 10000
    trust.bank = 10000
    const normalTrade = reduce(normal, {
      type: 'invest',
      asset: 'vltn',
      amount: 1000,
    })
    const trustTrade = reduce(trust, {
      type: 'invest',
      asset: 'vltn',
      amount: 1000,
    })
    expect(trustTrade.positions.vltn!.units).toBeGreaterThan(
      normalTrade.positions.vltn!.units,
    )
  })
})

describe('assets', () => {
  it('buys and sells fractional units without spending a day', () => {
    const state = stableGame(42)
    state.bank = 10000
    const price = state.assetMarkets.vltn.price
    const bought = reduce(state, {
      type: 'invest',
      asset: 'vltn',
      amount: 1000,
    })
    expect(bought.bank).toBe(9000)
    expect(bought.day).toBe(1)
    expect(bought.stats.assetTrades).toBe(1)
    expect(bought.positions.vltn!.basis).toBe(1000)
    expect(bought.positions.vltn!.units).toBeCloseTo(997 / price, 6)
    expect(bought.achievements).toContain('first_investment')

    const sold = reduce(bought, {
      type: 'divest',
      asset: 'vltn',
      amount: 10000,
    })
    expect(sold.positions.vltn).toBeUndefined()
    expect(sold.bank).toBeCloseTo(9994.009, 2)
    expect(sold.stats.investmentEarnings).toBeLessThan(0)
    expect(sold.day).toBe(1)
  })

  it('blocks trades without bank funds or an existing position', () => {
    const state = stableGame()
    state.bank = 0
    expect(
      reduce(state, { type: 'invest', asset: 'vltn', amount: 100 }).bank,
    ).toBe(0)
    expect(
      reduce(state, { type: 'divest', asset: 'vltn', amount: 100 }).bank,
    ).toBe(0)
  })

  it('marks the portfolio as part of net worth', () => {
    const state = stableGame()
    state.bank = 10000
    const invested = reduce(state, {
      type: 'invest',
      asset: 'ghst',
      amount: 1000,
    })
    expect(netWorth(invested)).toBeGreaterThanOrEqual(
      invested.cash + invested.bank - invested.debt,
    )
  })

  it('moves prices and pays bank interest at the start of a day', () => {
    const state = createGame(
      'normal',
      42,
      'classic',
      'standard',
      'trust_fund',
    )
    state.bank = 10000
    const before = state.assetMarkets.vltn.price
    const next = reduce(state, { type: 'layLow' })
    expect(next.day).toBe(2)
    expect(next.bank).toBe(10150)
    expect(next.assetMarkets.vltn.price).not.toBe(before)
    expect(next.assetMarkets.vltn.history.at(-1)).toBe(
      next.assetMarkets.vltn.price,
    )
    expect(next.assetMarkets.vltn.history).toHaveLength(15)
  })
})

describe('property portfolio', () => {
  it('unlocks the warehouse and property tycoon achievements', () => {
    const state = stableGame()
    state.cash = 30000
    let next = state
    for (const propertyType of ['crashpad', 'stash', 'growhouse', 'warehouse'] as const) {
      next = reduce(next, { type: 'buyProperty', propertyType })
    }
    expect(next.properties).toHaveLength(4)
    expect(next.achievements).toContain('warehouse_owner')

    next.location = 'harlem'
    next = reduce(next, { type: 'buyProperty', propertyType: 'stash' })
    expect(next.properties).toHaveLength(5)
    expect(next.stats.propertiesBought).toBe(5)
    expect(next.achievements).toContain('property_tycoon')
  })
})

describe('live prices', () => {
  it('drifts prices without advancing the day', () => {
    const state = createGame('normal', 21)
    const market = state.markets.bronx.ludes
    const before = market.history.length
    const next = tickGame(state)
    expect(next.day).toBe(state.day)
    expect(next.markets.bronx.ludes.history).toHaveLength(before + 1)
    expect(next.markets.bronx.ludes.history.at(-1)).toBe(
      next.markets.bronx.ludes.price,
    )
    expect(next.assetMarkets.vltn.history.at(-1)).toBe(
      next.assetMarkets.vltn.price,
    )
  })

  it('is deterministic for a seed', () => {
    const state = createGame('normal', 21)
    expect(tickGame(state)).toEqual(tickGame(state))
  })

  it('pauses while an event is pending', () => {
    const state = createGame('normal', 22)
    state.pendingEvent = {
      id: 'x',
      kind: 'police',
      title: 't',
      body: 'b',
      options: [],
      data: {},
    }
    expect(tickGame(state)).toBe(state)
  })

  it('keeps prices inside the daily band over many ticks', () => {
    let state = createGame('normal', 23)
    for (let index = 0; index < 200; index += 1) {
      state = tickGame(state)
    }
    for (const location of LOCATIONS) {
      for (const good of GOODS) {
        const market = state.markets[location.id][good.id]
        expect(market.price).toBeGreaterThanOrEqual(
          Math.max(1, Math.floor(market.base * 0.45)),
        )
        expect(market.price).toBeLessThanOrEqual(
          Math.ceil(market.base * 2.2),
        )
      }
    }
  })
})

describe('dealers', () => {
  it('hires a dealer and sells when the price meets the target', () => {
    const state = createGame('normal', 31)
    state.cash = 10000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const price = bought.markets.bronx.ludes.price
    const hired = reduce(bought, {
      type: 'hireDealer',
      propertyId: 'bronx:stash',
      good: 'ludes',
      minPrice: 1,
    })
    expect(hired.cash).toBe(bought.cash - DEALER_HIRE_COST)
    expect(hired.properties[0]!.dealer).toEqual({
      good: 'ludes',
      minPrice: 1,
    })

    hired.properties[0]!.stored.ludes = 5
    hired.properties[0]!.storedBasis.ludes = price * 5
    const sold = tickGame(hired)
    const salePrice = priceAt(sold, 'bronx', 'ludes')
    const revenue = salePrice * 5
    const fee = Math.round(revenue * DEALER_COMMISSION)
    expect(sold.properties[0]!.stored.ludes).toBe(0)
    expect(sold.cash).toBe(hired.cash + revenue - fee)
    expect(sold.stats.dealerSales).toBe(1)
    expect(sold.stats.dealerUnits).toBe(5)
    expect(sold.stats.dealerRevenue).toBe(revenue)
    expect(sold.stats.dealerFees).toBe(fee)
  })

  it('waits while the target is above the market', () => {
    const state = createGame('normal', 32)
    state.cash = 30000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const price = bought.markets.bronx.ludes.price
    const hired = reduce(bought, {
      type: 'hireDealer',
      propertyId: 'bronx:stash',
      good: 'ludes',
      minPrice: price * 3,
    })
    hired.properties[0]!.stored.ludes = 5
    const waited = tickGame(hired)
    expect(waited.properties[0]!.stored.ludes).toBe(5)
    expect(waited.stats.dealerSales).toBe(0)
  })

  it('does not hire without the upfront cash or outside the location', () => {
    const state = createGame('normal', 33)
    state.cash = DEALER_HIRE_COST - 1
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const broke = reduce(bought, {
      type: 'hireDealer',
      propertyId: 'bronx:stash',
      good: 'ludes',
      minPrice: 1,
    })
    expect(broke.properties[0]!.dealer).toBeNull()

    const away = { ...bought, location: 'manhattan' as const }
    const remote = reduce(away, {
      type: 'hireDealer',
      propertyId: 'bronx:stash',
      good: 'ludes',
      minPrice: 1,
    })
    expect(remote.properties[0]!.dealer).toBeNull()
  })

  it('updates the target and fires the dealer', () => {
    const state = createGame('normal', 34)
    state.cash = 10000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireDealer',
      propertyId: 'bronx:stash',
      good: 'ludes',
      minPrice: 1,
    })
    const target = state.markets.bronx.ludes.base * 3
    const retargeted = reduce(hired, {
      type: 'setDealerPrice',
      propertyId: 'bronx:stash',
      minPrice: target,
    })
    expect(retargeted.properties[0]!.dealer?.minPrice).toBe(target)

    const fired = reduce(retargeted, {
      type: 'fireDealer',
      propertyId: 'bronx:stash',
    })
    expect(fired.properties[0]!.dealer).toBeNull()
  })
})

describe('limit buy orders', () => {
  it('fills when the price is at or below the maximum', () => {
    const state = createGame('normal', 41)
    state.cash = 10000
    const price = state.markets.bronx.weed.price
    const placed = reduce(state, {
      type: 'placeBuyOrder',
      good: 'weed',
      location: 'bronx',
      qty: 3,
      maxPrice: Math.ceil(price * 10),
    })
    expect(placed.buyOrders).toHaveLength(1)
    const filled = tickGame(placed)
    expect(filled.buyOrders).toHaveLength(0)
    expect(filled.inventory.weed).toBe(3)
    expect(filled.stats.unitsBought).toBe(3)
  })

  it('waits above the maximum and can be cancelled', () => {
    const state = createGame('normal', 42)
    state.cash = 10000
    const placed = reduce(state, {
      type: 'placeBuyOrder',
      good: 'weed',
      location: 'bronx',
      qty: 3,
      maxPrice: 1,
    })
    const waited = tickGame(placed)
    expect(waited.inventory.weed).toBe(0)
    expect(waited.buyOrders).toHaveLength(1)
    const cancelled = reduce(waited, {
      type: 'cancelBuyOrder',
      id: placed.buyOrders[0]!.id,
    })
    expect(cancelled.buyOrders).toHaveLength(0)
  })
})

describe('price watchlist', () => {
  it('alerts once when the target is met and re-arms on update', () => {
    const state = createGame('normal', 51)
    const watched = reduce(state, {
      type: 'setWatch',
      good: 'ludes',
      location: 'bronx',
      target: 1,
      direction: 'above',
    })
    const alerted = tickGame(watched)
    expect(alerted.watchlist[0]!.armed).toBe(false)
    expect(
      alerted.log.filter((entry) => entry.text.includes('Price alert')),
    ).toHaveLength(1)

    const again = tickGame(alerted)
    expect(
      again.log.filter((entry) => entry.text.includes('Price alert')),
    ).toHaveLength(1)

    const rearmed = reduce(alerted, {
      type: 'setWatch',
      good: 'ludes',
      location: 'bronx',
      target: 1,
      direction: 'above',
    })
    expect(rearmed.watchlist[0]!.armed).toBe(true)
    const cleared = reduce(rearmed, { type: 'clearWatch', good: 'ludes', location: 'bronx' })
    expect(cleared.watchlist).toHaveLength(0)
  })
})

describe('bulk stash', () => {
  it('stores and takes all carried product at once', () => {
    const state = createGame('normal', 61)
    state.cash = 5000
    state.inventory.ludes = 5
    state.basis.ludes = 100
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const stored = reduce(bought, {
      type: 'depositStashAll',
      propertyId: 'bronx:stash',
    })
    expect(stored.inventory.ludes).toBe(0)
    expect(stored.properties[0]!.stored.ludes).toBe(5)
    expect(stored.properties[0]!.storedBasis.ludes).toBe(100)

    const taken = reduce(stored, {
      type: 'withdrawStashAll',
      propertyId: 'bronx:stash',
    })
    expect(taken.inventory.ludes).toBe(5)
    expect(taken.basis.ludes).toBe(100)
    expect(taken.properties[0]!.stored.ludes).toBe(0)
  })
})

describe('car borough hops', () => {
  it('grants same-day hops with a car before days start costing again', () => {
    const state = createGame('normal', 71)
    state.cash = 10000
    const bought = reduce(state, { type: 'buyCar', car: 'coupe' })
    expect(bought.boroughHopsLeft).toBe(2)

    const first = reduce(bought, { type: 'travel', location: 'harlem' })
    expect(first.day).toBe(bought.day)
    expect(first.location).toBe('harlem')
    expect(first.boroughHopsLeft).toBe(1)

    const second = reduce(first, { type: 'travel', location: 'queens' })
    expect(second.day).toBe(first.day)
    expect(second.boroughHopsLeft).toBe(0)

    const third = reduce(second, { type: 'travel', location: 'brooklyn' })
    expect(third.day).toBe(second.day + 1)
    expect(third.boroughHopsLeft).toBe(2)
  })

  it('leaves travel on foot costing a day', () => {
    const state = createGame('normal', 72)
    const walked = reduce(state, { type: 'travel', location: 'harlem' })
    expect(walked.day).toBe(2)
  })
})

describe('warehouse runner', () => {
  it('consolidates carried goods and local stashes each day', () => {
    const state = createGame('normal', 81)
    state.cash = 30000
    let next = reduce(state, { type: 'buyProperty', propertyType: 'warehouse' })
    next = reduce(next, { type: 'buyProperty', propertyType: 'stash' })
    next = reduce(next, { type: 'hireRunner', propertyId: 'bronx:warehouse' })
    const warehouse = next.properties.find((p) => p.type === 'warehouse')!
    const stash = next.properties.find((p) => p.id === 'bronx:stash')!
    expect(warehouse.runner).toBe(true)

    next.inventory.ludes = 3
    next.basis.ludes = 30
    stash.stored.weed = 2
    stash.storedBasis.weed = 200

    const ran = reduce(next, { type: 'layLow' })
    const filled = ran.properties.find((p) => p.type === 'warehouse')!
    const emptied = ran.properties.find((p) => p.id === 'bronx:stash')!
    expect(ran.inventory.ludes).toBe(0)
    expect(emptied.stored.weed).toBe(0)
    expect(filled.stored.ludes).toBe(3)
    expect(filled.storedBasis.ludes).toBe(30)
    expect(filled.stored.weed).toBe(2)
    expect(filled.storedBasis.weed).toBe(200)
    expect(ran.stats.wagesPaid).toBe(RUNNER_WAGE)
  })

  it('quits when the wage cannot be paid', () => {
    const state = createGame('normal', 82)
    state.cash = 10000
    let next = reduce(state, { type: 'buyProperty', propertyType: 'warehouse' })
    next = reduce(next, { type: 'hireRunner', propertyId: 'bronx:warehouse' })
    next.cash = 0
    next.bank = 0
    const broke = reduce(next, { type: 'layLow' })
    expect(broke.properties[0]!.runner).toBe(false)
  })
})

function advance(state: GameState, days: number): GameState {
  let next = state
  for (let index = 0; index < days; index += 1) {
    if (next.pendingEvent) {
      const option = next.pendingEvent.options.find((item) => !item.disabled)
      if (option) {
        next = reduce(next, { type: 'resolveEvent', option: option.id })
      }
    }
    next = reduce(next, { type: 'layLow' })
  }
  return next
}

function cookedLab(seed: number): GameState {
  const state = createGame('normal', seed)
  state.cash = 50000
  let next = reduce(state, { type: 'buyProperty', propertyType: 'lab' })
  const lab = next.properties.find((p) => p.type === 'lab')!
  lab.stored.speed = 5
  lab.storedBasis.speed = 500
  next = reduce(next, { type: 'cook', propertyId: lab.id, recipe: 'meth' })
  return advance(next, 3)
}

describe('lab cooking', () => {
  it('consumes ingredients, adds heat, and resolves batches', () => {
    const state = createGame('normal', 91)
    state.cash = 50000
    let next = reduce(state, { type: 'buyProperty', propertyType: 'lab' })
    const lab = next.properties.find((p) => p.type === 'lab')!
    lab.stored.speed = 5
    lab.storedBasis.speed = 500
    next = reduce(next, { type: 'cook', propertyId: lab.id, recipe: 'meth' })
    const started = next.properties.find((p) => p.type === 'lab')!
    expect(started.cooks).toHaveLength(1)
    expect(started.stored.speed).toBe(0)
    expect(next.heat).toBeGreaterThan(0)

    const batches = Array.from({ length: 30 }, (_, index) => cookedLab(index + 1))
    const successes = batches.filter(
      (entry) => entry.properties[0]!.stored.meth >= 1,
    )
    const explosions = batches.filter((entry) =>
      entry.log.some((line) => line.text.includes('blew up')),
    )
    expect(successes.length).toBeGreaterThan(0)
    expect(explosions.length).toBeGreaterThan(0)
    const win = successes[0]!
    expect(win.stats.cooks).toBeGreaterThanOrEqual(1)
    expect(win.stats.unitsCooked).toBeGreaterThanOrEqual(1)
    expect(win.properties[0]!.cooks).toHaveLength(0)
  })

  it('lab tech auto-starts batches from stored ingredients', () => {
    const state = createGame('normal', 92)
    state.cash = 50000
    let next = reduce(state, { type: 'buyProperty', propertyType: 'lab' })
    const lab = next.properties.find((p) => p.type === 'lab')!
    lab.stored.speed = 10
    lab.storedBasis.speed = 1000
    next = reduce(next, {
      type: 'hireLabTech',
      propertyId: lab.id,
      recipe: 'meth',
    })
    expect(next.properties[0]!.labTech).toBe('meth')
    const ran = advance(next, 1)
    const tended = ran.properties[0]!
    expect(tended.cooks).toHaveLength(2)
    expect(tended.stored.speed).toBe(0)
  })
})

describe('save', () => {
  it('round-trips a game state', () => {
    const state = stableGame(99)
    const restored = deserializeGame(serializeGame(state))
    expect(restored).toEqual(state)
  })

  it('round-trips a character, property, and portfolio', () => {
    const state = createGame(
      'normal',
      99,
      'classic',
      'standard',
      'trust_fund',
    )
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    hired.bank = 10000
    const invested = reduce(hired, {
      type: 'invest',
      asset: 'ghst',
      amount: 500,
    })
    invested.properties[0]!.stored.weed = 3

    const restored = deserializeGame(serializeGame(invested))
    expect(restored).toEqual(invested)
    expect(restored!.properties[0]!.caretaker).toEqual({ crop: 'weed' })
  })

  it('migrates a version 2 save', () => {
    const state = stableGame(7)
    const parsed = JSON.parse(serializeGame(state)) as Record<string, unknown>
    parsed.version = 2
    delete parsed.start
    delete parsed.pawnInventory
    delete parsed.properties
    delete parsed.assetMarkets
    delete parsed.positions
    delete parsed.character
    const stats = parsed.stats as Record<string, unknown>
    delete stats.dives
    delete stats.itemsPawned
    delete stats.pawnEarnings
    delete stats.safeHousesBought
    delete stats.harvests
    delete stats.unitsGrown
    delete stats.wagesPaid

    const restored = deserializeGame(JSON.stringify(parsed))
    expect(restored).not.toBeNull()
    expect(restored!.start).toBe('standard')
    expect(restored!.pawnInventory.copper).toBe(0)
    expect(restored!.properties).toEqual([])
    expect(restored!.character).toBeNull()
    expect(restored!.stats.dives).toBe(0)
    expect(restored!.stats.wagesPaid).toBe(0)
  })

  it('migrates a version 3 save with a legacy safe house', () => {
    const state = stableGame(8)
    const parsed = JSON.parse(serializeGame(state)) as Record<string, unknown>
    parsed.version = 3
    delete parsed.properties
    delete parsed.assetMarkets
    delete parsed.positions
    delete parsed.character
    parsed.safeHouses = {
      bronx: {
        location: 'bronx',
        stored: { ...state.inventory, ludes: 7 },
        storedBasis: { ...state.basis, ludes: 70 },
        grows: [],
      },
    }
    delete (parsed.stats as Record<string, unknown>).wagesPaid

    const restored = deserializeGame(JSON.stringify(parsed))
    expect(restored).not.toBeNull()
    expect(restored!.properties[0]?.id).toBe('bronx:stash')
    expect(restored!.properties[0]?.type).toBe('stash')
    expect(restored!.properties[0]?.stored.ludes).toBe(7)
    expect(restored!.properties[0]?.stored.cigarettes).toBe(0)
    expect(restored!.properties[0]?.caretaker).toBeNull()
    expect(restored!.stats.wagesPaid).toBe(0)
    expect(restored!.assetMarkets.vltn.price).toBeGreaterThan(0)
    expect(restored!.positions).toEqual({})
  })

  it('migrates a version 4 save without caretakers', () => {
    const state = stableGame(9)
    state.cash = 5000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const parsed = JSON.parse(serializeGame(bought)) as Record<string, unknown>
    parsed.version = 4
    delete (
      (parsed.properties as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).caretaker
    delete (parsed.stats as Record<string, unknown>).wagesPaid

    const restored = deserializeGame(JSON.stringify(parsed))
    expect(restored).not.toBeNull()
    expect(restored!.properties[0]!.caretaker).toBeNull()
    expect(restored!.stats.wagesPaid).toBe(0)
  })

  it('migrates a version 5 save without dealers or orders', () => {
    const state = stableGame(10)
    state.cash = 10000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireCaretaker',
      propertyId: 'bronx:stash',
      good: 'weed',
    })
    const parsed = JSON.parse(serializeGame(hired)) as Record<string, unknown>
    parsed.version = 5
    delete parsed.watchlist
    delete parsed.buyOrders
    delete (
      (parsed.properties as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).dealer
    const stats = parsed.stats as Record<string, unknown>
    delete stats.dealerSales
    delete stats.dealerUnits
    delete stats.dealerRevenue
    delete stats.dealerFees
    delete (parsed.assetMarkets as Record<string, Record<string, unknown>>).vltn
      .anchor

    const restored = deserializeGame(JSON.stringify(parsed))
    expect(restored).not.toBeNull()
    expect(restored!.version).toBe(SAVE_VERSION)
    expect(restored!.properties[0]!.dealer).toBeNull()
    expect(restored!.properties[0]!.caretaker).toEqual({ crop: 'weed' })
    expect(restored!.watchlist).toEqual([])
    expect(restored!.buyOrders).toEqual([])
    expect(restored!.stats.dealerSales).toBe(0)
    expect(restored!.assetMarkets.vltn.anchor).toBeGreaterThan(0)
  })

  it('migrates a version 6 save without runner, lab, or hops', () => {
    const state = stableGame(12)
    state.cash = 10000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'lab',
    })
    const parsed = JSON.parse(serializeGame(bought)) as Record<string, unknown>
    parsed.version = 6
    parsed.car = 'coupe'
    delete parsed.boroughHopsLeft
    const property = (parsed.properties as Record<string, unknown>[])[0]!
    delete property.runner
    delete property.cooks
    delete property.labTech
    const stats = parsed.stats as Record<string, unknown>
    delete stats.cooks
    delete stats.unitsCooked

    const restored = deserializeGame(JSON.stringify(parsed))
    expect(restored).not.toBeNull()
    expect(restored!.version).toBe(SAVE_VERSION)
    expect(restored!.boroughHopsLeft).toBe(2)
    expect(restored!.properties[0]!.runner).toBe(false)
    expect(restored!.properties[0]!.cooks).toEqual([])
    expect(restored!.properties[0]!.labTech).toBeNull()
    expect(restored!.stats.cooks).toBe(0)
    expect(restored!.stats.unitsCooked).toBe(0)
  })

  it('round-trips dealers, watchlist entries, and buy orders', () => {
    const state = stableGame(11)
    state.cash = 10000
    const bought = reduce(state, {
      type: 'buyProperty',
      propertyType: 'stash',
    })
    const hired = reduce(bought, {
      type: 'hireDealer',
      propertyId: 'bronx:stash',
      good: 'ludes',
      minPrice: 40,
    })
    const watched = reduce(hired, {
      type: 'setWatch',
      good: 'weed',
      location: 'bronx',
      target: 900,
      direction: 'above',
    })
    const ordered = reduce(watched, {
      type: 'placeBuyOrder',
      good: 'weed',
      location: 'bronx',
      qty: 4,
      maxPrice: 800,
    })

    const restored = deserializeGame(serializeGame(ordered))
    expect(restored).toEqual(ordered)
    expect(restored!.properties[0]!.dealer).toEqual({
      good: 'ludes',
      minPrice: 40,
    })
    expect(restored!.watchlist).toHaveLength(1)
    expect(restored!.buyOrders).toHaveLength(1)
  })

  it('rejects corrupt or outdated saves', () => {
    expect(deserializeGame(null)).toBeNull()
    expect(deserializeGame('not json')).toBeNull()
    expect(deserializeGame(JSON.stringify({ version: 0 }))).toBeNull()
  })
})


