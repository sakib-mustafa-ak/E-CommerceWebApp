# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Pharmacy buyers (Paikari):** Small pharmacy shop owners ordering wholesale medicine via the Paikari market. They browse catalogs, compare prices across tiers, place bulk orders, and track fulfillment. Primary workflow is procurement — finding the right medicines at the right price for their shop inventory.
- **Wholesalers:** High-volume master distributors managing B2B deals, pre-orders, and MPO-mediated transactions. They operate in a stealth-isolated environment from Paikari users, with their own catalog, pricing, and reselling tools.
- **Siam's Aqua operators (Admin/Staff):** Internal team managing the entire platform — customer tiers, pricing rules, inventory, order fulfillment, vendor management, and platform configuration. They need real-time visibility and operational control across all 8 sectors.
- **MPO field agents:** Medical Promotion Officers facilitating deals between buyers and sellers through an anonymous broker channel with bidding. They operate in the field, connecting pharmacies with wholesale suppliers.
- **Public consumers:** End users browsing and ordering medicine directly through the public marketplace, with prescription upload and home delivery support.

## Product Purpose

Siam's Aqua is a multi-sector B2B/B2C pharmaceutical distribution platform built for the Bangladesh market. It consolidates 8+ normally-separate marketplaces (pharmacy wholesale, public retail, food, gaming, community classifieds, MPO brokering, offer/clearance deals, and wholesale distribution) into a single unified platform with server-enforced access control and a 4-layer pricing engine. The platform exists to bring operational efficiency, price transparency, and real-time visibility to pharmaceutical distribution in Bangladesh — a market currently dominated by manual, opaque, and fragmented processes.

Success means: pharmacy buyers get better prices and reliable fulfillment, wholesalers get demand visibility and efficient distribution, operators get control and auditability, and the overall supply chain becomes more transparent and efficient.

## Positioning

A single platform that consolidates 8+ pharmaceutical distribution channels with a 4-layer pricing engine and server-enforced RBAC — something no competitor in the Bangladesh market currently offers. The combination of multi-sector consolidation, complex B2B pricing flexibility, and operational control creates a platform that would be extremely difficult to replicate piecemeal.

## Operating Context

- **Market:** Bangladesh — all prices in BDT (৳), payment methods include bKash, Nagad, Rocket, SSLCommerz, ShurjoPay
- **Workflow:** B2B procurement cycles (pharmacy buyers ordering from wholesalers), flash deal/clearance campaigns (Offer Para), MPO-mediated brokering with bidding, food vendor ordering, gaming top-up, community classifieds
- **Environments:** Desktop and mobile web browsers, primarily in Dhaka (Banani, Gulshan, Dhanmondi, Mirpur, Uttara, Old Dhaka) with nationwide delivery
- **Dev context:** 8 test accounts for role-based testing, SQLite dev database with comprehensive seed data
- **Languages:** Bengali terms used throughout (Paikari = পাইকারি, Hawlsel = হালেসল, Strip = পাতা)

## Capabilities and Constraints

- **8 active sectors:** Public Market (Pharmacy), Paikari Market, Wholesale, Offer Para, MPO Market, Food, Gaming, Community Hub
- **2 schema-ready sectors:** Services/Lab (diagnostic & doctor booking), Counter/POS (offline point-of-sale)
- **4-layer pricing engine:** Manual customer override → Product-specific override → Company-level rate → Tier default rate (supports percentage and flat-rate, volume discounts, tier-change recalculation while preserving manual overrides)
- **Server-enforced RBAC:** Visibility is enforced at the API level — e.g., Paikari users get a literal 404 if they navigate to `/wholesale`
- **Real-time updates:** Socket.io for live order status and fulfillment tracking
- **Dual inventory model:** Main pharmacy stock (external PharmaTrack, opaque) vs. Offer Para stock (fully managed internally)
- **Bilingual context:** Bengali terms in UI, English technical implementation
- **No frontend tests yet:** API has 20+ spec files, web has none
- **No mobile app yet:** Project plan mentions React Native/Expo but not yet implemented
- **SQLite in dev:** Production recommended PostgreSQL

## Brand Commitments

- **Brand name:** Siam's Aqua
- **Primary color:** `#0F5B78` (deep clinical slate-cobalt) — used throughout the current UI
- **No existing logo, brand guidelines, or visual identity** — brand identity is part of the design work to be created
- **Voice:** Professional, clinical, trustworthy — appropriate for pharmaceutical distribution

## Evidence on Hand

- **Full Next.js 14 frontend:** 45+ pages across 18 route directories with complete routing structure
- **NestJS backend:** 28 feature modules with 60+ Prisma models
- **Shared type system:** 1830 lines of TypeScript types covering all sectors
- **Pricing engine:** 191-line 4-layer engine with tests
- **Seed data:** 878-line comprehensive seed with realistic Bangladesh pharmaceutical data
- **No production deployment yet** — currently in development
- **No visual design system** — styling is inline Tailwind utilities with custom CSS properties

## Product Principles

1. **Sector isolation is non-negotiable:** Each marketplace operates independently with server-enforced visibility. No user type should ever see data or UI intended for another.
2. **Pricing flexibility is the core value:** The 4-layer pricing engine enables complex B2B relationships that manual systems cannot match. Every pricing decision must be traceable.
3. **Operational visibility drives trust:** Real-time order tracking, audit trails, and dashboards give operators and users confidence in the platform.
4. **Bangladesh-first design:** All UX decisions should account for the local market — BDT pricing, local payment methods, Bengali terminology where appropriate, and Dhaka-centric logistics.
5. **Build the system, not just the screens:** The platform is a business tool. Every screen should serve a clear workflow, not just display data.
