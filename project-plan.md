# Siam's Aqua E-Commerce — Project Plan
*Based on "Siam's Aqua E-Commerce — Complete Feature Specification v5.0" (164 pages, 296 features, 8 sectors, 13 development phases)*

This plan translates your Bengali business spec into an execution roadmap and a recommended architecture. It does **not** replace your spec — keep the original PDF as the source of truth for exact feature lists (it's referenced by chapter number throughout). This document adds the *how*: stack, structure, sequencing, and the open decisions that need to be made before (or during) each phase.

---

## 1. What this platform actually is

One login system, one database, but several completely separate "stores" behind it, each with its own users, prices, and interface:

| Sector | Who uses it | Your role |
|---|---|---|
| Public Market | Anyone | Direct seller (fixed retail price) |
| Wholesale (হালেসল) | Approved big buyers/distributors | Direct seller + take commission on their resale |
| Paikari (পাইকারি) — **build first** | Small pharmacy shops (your existing business) | Direct seller, only your own pharmacy stock |
| MPO Market | Medical Promotion Officers (anonymous broker channel) | Middleman — neither side knows the other |
| Medicine Search (MedEx-style) | Everyone | Reference database (generic-name lookup engine, powers suggestions everywhere) |
| Gaming | Gamers | Direct seller (diamond top-ups, Codashop-style) |
| Food | Local restaurants/shops | Commission platform (Foodpanda-style) |
| Hub/Community | Everyone on the platform | Free classifieds/board |

Two financially **separate businesses** run on top of this: your main pharmacy (inventory lives in your existing PharmaTrack software — **never shown live in this platform**) and "Offer Para," a brand-new business whose entire stock, pricing, and P&L live *inside* this platform.

The two non-negotiable rules that everything else depends on: **(1) who can see a sector at all**, and **(2) what price that person sees**. Every other feature is built on top of those two answers, so Phase 0 gets disproportionate time.

---

## 2. Recommended tech stack

You asked me to pick — here's what fits the specific constraints in your doc (server-side visibility checks on every request, live multi-staff concurrency, a 4-layer pricing engine, one account working across web + app, heavy admin tooling):

| Layer | Recommendation | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | One place for backend, web, mobile, and shared business logic (pricing engine, types) so the pricing rules and role/visibility rules are written **once** and imported everywhere — not re-implemented per platform (this is the #1 risk in your spec: two implementations of "who sees what" drifting apart). |
| Backend API | Node.js + TypeScript, **NestJS** | Structured modules map cleanly onto your sectors (a `paikari` module, `mpo` module, `pricing` module, etc.), built-in guards are a natural fit for the mandatory server-side account-type/role checks, and it has mature WebSocket support for the real-time requirements (chapter 35, note 4). |
| Database | **PostgreSQL** | Your pricing model, tiering, roles, and audit logs are deeply relational; Postgres row-level constraints and transactions matter for stock/commission correctness. Use Prisma or Drizzle as the ORM. |
| Real-time | **Socket.io** (or Postgres LISTEN/NOTIFY behind it) | Needed in paikari fulfillment, MPO bidding, food order status, staff concurrency indicators, memo sync. |
| Web frontend | **Next.js (React)** | SSR helps the public marketplace (SEO, product pages) and gives you one React codebase to share components/types with the mobile app. |
| Mobile app | **React Native (Expo)** | Shares TypeScript types and the pricing/visibility logic package with the web app; one account, one cart, works across both as your spec requires. |
| File/media storage | **Cloudflare R2 or AWS S3** | Product images, prescription uploads, license documents, digital product downloads (with expiring signed URLs — your spec explicitly calls out link-expiry for digital goods). |
| Search | **PostgreSQL full-text search** to start; move to **Meilisearch/Typesense** once the medicine database is large — fast brand/generic fuzzy search is central to the whole platform. |
| Payments | **SSLCommerz or ShurjoPay** (Bangladesh payment aggregators) | Each gives you bKash, Nagad, Rocket, cards, and bank transfer through *one* integration instead of separate merchant integrations per method — matches chapter 31 exactly. |
| Notifications | **Firebase Cloud Messaging** (push, web+app) + a Bangladesh SMS gateway (e.g. Alpha SMS / BulkSMSBD / SSL Wireless — compare pricing when you get there) + **Resend or SendGrid** (email) | Your spec is explicit that SMS matters more than email for shop owners in Bangladesh. |
| Hosting | Any VPS/cloud (DigitalOcean, AWS, or a local BD provider) + automated nightly Postgres backups to cold cloud storage, 30-day retention, monthly restore test | Matches chapter 35 note 11 exactly. |

**If you'd rather use something else**, the phase prompts below are structured so an agent can substitute frameworks without changing the sequencing — the architecture decisions are called out separately from the business logic in each phase.

---

## 3. Repo structure (suggested)

```
apps/
  api/          → NestJS backend (all sectors as modules)
  web/          → Next.js storefront + role-based dashboards + admin panel
  mobile/       → React Native (Expo) app
packages/
  shared-types/ → TypeScript types shared across api/web/mobile
  pricing/      → The 4-layer pricing engine (used by api, never duplicated)
  visibility/   → Server-side "who can see what" rules (used by api guards)
docs/
  spec/         → Original Bengali PDF + this plan, kept together
```

---

## 4. Cross-cutting rules (build these once, correctly, in Phase 0)

These aren't features of one sector — they're rules the *whole system* obeys, and retrofitting them later means rewriting almost everything (your own spec says this explicitly in chapter 36):

1. **Visibility is server-enforced, not UI-hidden.** Every request checks account type on the server. A paikari user must get a 403/404 for wholesale URLs typed directly into the browser — not just a hidden menu item.
2. **Four-layer pricing, in this precedence order (highest wins):**
   `Customer-specific manual rate → Product-specific override → Company-level rate → Tier default rate`
   Manual per-customer overrides **survive** a tier change (they represent a deliberate exception); everything else recalculates instantly when a tier changes. Must support both % and currency-amount input, converting and displaying both, with rounding rules decided upfront.
3. **Draft sale vs. Complete sale** is a platform-wide concept: stock is provisionally held (not deducted) at draft; it only deducts, counts toward reports, and starts return-window timers once the customer *confirms receipt*.
4. **Two inventories, never mixed.** Main pharmacy stock (PharmaTrack, not visible live here) vs. Offer Para stock (fully live in this platform). A sale in one never touches the other's numbers.
5. **Real-time everywhere it matters.** Paikari fulfillment, staff concurrency ("first click wins" with both screens updating live), MPO bidding, food order status, memo edits — no screen should ever require a manual refresh to see another actor's change.
6. **Full audit log on anything reversible or sensitive**: tier changes, manual rate changes, price edits, account suspension, product deletion, MPO company/territory changes, commission rate changes, return approvals — who, when, before/after value.
7. **Everything not being built yet (Phase 2/Future tags) still needs a home in the data model** — e.g., a nullable `bookingSlot` field structure even though bookings aren't built until later, so Phase 11+ doesn't require breaking changes.

---

## 5. Two decisions to make before coding starts

Your own spec flags both of these as "decide before starting" (chapter 35, notes 2 & 3):

**A. PharmaTrack integration.** Options, roughly in order of effort: (1) no integration yet — Offer Para and the online-only stock module run independently, main pharmacy stock stays fully outside this platform for now (matches your Phase 0–8 plan as written); (2) a one-way nightly export/import (PharmaTrack → this platform) just for the "short list" of out-of-stock items; (3) a real API integration once PharmaTrack exposes one. Given your own dev order defers this to "Future," **recommendation: build Phase 0–11 exactly as scoped with zero PharmaTrack connection, revisit integration only when you reach it.**

**B. Medicine + generic database sourcing.** This is a large, separate data project that can run in parallel with Phase 0 coding (your spec says to start it "day one, alongside coding"). Real options I found, roughly cheapest-to-most-thorough:
- **Buy/license an existing structured dataset**: there's a public Kaggle dataset ("bd-medicine-scraper" / "All Medicine Data of Bangladesh") with ~21,000+ medicines, generics, companies, and indications structured into CSVs, originally compiled from MedEx. Fastest starting point, but check its license terms and treat it as a *seed* that needs verification, not a final source — MedEx's underlying data is presumably still their commercial property.
- **DGDA (Directorate General of Drug Administration)** publishes the *official* essential drugs list and manufacturer licensing data — authoritative for generics/regulatory status, but much smaller and not brand-level granular.
- **drugbangladesh.com** is a newer (2024) bilingual directory claiming 30,000+ brands and 1,500+ generics — worth reaching out to about a data licensing/partnership arrangement rather than scraping.
- **Scraping MedEx or similar sites directly** is technically documented online (open-source scrapers exist) but carries real legal/ToS risk since you'd be republishing a competitor's commercial catalog as your own — I'd avoid this route and lean toward the Kaggle seed dataset plus your own manual verification/enrichment, or a licensing conversation with drugbangladesh.com or a similar provider.

**Recommendation:** start with the Kaggle dataset as a bulk seed to unblock development immediately, run it through a review/cleanup pass, and treat ongoing accuracy (new products, price changes) as a recurring content-ops task, not a one-time import — your spec already asks for a bulk import tool for exactly this reason.

---

## 6. Phase roadmap

This mirrors your own chapter 36 exactly — I haven't reordered anything, since your reasoning for the order (paikari first because it's your live business and mistakes surface fast) is sound.

| Phase | Sector / Focus | Why this position |
|---|---|---|
| 0 | Foundation: account types, login/redirect, server-side visibility, admin panel skeleton, staff roles/permissions, 2FA/IP-block basics, full pricing engine, backups | Nothing else can stand without this |
| 0-a | Medicine + generic database (run **in parallel** with Phase 0) | Needed before Phase 1 can go live even if code is ready |
| 1 | **Paikari Market** | Your current live business — launches first, bugs get caught fast |
| 2 | Return sub-sector | Needed almost immediately once Paikari is live (daily occurrence) |
| 3 | Wholesale Market | Sits on the same pricing/tier foundation as Paikari |
| 4 | Offer Para + Stock Management module | Second business — the two are built together since one depends on the other |
| 5 | MPO Market + Pre-order sector | Bidding only makes sense once Wholesale exists |
| 6 | Public Market | Biggest audience, but least urgent |
| 7 | Wholesaler resale + commission | Needs Public Market live first (that's who they resell to) |
| 8 | Gaming sector | Fully independent — a good filler whenever there's spare capacity |
| 9 | Food sector | Almost its own platform — left for last of the "core" sectors |
| 10 | Hub/Community sector | Only useful once there's a real user base |
| 11 | Enhancement features (recommendations, counter sales, rewards/referral, flash sales, abandoned-cart, price-drop alerts, support tickets, bulk order upload) | Layered on top once the core works |
| 12 | Future backlog (Pixel/Analytics, affiliate program, bulk SMS/email campaigns, "বাকির খাতা" ledger, full PharmaTrack sync, service/coaching bookings, direct gaming-company deals) | Explicitly deferred — just keep the data model open for it |

**Rule for every phase:** finish and launch it fully before starting the next — don't leave things half-built and move on. Have the actual business owner (you) use each phase in production before starting the next; that's how bugs get caught early per your own plan.

---

## 7. Notable business logic that agents will get wrong if not called out explicitly

- **Tier vs. company vs. product vs. customer pricing** is a strict precedence stack, not "whichever is set" — see §4.2.
- **MPO anonymity is bidirectional**: the shop never sees the MPO exists, the MPO never sees which shop bought their stock — your account is the only party visible to either side, and *all* trade documents show "Anonymous 1 (Your Store Name)" format, not the real MPO name, anywhere outside your own admin view.
- **Wholesale ("hawlsel") vs. Paikari access is invisible, not just locked.** A paikari account must see *zero* trace that wholesale exists — no greyed-out menu, no "access denied" page, nothing. It only appears after an explicit upgrade.
- **Staff concurrency**: first staff member to act on a line item wins; both staff screens update live; no locking dialog, no error — the loser's screen simply reflects the new state.
- **Quantity-based public discounts** are configured per-product with arbitrary breakpoints (not a fixed global rule), can be set in % or currency, and must be visible on the product page itself before checkout.
- **Bonus/BOGO math on MPO products** ("10+2") must be flexible ratios, itemized separately on the memo (zero price for the bonus units, but still deducted from stock), and always shown as coming from *your* account.
- **A staff device losing internet mid-fulfillment must not lose work** — sync back automatically on reconnect (spec explicitly calls this out).

---

## 8. Immediate next steps

1. Decide/confirm the tech stack (or hand this doc + your preference to the agent and let it scaffold Phase 0).
2. Start medicine-database sourcing in parallel — don't block coding on it, but don't leave it until Phase 1 is "done" either.
3. Feed the Phase 0 prompt (see `ai-agent-prompts.md`) to your Antigravity agent.
4. After each phase, use the "Definition of Done" checklist in that phase's prompt before moving to the next — don't let Antigravity self-report "done" without you verifying against it.
