import type { ReactNode } from 'react'
import {
  DEALER_COMMISSION,
  DEALER_HIRE_COST,
  RUNNER_WAGE,
} from '../game/data'
import { money } from '../lib/format'
import { CloseIcon, HelpIcon } from './icons'
import { Button, Modal } from './ui'

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} labelledBy="help-title" className="sm:max-w-2xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
              <HelpIcon size={18} />
            </span>
            <div>
              <h2 id="help-title" className="text-lg font-semibold tracking-tight">
                How to play
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                The whole game in one page.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={onClose}>
            <CloseIcon size={16} />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="mt-5 space-y-4 text-[12px] leading-relaxed text-[var(--muted)]">
          <Section title="The goal">
            Finish the run with <b className="text-[var(--text)]">$1,000,000 net worth</b>{' '}
            and <b className="text-[var(--text)]">no debt</b>. Net worth is cash +
            bank + carried product + stashed product + investments − debt. If
            you clear the million early, you can retire from the menu. If the
            final day ends with debt, you lose.
          </Section>
          <Section title="The loop">
            Buying and selling is free. <b className="text-[var(--text)]">Traveling</b>{' '}
            or <b className="text-[var(--text)]">lying low</b> advances one day.
            Every new day, prices move, interest is charged, heat cools, and an
            event may happen.
          </Section>
          <Section title="The tabs">
            <b className="text-[var(--text)]">Market</b> is where you trade.{' '}
            <b className="text-[var(--text)]">Street</b> handles travel,
            dumpster diving, lying low, the pawn shop, and the log.{' '}
            <b className="text-[var(--text)]">Bank</b> holds your savings, the
            loan shark, and the broker. <b className="text-[var(--text)]">Properties</b>{' '}
            stores product and grows crops. <b className="text-[var(--text)]">Workers</b>{' '}
            is where you hire caretakers to automate grows.{' '}
            <b className="text-[var(--text)]">Loadout</b> covers cars, guns, and
            gear. Your cash, bank, debt, heat, and the day always sit in the top
            bar.
          </Section>
          <Section title="Live prices">
            Market prices drift every second, so a good can spike or dip while
            you watch. Each new day still moves the underlying price level, the
            markets re-anchor, and interest, wages, and events resolve. The live
            graph pauses while a menu or event is open, so nothing moves under
            your feet mid-decision.
          </Section>
          <Section title="Price alerts and limit buys">
            Tap the star next to any good to add a price alert. The Alerts strip
            above the market shows the live price against your target — it fires
            once when the target is met, then sits in the log until you set it
            again. The Limit button under the quantity sets a standing buy
            order: whenever the price is at or below your maximum, units fill
            automatically up to the order size, cash, and coat space.
          </Section>
          <Section title="Dealers">
            In the Workers tab, switch to Dealers and hire one for any property
            for {money(DEALER_HIRE_COST)}. Pick a product and a minimum price,
            stash the product in that property, and the dealer sells the whole
            stash the moment the live price in that location reaches your
            target, taking {Math.round(DEALER_COMMISSION * 100)}% of the sale.
            Hire or retarget while standing at the property; they keep working
            while you travel.
          </Section>
          <Section title="Warehouse runner">
            Hire a runner for any warehouse from its card in the Properties tab.
            Each day you spend in that borough, the runner hauls your carried
            goods and every other local stash into the warehouse, up to its free
            space, for {money(RUNNER_WAGE)} a day.
          </Section>
          <Section title="Labs">
            Labs have two cook slots. Stock the lab&apos;s stash with
            ingredients (5 Speed per Meth batch, 5 Benzos per Ketamine batch),
            then start a cook — it takes three days and adds heat. At the start
            of the day a finished batch either lands in the stash or blows up,
            losing everything and spiking heat. Hire a lab tech to start the
            chosen batch automatically whenever ingredients and a slot are
            free.
          </Section>
          <Section title="Saving">
            The run autosaves in this browser. Menu → Save backup copies the
            whole run as text — paste it back and hit Import to restore it
            anywhere.
          </Section>
          <Section title="Trading">
            Twelve goods move through fourteen markets. Buy where something is
            cheap and sell where it is expensive. The same good costs the same
            to buy and sell in a single market, so location is where the profit
            lives. Your coat holds a limited number of units. Upgrades and cars
            add to that base capacity.
          </Section>
          <Section title="Cars and cities">
            Six cities sit beyond the boroughs, each with a different market:
            Newark, Philadelphia, Boston, Chicago, Miami, and Las Vegas. You
            cannot reach them on foot — buy a car in the garage first. Slower
            cars burn more days on the road, and a faster car can turn a long
            haul into a quick run. Trade in your old ride for half its sticker
            price. Capacity is additive: the cargo van adds 120 units, and
            storage upgrades stack on top. Every car also grants same-day
            borough hops each day (Beater 1, Coupé 2, Cargo Van 1, Sports Car
            3) - the first hops across the boroughs cost no day at all.
          </Section>
          <Section title="Endless mode">
            Endless runs have no final day. The markets keep moving, the shark
            keeps charging interest, and the only clean way out is to retire
            with a million and no debt. If the debt climbs past $75,000, the
            enforcers end the run for you.
          </Section>
          <Section title="Classes">
            Every run starts with a class. School Dropout carries 25 extra
            units and always finds at least two items diving. Released Prisoner
            fights better but builds heat faster and starts with a switchblade.
            Trust Fund Kid starts with $2,000 in the bank, earns extra interest,
            and halves broker fees. Chemistry Nerd gets more grow yield and
            cheaper seeds. Ex-Cop builds less heat and pays smaller bribes. From
            Zero keeps class passives but removes cash, bank, and starting gear.
          </Section>
          <Section title="From Zero">
            From Zero is a start option that works with Classic or Endless. You
            begin with no cash, no product, and no debt. The loan shark refuses
            to lend to you at all, so the only way up is scavenging, pawning,
            properties, investing, and growing your own. Pick it on the start
            screen to make any run harder.
          </Section>
          <Section title="Scavenging and pawning">
            Dumpster diving costs one day and turns up random junk: copper wire,
            old radios, bicycles, watches, and stranger things. Every piece has
            a fixed pawn value. The pawn shop buys it instantly and pawning
            takes no time. Found junk still counts toward your net worth until
            you sell it.
          </Section>
          <Section title="Properties">
            Each location offers five property types: Crash Pad, Stash House,
            Grow House, Warehouse, and Lab. You can own one of each per
            location. Stashed product is safe from muggings and raids and counts
            toward net worth, but you can only move product in or out while
            standing in that location. Properties are sunk costs, not resale
            assets.
          </Section>
          <Section title="Growing">
            Grow Houses and other properties with grow slots can plant weed,
            shrooms, and acid. Seeds cost cash up front and take a few days to
            finish. Harvested crops land in that property&apos;s stash, and the
            seed cost becomes the product basis. Crops keep growing while you
            travel, but harvest is blocked if the stash is full.
          </Section>
          <Section title="Caretakers">
            Hire one caretaker per grow property to pick a crop and tend every
            grow slot automatically. They harvest ready crops into that
            property&apos;s stash, replant empty slots when you can afford the
            seeds, and pause when storage is full. Wages are charged at the
            start of each day from cash first, then bank. A caretaker quits if
            the wage cannot be paid.
          </Section>
          <Section title="Investing">
            The Broker lets you buy stocks and crypto from your bank. Trades are
            instant and do not advance the day. Prices move daily, portfolio
            value counts toward net worth, and selling realizes the gain or
            loss. Stock fees are lower than crypto fees.
          </Section>
          <Section title="Heat">
            Big trades and high-value product raise your heat. Higher heat means
            more police stops, raids, and fines. Lying low cools you down, and a
            burner phone slows the buildup. A clean record is cheaper than a
            bribe.
          </Section>
          <Section title="Money and the shark">
            The bank is safe from muggers and pays 1% per day, plus the Trust
            Fund Kid bonus. The loan shark charges interest every day and will
            send enforcers if you let the debt grow too large. You can borrow
            more up to the credit cap, but every dollar is a promise.
          </Section>
          <Section title="Gear and guns">
            Five guns trade defense against confiscation risk. A vest halves
            mugging losses. Backpacks, duffels, trunks, roof racks, and cargo
            cages add capacity, with the largest upgrades requiring vehicles.
          </Section>
          <Section title="Events">
            Police stops, muggings, raids, market shortages, and loan-shark visits
            force choices. Read the hints, watch your cash and product, and pick
            the option you can survive.
          </Section>
          <Section title="Controls">
            On desktop, press <Kbd>1</Kbd>–<Kbd>8</Kbd> to travel, <Kbd>D</Kbd> to
            dumpster dive, <Kbd>R</Kbd> to retire when eligible, <Kbd>M</Kbd> for
            the menu, and <Kbd>?</Kbd> for this screen. Everything is also
            tappable on mobile.
          </Section>
        </div>

        <Button variant="primary" className="mt-6 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3">
      <h3 className="text-xs font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1">{children}</p>
    </section>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-3)] px-1 py-0.5 font-mono text-[10px] text-[var(--text)]">
      {children}
    </kbd>
  )
}
