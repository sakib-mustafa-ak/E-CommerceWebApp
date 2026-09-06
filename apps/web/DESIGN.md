# Design System — Siam's Aqua Web

## Visual Identity

**Aesthetic:** Clean, light, clinical e-commerce grid. Shopify/Amazon-level professionalism. No dark glassmorphism, no gradient blobs, no decorative blur.

**Ground:** White (#FFFFFF) primary surface, light gray (#F8F9FA) for separation, #0F5B78 (deep clinical slate-cobalt) for primary actions and authority.

**Typography:** Inter for all text. Weights: 400 body, 500 UI labels, 600 subheadings, 700 headings. Scale: 14px body, 16px/18px/24px/32px headings.

**Palette:**
- Primary: `#0F5B78` (brand-500) — CTAs, active states, authority
- Primary light: `#f0f7fa` (brand-50) — tints, backgrounds
- Primary dark: `#0d4f69` (brand-600) — hover states
- Background: `#F8F9FA` — page ground
- Card: `#FFFFFF` — surfaces, cards
- Border: `hsl(214 32% 91%)` — dividers, card borders
- Text primary: `#0F172A` (slate-900)
- Text secondary: `hsl(215 16% 47%)` (slate-500)
- Destructive: `hsl(0 84% 60%)` — errors, deletes

**Sector Colors (for hero accents and borders only):**
- Pharmacy: `#047857` (emerald-600)
- Paikari: `#b45309` (amber-700)
- Wholesale: `#4338ca` (indigo-700)
- MPO: `#6d28d9` (violet-700)
- Food: `#b91c1c` (red-700)
- Gaming: `#1d4ed8` (blue-700)
- Community: `#0e7490` (cyan-700)
- Offer Para: `#c2410c` (orange-700)

## Components

**Cards:** White background, 1px border `hsl(214 32% 91%)`, border-radius 0.75rem. Subtle shadow on hover.

**Buttons:** Primary `#0F5B78` bg, white text. Secondary white bg, dark text, 1px border. Rounded 0.5rem.

**Inputs:** 1px border, rounded 0.5rem, 0.875rem font. Focus: brand border + 3px ring at 10% opacity.

**Tables:** Zebra striping with `#F8F9FA` hover. Border-bottom per row.

**Hero Banners:** Light gradient background (sector color at 5% via white to slate-50). Decorative blur circles at low opacity. Inline badge pill, large bold heading, search bar with white bg and subtle border.

**Navigation:** White header, clean links with active states. Mobile hamburger menu.

## Layout

**Max width:** 1280px centered.

**Grid:** Standard 12-column Tailwind grid. Product grids: 1 col mobile, 2 cols tablet, 3-4 cols desktop.

**Spacing:** Consistent Tailwind scale. More space above headings than below.

## Voice

Professional, clinical, trustworthy. Bengali terms where appropriate (Paikari, Hawlsel). No hype, no gamification.
